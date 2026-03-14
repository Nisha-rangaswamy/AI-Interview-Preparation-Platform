import React from "react";
import "../App.css";
import { useNavigate, useLocation } from "react-router-dom";
import { FaUserTie } from "react-icons/fa";   // HR Icon
import { MdMemory } from "react-icons/md";    // Technical Icon

const InterviewTypeSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Domain passed from previous page
  const domain = location.state?.domain || "Artificial Intelligence";

  // Navigate to Interview Page with domain + type
  const handleNavigate = (type) => {
    navigate("/interview", { state: { domain, type } });
  };

  return (
    <div className="simulation-container">
      <h1 className="simulation-title">SELECT SIMULATION TYPE</h1>

      <div className="simulation-grid">
        {/* HR Interview Card */}
        <div
          className="simulation-card"
          onClick={() => handleNavigate("HR Interview")}
        >
          <FaUserTie className="simulation-icon hr" />
          <h2>HR Interview</h2>
          <p>Test your communication, confidence & behavioral skills.</p>
        </div>

        {/* Technical Interview Card */}
        <div
          className="simulation-card"
          onClick={() => handleNavigate("Technical Interview")}
        >
          <MdMemory className="simulation-icon tech" />
          <h2>Technical Interview</h2>
          <p>Evaluate your problem-solving and technical expertise.</p>
        </div>
      </div>
    </div>
  );
};

export default InterviewTypeSelect;
