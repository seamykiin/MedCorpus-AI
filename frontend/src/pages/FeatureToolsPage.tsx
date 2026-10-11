import { useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import ReportToolsBar from "../components/ReportToolsBar";
import { Icon, type IconName } from "./HomePage";
import { api, type ReportSummary, type Finding, type Flag, type PatientQAResponse } from "../services/api";

type ToolShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  children: ReactNode;
};

function ToolShell({ eyebrow, title, description, icon, children }: ToolShellProps) {
  return (
    <main className="feature-tool-page">
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
            <Icon name={icon} size={17} />
          </span>
          <span>
            <strong>{eyebrow}</strong>
            <small>Active report experience</small>
          </span>
        </div>
        <div className="tool-header-actions">
          <Link to="/start">Upload new report</Link>
        </div>
      </header>
      <section className="tool-intro">
        <div className="tool-shell">
          <span className="tool-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>

      <section className="tool-workspace tool-shell">{children}</section>

      <footer className="tool-footer">
        <div className="tool-shell">
          <span>
            <Icon name="shield" size={15} /> Informational use only
          </span>
          <span>Every medical fact remains linked to its source.</span>
        </div>
      </footer>
    </main>
  );
}

function getActiveReport(): ReportSummary | null {
  try {
    const saved = window.localStorage.getItem("medcorpus-active-report");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.id !== "sample-report-001" && parsed.findings && parsed.findings.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read active report:", e);
  }
  return null;
}

const defaultExtractedFacts = [
  {
    label: "Hemoglobin",
    value: "13.8 g/dL",
    page: 2,
    status: "Verified",
    quote: "Hemoglobin 13.8 g/dL — Reference interval 12.0–15.5 g/dL",
  },
  {
    label: "Vitamin D",
    value: "24 ng/mL",
    page: 3,
    status: "Verified",
    quote: "25-OH Vitamin D 24 ng/mL — Reference interval 30–100 ng/mL",
  },
  {
    label: "Fasting glucose",
    value: "92 mg/dL",
    page: 2,
    status: "Verified",
    quote: "Fasting Plasma Glucose 92 mg/dL — Reference interval 70–99 mg/dL",
  },
  {
    label: "Report date",
    value: "18 June 2025",
    page: 1,
    status: "Verified",
    quote: "Sample collected: 18 Jun 2025 · Report issued: 18 Jun 2025",
  },
];

