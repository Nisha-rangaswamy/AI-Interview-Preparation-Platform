import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    // Validation
    if (!name || !email || !password || !confirm) {
      setError("Please fill all fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    // Load stored users
    let users = JSON.parse(localStorage.getItem("users")) || [];

    // Check if email already exists
    if (users.includes(email)) {
      setError("Email is already registered. Redirecting to Login...");
      setTimeout(() => navigate("/login"), 1000);
      return;
    }

    // Save new email
    users.push(email);
    localStorage.setItem("users", JSON.stringify(users));

    // Redirect to resume page
    navigate("/dashboard");
  };

  return (
    <div className="register-container">

      {/* LEFT FORM */}
      <div className="register-left">
        <h1 className="register-title">REGISTER</h1>
        <p className="register-subtitle">Create an account to get started.</p>

        <form className="register-form" onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="Name"
            className="register-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="register-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="register-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="register-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <p className="error-text">{error}</p>}

          <button className="register-button" type="submit">
            Sign Up
          </button>
        </form>

        {/* LOGIN LINK */}
        <p className="register-login-text">
          Already have an account?{" "}
          <a href="/login" className="register-login-link">
            Log in
          </a>
        </p>
      </div>

      {/* RIGHT IMAGE */}
      <div className="register-right">
        <img
          src="/register-illustration.png"
          alt="AI Illustration"
          className="register-image"
        />
      </div>
    </div>
  );
};

export default Register;
