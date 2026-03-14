// client/src/pages/InterviewPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "../App.css";

const TECH_KEYWORDS = {
  "artificial intelligence": ["machine learning", "ai", "neural network", "nlp", "dataset", "python", "training", "model"],
  "data science": ["regression", "clustering", "pandas", "feature", "visualization", "statistics", "random forest"],
  "cloud computing": ["aws", "azure", "docker", "kubernetes", "cloud", "linux"],
  "cyber security": ["encryption", "firewall", "network", "hacking", "security", "threat"],
  "iot": ["arduino", "raspberry pi", "mqtt", "sensors", "embedded c"],
  "mobile app development": ["flutter", "react native", "android", "ios", "firebase", "api", "apk"]
};

const InterviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const domainRaw = (location.state?.domain || "artificial intelligence");
  const domain = String(domainRaw).toLowerCase();
  const interviewTypeRaw = location.state?.type || "Technical Interview";
  const interviewType = String(interviewTypeRaw);
  const isHR = interviewType.toLowerCase().includes("hr");

  // ATS: first try state, then localStorage
  const atsFromState = Number(location.state?.atsScore ?? NaN);
  const atsFromStorage = Number(localStorage.getItem("latestATS") ?? NaN);
  const atsScoreInitial = Number.isFinite(atsFromState) && !Number.isNaN(atsFromState) ? atsFromState : (Number.isFinite(atsFromStorage) && !Number.isNaN(atsFromStorage) ? atsFromStorage : 0);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [answer, setAnswer] = useState("");
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("neutral");

  const videoRef = useRef(null);
  const { transcript, resetTranscript } = useSpeechRecognition();
  const speechStartRef = useRef(null);
  const speechEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const captureEmotion = async () => {
      if (!videoRef.current || !videoRef.current.videoWidth) return;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg");
      try {
        const res = await fetch("http://127.0.0.1:5000/analyze_emotion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData }),
        });
        const data = await res.json();
        if (data?.emotion && mounted) setCurrentEmotion(data.emotion);
      } catch (e) {}
    };
    const interval = setInterval(captureEmotion, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const mode = isHR ? "HR Interview" : "Technical Interview";
        const res = await fetch("http://127.0.0.1:5000/get_questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, interview_type: mode }),
        });
        const data = await res.json();
        if (Array.isArray(data.questions)) setQuestions(data.questions);
        else setQuestions(["No questions found"]);
      } catch {
        setQuestions(["Error loading questions"]);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [domain, isHR]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
      } catch {}
    };
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startSpeech = () => {
    resetTranscript();
    speechStartRef.current = Date.now();
    SpeechRecognition.startListening({ continuous: true });
    setListening(true);
  };

  const stopSpeech = async () => {
    SpeechRecognition.stopListening();
    speechEndRef.current = Date.now();
    setListening(false);

    const transcriptText = transcript.trim();
    const durationSec = (speechEndRef.current - speechStartRef.current) / 1000;
    const wordCount = transcriptText ? transcriptText.split(/\s+/).length : 0;

    if (isHR) {
      if (!transcriptText) {
        setResponses((prev) => [
          ...prev,
          { question: questions[currentIndex], answer: "", sentiment: "negative", sentiment_score: 0.05, score: 0 },
        ]);
        return;
      }
      try {
        const res = await fetch("http://127.0.0.1:5000/score_hr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: transcriptText,
            question: questions[currentIndex],
            interview_type: "HR",
            duration: durationSec,
            words: wordCount,
          }),
        });
        const data = await res.json();
        setResponses((prev) => [
          ...prev,
          {
            question: questions[currentIndex],
            answer: transcriptText,
            sentiment: data.sentiment_class ?? "neutral",
            sentiment_score: typeof data.sentiment_score === "number" ? data.sentiment_score : (data.sentiment_score ? Number(data.sentiment_score) : 0),
            bert_score: data.bert_score ?? 0,
            voice_metrics: data.voice_metrics ?? {},
            score: data.score ?? 0,
          },
        ]);
      } catch {
        setResponses((prev) => [
          ...prev,
          { question: questions[currentIndex], answer: transcriptText, sentiment: "neutral", sentiment_score: 0.5, score: 2 },
        ]);
      }
      return;
    }

    // Technical: capture transcript as fallback if user used voice
    setResponses((prev) => [
      ...prev,
      { question: questions[currentIndex], answer: transcriptText, score: 0 },
    ]);
  };

  const handleNext = async () => {
    if (isHR) {
      if (!responses[currentIndex]) {
        setResponses((prev) => [...prev, { question: questions[currentIndex], answer: "", sentiment: "negative", sentiment_score: 0.05, score: 0 }]);
      }
      resetTranscript();
    } else {
      const userAnswer = answer.trim();
      const keywords = TECH_KEYWORDS[domain] || [];

      if (!userAnswer) {
        setResponses((prev) => [...prev, { question: questions[currentIndex], answer: "", score: 0 }]);
      } else {
        try {
          const res = await fetch("http://127.0.0.1:5000/score_technical", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answer: userAnswer,
              question: questions[currentIndex],
              keywords,
            }),
          });

          const data = await res.json();
          setResponses((prev) => [
            ...prev,
            {
              question: questions[currentIndex],
              answer: userAnswer,
              score: data.score ?? 0,
            },
          ]);
        } catch {
          setResponses((prev) => [...prev, { question: questions[currentIndex], answer: userAnswer, score: 1 }]);
        }
      }
      setAnswer("");
    }

    if (currentIndex + 1 < questions.length) setCurrentIndex((i) => i + 1);
    else setFinished(true);
  };

  const handleResult = () => {
    const totalPointsPerQ = 5;
    const total = questions.length * totalPointsPerQ;
    const scoreSum = responses.reduce((a, r) => a + (r.score || 0), 0);
    const interviewScore = total > 0 ? Math.round((scoreSum / total) * 100) : 0;

    let avgSentiment = "Not Applicable";
    if (isHR) {
      const sentimentValues = responses.map((r) => r.sentiment_score).filter((v) => typeof v === "number" && !Number.isNaN(v));
      if (sentimentValues.length > 0) avgSentiment = sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length;
      else avgSentiment = 0.5;
    }

    const stateToPass = {
      interviewScore,
      atsScore: atsScoreInitial,
      avgSentiment,
      interviewType,
      responses,
      domain,
    };

    navigate("/result", { state: stateToPass });
  };

  if (loading) return <div className="ip-loading">Loading questions...</div>;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="interview-page">
      <div className="interview-content">
        <div className="interview-left">
          <div className="interview-header">
            <div>
              <h2 className="ip-domain">{domain}</h2>
              <h3 className="ip-type">{interviewType}</h3>
            </div>
            <div className="ip-progress">Q {currentIndex + 1} / {questions.length}</div>
          </div>

          <div className="question-card">
            <p className="question-text">{currentQuestion}</p>

            {isHR ? (
              <>
                <p className={`speech-status ${listening ? "live" : ""}`}>{listening ? "🎤 Listening..." : "🎤 Mic ready"}</p>
                <div className="mic-controls">
                  <button onClick={startSpeech} className="mic-btn mic-start">Start Speaking</button>
                  <button onClick={stopSpeech} className="mic-btn mic-stop">Stop</button>
                </div>

                <div className="transcript-box">
                  <label className="transcript-label">Your Answer</label>
                  <div className="transcript-text">{transcript || "No speech detected yet."}</div>
                </div>
              </>
            ) : (
              <>
                <label className="answer-label">Type your answer below</label>
                <textarea
                  className="answer-input"
                  rows="6"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                />
              </>
            )}

            <div className="question-actions">
              {currentIndex + 1 === questions.length ? (
                <button onClick={handleResult} className="ip-next-btn">Finish Interview & View Result</button>
              ) : (
                <button onClick={handleNext} className="ip-next-btn">Next Question</button>
              )}
            </div>
          </div>

          {finished && (
            <div className="summary-card">
              <h3>Interview Summary</h3>
              <ul>
                {responses.map((r, i) => (
                  <li key={i}>
                    <strong>Q{i + 1}:</strong> {r.question}<br />
                    <em>Answer:</em> {r.answer || "Skipped"} — Score: {r.score ?? "—"}/5
                    {isHR && (
                      <div><small>Sentiment: {r.sentiment ?? "—"} ({typeof r.sentiment_score === "number" ? r.sentiment_score.toFixed(2) : "—"})</small></div>
                    )}
                  </li>
                ))}
              </ul>
              <button onClick={handleResult} className="ip-result-btn">View Result</button>
            </div>
          )}
        </div>

        <div className="interview-right">
          <div className="camera-card">
            <video ref={videoRef} autoPlay muted playsInline className="camera-video" />
            <div className="camera-caption">
              <div className={`camera-status ${listening ? "listening" : ""}`} />
              <div>
                <div className="cam-title">Live Camera</div>
                <div className="cam-sub">Sentiment Analysis {isHR ? "● Enabled" : "● Keyword Mode"}</div>
                <div className="emotion-detect">🎭 Emotion: <strong>{currentEmotion}</strong></div>
                <div style={{ marginTop: 6, fontSize: 13 }}>ATS (from resume): <strong>{atsScoreInitial}%</strong></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InterviewPage;