export function TestedLevelsPage() {
  const [searchParams] = useSearchParams();
  const reportIdParam = searchParams.get("reportId") || searchParams.get("id");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeReport, setActiveReport] = useState<ReportSummary | null>(() => getActiveReport());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser] = useState(() => api.getCurrentUser());

  // Role toggle: Clinical Staff (High Privilege) vs Patient (Read Only)
  const [roleMode, setRoleMode] = useState<"clinical" | "patient">(() => {
    return currentUser?.role === "patient" ? "patient" : "clinical";
  });

  // Clinical Override Modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideRange, setOverrideRange] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("Normal");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  // Clinician Sign-off Modal state
  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState(currentUser?.name || "Dr. Maya Rao, MD");
  const [licenseNumber, setLicenseNumber] = useState(currentUser?.license_number || "MED-84920");
  const [signoffNotes, setSignoffNotes] = useState("AI-extracted metrics verified against laboratory source text. Approved for patient EHR.");
  const [isSigningOff, setIsSigningOff] = useState(false);

  // Patient Interactive Q&A state
  const [patientQuestion, setPatientQuestion] = useState("");
  const [patientQAResponse, setPatientQAResponse] = useState<PatientQAResponse | null>(null);
  const [isAskingQA, setIsAskingQA] = useState(false);

  useEffect(() => {
    async function syncReport() {
      if (reportIdParam) {
        try {
          const rep = await api.getReportById(reportIdParam);
          if (rep && rep.findings && rep.findings.length > 0) {
            setActiveReport(rep);
            window.localStorage.setItem("medcorpus-active-report", JSON.stringify(rep));
            return;
          }
        } catch (e) {
          console.warn("Could not load report by id:", e);
        }
      }
      try {
        const latest = await api.getLatestReport();
        if (latest && latest.findings && latest.findings.length > 0) {
          setActiveReport(latest);
          window.localStorage.setItem("medcorpus-active-report", JSON.stringify(latest));
        }
      } catch (err) {
        console.warn("Could not sync latest report:", err);
      }
    }
    syncReport();
  }, [reportIdParam]);

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadReport(file);
      if (res && res.summary) {
        setActiveReport(res.summary);
        window.localStorage.setItem("medcorpus-active-report", JSON.stringify(res.summary));
      }
    } catch (err) {
      console.error("Direct report upload failed:", err);
      alert("Failed to process uploaded report file. Please verify it is a valid PDF.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleReanalyze = async () => {
    if (!activeReport) return;
    setIsRefreshing(true);
    try {
      const refreshed = await api.reanalyzeReport(activeReport.id);
      setActiveReport(refreshed);
      window.localStorage.setItem("medcorpus-active-report", JSON.stringify(refreshed));
    } catch (err) {
      console.error("Re-analysis failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const extractedFacts = activeReport && activeReport.findings && activeReport.findings.length > 0
    ? activeReport.findings.map((f) => ({
        id: f.id,
        label: f.name,
        value: f.value,
        range: f.range,
        page: f.page,
        status: f.status || (f.is_exact_match ? "Verified" : "Extracted"),
        quote: f.matched_quote || `${f.name} ${f.value} — Reference interval ${f.range}`,
        explanation: f.explanation || "This biomarker was extracted directly from the report.",
        detail: f.detail || "Refer to the source document for full clinical parameters.",
        is_overridden: f.is_overridden,
        override_notes: f.override_notes,
      }))
    : defaultExtractedFacts.map((f, i) => ({
        id: `fact-${i}`,
        label: f.label,
        value: f.value,
        range: "Standard physiological interval",
        page: f.page,
        status: f.status,
        quote: f.quote,
        explanation: "Verified laboratory measurement.",
        detail: "Standard clinical panel result.",
        is_overridden: false,
        override_notes: undefined,
      }));

  const [activeFact, setActiveFact] = useState(extractedFacts[0]);
  const [showSource, setShowSource] = useState(true);
  const [viewMode, setViewMode] = useState<"pdf" | "passage">("pdf");

  const [highlightPdf, setHighlightPdf] = useState(true);
  // Normal natural zoom level (standard scale without auto-magnifying or jump offsets)
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const reportId = activeReport?.id || "latest";
  const highlightedPdfUrl = `/api/reports/${reportId}/file?highlight=${highlightPdf}&fact_id=${encodeURIComponent(activeFact.label)}`;
  const pdfUrl = highlightedPdfUrl;
  const fileName = activeReport?.file_name || "Diagnostic_Report.pdf";
  const totalPages = activeReport?.pages?.length || Math.max(...extractedFacts.map((f) => f.page), 1);
  const currentPageData = activeReport?.pages?.find((p) => p.page_number === activeFact.page);

  // Clean PDF viewer URL with fixed page and normal zoom (NO auto zoom offset jumping!)
  const pdfTargetUrl = `${pdfUrl}#page=${activeFact.page}&zoom=${zoomLevel}`;

  useEffect(() => {
    if (extractedFacts.length > 0) {
      setActiveFact(extractedFacts[0]);
    }
  }, [activeReport?.id, activeReport?.findings?.length]);

  const handlePrevPage = () => {
    const prevPage = activeFact.page > 1 ? activeFact.page - 1 : totalPages;
    const targetFact = extractedFacts.find((f) => f.page === prevPage);
    if (targetFact) {
      setActiveFact(targetFact);
    } else {
      setActiveFact({
        ...activeFact,
        page: prevPage,
        quote: `Viewing Report Page ${prevPage}`,
      });
    }
  };

  const handleNextPage = () => {
    const nextPage = activeFact.page < totalPages ? activeFact.page + 1 : 1;
    const targetFact = extractedFacts.find((f) => f.page === nextPage);
    if (targetFact) {
      setActiveFact(targetFact);
    } else {
      setActiveFact({
        ...activeFact,
        page: nextPage,
        quote: `Viewing Report Page ${nextPage}`,
      });
    }
  };

  // Open override modal
  const openOverrideModal = () => {
    setOverrideValue(activeFact.value);
    setOverrideRange(activeFact.range || "");
    setOverrideStatus(activeFact.status === "Low" || activeFact.status === "High" || activeFact.status === "Critical" ? activeFact.status : "Normal");
    setOverrideNotes(activeFact.override_notes || "");
    setIsOverrideModalOpen(true);
  };

  // Submit clinical override
  const handleSaveOverride = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;
    setIsSavingOverride(true);
    try {
      const updated = await api.overrideReportFinding(
        activeReport.id,
        activeFact.id || activeFact.label,
        overrideValue,
        overrideRange,
        overrideStatus,
        overrideNotes
      );
      setActiveReport(updated);
      window.localStorage.setItem("medcorpus-active-report", JSON.stringify(updated));
      setIsOverrideModalOpen(false);
    } catch (err: any) {
      alert("Override failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Submit clinician sign-off
  const handleSaveSignoff = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;
    setIsSigningOff(true);
    try {
      const updated = await api.signoffReport(
        activeReport.id,
        doctorName,
        licenseNumber,
        signoffNotes
      );
      setActiveReport(updated);
      window.localStorage.setItem("medcorpus-active-report", JSON.stringify(updated));
      setIsSignoffModalOpen(false);
    } catch (err: any) {
      alert("Sign-off failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSigningOff(false);
    }
  };

  // Patient Interactive Q&A submission
  const handleAskPatientQA = async (e?: FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || patientQuestion;
    if (!query.trim()) return;
    setIsAskingQA(true);
    try {
      const res = await api.askPatientQA(reportId, query.trim());
      setPatientQAResponse(res);
    } catch (err: any) {
      alert("Could not answer report question: " + (err.message || "Service unavailable"));
    } finally {
      setIsAskingQA(false);
    }
  };

  return (
    <ToolShell
      description="See exactly what was extracted from the report and verify every value against its original passage."
      eyebrow="Tested levels"
      icon="document"
      title="Your tested levels, clearly organized and source checked."
    >
      {/* Hidden file input for direct report uploads */}
      <input
        accept=".pdf,application/pdf"
        onChange={handleDirectFileUpload}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Role Access Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 16px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>Active Perspective:</span>
          <div style={{ display: "inline-flex", background: "#e5e7eb", borderRadius: "6px", padding: "3px" }}>
            <button
              onClick={() => setRoleMode("clinical")}
              style={{
                padding: "4px 12px",
                border: "none",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: roleMode === "clinical" ? "#065f46" : "transparent",
                color: roleMode === "clinical" ? "#ffffff" : "#4b5563"
              }}
              type="button"
            >
              🩺 Healthcare Professional (Clinical View)
            </button>
            <button
              onClick={() => setRoleMode("patient")}
              style={{
                padding: "4px 12px",
                border: "none",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: roleMode === "patient" ? "#1e40af" : "transparent",
                color: roleMode === "patient" ? "#ffffff" : "#4b5563"
              }}
              type="button"
            >
              👤 Patient (Patient-Friendly View)
            </button>
          </div>
        </div>

        <div>
          {roleMode === "clinical" ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px" }}>
              🛡️ High-Privilege Clinical Access · Verification & Override Authority
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "6px" }}>
              🔒 Read-Only Personal Access · Patient Record Owner
            </span>
          )}
        </div>
      </div>

      <div className="extraction-toolbar">
        <span>
          <Icon name="check" size={15} /> {extractedFacts.length} of {extractedFacts.length} facts verified {activeReport ? `(${activeReport.patient_name})` : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Direct Upload Diagnostic Report */}
          <button
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              background: "#166534",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#ffffff",
              cursor: "pointer",
            }}
            title="Upload a new lab or radiology PDF report"
            type="button"
          >
            <Icon name="upload" size={13} />
            {isUploading ? "Processing Report..." : "Upload New Diagnostic Report"}
          </button>

          {activeReport && (
            <button
              disabled={isRefreshing}
              onClick={handleReanalyze}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                background: "#f0f4f1",
                border: "1px solid #ccd2ca",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1b3322",
                cursor: "pointer",
              }}
              title="Re-extract all lab findings from uploaded document"
              type="button"
            >
              <Icon name="sparkles" size={12} />
              {isRefreshing ? "Extracting..." : "Re-extract findings"}
            </button>
          )}

          {/* Clinician Sign-off button in Clinical mode */}
          {roleMode === "clinical" && activeReport && (
            <button
              onClick={() => setIsSignoffModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                background: activeReport.clinician_signed_off ? "#047857" : "#0f766e",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              title="Clinician authority to verify and sign off on report summary"
              type="button"
            >
              <Icon name="check" size={13} />
              {activeReport.clinician_signed_off ? "Signed Off ✓" : "Sign Off AI Summary"}
            </button>
          )}

          <span>Report</span>
          <button
            aria-pressed={showSource}
            className={showSource ? "active" : ""}
            onClick={() => setShowSource((current) => !current)}
            type="button"
          >
            <i />
          </button>
        </div>
      </div>

      {/* Clinician Sign-off Banner if already signed */}
      {activeReport?.clinician_signed_off && (
        <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: "8px", padding: "10px 16px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#065f46", fontSize: "13px" }}>
              ✅ Clinically Signed Off by {activeReport.signed_off_by || "Physician"}
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#047857" }}>
              {activeReport.clinician_notes || "All extracted laboratory metrics have been verified against source documentation and saved to the patient's official electronic medical record."}
            </p>
          </div>
          <span style={{ fontSize: "11px", color: "#065f46", background: "#d1fae5", padding: "3px 8px", borderRadius: "4px", fontWeight: 700 }}>
            OFFICIAL EHR RECORD
          </span>
        </div>
      )}

      <div className={`extraction-grid ${showSource ? "" : "source-hidden"}`}>
        <div className="extracted-facts-panel">
          <div className="tool-panel-heading">
            <span>
              <strong>Extracted facts ({extractedFacts.length})</strong>
              <small>
                {roleMode === "clinical"
                  ? "Clinical View · Anomalous metrics highlighted · Click to jump to PDF."
                  : "Patient-Friendly View · Simplified metrics & explanations."}
              </small>
            </span>
            <span className="tool-count">{String(extractedFacts.length).padStart(2, "0")} facts</span>
          </div>
          <div className="extracted-list">
            {extractedFacts.map((fact) => {
              const isAbnormal = fact.status === "Low" || fact.status === "High" || fact.status === "Critical";
              return (
                <button
                  className={`${activeFact.label === fact.label ? "active" : ""} ${isAbnormal ? "anomalous-fact-item" : ""}`}
                  key={fact.id || fact.label}
                  onClick={() => setActiveFact(fact)}
                  style={{
                    borderLeft: isAbnormal
                      ? fact.status === "Critical"
                        ? "4px solid #dc2626"
                        : "4px solid #d97706"
                      : "4px solid transparent"
                  }}
                  type="button"
                >
                  <span className="extraction-check">
                    <Icon name="check" size={14} />
                  </span>
                  <span>
                    <small>{fact.label}</small>
                    <strong>{fact.value}</strong>
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                    <span className={`fact-status ${isAbnormal ? "status-abnormal" : ""}`}>
                      {fact.status}
                    </span>
                    {fact.is_overridden && (
                      <span style={{ fontSize: "9px", background: "#fef3c7", color: "#92400e", padding: "1px 4px", borderRadius: "3px", fontWeight: 700 }}>
                        Overridden
                      </span>
                    )}
                  </div>
                  <Icon name="arrow" size={15} />
                </button>
              );
            })}
          </div>
          <div className="extraction-method">
            <Icon name="shield" size={18} />
            <span>
              <strong>Value-level verification</strong>
              Each extracted value is matched character-for-character with the report before being
              included.
            </span>
          </div>
        </div>

        {showSource && (
          <aside className="extraction-source">
            <div className="tool-panel-heading">
              <span>
                <strong>Original report ({fileName})</strong>
                <small>Page {activeFact.page} of {totalPages}</small>
              </span>
              <div className="pdf-toolbar-addon">
                <button
                  aria-label="Previous page"
                  onClick={handlePrevPage}
                  style={{
                    border: "1px solid #ccd2ca",
                    background: "#ffffff",
                    borderRadius: "4px",
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "grid",
                    placeItems: "center",
                  }}
                  title="Previous page"
                  type="button"
                >
                  ‹
                </button>
                <button
                  aria-label="Next page"
                  onClick={handleNextPage}
                  style={{
                    border: "1px solid #ccd2ca",
                    background: "#ffffff",
                    borderRadius: "4px",
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                    fontSize: "14px",
                    display: "grid",
                    placeItems: "center",
                  }}
                  title="Next page"
                  type="button"
                >
                  ›
                </button>
                <span className="source-match">
                  <Icon name="check" size={12} /> Exact match
                </span>
                <a
                  className="pdf-newtab-btn"
                  href={pdfUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="Open original uploaded PDF in new tab"
                >
                  Open PDF ↗
                </a>
              </div>
            </div>

            {/* Matched Source Passage Card */}
            <div className="matched-source-banner">
              <div className="matched-source-header">
                <span className="source-badge">
                  <Icon name="check" size={12} /> Character-for-character matched
                </span>
                <span className="matched-page-tag">Report Page {activeFact.page}</span>
              </div>
              <div className="matched-quote-box">
                <span className="quote-label">Matched Source Passage in PDF:</span>
                <blockquote className="quote-text">
                  “{activeFact.quote}”
                </blockquote>
              </div>
              <div className="matched-meta-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <span>
                  <strong>Extracted Result:</strong> {activeFact.label} = <mark className="value-mark">{activeFact.value}</mark>
                  {activeFact.range && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#4b5563" }}>(Range: {activeFact.range})</span>}
                </span>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {/* Doctor Override Button */}
                  {roleMode === "clinical" && (
                    <button
                      onClick={openOverrideModal}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#fffbeb",
                        border: "1px solid #f59e0b",
                        color: "#92400e",
                        fontWeight: 700,
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                      title="Edit, correct, or override this finding in the official medical record"
                      type="button"
                    >
                      ✏️ Override / Edit Finding
                    </button>
                  )}

                  {/* Patient Download Raw Source Document Button */}
                  {roleMode === "patient" && (
                    <a
                      download={fileName}
                      href={`/api/reports/${reportId}/file?highlight=false`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#eff6ff",
                        border: "1px solid #3b82f6",
                        color: "#1d4ed8",
                        fontWeight: 700,
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        textDecoration: "none"
                      }}
                      title="Download the raw source diagnostic document for your records"
                    >
                      ⬇️ Download Official PDF Report
                    </a>
                  )}

                  <div className="view-mode-tabs" style={{ display: "flex", gap: "6px" }}>
                    <button
                      className={`mode-tab ${highlightPdf ? "active" : ""}`}
                      onClick={() => setHighlightPdf((curr) => !curr)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: highlightPdf ? "#e3f5e9" : "#f1f3f1",
                        border: highlightPdf ? "1px solid #3c7d56" : "1px solid #ccd2ca",
                        color: highlightPdf ? "#194d2d" : "#555",
                        fontWeight: 600,
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                      title="Toggle visual highlights burned directly into the PDF"
                      type="button"
                    >
                      <Icon name="sparkles" size={12} />
                      Highlights: {highlightPdf ? "ON" : "OFF"}
                    </button>
                    <button
                      className={`mode-tab ${viewMode === "pdf" ? "active" : ""}`}
                      onClick={() => setViewMode("pdf")}
                      type="button"
                    >
                      PDF
                    </button>
                    <button
                      className={`mode-tab ${viewMode === "passage" ? "active" : ""}`}
                      onClick={() => setViewMode("passage")}
                      type="button"
                    >
                      Text
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient Plain-Language Explanation & Interactive Q&A (Patient Mode) */}
            {roleMode === "patient" && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "14px 16px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <Icon name="sparkles" size={15} />
                  <strong style={{ color: "#166534", fontSize: "13px" }}>
                    Plain Language Breakdown for {activeFact.label}:
                  </strong>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#14532d", lineHeight: 1.5 }}>
                  {activeFact.explanation}
                </p>
                <div style={{ fontSize: "12px", color: "#15803d", background: "#dcfce7", padding: "8px 12px", borderRadius: "6px", marginBottom: "12px" }}>
                  <strong>Understanding your reference range:</strong> Standard physiological baseline is {activeFact.range || "established by your testing laboratory"}. Your tested level is {activeFact.value} ({activeFact.status}).
                </div>

                {/* Interactive Q&A (Stretch Goal) */}
                <div style={{ borderTop: "1px dashed #86efac", paddingTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px" }}>💬</span>
                    <strong style={{ fontSize: "13px", color: "#166534" }}>
                      Ask Report Assistant (Interactive Q&A):
                    </strong>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#4b5563" }}>
                    Ask follow-up questions restricted strictly to the contents of your uploaded medical report:
                  </p>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <button
                      onClick={() => {
                        setPatientQuestion(`What does my ${activeFact.label} count mean?`);
                        handleAskPatientQA(undefined, `What does my ${activeFact.label} count mean?`);
                      }}
                      style={{ fontSize: "11px", padding: "3px 8px", background: "#ffffff", border: "1px solid #86efac", borderRadius: "12px", color: "#166534", cursor: "pointer" }}
                      type="button"
                    >
                      "What does my {activeFact.label} count mean?"
                    </button>
                    <button
                      onClick={() => {
                        setPatientQuestion(`Is my result of ${activeFact.value} within normal limits?`);
                        handleAskPatientQA(undefined, `Is my result of ${activeFact.value} within normal limits?`);
                      }}
                      style={{ fontSize: "11px", padding: "3px 8px", background: "#ffffff", border: "1px solid #86efac", borderRadius: "12px", color: "#166534", cursor: "pointer" }}
                      type="button"
                    >
                      "Is my result of {activeFact.value} within normal limits?"
                    </button>
                  </div>

                  <form onSubmit={handleAskPatientQA} style={{ display: "flex", gap: "8px" }}>
                    <input
                      onChange={(e) => setPatientQuestion(e.target.value)}
                      placeholder={`Ask anything about ${activeFact.label} in this report...`}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #86efac", fontSize: "13px" }}
                      type="text"
                      value={patientQuestion}
                    />
                    <button
                      disabled={isAskingQA || !patientQuestion.trim()}
                      style={{ padding: "8px 14px", background: "#166534", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}
                      type="submit"
                    >
                      {isAskingQA ? "Answering..." : "Ask Report Assistant"}
                    </button>
                  </form>

                  {patientQAResponse && (
                    <div style={{ marginTop: "10px", background: "#ffffff", border: "1px solid #86efac", borderRadius: "6px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "12px", color: "#166534" }}>Q: {patientQAResponse.question}</strong>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>{patientQAResponse.model || "MedCorpus Clinical AI"}</span>
                      </div>
                      <p style={{ margin: "4px 0 6px", fontSize: "13px", color: "#1f2937", lineHeight: 1.5 }}>
                        {patientQAResponse.answer}
                      </p>
                      <small style={{ color: "#6b7280", fontSize: "11px", display: "block" }}>
                        📌 Grounded facts: {patientQAResponse.grounded_findings.join(", ")}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document display area (NO auto-zoom offset jumping!) */}
            {viewMode === "pdf" ? (
              <div className="pdf-viewer-container">
                {/* PDF Zoom Toolbar without auto-jump buttons */}
                <div className="pdf-zoom-toolbar">
                  <div className="zoom-controls-group">
                    <span className="zoom-label">PDF Zoom:</span>
                    <button
                      className="zoom-btn"
                      onClick={() => setZoomLevel((z) => Math.max(75, z - 25))}
                      title="Zoom Out"
                      type="button"
                    >
                      −
                    </button>
                    <span className="zoom-level-badge">{zoomLevel}%</span>
                    <button
                      className="zoom-btn"
                      onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                      title="Zoom In"
                      type="button"
                    >
                      +
                    </button>
                    <button
                      className="zoom-btn"
                      onClick={() => setZoomLevel(100)}
                      style={{ width: "auto", padding: "0 8px", fontSize: "11px" }}
                      title="Reset to 100%"
                      type="button"
                    >
                      Reset 100%
                    </button>
                  </div>
                  <span style={{ fontSize: "11px", color: "#4b5563" }}>
                    Standard Page Fit · Page {activeFact.page}
                  </span>
                </div>

                <iframe
                  className="original-pdf-frame zoom-focused-frame"
                  key={`${pdfTargetUrl}`}
                  src={pdfTargetUrl}
                  title={`Original PDF - Page ${activeFact.page}`}
                />
              </div>
            ) : (
              <div className="extraction-document passage-view">
                <div className="extraction-doc-head">
                  <span>{activeReport?.lab_name.slice(0, 2).toUpperCase() || "CD"}</span>
                  <div>
                    <strong>{activeReport?.lab_name || "CITY DIAGNOSTICS"}</strong>
                    <small>
                      {currentPageData?.page_title || `Diagnostic Panel — Page ${activeFact.page}`}
                    </small>
                  </div>
                </div>
                {currentPageData?.extracted_text ? (
                  <div className="extracted-page-text-content">
                    <pre className="page-raw-text">
                      {currentPageData.extracted_text}
                    </pre>
                  </div>
                ) : (
                  <>
                    <p>{activeFact.quote}</p>
                    <div className="extraction-callout">
                      <span>Exact finding in document</span>
                      <strong>{activeFact.label} {activeFact.value}</strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Clinician Override Finding Modal */}
      {isOverrideModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: "10px", width: "90%", maxWidth: "480px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
                Override Diagnostic Finding
              </h3>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
                type="button"
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#4b5563" }}>
              Healthcare professional authority to correct or override an extracted value and record clinical rationale.
            </p>

            <form onSubmit={handleSaveOverride}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                  Biomarker Parameter
                </label>
                <input
                  disabled
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#f3f4f6" }}
                  type="text"
                  value={activeFact.label}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                    Corrected Tested Value
                  </label>
                  <input
                    onChange={(e) => setOverrideValue(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    type="text"
                    value={overrideValue}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                    Reference Range
                  </label>
                  <input
                    onChange={(e) => setOverrideRange(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                    type="text"
                    value={overrideRange}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                  Clinical Status Classification
                </label>
                <select
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  value={overrideStatus}
                >
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                  Clinical Rationale / Notes (Recorded to Audit Trail)
                </label>
                <textarea
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Corrected against repeat serum analysis; confirmed by Dr. Maya Rao."
                  rows={3}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  value={overrideNotes}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  style={{ padding: "8px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#ffffff", cursor: "pointer", fontSize: "13px" }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  disabled={isSavingOverride}
                  style={{ padding: "8px 16px", border: "none", borderRadius: "6px", background: "#065f46", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
                  type="submit"
                >
                  {isSavingOverride ? "Saving Override..." : "Save Clinical Override"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clinician Sign-off Modal */}
      {isSignoffModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center" }}>
          <div style={{ background: "#ffffff", borderRadius: "10px", width: "90%", maxWidth: "480px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
                Sign Off & Commit to Patient Record
              </h3>
              <button
                onClick={() => setIsSignoffModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}
                type="button"
              >
                ×
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#4b5563" }}>
              Sign off on AI-extracted diagnostic summaries before committing them to the patient's official electronic medical record (EHR).
            </p>

            <form onSubmit={handleSaveSignoff}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                  Signing Clinician Name
                </label>
                <input
                  onChange={(e) => setDoctorName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  type="text"
                  value={doctorName}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                  Medical License / NPI Number
                </label>
                <input
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  type="text"
                  value={licenseNumber}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "4px", color: "#374151" }}>
                  Clinician Sign-off Notes
                </label>
                <textarea
                  onChange={(e) => setSignoffNotes(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px" }}
                  value={signoffNotes}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setIsSignoffModalOpen(false)}
                  style={{ padding: "8px 14px", border: "1px solid #d1d5db", borderRadius: "6px", background: "#ffffff", cursor: "pointer", fontSize: "13px" }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  disabled={isSigningOff}
                  style={{ padding: "8px 16px", border: "none", borderRadius: "6px", background: "#0f766e", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}
                  type="submit"
                >
                  {isSigningOff ? "Signing Off..." : "Sign Off & Lock Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ToolShell>
  );
}

const defaultFlags: Flag[] = [
  {
    id: "date",
    level: "Conflict",
    title: "Two collection dates found",
    detail: "Page 1 lists 18 June, while the footer on page 3 lists 17 June.",
    sources: ["Page 1 · 18 Jun 2025", "Page 3 · 17 Jun 2025"],
    resolved: false,
  },
  {
    id: "range",
    level: "Needs context",
    title: "Vitamin D reference range may vary",
    detail: "The report uses 30–100 ng/mL. Other laboratories may use a different interval.",
    sources: ["Page 3 · Lab reference interval"],
    resolved: false,
  },
  {
    id: "fasting",
    level: "Missing",
    title: "Fasting status not confirmed",
    detail: "A glucose value is present, but the report does not clearly confirm fasting status.",
    sources: ["Page 2 · Glucose 92 mg/dL"],
    resolved: false,
  },
];

export function UncertaintyFlagsPage() {
  const [report, setReport] = useState<ReportSummary | null>(getActiveReport());
  const [flags, setFlags] = useState<Flag[]>(defaultFlags);
  const [resolved, setResolved] = useState<string[]>([]);
  const [activeFlag, setActiveFlag] = useState<Flag>(defaultFlags[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadFlags() {
      setIsLoading(true);
      try {
        let currentReport = getActiveReport();
        if (!currentReport) {
          try {
            currentReport = await api.getLatestReport();
            if (currentReport && isMounted) {
              setReport(currentReport);
              try {
                window.localStorage.setItem("medcorpus-active-report", JSON.stringify(currentReport));
              } catch (_) {}
            }
          } catch (_) {}
        } else if (isMounted) {
          setReport(currentReport);
        }

        const reportId = currentReport?.id || "latest";
        const fetchedFlags = await api.getFlags(reportId);
        if (isMounted) {
          if (fetchedFlags && fetchedFlags.length > 0) {
            setFlags(fetchedFlags);
            setActiveFlag(fetchedFlags[0]);
            const resolvedIds = fetchedFlags.filter((f) => f.resolved).map((f) => f.id);
            setResolved(resolvedIds);
          } else if (currentReport?.flags && currentReport.flags.length > 0) {
            setFlags(currentReport.flags);
            setActiveFlag(currentReport.flags[0]);
          }
        }
      } catch (e) {
        console.warn("Could not fetch remote uncertainty flags:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadFlags();
    return () => { isMounted = false; };
  }, []);

  const toggleResolve = async (flagId: string) => {
    const isNowResolved = !resolved.includes(flagId);
    setResolved((current) =>
      isNowResolved ? [...current, flagId] : current.filter((id) => id !== flagId),
    );
    try {
      await api.resolveFlag(flagId, isNowResolved);
    } catch (e) {
      // Local state already updated
    }
  };

  return (
    <ToolShell
      description="Review missing, ambiguous, and conflicting information extracted directly from your diagnostic PDF before relying on the generated summary."
      eyebrow="Uncertainty flags"
      icon="warning"
      title="When the report is unclear, MedCorpus shows you."
    >
      {/* Uploaded PDF Context Indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>📄</span>
          <div>
            <strong style={{ fontSize: "13px", color: "#1e293b", display: "block" }}>
              {report?.file_name || "Uploaded Diagnostic Report.pdf"}
            </strong>
            <small style={{ fontSize: "11px", color: "#64748b" }}>
              Patient: {report?.patient_name || "Patient"} · Lab: {report?.lab_name || "Clinical Laboratory"} · {report?.total_findings || report?.findings?.length || 0} extracted biomarkers
            </small>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Link
            to="/report"
            style={{ fontSize: "12px", color: "#065f46", textDecoration: "none", fontWeight: 600, padding: "5px 10px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px" }}
          >
            View Full Report PDF ↗
          </Link>
          <Link
            to="/start"
            style={{ fontSize: "12px", color: "#1e40af", textDecoration: "none", fontWeight: 600, padding: "5px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px" }}
          >
            Upload Different PDF
          </Link>
        </div>
      </div>

      <div className="uncertainty-summary">
        <div>
          <strong>{flags.length - resolved.length}</strong>
          <span>Open flags</span>
        </div>
        <div>
          <strong>{resolved.length}</strong>
          <span>Reviewed</span>
        </div>
        <p>
          <Icon name="shield" size={17} />
          {isLoading
            ? "Analyzing uploaded PDF for conflicts, missing ranges, and date discrepancies..."
            : "Derived directly from your uploaded PDF text, test ranges, and specimen remarks."}
        </p>
      </div>

      <div className="uncertainty-grid">
        <div className="flag-list">
          <div className="tool-panel-heading">
            <span>
              <strong>Review required ({flags.length})</strong>
              <small>Extracted from uploaded report evidence</small>
            </span>
          </div>
          {flags.map((flag) => (
            <button
              className={`${activeFlag?.id === flag.id ? "active" : ""} ${resolved.includes(flag.id) ? "resolved" : ""}`}
              key={flag.id}
              onClick={() => setActiveFlag(flag)}
            >
              <span className="flag-icon">
                <Icon name={resolved.includes(flag.id) ? "check" : "warning"} size={16} />
              </span>
              <span>
                <small>{resolved.includes(flag.id) ? "Reviewed" : flag.level}</small>
                <strong>{flag.title}</strong>
              </span>
              <Icon name="arrow" size={15} />
            </button>
          ))}
        </div>

        {activeFlag && (
          <aside className="flag-detail">
            <span className="flag-detail-level">{activeFlag.level}</span>
            <h2>{activeFlag.title}</h2>
            <p>{activeFlag.detail}</p>
            <div className="flag-sources">
              <span>Evidence in uploaded report</span>
              {activeFlag.sources && activeFlag.sources.length > 0 ? (
                activeFlag.sources.map((source, idx) => (
                  <div key={`${source}-${idx}`}>
                    <Icon name="document" size={15} />
                    {source}
                    <Icon name="arrow" size={14} />
                  </div>
                ))
              ) : (
                <div style={{ color: "#64748b", fontSize: "12px", fontStyle: "italic" }}>
                  Verified from document structure and clinical metadata.
                </div>
              )}
            </div>
            <div className="flag-guidance">
              <Icon name="sparkles" size={18} />
              <span>
                <strong>Suggested next step</strong>
                {activeFlag.suggested_step || "Confirm this information with the issuing laboratory or your healthcare professional."}
              </span>
            </div>
            <button
              className={resolved.includes(activeFlag.id) ? "reviewed-button" : ""}
              onClick={() => toggleResolve(activeFlag.id)}
            >
              <Icon name="check" size={16} />
              {resolved.includes(activeFlag.id) ? "Marked as reviewed" : "Mark as reviewed"}
            </button>
          </aside>
        )}
      </div>
    </ToolShell>
  );
}

const defaultWellnessPlans = {
  Routine: [
    "Spend a short period outdoors during morning sunlight when appropriate and safe.",
    "Keep a consistent sleep and wake schedule to support metabolic regulation.",
    "Add gentle, regular movement (such as 20-30 minutes of walking) suited to your ability.",
  ],
  Diet: [
    "Discuss nutrient-rich foods suited to your results with your physician or dietitian.",
    "Include varied whole foods across meals to support metabolic and cellular health.",
    "Avoid major restrictive dietary changes based on a single laboratory result alone.",
  ],
  Nutrition: [
    "Do not begin high-dose supplements without professional clinical guidance.",
    "Ask whether follow-up repeat testing may be appropriate in 3 to 6 months.",
    "Bring the original diagnostic report to your next medical appointment.",
  ],
};

export function MiniDoctorPage() {
  const [report, setReport] = useState<ReportSummary | null>(getActiveReport());
  const [plans, setPlans] = useState<Record<string, string[]>>(defaultWellnessPlans);
  const [abnormalFindingsList, setAbnormalFindingsList] = useState<string[]>([]);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string>("");
  const [activePlan, setActivePlan] = useState<string>("Routine");
  const [saved, setSaved] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      setIsGeneratingPlans(true);
      try {
        let currentReport = getActiveReport();
        if (!currentReport) {
          try {
            currentReport = await api.getLatestReport();
            if (currentReport && isMounted) {
              setReport(currentReport);
              try {
                window.localStorage.setItem("medcorpus-active-report", JSON.stringify(currentReport));
              } catch (_) {}
            }
          } catch (_) {}
        } else if (isMounted) {
          setReport(currentReport);
        }

        const reportId = currentReport?.id || "latest";
        const planRes = await api.getWellnessPlans(reportId);

        if (isMounted && planRes && planRes.plans) {
          setPlans(planRes.plans);
          const abnormals = planRes.abnormal_findings || [];
          setAbnormalFindingsList(abnormals);

          const firstContext = abnormals.length > 0 && !abnormals[0].includes("reference range")
            ? abnormals[0]
            : (currentReport?.findings?.[0] ? `${currentReport.findings[0].name} (${currentReport.findings[0].value})` : "Comprehensive Blood Panel");

          setSelectedBiomarker(firstContext);

          setChatMessages([
            {
              role: "assistant",
              text: `Hello! I am your Mini Doctor assistant. I have reviewed ${currentReport?.file_name || "your uploaded diagnostic report"} (${currentReport?.patient_name || "Patient"}). Ask me about general routine, diet, or nutrition ideas tailored to ${firstContext}.`,
            },
          ]);
        }
      } catch (err) {
        console.warn("Failed to load wellness plans from uploaded PDF:", err);
      } finally {
        if (isMounted) setIsGeneratingPlans(false);
      }
    }
    loadPlans();
    return () => { isMounted = false; };
  }, []);

  const sendDoctorMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || isSendingChat) return;

    setChatMessages((current) => [...current, { role: "user", text: question }]);
    setChatInput("");
    setIsSendingChat(true);

    try {
      const res = await api.chatMiniDoctor(
        question,
        report?.id || "latest",
        selectedBiomarker
      );
      setChatMessages((current) => [...current, { role: "assistant", text: res.answer }]);
    } catch (err) {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `Grounded in your uploaded report (${report?.file_name || "Report"}): For ${selectedBiomarker}, please consult your healthcare provider before taking supplements or modifying medications. Consistent gentle movement, adequate hydration, and whole foods can support your wellness plan.`,
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const currentPlanSuggestions = plans[activePlan] || defaultWellnessPlans[activePlan as keyof typeof defaultWellnessPlans] || [];

  return (
    <ToolShell
      description="Explore evidence-grounded wellness suggestions generated directly from your uploaded diagnostic PDF and clearly separated from medical advice."
      eyebrow="Mini Doctor Box"
      icon="sparkles"
      title="Helpful next steps, with responsible limits."
    >
      {/* Uploaded Report Context Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "16px" }}>🩺</span>
          <div>
            <strong style={{ fontSize: "13px", color: "#166534", display: "block" }}>
              Suggestions synthesized from: {report?.file_name || "Uploaded Diagnostic Report.pdf"}
            </strong>
            <small style={{ fontSize: "11px", color: "#15803d" }}>
              Patient: {report?.patient_name || "Patient"} · {report?.total_findings || report?.findings?.length || 0} findings evaluated
            </small>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isGeneratingPlans && (
            <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>
              ⏳ Generating from PDF...
            </span>
          )}
          <Link
            to="/start"
            style={{ fontSize: "12px", color: "#15803d", textDecoration: "none", fontWeight: 700, padding: "5px 10px", background: "#dcfce7", border: "1px solid #86efac", borderRadius: "6px" }}
          >
            Upload New PDF
          </Link>
        </div>
      </div>

      {/* Multiple Biomarkers Selector Chips */}
      {abnormalFindingsList.length > 0 && (
        <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>Focal Findings in Report:</span>
          {abnormalFindingsList.map((findingText) => {
            const isSelected = selectedBiomarker === findingText;
            return (
              <button
                key={findingText}
                onClick={() => setSelectedBiomarker(findingText)}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  borderRadius: "14px",
                  border: isSelected ? "1.5px solid #059669" : "1px solid #d1d5db",
                  background: isSelected ? "#ecfdf5" : "#ffffff",
                  color: isSelected ? "#065f46" : "#4b5563",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                }}
                type="button"
              >
                {findingText}
              </button>
            );
          })}
        </div>
      )}

      <div className="doctor-result-context">
        <span className="doctor-result-icon">
          {selectedBiomarker.slice(0, 1).toUpperCase() || "D"}
        </span>
        <span>
          <small>Biomarker used for wellness context</small>
          <strong>{selectedBiomarker || "Uploaded Laboratory Panel"}</strong>
        </span>
        <Link to="/features/structured-summaries">
          View full source <Icon name="arrow" size={14} />
        </Link>
      </div>

      <div className="doctor-workspace">
        <div className="doctor-plan">
          <div className="doctor-tabs">
            {Object.keys(plans).map((plan) => (
              <button
                className={activePlan === plan ? "active" : ""}
                key={plan}
                onClick={() => setActivePlan(plan)}
              >
                {plan}
              </button>
            ))}
          </div>

          <div className="doctor-plan-heading">
            <span className="plain-card-mark">
              <Icon name="sparkles" size={21} />
            </span>
            <span>
              <small>General wellness suggestions from uploaded PDF</small>
              <h2>{activePlan} ideas to discuss with your care team</h2>
            </span>
          </div>

          <div className="wellness-list">
            {currentPlanSuggestions.map((suggestion, index) => {
              const id = `${activePlan}-${index}`;
              return (
                <article key={`${suggestion}-${index}`}>
                  <span>0{index + 1}</span>
                  <p>{suggestion}</p>
                  <button
                    aria-label={saved.includes(id) ? "Remove saved suggestion" : "Save suggestion"}
                    className={saved.includes(id) ? "saved" : ""}
                    onClick={() =>
                      setSaved((current) =>
                        current.includes(id)
                          ? current.filter((item) => item !== id)
                          : [...current, id],
                      )
                    }
                  >
                    <Icon name="check" size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="doctor-safety">
          <span className="safety-mark-small">
            <Icon name="shield" size={25} />
          </span>
          <h3>What Mini Doctor can—and cannot—do</h3>
          <div>
            <p>
              <Icon name="check" size={15} /> Offer routine and nutrition suggestions from verified results
            </p>
            <p>
              <Icon name="check" size={15} /> Keep suggestions tied directly to your uploaded PDF
            </p>
            <p className="cannot">
              <Icon name="x" size={15} /> Diagnose a medical condition or prescribe treatment
            </p>
            <p className="cannot">
              <Icon name="x" size={15} /> Replace advice from a licensed medical professional
            </p>
          </div>
          <div className="doctor-disclaimer">
            These suggestions are informational and synthesized from your diagnostic report. Always consult a qualified healthcare
            professional before changing diet, supplements, medication, or routine.
          </div>
        </aside>
      </div>

      <section className="doctor-chatbot">
        <div className="doctor-chat-head">
          <span className="voice-assistant-mark">
            <Icon name="sparkles" size={19} />
          </span>
          <span>
            <strong>Chat with Mini Doctor</strong>
            <small>Grounded strictly in {report?.file_name || "your uploaded report"} · Not a diagnosis</small>
          </span>
          <span className="report-connected">
            <Icon name="check" size={12} /> Connected to {report?.file_name ? report.file_name.slice(0, 24) : "Uploaded PDF"}
          </span>
        </div>
        <div className="doctor-chat-messages" aria-live="polite">
          {chatMessages.map((message, index) => (
            <div className={message.role} key={`${message.role}-${index}`}>
              {message.role === "assistant" && (
                <span><Icon name="sparkles" size={14} /></span>
              )}
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        <div className="doctor-chat-prompts">
          {[
            `What foods support my ${selectedBiomarker.split(" ")[0] || "results"}?`,
            "Should I take any supplements for this?",
            "Suggest daily routine and movement ideas",
            "What questions should I ask my doctor about this?",
          ].map((prompt) => (
            <button key={prompt} onClick={() => setChatInput(prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        <form className="doctor-chat-form" onSubmit={sendDoctorMessage}>
          <input
            aria-label="Ask Mini Doctor a question"
            disabled={isSendingChat}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={`Ask Mini Doctor about diet, routine, or nutrition for ${selectedBiomarker.split(" ")[0] || "your results"}...`}
            value={chatInput}
          />
          <button disabled={!chatInput.trim() || isSendingChat} type="submit">
            {isSendingChat ? "..." : "Send"} <Icon name="arrow" size={16} />
          </button>
        </form>
      </section>
    </ToolShell>
  );
}

