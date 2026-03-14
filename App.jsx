import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";          // ATS page
import HomePage from "./pages/HomePage";  // Landing page
import Register from "./pages/Register";  // later you'll add this
import Login from "./pages/Login";
import ResumePage from "./pages/ResumePage";
import Dashboard from "./pages/Dashboard";
import ResumeUpload from "./pages/ResumeUpload";
import ResultsPage from "./pages/ResultsPage";
import DomainSelect from "./pages/DomainSelect";
import InterviewTypeSelect from "./pages/InterviewTypeSelect";
import InterviewPage from "./pages/InterviewPage";
import Result from "./pages/Result";


function App() {
  return (
    <Router>
      <Routes>

        {/* Landing Page */}
        <Route path="/" element={<HomePage />} />

        {/* ATS Analyzer Page */}
        <Route path="/home" element={<Home />} />

        {/* Register Page */}
        <Route path="/register" element={<Register />} />

        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/resume-upload" element={<ResumeUpload />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/domain" element={<DomainSelect />} />
        <Route path="/interview-type-select" element={<InterviewTypeSelect />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/result" element={<Result />} />

      </Routes>
    </Router>
  );
}

export default App;