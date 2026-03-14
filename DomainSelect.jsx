import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const domains = [
  { name: "Artificial Intelligence", icon: "🤖" },
  { name: "Data Science", icon: "📊" },
  { name: "Cloud Computing", icon: "☁️" },
  { name: "Cyber Security", icon: "🔒" },
  { name: "Internet of Things (IoT)", icon: "🌐" },
  { name: "Mobile App Development", icon: "📱" },
];

// 🔥 MAP UI names → REAL backend keys
const DOMAIN_MAP = {
  "Artificial Intelligence": "artificial intelligence",
  "Data Science": "data science",
  "Cloud Computing": "cloud computing",
  "Cyber Security": "cyber security",
  "Internet of Things (IoT)": "iot",
  "Mobile App Development": "mobile app development",
};

const DomainSelect = () => {
  const [selectedDomain, setSelectedDomain] = useState(null);
  const navigate = useNavigate();

  const handleProceed = () => {
    if (!selectedDomain) {
      alert("⚠️ Please select a domain before proceeding!");
      return;
    }

    // 🔥 Convert friendly name → backend name
    const normalizedDomain = DOMAIN_MAP[selectedDomain];

    // Send correct domain to next screen
    navigate("/interview-type-select", { state: { domain: normalizedDomain } });
  };

  return (
    <div className="domain-container">
      <h1 className="domain-title">Select a Domain</h1>

      <div className="domain-grid">
        {domains.map((domain, index) => (
          <div
            key={index}
            className={`domain-card ${selectedDomain === domain.name ? "selected" : ""}`}
            onClick={() => setSelectedDomain(domain.name)}
          >
            <div className="domain-icon">{domain.icon}</div>
            <p>{domain.name}</p>
          </div>
        ))}
      </div>

      <button onClick={handleProceed} className="domain-btn">
        Proceed with Simulation
      </button>
    </div>
  );
};

export default DomainSelect;
