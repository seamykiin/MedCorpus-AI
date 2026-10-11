import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Icon, type IconName } from "../pages/HomePage";
import { api, type LLMStatusResponse } from "../services/api";
import AIEngineModal from "./AIEngineModal";

const reportTools: Array<{ label: string; path: string; icon: IconName }> = [
  { label: "Home", path: "/", icon: "home" },
  { label: "Tested levels", path: "/features/tested-levels", icon: "document" },
  {
    label: "Structured summary",
    path: "/features/structured-summaries",
    icon: "sparkles",
  },
  { label: "Voice assistant", path: "/features/voice-assistant", icon: "mic" },
  { label: "Uncertainty flags", path: "/features/uncertainty-flags", icon: "warning" },
  { label: "Mini Doctor Box", path: "/features/mini-doctor-box", icon: "shield" },
];

export default function ReportToolsBar() {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LLMStatusResponse | null>(null);
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());

  useEffect(() => {
    loadStatus();
    setCurrentUser(api.getCurrentUser());
  }, [location.pathname]);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const loadStatus = async () => {
    try {
      const res = await api.getLLMStatus();
      setLlmStatus(res);
    } catch (e) {
      // Backend may be starting
    }
  };

  const getProviderLabel = () => {
    if (!llmStatus) return "AI Engine";
    if (llmStatus.active_provider === "gemini") {
      return llmStatus.is_configured ? "✨ Gemini 1.5 Flash" : "✨ Gemini (API Key)";
    }
    if (llmStatus.active_provider === "local") {
      return "💻 Local (medcorpus-local)";
    }
    if (llmStatus.active_provider === "groq") {
      return "⚡ Groq Cloud API";
    }
    return `🤖 ${llmStatus.active_provider.toUpperCase()}`;
  };

  return (
    <>
      <nav className="report-feature-nav shared-tools-bar" aria-label="Report tools">
        <span>Report tools</span>
        <div>
          {reportTools.map((tool) => (
            <Link
              className={location.pathname === tool.path ? "active" : ""}
              key={tool.path}
              to={tool.path}
            >
              <Icon name={tool.icon} size={14} />
              {tool.label}
            </Link>
          ))}
        </div>
        <div className="report-tools-right">
          {currentUser ? (
            <div className="nav-user-badge">
              <span className={`user-role-pill ${currentUser.role === "doctor" ? "pill-doctor" : "pill-patient"}`}>
                {currentUser.role === "doctor" ? "🩺" : "👤"} {currentUser.name || currentUser.email.split("@")[0]} ({currentUser.role})
              </span>
              <button className="nav-logout-btn" onClick={handleLogout} title="Sign out" type="button">
                Log Out
              </button>
            </div>
          ) : (
            <div className="nav-auth-links">
              <Link className="nav-auth-link patient-nav-link" to="/login/patient">
                Patient Login
              </Link>
              <Link className="nav-auth-link doctor-nav-link" to="/login/doctor">
                Doctor Portal
              </Link>
            </div>
          )}

          <button
            type="button"
            className="ai-engine-nav-btn"
            onClick={() => setIsModalOpen(true)}
            title="Configure LLM API or Local Model"
          >
            <span className="ai-engine-indicator-dot" />
            <span className="ai-engine-name">{getProviderLabel()}</span>
            <span className="ai-engine-settings-badge">Config</span>
          </button>
        </div>
      </nav>

      <AIEngineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={(newStatus) => setLlmStatus(newStatus)}
      />
    </>
  );
}
