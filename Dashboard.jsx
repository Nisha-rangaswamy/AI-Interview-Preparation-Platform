import React from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dash-container">

      <h1 className="dash-title">AI INTERVIEW<br/>PREPARATION PLATFORM</h1>

      <div className="dash-card-wrapper">

        {/* CARD 1 - Resume */}
        <div className="dash-card">
          <img src="/resume-icon.png" alt="resume" className="dash-icon" />

          <h2 className="dash-card-title">RESUME<br/>ANALYSIS</h2>
          <p className="dash-card-text">Get detailed insights into your resume.</p>

          <button className="dash-btn" onClick={() => navigate("/resume-upload")}>
          Analyze Resume
          </button>

        </div>

        {/* CARD 2 - Interview */}
        <div className="dash-card">
          <img src="/interview-icon.png" alt="interview" className="dash-icon" />

          <h2 className="dash-card-title">INTERVIEW<br/>SIMULATION</h2>
          <p className="dash-card-text">Practice interviews with real-time feedback.</p>

          <button className="dash-btn-practice" onClick={() => navigate("/domain")}>
          Start Practicing
          </button>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
