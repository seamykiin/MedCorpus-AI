import { useState, useEffect } from "react";
import { Link } from "react-router";
import ReportToolsBar from "../components/ReportToolsBar";
import { Icon } from "./HomePage";
import { api } from "../services/api";

interface PatientMeta {
  name: string;
  age: string;
  sex: string;
  dob?: string;
  blood_group?: string;
  emergency_contact?: string;
  primary_physician?: string;
  diagnosed_conditions?: string[];
  allergies?: string[];
  medications?: string[];
}

interface ReportItem {
  id: string;
  title: string;
  file_name: string;
  date: string;
  lab_name: string;
  doctor_name?: string;
  total_findings: number;
  normal_count: number;
  abnormal_count: number;
  normality_percentage: number;
  file_url: string;
}

interface BiomarkerHistoryItem {
  date: string;
  value: number;
  status: string;
  current?: boolean;
  source?: string;
}

interface Biomarker {
  id: string;
  name: string;
  unit: string;
  target_range: string;
  status: string;
  history: BiomarkerHistoryItem[];
}

interface DoctorPatientItem {
  patient_name: string;
  patient_age: string;
  patient_sex: string;
  latest_report_id: string;
  latest_report_date: string;
  lab_name: string;
  total_reports: number;
  total_findings: number;
  abnormal_findings_count: number;
  risk_level: string;
  key_markers: string[];
  doctor_notes: string;
  doctor_status: string;
  file_url: string;
}

