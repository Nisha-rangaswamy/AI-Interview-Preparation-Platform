import React from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";  // IMPORTANT: to apply custom CSS

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="homepage-container">
      {/* LEFT SIDE TEXT */}
      <div className="homepage-left">
        <h1 className="homepage-title">
          AI INTERVIEW <br /> PREPARATION PLATFORM
        </h1>

        <p className="homepage-subtitle">
          Improve your interview skills with AI-powered practice.
        </p>

        <button className="homepage-button" onClick={() => navigate("/register")}>
          Get Started
        </button>
      </div>

      {/* RIGHT SIDE IMAGE */}
      <div className="homepage-right">
        <img
          src="/hero.jpeg"
          alt="AI Illustration"
          className="homepage-image"
        />
      </div>
    </div>
  );
};

export default HomePage;
