import React, { useState } from "react";

function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !jobDescription) {
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
        setResult(null);
      } else {
        // FIXED — CORRECT NORMALIZATION
        const normalized = {
  name: data.name ?? "",
  email: data.email ?? "",
  skills: data.skills ?? data.resume_skills ?? [],
  missing_skills: Array.isArray(data.missing_skills)
    ? data.missing_skills
    : (data.missing_skills?.split?.(",") ?? []),

  recommendations: Array.isArray(data.recommendations)
    ? data.recommendations
    : (data.recommendations?.split?.(",") ?? []),

  education: Array.isArray(data.education) ? data.education : [],
  experience: Array.isArray(data.experience) ? data.experience : [],

  ats_score_100: data.ats_score_100 ?? data.ats_score ?? 0,
};


        setResult(normalized);
        setError("");
      }
    } catch (err) {
      setError("Server error: " + err.message);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">ATS Resume Analyzer</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="file"
          onChange={handleFileChange}
          className="mb-3 w-full border p-2 rounded"
        />

        <textarea
          className="w-full p-3 border mb-3 rounded"
          rows="4"
          placeholder="Paste job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Analyze Resume
        </button>
      </form>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {result && (
        <div className="mt-6 bg-gray-50 p-5 rounded-lg shadow-inner">

          {/* ATS SCORE */}
          <div className="text-center mb-5">
            <h3 className="text-xl font-semibold">ATS Score</h3>
            <p className="text-4xl font-bold text-green-600">{result.ats_score_100}%</p>
          </div>

          {/* PERSONAL INFO */}
          <div className="mb-5">
            <h3 className="text-lg font-semibold mb-2">Personal Details</h3>
            <p><b>Name:</b> {result.name}</p>
            <p><b>Email:</b> {result.email}</p>
          </div>

          {/* SKILLS */}
          <div className="mb-5">
            <h3 className="text-lg font-semibold mb-2">Skills Found</h3>
            <div className="flex flex-wrap gap-2">
              {result.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* MISSING SKILLS (FIXED → Using backend data) */}
          <div className="mb-5">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Missing Skills</h3>

            {result.missing_skills.length === 0 ? (
              <p className="text-green-700 font-medium">
                No missing skills. Good match!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.missing_skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RECOMMENDATIONS */}
          <div className="mb-5">
            <h3 className="text-lg font-semibold mb-2 text-blue-600">Recommendations</h3>

            {result.recommendations.length === 0 ? (
              <p className="text-green-700 font-medium">No recommendations.</p>
            ) : (
              <ul className="list-disc ml-6">
                {result.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default ResumeAnalyzer;
