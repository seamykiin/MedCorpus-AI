import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "../HomePage";
import { api } from "../../services/api";

export default function PatientSignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+1 (555) 234-8901");
  const [patientMrn, setPatientMrn] = useState("MRN-94812");
  const [verificationMethod, setVerificationMethod] = useState<"invite" | "otp">("invite");
  const [phoneOtp, setPhoneOtp] = useState("492018");
  const [age, setAge] = useState<number | "">("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.signup({
        name,
        email,
        password,
        role: "patient",
        age: age ? Number(age) : undefined,
        blood_group: bloodGroup || undefined,
      });
      navigate("/features/tested-levels");
    } catch (err: any) {
      setError(err.message || "Failed to create patient account.");
    } finally {
      setLoading(false);
    }
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
          <span>Clinician registering?</span>
          <Link className="portal-pill-link doctor-pill" to="/signup/doctor">
            <Icon name="activity" size={13} /> Doctor Portal Registration ↗
          </Link>
        </div>
      </header>

      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-badge patient-badge">
            <Icon name="user" size={14} />
            <span>Patient Portal · Individual Health Record Owner</span>
          </div>

          <h2>Patient Onboarding & Registration</h2>
          <p className="auth-subtitle">
            Self-signup or claim your account using an invite link after your hospital visit with verified identity mapping.
          </p>

          <div className="access-level-banner" style={{ background: "#f0f4f8", border: "1px solid #94b8db", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "#1d4ed8" }}>
            <strong>🔒 Access Level: Read-Only Personal Medical History</strong>
            <p style={{ margin: "2px 0 0", color: "#334155" }}>
              Secure read-only access restricted strictly to your own diagnostic history, plain-language summaries, and grounded Q&A.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setVerificationMethod("invite")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: verificationMethod === "invite" ? "2px solid #2563eb" : "1px solid #ccd2ca",
                background: verificationMethod === "invite" ? "#eff6ff" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                color: "#1e40af",
                cursor: "pointer"
              }}
            >
              ✉️ Post-Visit Hospital Invite Link
            </button>
            <button
              type="button"
              onClick={() => setVerificationMethod("otp")}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: verificationMethod === "otp" ? "2px solid #2563eb" : "1px solid #ccd2ca",
                background: verificationMethod === "otp" ? "#eff6ff" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                color: "#1e40af",
                cursor: "pointer"
              }}
            >
              📱 Mobile Phone OTP Verification
            </button>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="patient-name">Patient Full Name</label>
              <input
                id="patient-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Smith"
                required
                type="text"
                value={name}
              />
            </div>

            <div className="auth-field-grid">
              <div className="auth-field">
                <label htmlFor="patient-email">Email Address</label>
                <input
                  id="patient-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.smith@example.com"
                  required
                  type="email"
                  value={email}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="patient-phone">Mobile Phone</label>
                <input
                  id="patient-phone"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                  value={phone}
                />
              </div>
            </div>

            {verificationMethod === "invite" ? (
              <div className="auth-field" style={{ background: "#f8fafc", border: "1px dashed #94a3b8", padding: "10px", borderRadius: "6px" }}>
                <label htmlFor="patient-mrn" style={{ color: "#334155", fontWeight: 600 }}>
                  Hospital Patient ID / MRN Mapping (from Discharge / Visit Slip)
                </label>
                <input
                  id="patient-mrn"
                  onChange={(e) => setPatientMrn(e.target.value)}
                  placeholder="e.g. MRN-94812"
                  type="text"
                  value={patientMrn}
                />
                <small style={{ color: "#64748b", display: "block", marginTop: "3px" }}>
                  Maps your verified electronic patient record securely from the hospital visit.
                </small>
              </div>
            ) : (
              <div className="auth-field" style={{ background: "#f8fafc", border: "1px dashed #94a3b8", padding: "10px", borderRadius: "6px" }}>
                <label htmlFor="patient-otp" style={{ color: "#334155", fontWeight: 600 }}>
                  Identity Verification Code (SMS OTP)
                </label>
                <input
                  id="patient-otp"
                  maxLength={6}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP sent to mobile"
                  style={{ letterSpacing: "3px", textAlign: "center", fontWeight: "bold" }}
                  type="text"
                  value={phoneOtp}
                />
                <small style={{ color: "#64748b", display: "block", marginTop: "3px" }}>
                  Pre-filled with simulated verification code.
                </small>
              </div>
            )}

            <div className="auth-field-grid">
              <div className="auth-field">
                <label htmlFor="patient-age">Age (Optional)</label>
                <input
                  id="patient-age"
                  min="1"
                  max="120"
                  onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                  placeholder="34"
                  type="number"
                  value={age}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="patient-blood">Blood Group (Optional)</label>
                <select
                  id="patient-blood"
                  onChange={(e) => setBloodGroup(e.target.value)}
                  value={bloodGroup}
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="patient-password">Portal Password (min 6 characters)</label>
              <input
                id="patient-password"
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
              />
            </div>

            <button className="auth-submit-btn patient-btn" disabled={loading} type="submit">
              {loading ? "Verifying & Creating..." : "Register Personal Health Account"}
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>Already have an account?</span>
            <Link to="/login/patient">Sign In via OTP or Password</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

