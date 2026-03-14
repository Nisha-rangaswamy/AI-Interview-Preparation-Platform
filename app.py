# server/app.py (UPDATED)
# Improvements made:
# - More robust skill extraction using semantic matching (sentence-transformers) + exact matches
# - Role-to-skills expansion (e.g., "software" -> common languages) so "software developer" won't give 0
# - Softer domain-mismatch handling (downweight instead of hard-zero)
# - Ensure response keys expected by frontend exist (skills, education, experience)
# - Provide better missing_skills and recommendation generation
# - Keep other endpoints/logic untouched

import os
import re
import json
import base64
import numpy as np
import cv2

from flask import Flask, request, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader
import docx

from sentence_transformers import SentenceTransformer, util
from transformers import pipeline
from fer import FER

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

# ----------------------- MODELS -----------------------
sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english",
    framework="pt"
)

st_model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

detector = FER()

# ----------------------- UTIL -----------------------

def clean_text(t):
    t = (t or "").strip()
    # keep case for name extraction, but many operations will use lower()
    return re.sub(r"\s+", " ", t)


def clean_text_lower(t):
    t = (t or "").strip().lower()
    t = re.sub(r"[^a-z0-9\s+#+.-]", " ", t)
    return re.sub(r"\s+", " ", t)


def extract_text_from_file(file):
    filename = (file.filename or "").lower()

    if filename.endswith(".pdf"):
        reader = PdfReader(file)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text

    elif filename.endswith(".docx") or filename.endswith(".doc"):
        docf = docx.Document(file)
        return "\n".join([p.text for p in docf.paragraphs])

    # also accept plain text files
    elif filename.endswith('.txt'):
        return file.read().decode('utf-8', errors='ignore')

    return ""


def extract_email(text):
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else ""


def extract_name(text):
    # prefer first non-empty short line (typical resume layouts)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not lines:
        return "Unknown"
    # sometimes first line is company header; pick first line that looks like a name (<=4 words, has letters)
    for line in lines[:8]:
        if 1 <= len(line.split()) <= 4 and re.search(r"[A-Za-z]", line):
            # avoid lines that contain words like 'resume', 'curriculum', 'profile'
            if not re.search(r"resume|curriculum|cv|profile|objective|contact", line, re.I):
                return line
    return lines[0]

# simple education extractor

def extract_education(text):
    text_l = text.lower()
    degrees = ["bachelor", "b.tech", "bsc", "bs", "master", "m.tech", "msc", "mba", "phd", "associate"]
    found = []
    for deg in degrees:
        if deg in text_l:
            # grab surrounding snippet
            idx = text_l.find(deg)
            start = max(0, idx - 40)
            snippet = text[start: idx + 60]
            found.append(snippet.strip())
    return found[:5]

# experience keywords (years and roles)

def extract_experience(text):
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    exp_lines = [l for l in lines if re.search(r"\b(\d+\+?\s*years|year(s)?\b|\bexperience\b)", l.lower())]
    # fallback: sentences that contain role words
    role_words = ['engineer','developer','manager','analyst','intern','consultant','specialist']
    if not exp_lines:
        exp_lines = [l for l in lines if any(rw in l.lower() for rw in role_words)]
    return exp_lines[:8]

