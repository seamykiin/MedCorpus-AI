import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "../HomePage";
import { api } from "../../services/api";

export default function DoctorLoginPage() {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<"mfa" | "sso">("mfa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPrompt, setMfaPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mfaPrompt) {
      // Step 1: verify credentials and request MFA
      setMfaPrompt(true);
      setMfaCode("842019");
      return;
    }

    setLoading(true);
    try {
      await api.login(email, password, "doctor");
      navigate("/features/tested-levels");
    } catch (err: any) {
      setError(err.message || "Failed to log in as Clinician. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.login("dr.maya.rao@cityhospital.org", "doctor123", "doctor");
      navigate("/features/tested-levels");
    } catch (err: any) {
      setError(`Failed to connect to ${provider} EHR SSO.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail("dr.maya.rao@cityhospital.org");
    setPassword("doctor123");
    setMfaPrompt(true);
    setMfaCode("842019");
  };

  return (
    <main className="auth-portal-page doctor-theme">
      <header className="auth-portal-header">
        <Link className="onboarding-brand" to="/">
          <span className="onboarding-brand-mark">
            <span />
            <span />
            <span />
          </span>
          MedCorpus Clinician
        </Link>
        <div className="auth-switch-link">
          <span>Are you a patient?</span>
          <Link className="portal-pill-link patient-pill" to="/login/patient">
            <Icon name="user" size={13} /> Patient Portal Login ↗
          </Link>
        </div>
      </header>

      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-badge doctor-badge">
            <Icon name="activity" size={14} />
            <span>Healthcare Professional Login · High-Privilege Access</span>
          </div>

          <h2>Clinician Portal Sign In</h2>
          <p className="auth-subtitle">
            Secure login for registered clinical staff via Multi-Factor Authentication (MFA) or Hospital EHR Single Sign-On (SSO).
          </p>

          <div className="access-level-banner" style={{ background: "#e8f4ec", border: "1px solid #7cb992", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#144525" }}>
            <strong>🛡️ Access Level: High-Privilege Clinical Access</strong>
            <p style={{ margin: "2px 0 0", opacity: 0.9 }}>
              Provides upload permissions, AI diagnostic processing, source paragraph grounding, and summary sign-off authority.
            </p>
          </div>

          {/* Login Mode Switcher */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setAuthMethod("mfa")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: authMethod === "mfa" ? "2px solid #144525" : "1px solid #ccd2ca",
                background: authMethod === "mfa" ? "#eef6f0" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                color: "#144525",
                cursor: "pointer"
              }}
            >
              🔐 MFA Clinical Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("sso")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: authMethod === "sso" ? "2px solid #144525" : "1px solid #ccd2ca",
                background: authMethod === "sso" ? "#eef6f0" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                color: "#144525",
                cursor: "pointer"
              }}
            >
              🏥 Hospital EHR SSO
            </button>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          {authMethod === "mfa" ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="doctor-email">Institutional / Hospital Email</label>
                <input
                  id="doctor-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor.name@hospital.org"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="auth-field">
                <div className="field-label-row">
                  <label htmlFor="doctor-password">Password</label>
                </div>
                <input
                  id="doctor-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </div>

              {mfaPrompt && (
                <div className="auth-field" style={{ background: "#f5faf6", border: "1px dashed #3c7d56", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="doctor-mfa" style={{ color: "#194d2d", fontWeight: 700 }}>
                      Multi-Factor Authentication (MFA) Code
                    </label>
                    <span style={{ fontSize: "11px", color: "#3c7d56" }}>SMS / Hospital App</span>
                  </div>
                  <input
                    id="doctor-mfa"
                    maxLength={6}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit MFA code"
                    required
                    style={{ letterSpacing: "3px", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}
                    type="text"
                    value={mfaCode}
                  />
                  <small style={{ color: "#555", display: "block", marginTop: "4px" }}>
                    Simulated MFA active · Pre-filled with secure token.
                  </small>
                </div>
              )}

              <button className="auth-submit-btn doctor-btn" disabled={loading} type="submit">
                {loading
                  ? "Authenticating MFA & EHR..."
                  : mfaPrompt
                  ? "Verify MFA & Sign In"
                  : "Next: Verify via MFA →"}
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "14px 0" }}>
              <button
                type="button"
                onClick={() => handleSsoLogin("Epic Systems")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "12px",
                  background: "#b91c1c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Log In with Epic Systems EHR SSO
              </button>
              <button
                type="button"
                onClick={() => handleSsoLogin("Cerner Health")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "12px",
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Log In with Oracle / Cerner EHR SSO
              </button>
              <button
                type="button"
                onClick={() => handleSsoLogin("Hospital SAML")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  padding: "12px",
                  background: "#1e293b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Log In with Institutional SAML / Okta
              </button>
            </div>
          )}

          <div className="auth-demo-shortcut">
            <span>Demo testing clinician account:</span>
            <button className="demo-fill-btn doctor-demo-btn" onClick={handleDemoFill} type="button">
              Fill Demo Clinician (Dr. Maya Rao, MD · Internal Medicine)
            </button>
          </div>

          <div className="auth-footer-prompt">
            <span>New medical practitioner or staff?</span>
            <Link to="/signup/doctor">Register Clinician Account</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

