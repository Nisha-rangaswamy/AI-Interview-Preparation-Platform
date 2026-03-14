import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];

    if (storedUsers.includes(email)) {
      // ✅ Email exists → go to resume page
      navigate("/dashboard");
    } else {
      // ❌ Email not found → go to register page
      navigate("/register");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">

        <h1 className="login-title">LOGIN</h1>
        <p className="login-subtitle">TO YOUR ACCOUNT</p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-input-wrapper">
            <span className="login-icon">📧</span>
            <input
              type="email"
              placeholder="Email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-input-wrapper">
            <span className="login-icon">🔒</span>
            <input
              type="password"
              placeholder="Password"
              className="login-input"
              required
            />
          </div>

          <button className="login-button" type="submit">
            LOGIN
          </button>
        </form>

        <p className="login-footer-text">
          AI INTERVIEW PREPARATION PLATFORM
        </p>

      </div>
    </div>
  );
};

export default Login;
