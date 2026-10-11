import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "../HomePage";
import { api } from "../../services/api";

export default function PatientLoginPage() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError("Please enter your email or mobile phone number.");
      return;
    }
    setError(null);
    setOtpSent(true);
    setOtpCode("582910");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const email = identifier.includes("@") ? identifier : "alex.smith@example.com";
      await api.login(email, "patient123", "patient");
      navigate("/features/tested-levels");
    } catch (err: any) {
      setError(err.message || "Failed to verify one-time code. Please check your input.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login(identifier, password, "patient");
      navigate("/features/tested-levels");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setIdentifier("alex.smith@example.com");
    setPassword("password123");
    setOtpSent(true);
    setOtpCode("582910");
  };

  return (
    <main className="auth-portal-page">
      <header className="auth-portal-header">
        <Link className="onboarding-brand" to="/">
          <span className="onboarding-brand-mark">
            <span />
            <span />
            <span />
          </span>
          MedCorpus Patient
        </Link>
        <div className="auth-switch-link">
          <span>Are you a clinician?</span>
          <Link className="portal-pill-link doctor-pill" to="/login/doctor">
            <Icon name="activity" size={13} /> Doctor Portal Login ↗
          </Link>
        </div>
      </header>

      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-badge patient-badge">
            <Icon name="user" size={14} />
            <span>Patient Portal · Read-Only Access</span>
          </div>

          <h2>Patient Portal Sign In</h2>
          <p className="auth-subtitle">
            Secure login via passwordless OTP (SMS/Email) or passkeys to access your simplified report summaries and source documents.
          </p>

          <div className="access-level-banner" style={{ background: "#f0f4f8", border: "1px solid #94b8db", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#1d4ed8" }}>
            <strong>🔒 Access Level: Read-Only Medical History</strong>
            <p style={{ margin: "2px 0 0", color: "#334155" }}>
              Private access strictly to your own diagnostic history. Clinical values are verified and locked by healthcare professionals.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setLoginMethod("otp")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: loginMethod === "otp" ? "2px solid #2563eb" : "1px solid #ccd2ca",
                background: loginMethod === "otp" ? "#eff6ff" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                color: "#1e40af",
                cursor: "pointer"
              }}
            >
              📲 Passwordless OTP (SMS/Email)
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("password")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: loginMethod === "password" ? "2px solid #2563eb" : "1px solid #ccd2ca",
                background: loginMethod === "password" ? "#eff6ff" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                color: "#1e40af",
                cursor: "pointer"
              }}
            >
              🔑 Password / Passkeys
            </button>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          {loginMethod === "otp" ? (
            !otpSent ? (
              <form className="auth-form" onSubmit={handleSendOtp}>
                <div className="auth-field">
                  <label htmlFor="patient-id-input">Mobile Phone Number or Email</label>
                  <input
                    id="patient-id-input"
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@example.com or +1 (555) 000-0000"
                    required
                    type="text"
                    value={identifier}
                  />
                </div>
                <button className="auth-submit-btn patient-btn" type="submit">
                  Send One-Time Passcode (OTP) →
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <div className="auth-field" style={{ background: "#f8fafc", border: "1px dashed #2563eb", padding: "12px", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="patient-otp-input" style={{ color: "#1e40af", fontWeight: 700 }}>
                      6-Digit Security Passcode
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      style={{ background: "none", border: "none", color: "#2563eb", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Change {identifier}
                    </button>
                  </div>
                  <input
                    id="patient-otp-input"
                    maxLength={6}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    style={{ letterSpacing: "4px", fontSize: "18px", fontWeight: "bold", textAlign: "center", marginTop: "6px" }}
                    type="text"
                    value={otpCode}
                  />
                  <small style={{ color: "#64748b", display: "block", marginTop: "4px" }}>
                    Simulated OTP sent to {identifier || "your mobile/email"} · Pre-filled for demo.
                  </small>
                </div>
                <button className="auth-submit-btn patient-btn" disabled={loading} type="submit">
                  {loading ? "Authenticating Passcode..." : "Sign in to Patient Portal"}
                </button>
              </form>
            )
          ) : (
            <form className="auth-form" onSubmit={handlePasswordSubmit}>
              <div className="auth-field">
                <label htmlFor="patient-email">Email Address</label>
                <input
                  id="patient-email"
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={identifier}
                />
              </div>

              <div className="auth-field">
                <div className="field-label-row">
                  <label htmlFor="patient-password">Password</label>
                </div>
                <input
                  id="patient-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </div>

              <button className="auth-submit-btn patient-btn" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Sign in as Patient"}
              </button>
            </form>
          )}

          <div className="auth-demo-shortcut">
            <span>Demo testing patient account:</span>
            <button className="demo-fill-btn" onClick={handleDemoFill} type="button">
              Fill Demo Patient (Alex Smith · Verified Patient)
            </button>
          </div>

          <div className="auth-footer-prompt">
            <span>Don't have a patient account yet?</span>
            <Link to="/signup/patient">Register via SMS/Email Invite</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

