import React, { useState } from "react";

function Home() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!file || !jobDescription.trim()) {
      setError("Please upload a resume and enter a job description.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDescription);

    try {
      const res = await fetch("http://127.0.0.1:5000/analyze_resume", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-lg mt-10">
      <h1 className="text-2xl font-bold text-center mb-5 text-blue-700">
        ATS Resume Analyzer
      </h1>

      <form onSubmit={handleSubmit} className="mb-5">
        <input
          type="file"
          className="w-full border p-2 mb-3 rounded"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <textarea
          placeholder="Paste job description here..."
          className="w-full border p-2 mb-3 rounded"
          rows="4"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 font-semibold rounded hover:bg-blue-700"
        >
          Analyze Resume
        </button>
      </form>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-100 p-5 rounded">
          <h2 className="text-xl font-bold text-center mb-4">Resume Analysis</h2>

          <p className="text-center text-green-600 text-xl font-bold mb-4">
            ATS Score: {result.ats_score_100}%
          </p>

          <p><strong>Name:</strong> {result.name}</p>
          <p><strong>Email:</strong> {result.email}</p>

          <div className="mt-3">
            <strong>Education:</strong>
            <ul className="list-disc list-inside">
              {result.education?.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>

          <div className="mt-3">
            <strong>Skills:</strong>
            <ul className="list-disc list-inside">
              {result.skills?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="mt-3">
            <strong>Projects:</strong>
            <ul className="list-disc list-inside">
              {result.projects?.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          <div className="mt-3">
            <strong>Experience:</strong>
            <ul className="list-disc list-inside">
              {result.experience?.map((ex, i) => <li key={i}>{ex}</li>)}
            </ul>
          </div>

          <div className="mt-4">
            <strong>Recommendations:</strong>
            <ul className="list-disc list-inside">
              {result.recommendations?.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
