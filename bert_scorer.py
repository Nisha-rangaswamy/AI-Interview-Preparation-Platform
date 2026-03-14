# backend/bert_scorer.py
import os
import json
import re
import numpy as np
from typing import Dict, Any, List
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_NAME = os.environ.get("SENTENCE_MODEL", "all-MiniLM-L6-v2")
EXPECTED_FILE = r"C:\Users\DEEKSHITHA\OneDrive\Desktop\ai interview\server\models\expected_answers.json"
EMBED_FILE = r"C:\Users\DEEKSHITHA\OneDrive\Desktop\ai interview\server\models\expected_embeddings.npy"



def normalize(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r"\s+", " ", t)
    return t

class BERTScorer:
    def __init__(self, expected_path: str = EXPECTED_FILE, model_name: str = MODEL_NAME):
        self.expected_path = expected_path
        self.model = SentenceTransformer(model_name)
        with open(expected_path, "r", encoding="utf-8") as f:
            self.expected = json.load(f)
        # Expand SAME_AS_AI_HR if present
        if "artificial intelligence" in self.expected:
            ai_hr = self.expected["artificial intelligence"]["HR Interview"]
            for domain, data in self.expected.items():
                if data.get("HR Interview") == "SAME_AS_AI_HR":
                    self.expected[domain]["HR Interview"] = ai_hr
        self.flat = []
        for domain, data in self.expected.items():
            for ttype in ["HR Interview", "Technical Interview"]:
                qlist = data.get(ttype, [])
                for i, qobj in enumerate(qlist):
                    # ensure structure
                    question = qobj["question"]
                    answer = qobj["answer"]
                    keypoints = qobj.get("keypoints", [])
                    entry = {
                        "domain": domain,
                        "type": ttype,
                        "qid": f"{domain}::{ttype}::{i}",
                        "question": question,
                        "answer": answer,
                        "keypoints": keypoints
                    }
                    self.flat.append(entry)
        # Build embeddings for gold answers
        if os.path.exists(EMBED_FILE):
            arr = np.load(EMBED_FILE, allow_pickle=False)
            if arr.shape[0] == len(self.flat):
                self.gold_embeddings = arr
            else:
                self._build_embeddings()
        else:
            self._build_embeddings()

    def _build_embeddings(self):
        texts = [normalize(e["answer"]) for e in self.flat]
        embs = self.model.encode(texts, show_progress_bar=False)
        self.gold_embeddings = np.array(embs)
        os.makedirs(os.path.dirname(EMBED_FILE), exist_ok=True)
        np.save(EMBED_FILE, self.gold_embeddings)

    def _find_entry(self, domain: str, question_text: str):
        q_norm = normalize(question_text)
        # exact match search in same domain (prefer exact)
        candidates = [e for e in self.flat if e["domain"] == domain]
        for e in candidates:
            if normalize(e["question"]) == q_norm:
                return e
        # fallback: semantic match among questions in domain
        q_emb = self.model.encode([q_norm])[0]
        cand_embs = self.model.encode([normalize(x["question"]) for x in candidates])
        sims = cosine_similarity([q_emb], cand_embs)[0] if len(cand_embs)>0 else []
        if len(sims)==0:
            return None
        idx = int(np.argmax(sims))
        return candidates[idx]

    def _keyword_coverage(self, candidate: str, keypoints: List[str]) -> float:
        c = normalize(candidate)
        found = 0
        for kp in keypoints:
            k = normalize(kp)
            if k in c:
                found += 1
            else:
                # split into words and check partial presence (strict: words >2 chars)
                words = [w for w in re.split(r"\W+", k) if len(w) > 2]
                if words and all(w in c for w in words):
                    found += 1
        return found / max(1, len(keypoints))

    def _surface_points(self, candidate: str) -> int:
        words = candidate.strip().split()
        if len(words) < 8:
            return -1
        fillers = ["um", "uh", "like", "you know", "i mean"]
        fcount = sum(candidate.lower().count(f) for f in fillers)
        if fcount >= 3:
            return -1
        if 40 <= len(words) <= 200:
            return 1
        return 0

    def score_answer(self, domain: str, question: str, candidate: str) -> Dict[str, Any]:
        entry = self._find_entry(domain, question)
        if entry is None:
            return {"error": "No matching question found in domain."}
        expected = normalize(entry["answer"])
        cand_norm = normalize(candidate)
        # embeddings
        gold_index = None
        for idx, e in enumerate(self.flat):
            if e["qid"] == entry["qid"]:
                gold_index = idx
                break
        if gold_index is None:
            return {"error": "Internal indexing error."}
        gold_emb = self.gold_embeddings[gold_index]
        cand_emb = self.model.encode([cand_norm])[0]
        sim = float(cosine_similarity([gold_emb], [cand_emb])[0][0])
        # similarity points mapping (0-6)
        if sim < 0.40:
            sim_pts = 0
        elif sim < 0.60:
            sim_pts = 2
        elif sim < 0.75:
            sim_pts = 4
        elif sim < 0.85:
            sim_pts = 5
        else:
            sim_pts = 6
        # keyword coverage -> 0-3
        kw_cov = self._keyword_coverage(candidate, entry.get("keypoints", []))
        if kw_cov == 1.0:
            kw_pts = 3
        elif kw_cov >= 0.67:
            kw_pts = 2
        elif kw_cov >= 0.34:
            kw_pts = 1
        else:
            kw_pts = 0
        surf = self._surface_points(candidate)
        total = sim_pts + kw_pts + surf
        total = int(max(0, min(10, round(total))))
        missing = [kp for kp in entry.get("keypoints", []) if normalize(kp) not in cand_norm]
        return {
            "score": total,
            "similarity": round(sim, 4),
            "similarity_points": sim_pts,
            "keyword_coverage": round(kw_cov, 3),
            "keyword_points": kw_pts,
            "surface_points": surf,
            "question_matched": entry["question"],
            "expected_answer": entry["answer"],
            "missing_keypoints": missing
        }