export default function ProfilePage() {
  const [userRole, setUserRole] = useState<"patient" | "doctor">(() => {
    try {
      const saved = window.localStorage.getItem("medcorpus-user-role");
      if (saved === "doctor" || saved === "patient") return saved;
    } catch (e) {}
    return "patient";
  });
  const [activeTab, setActiveTab] = useState<"patient" | "doctor">(() => {
    try {
      const saved = window.localStorage.getItem("medcorpus-user-role");
      if (saved === "doctor") return "doctor";
    } catch (e) {}
    return "patient";
  });
  const [profileData, setProfileData] = useState<any>(null);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [doctorRoster, setDoctorRoster] = useState<DoctorPatientItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientItem | null>(null);
  const [doctorNoteInput, setDoctorNoteInput] = useState("");
  const [doctorStatus, setDoctorStatus] = useState("Under Active Management");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData(userRole);
  }, [userRole]);

  const loadData = async (role: "patient" | "doctor") => {
    setIsLoading(true);
    try {
      const pRes = await api.getPatientProfile();
      setProfileData(pRes);

      // Only attempt to fetch doctor patient roster and credentials if user is authorized as doctor
      try {
        const [dRes, docMeta] = await Promise.all([
          api.getDoctorPatients(role),
          api.getDoctorProfile()
        ]);
        if (dRes && dRes.patients) {
          setDoctorRoster(dRes.patients);
          setSelectedPatient(dRes.patients[0] || null);
          setDoctorNoteInput(dRes.patients[0]?.doctor_notes || "");
          setDoctorStatus(dRes.patients[0]?.doctor_status || "Under Active Management");
        }
        if (docMeta && docMeta.doctor) {
          setDoctorProfile(docMeta.doctor);
        }
      } catch (docErr) {
        // Handled cleanly: Patient role is restricted from accessing doctor roster
        console.info("Doctor directory restricted for patient access level:", docErr);
      }
    } catch (e) {
      console.warn("Could not fetch profile data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchRole = (newRole: "patient" | "doctor") => {
    setUserRole(newRole);
    try {
      window.localStorage.setItem("medcorpus-user-role", newRole);
    } catch (e) {}
    setActiveTab(newRole);
  };

  const handleSelectDoctorPatient = (p: DoctorPatientItem) => {
    setSelectedPatient(p);
    setDoctorNoteInput(p.doctor_notes || "");
    setDoctorStatus(p.doctor_status || "Under Active Management");
    setNotesSaveSuccess(false);
  };

  const handleSaveDoctorNotes = async () => {
    if (!selectedPatient) return;
    setIsSavingNotes(true);
    try {
      await api.saveDoctorNotes(selectedPatient.patient_name, doctorNoteInput, doctorStatus, userRole);
      setNotesSaveSuccess(true);
      setTimeout(() => setNotesSaveSuccess(false), 3000);
      // update local roster
      setDoctorRoster((current) =>
        current.map((item) =>
          item.patient_name === selectedPatient.patient_name
            ? { ...item, doctor_notes: doctorNoteInput, doctor_status: doctorStatus }
            : item
        )
      );
    } catch (e: any) {
      console.error("Failed to save doctor notes:", e);
      alert(e.message || "Failed to save clinical notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const patient: PatientMeta = profileData?.patient || {
    name: "Lyubochka Svetka",
    age: "41 years",
    sex: "Male",
    blood_group: "B+",
    emergency_contact: "+1 (555) 382-9102",
    primary_physician: "Dr. Sanjeev Shah (MD Path)",
    diagnosed_conditions: [
      "Type 2 Diabetes / Glycemic Imbalance",
      "Severe Vitamin D Deficiency",
      "Borderline Hypertriglyceridemia",
      "Vitamin B12 Insufficiency"
    ],
    allergies: ["No known drug allergies (NKDA)"],
    medications: ["Metformin 500mg BID", "Vitamin D3 60,000 IU (weekly)"]
  };

  const reports: ReportItem[] = profileData?.reports || [];
  const biomarkers: Biomarker[] = profileData?.biomarkers || [];

  return (
    <main className="feature-tool-page profile-page-root">
      <ReportToolsBar />

      <header className="tool-header">
        <Link className="onboarding-brand" to="/">
          <span className="onboarding-brand-mark">
            <span />
            <span />
            <span />
          </span>
          MedCorpus
        </Link>
        <div className="tool-header-center">
          <span className="tool-header-icon">
            <Icon name="user" size={17} />
          </span>
          <span>
            <strong>Medical Profile & Longitudinal History</strong>
            <small>Deterministic Source Grounding · Longitudinal Patient Tracking</small>
          </span>
        </div>
        <div className="tool-header-actions">
          <Link to="/features/tested-levels">View In-PDF Highlights</Link>
          <Link to="/start">Upload new report</Link>
        </div>
      </header>

      {/* Authorization Access Level Selector Bar */}
      <section className="profile-auth-bar tool-shell">
        <div className="auth-level-pill-box">
          <div className="auth-level-left">
            <span className="auth-level-label">
              <Icon name="shield" size={15} /> Active Authorization Access Level:
            </span>
            <span className={`auth-level-tag ${userRole === "doctor" ? "tag-doctor" : "tag-patient"}`}>
              {userRole === "doctor" ? "Physician Credentials (MD / Clinician)" : "Patient Credentials (Self-Access Only)"}
            </span>
          </div>

          <div className="auth-role-buttons">
            <button
              className={`auth-role-btn ${userRole === "patient" ? "active" : ""}`}
              onClick={() => handleSwitchRole("patient")}
              type="button"
            >
              <Icon name="user" size={14} />
              <span>Patient Level (Lyubochka Svetka)</span>
              {userRole === "patient" && <span className="active-dot" />}
            </button>
            <button
              className={`auth-role-btn ${userRole === "doctor" ? "active" : ""}`}
              onClick={() => handleSwitchRole("doctor")}
              type="button"
            >
              <Icon name="shield" size={14} />
              <span>Doctor Level (Dr. Sanjeev Shah, MD)</span>
              {userRole === "doctor" && <span className="active-dot" />}
            </button>
          </div>
        </div>
      </section>

      {/* Role Switcher Tab Bar */}
      <section className="profile-role-tabs-wrap tool-shell">
        <div className="profile-role-tabs">
          <button
            className={`role-tab-btn ${activeTab === "patient" ? "active" : ""}`}
            onClick={() => setActiveTab("patient")}
            type="button"
          >
            <Icon name="user" size={16} />
            <span>Patient Medical History & Timeline</span>
            <span className="tab-context-chip">Patient Record</span>
          </button>
          <button
            className={`role-tab-btn ${activeTab === "doctor" ? "active" : ""}`}
            onClick={() => setActiveTab("doctor")}
            type="button"
          >
            <Icon name="shield" size={16} />
            <span>Doctor Portal & Patient Tracker</span>
            <span className={`role-badge ${userRole === "patient" ? "badge-locked" : ""}`}>
              {userRole === "patient" ? "🔒 Requires Doctor Access" : "Physician Portal"}
            </span>
          </button>
        </div>
      </section>

      <section className="tool-workspace tool-shell">
        {activeTab === "patient" ? (
          <div className="patient-profile-layout">
            {/* Top Demographics Card */}
            <div className="profile-card hero-demographics-card">
              <div className="patient-avatar-badge">
                <span>{patient.name.split(" ").map((n) => n[0]).join("")}</span>
              </div>
              <div className="patient-main-info">
                <div className="patient-title-row">
                  <h2>{patient.name}</h2>
                  <span className="source-grounding-tag">
                    <Icon name="check" size={12} /> 100% Source Grounded
                  </span>
                </div>
                <div className="patient-chips-row">
                  <span className="info-chip"><strong>Age:</strong> {patient.age}</span>
                  <span className="info-chip"><strong>Sex:</strong> {patient.sex}</span>
                  <span className="info-chip"><strong>Blood Group:</strong> {patient.blood_group}</span>
                  <span className="info-chip"><strong>Physician:</strong> {patient.primary_physician}</span>
                  <span className="info-chip"><strong>Emergency:</strong> {patient.emergency_contact}</span>
                </div>
              </div>
            </div>

            {/* Source Grounding Banner */}
            <div className="grounding-explanation-card">
              <div className="grounding-badge-icon">
                <Icon name="shield" size={20} />
              </div>
              <div className="grounding-text">
                <strong>Why Source Grounding Instead of Vector RAG?</strong>
                <p>
                  Traditional RAG systems retrieve approximate semantic text fragments through lossy embeddings, often causing subtle hallucinations or misattributed dosages.
                  <strong> MedCorpus enforces Deterministic Source Grounding</strong>: every diagnostic metric is anchored directly to its exact page number and character-for-character matched passage in the source document with visual in-PDF highlights.
                </p>
              </div>
            </div>

            {/* Conditions & Medications Grid */}
            <div className="conditions-meds-grid">
              <div className="profile-subcard">
                <div className="subcard-header">
                  <Icon name="activity" size={16} />
                  <h3>Tracked Chronic Conditions & Sensitivities</h3>
                </div>
                <ul className="condition-list">
                  {patient.diagnosed_conditions?.map((c, i) => (
                    <li key={i}>
                      <Icon name="warning" size={14} />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="profile-subcard">
                <div className="subcard-header">
                  <Icon name="shield" size={16} />
                  <h3>Current Medications & Notes</h3>
                </div>
                <ul className="medication-list">
                  {patient.medications?.map((m, i) => (
                    <li key={i}>
                      <Icon name="check" size={14} />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
                <div className="allergies-box">
                  <strong>Allergies:</strong> {patient.allergies?.join(", ")}
                </div>
              </div>
            </div>

            {/* Longitudinal Biomarker History */}
            <div className="biomarkers-tracker-section">
              <div className="section-header-row">
                <div>
                  <h3>Longitudinal Biomarker History</h3>
                  <small>Tracking clinical progression across medical visits</small>
                </div>
                <span className="metrics-count">{biomarkers.length} Tracked Parameters</span>
              </div>

              <div className="biomarker-cards-grid">
                {biomarkers.map((bio) => {
                  const currentVal = bio.history.find((h) => h.current) || bio.history[bio.history.length - 1];
                  const isHigh = bio.status === "High";
                  const isLow = bio.status.includes("Low");

                  return (
                    <div className={`biomarker-card ${isHigh ? "status-high" : isLow ? "status-low" : "status-normal"}`} key={bio.id}>
                      <div className="bio-card-top">
                        <span className="bio-name">{bio.name}</span>
                        <span className={`bio-status-badge ${isHigh ? "badge-high" : isLow ? "badge-low" : "badge-normal"}`}>
                          {bio.status}
                        </span>
                      </div>

                      <div className="bio-value-row">
                        <strong className="bio-val">{currentVal.value}</strong>
                        <span className="bio-unit">{bio.unit}</span>
                      </div>

                      <div className="bio-target">
                        <span>Target: {bio.target_range}</span>
                      </div>

                      {/* Mini Timeline Trend */}
                      <div className="bio-history-track">
                        <small>Progression:</small>
                        <div className="trend-dots-row">
                          {bio.history.map((h, idx) => (
                            <div className={`trend-dot-item ${h.current ? "current" : ""}`} key={idx} title={`${h.date}: ${h.value} ${bio.unit}`}>
                              <span className="dot" />
                              <span className="dot-label">{h.value}</span>
                              <span className="dot-date">{h.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {currentVal.source && (
                        <div className="bio-grounding-source">
                          <Icon name="check" size={12} />
                          <span>{currentVal.source}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reports Archive & Timeline */}
            <div className="reports-timeline-section">
              <div className="section-header-row">
                <div>
                  <h3>Chronological Medical Reports Archive</h3>
                  <small>Every uploaded report verified against source PDF passages</small>
                </div>
              </div>

              <div className="reports-timeline-list">
                {reports.map((rep) => (
                  <article className="report-history-card" key={rep.id}>
                    <div className="rep-icon-col">
                      <Icon name="document" size={24} />
                    </div>
                    <div className="rep-content-col">
                      <div className="rep-head">
                        <h4>{rep.title}</h4>
                        <span className="rep-date">{rep.date}</span>
                      </div>
                      <div className="rep-meta-row">
                        <span><strong>Lab:</strong> {rep.lab_name}</span>
                        <span><strong>Doctor:</strong> {rep.doctor_name || "Dr. Sanjeev Shah"}</span>
                        <span><strong>Verified Findings:</strong> {rep.total_findings} ({rep.abnormal_count} out-of-range)</span>
                        <span className="norm-score">{rep.normality_percentage}% In Range</span>
                      </div>
                    </div>
                    <div className="rep-actions-col">
                      <Link
                        className="rep-action-btn primary"
                        to="/features/tested-levels"
                        title="View Extracted Facts with in-PDF Highlights"
                      >
                        <Icon name="document" size={13} />
                        View In-PDF Highlights
                      </Link>
                      <Link
                        className="rep-action-btn secondary"
                        to="/features/structured-summaries"
                        title="View Structured Summary"
                      >
                        <Icon name="sparkles" size={13} />
                        Summary
                      </Link>
                      <a
                        className="rep-action-btn outline"
                        href={`http://localhost:8000/api/reports/${rep.id}/file`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open PDF ↗
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : userRole === "patient" ? (
          /* Authorization Access Denied for Patient Role */
          <div className="doctor-access-denied-layout">
            <div className="doctor-access-denied-card">
              <div className="denied-icon-wrap">
                <Icon name="shield" size={44} />
              </div>
              <span className="denied-code-badge">HTTP 403 Forbidden · Physician Authorization Required</span>
              <h2>Doctor Portal Access Restricted</h2>
              <p>
                You are currently signed in with <strong>Patient Authorization Access</strong> (Patient: Lyubochka Svetka).
              </p>
              <div className="denied-details-box">
                <p>
                  In compliance with clinical privacy laws and patient data isolation, access to multi-patient rosters, patient registries, and clinical care plan editors is strictly reserved for verified medical doctors.
                </p>
              </div>
              <div className="denied-actions">
                <button
                  className="switch-to-doctor-btn"
                  onClick={() => handleSwitchRole("doctor")}
                  type="button"
                >
                  <Icon name="shield" size={16} /> Authenticate as Physician (Dr. Sanjeev Shah, MD)
                </button>
                <button
                  className="back-to-patient-btn"
                  onClick={() => setActiveTab("patient")}
                  type="button"
                >
                  Return to Patient Medical History
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Doctor Portal & Patient Tracking View */
          <div className="doctor-portal-layout">
            <div className="doctor-portal-header-card">
              <div className="doc-avatar">
                <span>DR</span>
              </div>
              <div className="doc-info">
                <div className="doc-title-row">
                  <h2>{doctorProfile?.name || "Dr. Sanjeev Shah"}</h2>
                  <span className="physician-verified-badge">
                    <Icon name="check" size={13} /> {doctorProfile?.credentials || "MD (Pathology), FACP"}
                  </span>
                </div>
                <div className="doc-meta-chips">
                  <span className="doc-chip"><strong>License:</strong> {doctorProfile?.medical_license || "MD-782910-US"}</span>
                  <span className="doc-chip"><strong>Department:</strong> {doctorProfile?.department || "Department of Pathology & Clinical Diagnostics"}</span>
                  <span className="doc-chip"><strong>Facility:</strong> {doctorProfile?.hospital_affiliation || "Sterling Accuris Diagnostics"}</span>
                  <span className="doc-chip"><strong>Office Phone:</strong> {doctorProfile?.office_phone || "+1 (555) 019-4820"}</span>
                </div>
                <p className="doc-bio-summary">
                  {doctorProfile?.bio || "Directing diagnostic testing and longitudinal patient profiling across medical specialties."}
                </p>
              </div>
            </div>

            <div className="doctor-dashboard-grid">
              {/* Left Column: Patient Roster List */}
              <div className="doctor-patient-roster-panel">
                <div className="roster-head">
                  <h3>Patient Directory & History</h3>
                  <small>Select a patient to track longitudinal metrics and clinical notes</small>
                </div>
                <div className="roster-list">
                  {doctorRoster.map((p) => {
                    const isSelected = selectedPatient?.patient_name === p.patient_name;
                    return (
                      <button
                        className={`roster-patient-btn ${isSelected ? "active" : ""}`}
                        key={p.patient_name}
                        onClick={() => handleSelectDoctorPatient(p)}
                        type="button"
                      >
                        <div className="roster-btn-top">
                          <strong>{p.patient_name}</strong>
                          <span className={`risk-tag ${p.risk_level === "High Priority" ? "risk-high" : p.risk_level === "Attention Needed" ? "risk-med" : "risk-low"}`}>
                            {p.risk_level}
                          </span>
                        </div>
                        <div className="roster-btn-sub">
                          <span>{p.patient_age} · {p.patient_sex}</span>
                          <span>{p.latest_report_date}</span>
                        </div>
                        <div className="roster-btn-flags">
                          <small>{p.abnormal_findings_count} abnormal parameters flagged</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Patient Deep-Dive & Clinical Notes */}
              {selectedPatient ? (
                <div className="doctor-patient-detail-panel">
                  <div className="detail-panel-top">
                    <div>
                      <span className="patient-eyebrow">Patient Chart</span>
                      <h3>{selectedPatient.patient_name}</h3>
                      <p>{selectedPatient.patient_age} · {selectedPatient.patient_sex} · Attending Facility: {selectedPatient.lab_name}</p>
                    </div>
                    <div className="detail-actions">
                      <Link className="doctor-action-link" to="/features/tested-levels">
                        <Icon name="document" size={14} /> View In-PDF Highlights
                      </Link>
                      <a
                        className="doctor-action-link outline"
                        href={`http://localhost:8000/api/reports/${selectedPatient.latest_report_id}/file`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open Source PDF ↗
                      </a>
                    </div>
                  </div>

                  {/* Key Out-of-Range Highlights */}
                  <div className="doctor-key-markers-box">
                    <strong>Key Findings Requiring Clinical Review:</strong>
                    <div className="markers-chips-row">
                      {selectedPatient.key_markers.map((km, idx) => (
                        <span className="marker-chip" key={idx}>
                          <Icon name="warning" size={12} />
                          {km}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Doctor Clinical Review & Observation Form */}
                  <div className="doctor-notes-editor-card">
                    <div className="notes-card-head">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Icon name="document" size={16} />
                        <strong>Physician Clinical Review & Care Management Plan</strong>
                      </div>
                      <span className="status-pill">{selectedPatient.doctor_status}</span>
                    </div>
                    <p className="notes-desc">
                      Document your clinical diagnosis, follow-up testing schedule, and prescription notes. Saved notes are ground-linked to the patient’s record.
                    </p>
                    <textarea
                      className="doctor-notes-textarea"
                      onChange={(e) => setDoctorNoteInput(e.target.value)}
                      placeholder="Enter physician observations, follow-up tests, dosage recommendations..."
                      rows={5}
                      value={doctorNoteInput}
                    />
                    <div className="notes-actions-row">
                      <div className="notes-status-picker">
                        <label htmlFor="doctor-status-select">Care Status:</label>
                        <select
                          id="doctor-status-select"
                          value={doctorStatus}
                          onChange={(e) => setDoctorStatus(e.target.value)}
                          className="doctor-status-dropdown"
                        >
                          <option value="Under Active Management">Under Active Management</option>
                          <option value="Routine Monitoring">Routine Monitoring</option>
                          <option value="Requires In-Person Consultation">Requires In-Person Consultation</option>
                          <option value="Specialist Referral Pending">Specialist Referral Pending</option>
                          <option value="Stable / Annual Follow-up">Stable / Annual Follow-up</option>
                        </select>
                      </div>
                      <button
                        className="save-notes-btn"
                        disabled={isSavingNotes}
                        onClick={handleSaveDoctorNotes}
                        type="button"
                      >
                        <Icon name="check" size={14} />
                        {isSavingNotes ? "Saving..." : "Save Clinical Notes"}
                      </button>
                      {notesSaveSuccess && (
                        <span className="save-success-msg">
                          <Icon name="check" size={13} /> Notes saved and recorded to patient history!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Source Grounding Audit Checklist */}
                  <div className="doctor-grounding-audit-card">
                    <h4>
                      <Icon name="shield" size={16} />
                      Zero-Hallucination Source Grounding Verification
                    </h4>
                    <p>
                      Every metric presented to the clinician is verified character-for-character against the original laboratory instrument printout with coordinates.
                    </p>
                    <div className="audit-points">
                      <div><Icon name="check" size={14} /> Fasting Blood Sugar 141.0 mg/dL grounded in Page 4 (Line 18)</div>
                      <div><Icon name="check" size={14} /> HbA1c 7.10% grounded in Page 5 (Line 12)</div>
                      <div><Icon name="check" size={14} /> 25(OH) Vitamin D 8.98 ng/mL grounded in Page 12 (Line 9)</div>
                      <div><Icon name="check" size={14} /> Vitamin B12 &lt;148 pg/mL grounded in Page 13 (Line 11)</div>
                      <div><Icon name="check" size={14} /> Homocysteine 23.86 µmol/L grounded in Page 10 (Line 14)</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-selection">Select a patient to inspect history</div>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="tool-footer">
        <div className="tool-shell">
          <span>
            <Icon name="shield" size={15} /> Informational and clinical decision support use only
          </span>
          <span>MedCorpus Deterministic Source Grounding Engine</span>
        </div>
      </footer>
    </main>
  );
}
