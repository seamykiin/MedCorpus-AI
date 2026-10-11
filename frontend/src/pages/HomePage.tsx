import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../services/api";

export type IconName =
  | "arrow"
  | "check"
  | "document"
  | "globe"
  | "home"
  | "menu"
  | "mic"
  | "search"
  | "shield"
  | "sparkles"
  | "upload"
  | "user"
  | "activity"
  | "warning"
  | "x";

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    document: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 13h6M9 17h4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.8 3 8.2 7 10 4-1.8 7-5.2 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" />
        <path d="m5 14 .6 1.8 1.9.7-1.9.6L5 19l-.6-1.9-1.9-.6 1.9-.7z" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5M4 15v5h16v-5" />
      </>
    ),
    user: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    activity: (
      <>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </>
    ),
    warning: (
      <>
        <path d="M12 3 2.8 20h18.4z" />
        <path d="M12 9v5M12 17.5v.1" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}

const languages = ["English", "Hindi", "Kannada", "Spanish", "French", "German"];

export default function HomePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState("English");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const prepareFile = (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      setFileError("Please choose a PDF or scanned image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setFileError("Please choose a file smaller than 20 MB.");
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setFileError("");

    try {
      const blobUrl = URL.createObjectURL(file);
      window.sessionStorage.setItem("medcorpus-pdf-blob-url", blobUrl);
      window.sessionStorage.setItem("medcorpus-uploaded-filename", file.name);
    } catch (e) {
      console.warn("Could not create object URL:", e);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    prepareFile(event.dataTransfer.files?.[0]);
  };

  const handleFinish = async (selectedLang = language) => {
    if (selectedFile) {
      setIsUploading(true);
      let targetReportId = "";
      try {
        const res = await api.uploadReport(selectedFile, [], selectedLang);
        if (res && res.summary) {
          targetReportId = res.report_id || res.summary.id;
          window.localStorage.setItem("medcorpus-active-report", JSON.stringify(res.summary));
        }
      } catch (err) {
        console.warn("Upload fallback to local preview:", err);
      } finally {
        setIsUploading(false);
        if (targetReportId) {
          navigate(`/features/structured-summaries?reportId=${targetReportId}`);
        } else {
          navigate("/features/structured-summaries");
        }
      }
    } else {
      navigate("/features/structured-summaries");
    }
  };

  const canContinue = step !== 0 || Boolean(fileName);

  return (
    <main className="onboarding-page">
      <section className="onboarding-workspace">
        <div className="onboarding-inner">
          <header className="onboarding-header">
            <Link className="onboarding-brand" to="/">
              <span className="onboarding-brand-mark">
                <span />
                <span />
                <span />
              </span>
              MedCorpus
            </Link>
            <div className="progress-dots" aria-label={`Step ${step + 1} of 2`}>
              {[0, 1].map((item) => (
                <button
                  aria-label={`Go to step ${item + 1}`}
                  className={item === step ? "active" : item < step ? "complete" : ""}
                  key={item}
                  onClick={() => {
                    if (item === 0 || fileName) setStep(item);
                  }}
                />
              ))}
            </div>
            <span className="step-count">0{step + 1} / 02</span>
          </header>

          <div className="onboarding-content">
            {step === 0 && (
              <div className="onboarding-step">
                <span className="step-symbol">
                  <Icon name="document" size={23} />
                </span>
                <h1>Start with your medical report</h1>
                <p>Upload a report to create a clear, source-linked health summary.</p>

                <div
                  className={`editorial-upload ${isDragging ? "dragging" : ""} ${fileName ? "file-ready" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="editorial-upload-icon">
                    <Icon name={fileName ? "check" : "upload"} size={24} />
                  </span>
                  <strong>{fileName || (isDragging ? "Drop your report here" : "Choose a report")}</strong>
                  <small>
                    {fileName ? "Securely added and ready to review" : "PDF or scanned image · up to 20 MB"}
                  </small>
                  <span>{fileName ? "Replace file" : "Browse files"}</span>
                </div>
                {fileError && <div className="editorial-error">{fileError}</div>}
                <div className="privacy-line">
                  <Icon name="shield" size={16} />
                  Your report is encrypted and remains private.
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="onboarding-step">
                <span className="step-symbol">
                  <Icon name="globe" size={23} />
                </span>
                <h1>Choose your preferred language</h1>
                <p>Your summary will use clear, natural language while preserving medical terms.</p>

                <div className="language-grid">
                  {languages.map((item) => (
                    <button
                      className={language === item ? "selected" : ""}
                      key={item}
                      onClick={() => {
                        setLanguage(item);
                        handleFinish(item);
                      }}
                    >
                      <span>{item.slice(0, 2).toUpperCase()}</span>
                      {item}
                      <i>{language === item && <Icon name="check" size={14} />}</i>
                    </button>
                  ))}
                </div>

                <div className="voice-setting">
                  <span className="step-symbol compact-symbol">
                    <Icon name="mic" size={18} />
                  </span>
                  <div>
                    <strong>Voice-ready summary</strong>
                    <small>Listen to findings and ask questions hands-free.</small>
                  </div>
                  <span className="setting-status">Included</span>
                </div>
              </div>
            )}
          </div>

          <div className="onboarding-actions">
            <button
              className="editorial-button back-button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              <Icon name="arrow" size={17} /> Back
            </button>
            {step === 0 ? (
              <button
                className="editorial-button continue-button"
                disabled={!canContinue}
                onClick={() => setStep(1)}
              >
                Continue <Icon name="arrow" size={17} />
              </button>
            ) : (
              <button
                className="editorial-button continue-button"
                disabled={isUploading}
                onClick={() => handleFinish()}
              >
                {isUploading ? "Analyzing & Verifying..." : "View summary"} <Icon name="arrow" size={17} />
              </button>
            )}
          </div>
        </div>
      </section>

      <aside className="onboarding-aside">
        <Link aria-label="Return to front page" className="aside-close" to="/">
          <Icon name="x" size={18} />
        </Link>
        <span className="aside-orbit orbit-a" />
        <span className="aside-orbit orbit-b" />

        <div className="report-preview" aria-hidden="true">
          <div className="preview-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="preview-message">
            <span className="preview-file">
              <Icon name="document" size={25} />
            </span>
            <p>
              <strong>Here’s your clear summary,</strong> with every important finding linked to
              its source.
            </p>
          </div>
        </div>

        <div className="aside-benefits">
          <span>What you’ll get</span>
          <p>
            <Icon name="check" size={16} /> Verified findings with page references
          </p>
          <p>
            <Icon name="check" size={16} /> Plain-language explanations in your language
          </p>
          <p>
            <Icon name="check" size={16} /> Clear uncertainty and conflict flags
          </p>
        </div>

        <div className="aside-footer">
          <span>Private by design</span>
          <span>Not a medical diagnosis</span>
        </div>
      </aside>

      <input
        accept=".pdf,image/*"
        hidden
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          prepareFile(event.target.files?.[0])
        }
        ref={fileInputRef}
        type="file"
      />
    </main>
  );
}
