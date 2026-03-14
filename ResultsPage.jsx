import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../App.css";

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.data;

  if (!data) {
    return (
      <div className="results-container">
        <h2>No results found.</h2>
        <button className="go-back-btn" onClick={() => navigate("/dashboard")}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="results-container">

      {/* ===== GO BACK BUTTON ===== */}
      <button className="go-back-btn" onClick={() => navigate("/dashboard")}>
        Go Back
      </button>

      <h1 className="results-title">Resume Analysis Results</h1>

      {/* ===== ATS SCORE CIRCLE ===== */}
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

              {/* Background Circle */}
              <circle
                className="progress-ring__background"
                cx="100"
                cy="100"
                r="85"
              />

              {/* Progress Circle */}
              <circle
                className="progress-ring__circle"
                cx="100"
                cy="100"
                r="85"
                style={{
                  strokeDashoffset: 534 - (534 * data.ats_score_100) / 100,
                }}
              />
            </svg>

            <div className="ats-number">{data.ats_score_100}%</div>
          </div>

          <p className="ats-label">ATS Score</p>
        </div>
      </div>

      {/* ===== DETAILS SECTION ===== */}
      <div className="results-card">

        <p><strong>Name:</strong> {data.name}</p>
        <p><strong>Email:</strong> {data.email}</p>

        {/* ===== RESUME SKILLS ===== */}
        <h3 className="section-title">Resume Skills Detected</h3>
        {data.resume_skills && data.resume_skills.length > 0 ? (
          <ul>
            {data.resume_skills.map((skill, i) => (
              <li key={i}>{skill}</li>
            ))}
          </ul>
        ) : (
          <p>No skills detected in resume.</p>
        )}

        {/* ===== JD SKILLS ===== */}
        <h3 className="section-title">Skills Required in Job Description</h3>
        {data.jd_skills && data.jd_skills.length > 0 ? (
          <ul>
            {data.jd_skills.map((skill, i) => (
              <li key={i}>{skill}</li>
            ))}
          </ul>
        ) : (
          <p>No skills found in job description.</p>
        )}

        {/* ===== MISSING SKILLS ===== */}
        <h3 className="section-title">Missing Skills</h3>
        {data.missing_skills && data.missing_skills.length > 0 ? (
          <ul>
            {data.missing_skills.map((skill, i) => (
              <li key={i}>{skill}</li>
            ))}
          </ul>
        ) : (
          <p>No missing skills. Good match!</p>
        )}

        {/* ===== RECOMMENDATIONS ===== */}
        <h3 className="section-title">Recommendations</h3>
        {data.recommendations && data.recommendations.length > 0 ? (
          <ul>
            {data.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        ) : (
          <p>No recommendations.</p>
        )}

      </div>
    </div>
  );
};

export default ResultsPage;
