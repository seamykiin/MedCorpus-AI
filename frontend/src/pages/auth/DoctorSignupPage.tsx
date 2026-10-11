import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Icon } from "../HomePage";
import { api } from "../../services/api";

export default function DoctorSignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicalRole, setClinicalRole] = useState("Doctor / Physician");
  const [specialty, setSpecialty] = useState("Internal Medicine");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hospital, setHospital] = useState("");
  const [onboardingType, setOnboardingType] = useState<"self" | "admin_invite">("self");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.signup({
        name: `${name} (${clinicalRole})`,
        email,
        password,
        role: "doctor",
        specialty: `${clinicalRole} - ${specialty}`,
        license_number: licenseNumber || undefined,
        hospital_affiliation: hospital || undefined,
      });
      navigate("/features/tested-levels");
    } catch (err: any) {
      setError(err.message || "Failed to register clinician account.");
    } finally {
      setLoading(false);
    }
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
          <Link className="portal-pill-link patient-pill" to="/signup/patient">
            <Icon name="user" size={13} /> Patient Portal Registration ↗
          </Link>
        </div>
      </header>

      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-badge doctor-badge">
            <Icon name="activity" size={14} />
            <span>Healthcare Professional Registration · High-Privilege Clinical Access</span>
          </div>

          <h2>Healthcare Professional Onboarding</h2>
          <p className="auth-subtitle">
            For registered clinical staff (Doctors, Nurses, Radiologists). Self-register using institutional credentials or system administrator invite token.
          </p>

          <div className="access-level-banner" style={{ background: "#e8f4ec", border: "1px solid #7cb992", borderRadius: "8px", padding: "10px 14px", marginBottom: "18px", fontSize: "13px", color: "#144525" }}>
            <strong>🛡️ Access Level: High-Privilege Clinical Access</strong>
            <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.9 }}>
              Grants clinical authority to trigger AI extraction, inspect character-grounded PDF source passages, perform findings overrides, and sign off on official EHR summaries.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={() => setOnboardingType("self")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: onboardingType === "self" ? "2px solid #144525" : "1px solid #ccd2ca",
                background: onboardingType === "self" ? "#eef6f0" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
                color: "#144525"
              }}
            >
              Institutional Self-Registration
            </button>
            <button
              type="button"
              onClick={() => {
                setOnboardingType("admin_invite");
                setInviteCode("HOSP-SYSADMIN-AUTH-2025");
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: onboardingType === "admin_invite" ? "2px solid #144525" : "1px solid #ccd2ca",
                background: onboardingType === "admin_invite" ? "#eef6f0" : "#ffffff",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
                color: "#144525"
              }}
            >
              System Admin Invite Token
            </button>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-grid">
              <div className="auth-field">
                <label htmlFor="clinical-role">Clinical Staff Role</label>
                <select
                  id="clinical-role"
                  onChange={(e) => setClinicalRole(e.target.value)}
                  value={clinicalRole}
                >
                  <option value="Doctor / Physician">Doctor / Physician</option>
                  <option value="Registered Nurse / NP">Registered Nurse (RN / NP)</option>
                  <option value="Radiologist">Radiologist</option>
                  <option value="Clinical Pathologist">Clinical Pathologist</option>
                </select>
              </div>

              <div className="auth-field">
                <label htmlFor="doc-specialty">Medical Specialty / Department</label>
                <select
                  id="doc-specialty"
                  onChange={(e) => setSpecialty(e.target.value)}
                  value={specialty}
                >
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Diagnostic Radiology">Diagnostic Radiology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Hematology / Oncology">Hematology / Oncology</option>
                  <option value="Endocrinology">Endocrinology</option>
                  <option value="Clinical Pathology">Clinical Pathology</option>
                  <option value="Critical Care / ICU">Critical Care / ICU</option>
                </select>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="doc-name">Full Clinical Name & Title</label>
              <input
                id="doc-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Maya Rao, MD / Nurse Sarah Jenkins, RN"
                required
                type="text"
                value={name}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="doc-email">Institutional Hospital Email</label>
              <input
                id="doc-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clinical.staff@hospital.org"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="auth-field-grid">
              <div className="auth-field">
                <label htmlFor="doc-license">License / Registration Number</label>
                <input
                  id="doc-license"
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MED-84920 / NPI-10492"
                  required
                  type="text"
                  value={licenseNumber}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="doc-hospital">Hospital / Health System</label>
                <input
                  id="doc-hospital"
                  onChange={(e) => setHospital(e.target.value)}
                  placeholder="City General Hospital"
                  required
                  type="text"
                  value={hospital}
                />
              </div>
            </div>

            {onboardingType === "admin_invite" && (
              <div className="auth-field">
                <label htmlFor="doc-invite">System Admin Invite Token</label>
                <input
                  id="doc-invite"
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="HOSP-SYSADMIN-AUTH-XXXX"
                  type="text"
                  value={inviteCode}
                />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="doc-password">Institutional Password (min 6 characters)</label>
              <input
                id="doc-password"
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
              />
            </div>

            <button className="auth-submit-btn doctor-btn" disabled={loading} type="submit">
              {loading ? "Authenticating Clinician..." : "Register Clinical Staff Account"}
            </button>
          </form>

          <div className="auth-footer-prompt">
            <span>Already registered as clinical staff?</span>
            <Link to="/login/doctor">Sign In via MFA or EHR SSO</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
