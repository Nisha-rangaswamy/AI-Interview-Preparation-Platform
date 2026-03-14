// client/src/pages/ResumeUpload.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css";

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      alert("Please upload your resume!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDescription);

    try {
      setLoading(true);
      const res = await axios.post(
        "http://127.0.0.1:5000/analyze_resume",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Save latest ATS in localStorage for interview pages to read later
      const ats = (res.data?.ats_score_100 ?? res.data?.ats_score ?? 0);
      try {
        localStorage.setItem("latestATS", String(ats));
      } catch (e) {
        console.warn("Could not write to localStorage:", e);
      }

      // Navigate to resume results page (existing route in your app)
      navigate("/results", { state: { data: res.data } });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Failed to analyze resume. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resume-analysis-page">
      <h1 className="ra-title">RESUME</h1>
      <h2 className="ra-subtitle">ANALYSIS</h2>

      <div
        className="ra-upload-box"
        onClick={() => document.getElementById("resumeFile").click()}
      >
        <div className="ra-upload-icon">📄</div>
        <p className="ra-upload-text">Upload your resume (.doc or .pdf)</p>

        {file && <p className="selected-file">Selected: {file.name}</p>}
      </div>

      <input
        id="resumeFile"
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: "none" }}
        onChange={(e) => setFile(e.target.files[0])}
      />

      <label className="ra-label">JOB DESCRIPTION</label>
      <textarea
        className="ra-textarea"
        rows="6"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder="Paste job description (optional)"
      ></textarea>

      <button
        onClick={handleUpload}
        disabled={loading}
        className="ra-analyze-btn"
      >
        {loading ? "Analyzing..." : "Analyze Resume"}
      </button>
    </div>
  );
};

export default ResumeUpload;