# ----------------------- RESUME ANALYSIS -----------------------
@app.route("/analyze_resume", methods=["POST"])
def analyze_resume():
    try:
        file = request.files.get("file")
        jd = request.form.get("job_description", "") or ""

        if not file:
            return jsonify({"error": "No resume uploaded"}), 400

        resume_text = extract_text_from_file(file)
        if not resume_text:
            return jsonify({"error": "Could not read resume"}), 400

        resume_clean = clean_text(resume_text)
        resume_lower = clean_text_lower(resume_text)
        jd_clean = clean_text(jd)
        jd_lower = clean_text_lower(jd)

        # -------- SKILL & DOMAIN KEYWORDS (expanded) --------
        SKILL_KEYWORDS = [
            # Technical
            "python","java","sql","aws","azure","gcp","google cloud","docker","kubernetes",
            "html","css","javascript","typescript","react","angular","vue","node","express","linux",
            "machine learning","deep learning","nlp","natural language processing","data science",
            "tensorflow","keras","pytorch","pandas","numpy","scikit-learn","sklearn","flask","django",
            "spring","hibernate","git","github","gitlab","ci/cd","jenkins","terraform","ansible",
            "iot","raspberry","arduino","c","c++","c#","go","golang","rust","php","sql","nosql","IoT","embedded","embedded systems","embedded engineer",
            "raspberry pi","microcontroller","mcu","sensor",
            "linux","linux commands","wireless","5g","5g systems",
            "ran","oran","lte","rf","wireless communication"


            # Soft Skills
            "communication","leadership","teamwork","time management",
            "problem solving","critical thinking","adaptability","presentation",

            # BPO / Call Center
            "bpo","call center","voice process","non voice","customer service",
            "customer support","crm","call handling","inbound","outbound",
            "telecalling","typing","email support","chat support"
        ]

        # Role -> implied skills mapping (helps when resume lists roles like 'software developer')
        ROLE_SKILLS = {
            'software': ['python','java','c++','javascript','sql','git'],
            'developer': ['python','java','javascript','react','node','sql'],
            'full-stack': ['html','css','javascript','react','node','sql'],
            'data': ['python','pandas','numpy','scikit-learn','sql','machine learning'],
            'ml': ['python','tensorflow','pytorch','numpy','pandas','scikit-learn','machine learning'],
            'devops': ['docker','kubernetes','ci/cd','terraform','ansible','aws','azure','gcp'],
            'call center': ['customer service','crm','communication']
        }

        DOMAIN_KEYWORDS = {
            "call_center": [
                "call center","bpo","voice process","customer service","customer support",
                "crm","call handling","inbound","outbound","telecalling","chat support","email support"
            ],
            "technical": [
                "python","java","sql","aws","azure","docker","kubernetes",
                "machine learning","deep learning","nlp","tensorflow","pandas","numpy",
                "react","node","html","css","javascript","linux","iot"
            ],
        }

        # -------- Semantic skill detection helper --------
        # precompute embeddings for keywords
        skill_embeddings = st_model.encode(SKILL_KEYWORDS, convert_to_tensor=True)
        # embed full resume and jd
        emb_resume = st_model.encode(resume_lower, convert_to_tensor=True)
        emb_jd = st_model.encode(jd_lower, convert_to_tensor=True)

        # exact (word-boundary) matcher
        def exact_skills_in_text(text_lower):
            found = set()
            for s in SKILL_KEYWORDS:
                s_l = s.lower()
                # use word boundary for simple tokens
                token = re.escape(s_l)
                if re.search(rf"\b{token}\b", text_lower):
                    found.add(s)
            return found

        # semantic matcher with threshold
        def semantic_skills_in_text(emb_text, threshold=0.45):
            sims = util.cos_sim(emb_text, skill_embeddings)[0].cpu().numpy()
            found = set()
            for i, score in enumerate(sims):
                if score >= threshold:
                    found.add(SKILL_KEYWORDS[i])
            return found

        # combine approaches for resume
        resume_exact = exact_skills_in_text(resume_lower)
        resume_sem = semantic_skills_in_text(emb_resume, threshold=0.45)
        resume_skills = set(list(resume_exact) + list(resume_sem))

        # augment with role implied skills if role words exist
        for role, implied in ROLE_SKILLS.items():
            if re.search(rf"\b{re.escape(role)}\b", resume_lower):
                resume_skills.update(implied)

        # JD skills using same approach but looser threshold
        jd_exact = exact_skills_in_text(jd_lower)
        jd_sem = semantic_skills_in_text(emb_jd, threshold=0.42)
        jd_skills = set(list(jd_exact) + list(jd_sem))

        # normalize lists
        resume_skills = sorted(set([s.lower() for s in resume_skills]))
        jd_skills = sorted(set([s.lower() for s in jd_skills]))

        # -------- DOMAIN DETECTION (soft) --------
        def detect_domain_soft(text_lower):
            scores = {}
            for domain, kws in DOMAIN_KEYWORDS.items():
                count = sum(1 for kw in kws if kw in text_lower)
                scores[domain] = count
            best = max(scores, key=lambda k: scores[k])
            if scores[best] == 0:
                return 'general'
            return best

        resume_domain = detect_domain_soft(resume_lower)
        jd_domain = detect_domain_soft(jd_lower)

        # -------- TF-IDF MATCHING --------
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([resume_lower, jd_lower])
            tfidf_sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        except Exception:
            tfidf_sim = 0.0

        # -------- BERT semantic similarity (0..100) --------
        try:
            bert_sim_raw = float(util.cos_sim(emb_resume, emb_jd).item())
            bert_score = int(max(0, min(bert_sim_raw * 100, 100)))
        except Exception:
            bert_score = 0

        # -------- SKILL SCORE --------
        # skill score: proportion of JD skills present in resume, weighted by importance
        matched_skill_count = len(set(resume_skills) & set(jd_skills))
        skill_score = int((matched_skill_count / max(len(jd_skills), 1)) * 100)

        # -------- DOMAIN MISMATCH HANDLING (SOFT) --------
        domain_mismatch = False
        if resume_domain != jd_domain and resume_domain != 'general' and jd_domain != 'general':
            # mark mismatch but do not force zero; downweight final score
            domain_mismatch = True

        # If TF-IDF is extremely low, consider unrelated
        if tfidf_sim < 0.03:
            final_score = 0
        else:
            # combine BERT and skill scores
            final_score = int((bert_score * 0.55) + (skill_score * 0.45))
            # soften domain mismatch penalty instead of zeroing everything
            if domain_mismatch:
                final_score = int(final_score * 0.6)  # penalize but keep informative score

        # clamp
        final_score = max(0, min(final_score, 100))

        # -------- Missing skills & recommendations --------
        missing_skills = sorted(list(set(jd_skills) - set(resume_skills)))

        recommendations = []
        for skill in missing_skills:
            # craft more helpful recommendation text
            recommendations.append(
                f"Consider adding specific experience, a project, or a course on '{skill}' and mention it in your resume (tools, duration, outcome)."
            )

        # If resume uses generic role words, recommend listing languages explicitly
        if any(r in resume_lower for r in ['software developer','software engineer','developer','engineer']) and not any(l in resume_lower for l in ['python','java','c++','javascript','sql']):
            recommendations.append("You list a software role; explicitly mention programming languages, frameworks or projects (e.g., Python, Java, React).")

        # ---------------- Additional lightweight extraction for frontend ----------------
        education = extract_education(resume_text)
        experience = extract_experience(resume_text)

        name = extract_name(resume_text)
        email = extract_email(resume_text)

        # Return keys expected by front-end (skills, education, experience, ats_score_100 etc.)
        return jsonify({
            "name": name,
            "email": email,
            # keep existing keys for backward compatibility
            "resume_skills": resume_skills,
            "jd_skills": jd_skills,
            # primary key used by frontend
            "skills": resume_skills,
            "missing_skills": missing_skills,
            "recommendations": recommendations,
            "tfidf_similarity": tfidf_sim,
            "bert_score": bert_score,
            "skill_score": int(skill_score),
            "ats_score_100": final_score,
            "resume_domain": resume_domain,
            "jd_domain": jd_domain,
            "domain_mismatch": domain_mismatch,
            "education": education,
            "experience": experience,
            "raw_text": resume_text
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------- GET QUESTIONS -----------------------
# (unchanged except for formatting) - kept identical logic to previous file
@app.route("/get_questions", methods=["POST"])
def get_questions():
    try:
        data = request.get_json() or {}
        domain = (data.get("domain") or "").strip().lower()
        interview_type = (data.get("interview_type") or "").strip().lower()

        with open("questions.json", "r", encoding="utf-8") as f:
            all_data = json.load(f)

        if domain not in [d.lower() for d in all_data]:
            return jsonify({"questions": ["Invalid domain"]})

        real_domain = next(k for k in all_data if k.lower() == domain)
        domain_data = all_data[real_domain]

        if interview_type not in [t.lower() for t in domain_data]:
            return jsonify({"questions": ["Invalid interview type"]})

        real_type = next(k for k in domain_data if k.lower() == interview_type)
        return jsonify({"questions": domain_data[real_type]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------- TECHNICAL SCORING -----------------------
@app.route("/score_technical", methods=["POST"])
def score_technical():
    try:
        data = request.get_json() or {}
        answer = data.get("answer", "").strip()
        question = data.get("question", "").strip()

        if not answer:
            return jsonify({"score": 0})

        emb_q = st_model.encode(question, convert_to_tensor=True)
        emb_a = st_model.encode(answer, convert_to_tensor=True)

        sim = float(util.cos_sim(emb_q, emb_a).item())
        score = round(sim * 5, 2)

        return jsonify({"score": score})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------- EMOTION DETECTION -----------------------
@app.route("/analyze_emotion", methods=["POST"])
def analyze_emotion():
    try:
        data = request.get_json()
        img_data = data.get("image")

        img_bytes = base64.b64decode(img_data.split(",")[1])
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        results = detector.detect_emotions(frame)
        if results:
            emotions = results[0]["emotions"]
            dominant = max(emotions, key=emotions.get)
            return jsonify({"emotion": dominant, "scores": emotions})

        return jsonify({"emotion": "neutral"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------- HR SCORING -----------------------
@app.route("/score_hr", methods=["POST"])
def score_hr():
    try:
        data = request.get_json() or {}
        text = data.get("text", "")
        question = data.get("question", "")
        duration = data.get("duration", 1)
        words = data.get("words", 1)

        if not text.strip():
            return jsonify({
                "sentiment_class": "negative",
                "sentiment_score": 0.05,
                "bert_score": 0,
                "voice_metrics": {
                    "duration_sec": duration,
                    "word_count": words,
                    "speed_wpm": 0
                },
                "score": 0
            })

        sentiment = sentiment_analyzer(text)[0]
        sentiment_label = sentiment["label"].lower()
        sentiment_score = float(sentiment["score"]) 

        if sentiment_label == "positive":
            sentiment_numeric = 4
        elif sentiment_label == "neutral":
            sentiment_numeric = 3
        else:
            sentiment_numeric = 1

        emb_q = st_model.encode(question, convert_to_tensor=True)
        emb_a = st_model.encode(text, convert_to_tensor=True)
        bert_sim = float(util.cos_sim(emb_q, emb_a).item())

        speed = words / max(duration / 60, 1)

        final_score = round(((sentiment_numeric * 0.6) + (bert_sim * 5 * 0.4)), 2)

        return jsonify({
            "sentiment_class": sentiment_label,
            "sentiment_score": round(sentiment_score, 2),
            "bert_score": round(bert_sim * 100, 2),
            "voice_metrics": {
                "duration_sec": duration,
                "word_count": words,
                "speed_wpm": round(speed, 1),
            },
            "score": final_score
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------- MAIN -----------------------
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
