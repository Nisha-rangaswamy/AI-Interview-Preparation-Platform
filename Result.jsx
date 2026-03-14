// client/src/pages/Result.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const interviewScore = location.state?.interviewScore ?? 0;
  const atsScore = location.state?.atsScore ?? 0;
  const rawAvgSentiment = location.state?.avgSentiment;
  const interviewType = location.state?.interviewType || "Technical Interview";
  const responses = location.state?.responses || [];

  const isSentimentApplicable =
    rawAvgSentiment !== undefined &&
    rawAvgSentiment !== null &&
    rawAvgSentiment !== "Not Applicable";

  const avgSentiment = isSentimentApplicable ? Number(rawAvgSentiment) : 0.5;
  const overallScore = Math.round(interviewScore * 0.6 + atsScore * 0.4);

  let sentimentLabel = "";
  if (isSentimentApplicable) {
    if (avgSentiment > 0.6) sentimentLabel = "😊 Positive";
    else if (avgSentiment >= 0.4) sentimentLabel = "😐 Neutral";
    else sentimentLabel = "☹ Negative";
  }

  let feedback = "";
  if (interviewType === "HR Interview") {
    if (!isSentimentApplicable) {
      feedback = "Speak clearly and confidently to express your thoughts better.";
    } else if (avgSentiment > 0.6) {
      feedback = "Great confidence and positive communication! Keep it up.";
    } else if (avgSentiment >= 0.4) {
      feedback = "Good communication. Add more clarity, examples, and speak with confidence.";
    } else {
      feedback = "Work on improving clarity, confidence, and keeping a positive tone during your answers.";
    }
  } else {
    if (overallScore >= 80) feedback = "Excellent technical performance! You’re job-ready.";
    else if (overallScore >= 60) feedback = "Good technical skills. Revise a few topics and practice more.";
    else if (overallScore >= 40) feedback = "Average technical performance. Strengthen fundamentals and practice.";
    else feedback = "Needs improvement in technical skills. Study basics and try mock interviews.";
  }

  return (
    <div className="result-page">
      <h1 className="result-heading">Interview & Resume Analysis Result</h1>

      <div className="ats-center">
        <div className="ats-card">
          <div className="ats-loader">
            <svg className="progress-ring" width="200" height="200">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f8cff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>

              <circle className="progress-ring__background" cx="100" cy="100" r="85" />

              <circle
                className="progress-ring__circle"
                cx="100"
                cy="100"
                r="85"
                style={{ strokeDashoffset: 534 - (534 * overallScore) / 100 }}
              />
            </svg>
            <div className="ats-number">{overallScore}%</div>
          </div>
          <p className="ats-label">Overall Readiness</p>
        </div>
      </div>

      <div className="result-stats">
        <div>
          <h3>{interviewScore}%</h3>
          <p>Interview Performance</p>
        </div>
        <div>
          <h3>{atsScore}%</h3>
          <p>Resume ATS Score</p>
        </div>

        {isSentimentApplicable ? (
          <div>
            <h3>{sentimentLabel}</h3>
            <p>Speech Sentiment</p>
          </div>
        ) : (
          <div>
            <h3>—</h3>
            <p>Speech Sentiment (N/A)</p>
          </div>
        )}
      </div>

      <div className="result-feedback">
        <h3>Feedback</h3>
        <p>{feedback}</p>
      </div>

      <div className="per-question-results">
        <h3>Per-question details</h3>
        {responses.length === 0 ? (
          <p>No per-question data available.</p>
        ) : (
          <ul>
            {responses.map((r, i) => (
              <li key={i} style={{ marginBottom: 12 }}>
                <strong>Q{i + 1}:</strong> {r.question}<br />
                <em>Answer:</em> {r.answer || "Skipped"}<br />
                <em>Score:</em> {(r.score ?? "—")}/5 {isNaN(r.score) ? "" : `(${Math.round(((r.score ?? 0)/5)*100)}%)`}<br />
                {r.sentiment !== undefined && (
                  <small>Sentiment: {r.sentiment} {typeof r.sentiment_score === "number" ? `(${r.sentiment_score.toFixed(2)})` : ""}</small>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button className="back-btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
    </div>
  );
};

export default Result;
