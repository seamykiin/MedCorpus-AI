import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLocation } from "react-router";
import { Icon } from "../pages/HomePage";
import { api, type ExplainResponse } from "../services/api";

type ExplanationMode = "layman" | "clinical";

const languages = ["English", "Hindi", "Kannada", "Spanish", "French", "German"];

const responses: Record<
  string,
  Record<string, { layman: string; clinical: string }>
> = {
  vitamin: {
    English: {
      layman:
        "Vitamin D supports bone and muscle health. A result below the report’s expected range may be worth discussing with a healthcare professional.",
      clinical:
        "Serum 25-hydroxyvitamin D is below the laboratory reference interval. Interpret alongside symptoms, history, and clinician assessment.",
    },
    Hindi: {
      layman:
        "विटामिन D हड्डियों और मांसपेशियों के स्वास्थ्य में मदद करता है। कम स्तर के बारे में स्वास्थ्य विशेषज्ञ से चर्चा करें।",
      clinical:
        "सीरम 25-हाइड्रॉक्सीविटामिन D प्रयोगशाला संदर्भ सीमा से कम है। नैदानिक संदर्भ के साथ मूल्यांकन आवश्यक है।",
    },
    Kannada: {
      layman:
        "ವಿಟಮಿನ್ D ಮೂಳೆ ಮತ್ತು ಸ್ನಾಯುಗಳ ಆರೋಗ್ಯಕ್ಕೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಕಡಿಮೆ ಮಟ್ಟದ ಬಗ್ಗೆ ವೈದ್ಯರೊಂದಿಗೆ ಚರ್ಚಿಸಿ.",
      clinical:
        "ಸೀರಮ್ 25-ಹೈಡ್ರಾಕ್ಸಿವಿಟಮಿನ್ D ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿಗಿಂತ ಕಡಿಮೆಯಾಗಿದೆ. ಕ್ಲಿನಿಕಲ್ ಮೌಲ್ಯಮಾಪನ ಅಗತ್ಯ.",
    },
    Spanish: {
      layman:
        "La vitamina D ayuda a la salud de los huesos y músculos. Conviene comentar un nivel bajo con un profesional de salud.",
      clinical:
        "La 25-hidroxivitamina D sérica está por debajo del intervalo de referencia del laboratorio. Se recomienda correlación clínica.",
    },
  },
  hemoglobin: {
    English: {
      layman:
        "Hemoglobin carries oxygen through your blood. A value inside the report’s range is generally not marked abnormal by the laboratory.",
      clinical:
        "Hemoglobin concentration falls within the laboratory-defined reference interval. Correlate with red-cell indices and clinical context.",
    },
    Hindi: {
      layman:
        "हीमोग्लोबिन रक्त में ऑक्सीजन पहुंचाता है। रिपोर्ट की सामान्य सीमा में परिणाम को प्रयोगशाला असामान्य नहीं मानती।",
      clinical:
        "हीमोग्लोबिन सांद्रता प्रयोगशाला संदर्भ सीमा के भीतर है। अन्य रक्त संकेतकों के साथ मूल्यांकन करें।",
    },
    Kannada: {
      layman:
        "ಹೀಮೋಗ್ಲೋಬಿನ್ ರಕ್ತದಲ್ಲಿ ಆಮ್ಲಜನಕವನ್ನು ಸಾಗಿಸುತ್ತದೆ. ವರದಿಯ ಸಾಮಾನ್ಯ ಶ್ರೇಣಿಯಲ್ಲಿರುವ ಮೌಲ್ಯವನ್ನು ಅಸಹಜ ಎಂದು ಗುರುತಿಸಲಾಗುವುದಿಲ್ಲ.",
      clinical:
        "ಹೀಮೋಗ್ಲೋಬಿನ್ ಸಾಂದ್ರತೆಯು ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿಯಲ್ಲಿದೆ. ಇತರ ರಕ್ತ ಸೂಚ್ಯಂಕಗಳೊಂದಿಗೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ.",
    },
    Spanish: {
      layman:
        "La hemoglobina transporta oxígeno en la sangre. Un valor dentro del rango del informe no suele marcarse como anormal.",
      clinical:
        "La concentración de hemoglobina está dentro del intervalo de referencia del laboratorio. Correlacionar con índices eritrocitarios.",
    },
  },
  glucose: {
    English: {
      layman:
        "Glucose is the main sugar your body uses for energy. Whether a result is expected can depend on whether the sample was taken while fasting.",
      clinical:
        "Interpret plasma glucose against the stated fasting or non-fasting reference interval and confirm specimen conditions.",
    },
    Hindi: {
      layman:
        "ग्लूकोज़ शरीर की मुख्य ऊर्जा शर्करा है। परिणाम का अर्थ इस बात पर निर्भर कर सकता है कि नमूना खाली पेट लिया गया था या नहीं।",
      clinical:
        "प्लाज़्मा ग्लूकोज़ को उपवास स्थिति और प्रयोगशाला संदर्भ सीमा के अनुसार समझें।",
    },
    Kannada: {
      layman:
        "ಗ್ಲೂಕೋಸ್ ದೇಹದ ಮುಖ್ಯ ಶಕ್ತಿಯ ಸಕ್ಕರೆ. ಮಾದರಿಯನ್ನು ಉಪವಾಸದಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆಯೇ ಎಂಬುದರ ಮೇಲೆ ಫಲಿತಾಂಶ ಅವಲಂಬಿಸಬಹುದು.",
      clinical:
        "ಪ್ಲಾಸ್ಮಾ ಗ್ಲೂಕೋಸ್ ಅನ್ನು ಉಪವಾಸ ಸ್ಥಿತಿ ಮತ್ತು ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿಯೊಂದಿಗೆ ಅರ್ಥೈಸಿ.",
    },
    Spanish: {
      layman:
        "La glucosa es el azúcar principal que el cuerpo usa como energía. El resultado depende de si la muestra fue tomada en ayunas.",
      clinical:
        "Interpretar la glucosa plasmática según el estado de ayuno y el intervalo de referencia indicado.",
    },
  },
  general: {
    English: {
      layman:
        "This wording describes a medical result. Compare the value with the range printed on the report and ask a healthcare professional what it means for you.",
      clinical:
        "Interpret the reported finding using its stated unit, laboratory reference interval, specimen conditions, and relevant clinical context.",
    },
    Hindi: {
      layman:
        "यह शब्दावली एक चिकित्सा परिणाम बताती है। रिपोर्ट की सीमा से मूल्य की तुलना करें और स्वास्थ्य विशेषज्ञ से इसका अर्थ पूछें।",
      clinical:
        "दिए गए परिणाम को इकाई, प्रयोगशाला संदर्भ सीमा और नैदानिक संदर्भ के साथ समझें।",
    },
    Kannada: {
      layman:
        "ಈ ಪದಗಳು ವೈದ್ಯಕೀಯ ಫಲಿತಾಂಶವನ್ನು ವಿವರಿಸುತ್ತವೆ. ವರದಿಯ ಶ್ರೇಣಿಯೊಂದಿಗೆ ಮೌಲ್ಯವನ್ನು ಹೋಲಿಸಿ ಮತ್ತು ವೈದ್ಯರನ್ನು ಕೇಳಿ.",
      clinical:
        "ವರದಿ ಮಾಡಿದ ಫಲಿತಾಂಶವನ್ನು ಘಟಕ, ಪ್ರಯೋಗಾಲಯದ ಉಲ್ಲೇಖ ಶ್ರೇಣಿ ಮತ್ತು ಕ್ಲಿನಿಕಲ್ ಸಂದರ್ಭದೊಂದಿಗೆ ಅರ್ಥೈಸಿ.",
    },
    Spanish: {
      layman:
        "Este texto describe un resultado médico. Compara el valor con el rango del informe y consulta su significado con un profesional.",
      clinical:
        "Interpretar el hallazgo según su unidad, intervalo de referencia, condiciones de la muestra y contexto clínico.",
    },
  },
};

function getTopic(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("vitamin") || normalized.includes("25-oh")) return "vitamin";
  if (normalized.includes("hemoglobin") || normalized.includes("haemoglobin")) return "hemoglobin";
  if (normalized.includes("glucose") || normalized.includes("sugar")) return "glucose";
  return "general";
}

export default function GlobalPlainLanguage() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("English");
  const [mode, setMode] = useState<ExplanationMode>("layman");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = window.localStorage.getItem("medcorpus-explain-position");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as { x: number; y: number };
    } catch {
      return null;
    }
  });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const openPanel = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) setText(selection);
      setOpen(true);
    };
    const rememberSelection = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) setText(selection);
    };
    window.addEventListener("open-plain-language", openPanel);
    document.addEventListener("selectionchange", rememberSelection);
    return () => {
      window.removeEventListener("open-plain-language", openPanel);
      document.removeEventListener("selectionchange", rememberSelection);
    };
  }, []);

  useEffect(() => {
    const keepOnScreen = () => {
      setPosition((current) =>
        current
          ? {
              x: Math.max(8, Math.min(current.x, window.innerWidth - 60)),
              y: Math.max(8, Math.min(current.y, window.innerHeight - 60)),
            }
          : null,
      );
    };
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, []);

  const [llmResult, setLlmResult] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function fetchLlmExplanation() {
      if (!open || !text.trim()) {
        setLlmResult(null);
        return;
      }
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.explainText(text.trim(), language, mode);
        if (!isCancelled) {
          setLlmResult(res);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn("LLM explanation request failed, using local dictionary:", err);
          setFetchError("LLM offline; using verified clinical dictionary fallback.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchLlmExplanation();

    return () => {
      isCancelled = true;
    };
  }, [open, text, language, mode]);

  const fallbackExplanation = text.trim()
    ? (responses[getTopic(text)]?.[language]?.[mode] || responses.general?.[language]?.[mode] || "Interpret this finding within the clinical laboratory reference range.")
    : "";

  const finalExplanation = llmResult?.explanation || fallbackExplanation;

  const openWithSelection = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) setText(selection);
    setOpen(true);
  };

  const startDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isHomePage) return;
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) drag.moved = true;
    if (!drag.moved) return;

    setPosition({
      x: Math.max(8, Math.min(drag.originX + deltaX, window.innerWidth - drag.width - 8)),
      y: Math.max(8, Math.min(drag.originY + deltaY, window.innerHeight - drag.height - 8)),
    });
  };

  const stopDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    suppressClickRef.current = drag.moved;
    if (drag.moved) {
      setPosition((current) => {
        if (current) {
          window.localStorage.setItem("medcorpus-explain-position", JSON.stringify(current));
        }
        return current;
      });
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <button
        className={`global-language-trigger ${isHomePage ? "home-translate-trigger" : ""}`}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          openWithSelection();
        }}
        onDoubleClick={() => {
          if (isHomePage) return;
          setPosition(null);
          window.localStorage.removeItem("medcorpus-explain-position");
        }}
        onPointerDown={startDragging}
        onPointerMove={moveDragging}
        onPointerUp={stopDragging}
        style={
          !isHomePage && position
            ? { bottom: "auto", left: position.x, right: "auto", top: position.y }
            : undefined
        }
        title={
          isHomePage ? "Translate selected text" : "Drag to move · Double-click to reset position"
        }
      >
        <Icon name="globe" size={18} />
        <span>
          {isHomePage ? "Translate" : text ? "Explain selected text" : "Select text to explain"}
        </span>
        {!isHomePage && text && <i />}
      </button>

      {open && (
        <div className="global-language-overlay" role="presentation">
          <section
            aria-labelledby="global-language-title"
            aria-modal="true"
            className="global-language-box"
            role="dialog"
          >
            <header>
              <span className="plain-card-mark">
                <Icon name="globe" size={21} />
              </span>
              <span>
                <small>Available throughout MedCorpus</small>
                <strong id="global-language-title">Translate & explain medical wording</strong>
              </span>
              <button aria-label="Close explanation" onClick={() => setOpen(false)}>
                <Icon name="x" size={18} />
              </button>
            </header>

            {text ? (
              <div className="selection-explanation-content">
                <div className="selected-medical-text">
                  <span>Selected from the page</span>
                  <blockquote>{text}</blockquote>
                </div>

                <div className="global-language-options">
                  <label>
                    Language
                    <select onChange={(event) => setLanguage(event.target.value)} value={language}>
                      {languages.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <span>Explanation style</span>
                    <div className="global-mode-switch">
                      <button
                        className={mode === "clinical" ? "active" : ""}
                        onClick={() => setMode("clinical")}
                        type="button"
                      >
                        Clinical
                      </button>
                      <button
                        className={mode === "layman" ? "active" : ""}
                        onClick={() => setMode("layman")}
                        type="button"
                      >
                        Simple
                      </button>
                    </div>
                  </div>
                </div>

                <div className="global-explanation-result" aria-live="polite">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                      {mode === "clinical"
                        ? "Clinical explanation"
                        : "Simple explanation"}
                    </span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {llmResult?.provider && (
                        <span className="llm-provider-chip" style={{ fontSize: "10.5px", background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                          ⚡ {llmResult.provider.toUpperCase()} {llmResult.model ? `(${llmResult.model})` : ""}
                        </span>
                      )}
                      <em>{language}</em>
                    </div>
                  </div>

                  {loading ? (
                    <div className="llm-loading-explanation" style={{ padding: "16px 0", display: "flex", alignItems: "center", gap: "8px", color: "#059669", fontWeight: "600" }}>
                      <Icon name="sparkles" size={16} />
                      <span>Consulting MedCorpus LLM for medical explanation ({language})...</span>
                    </div>
                  ) : (
                    <p>{finalExplanation}</p>
                  )}

                  {fetchError && !loading && (
                    <div style={{ fontSize: "11px", color: "#92400e", background: "#fef3c7", padding: "4px 8px", borderRadius: "4px", margin: "6px 0" }}>
                      {fetchError}
                    </div>
                  )}

                  <small>
                    <Icon name="warning" size={13} />
                    {llmResult?.disclaimer || "AI-assisted explanation · Verify against the original report · Not a diagnosis"}
                  </small>
                </div>

                <button
                  className="explain-another-action"
                  onClick={() => {
                    setText("");
                    setOpen(false);
                  }}
                >
                  Select different wording
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            ) : (
              <div className="selection-empty-state">
                <span>
                  <Icon name="document" size={28} />
                </span>
                <h2>Select wording directly on the page</h2>
                <p>
                  Close this box, highlight any medical term, result, or sentence, then use the
                  top-right Explain button. No copying or pasting is needed.
                </p>
                <button onClick={() => setOpen(false)}>
                  Return to the page <Icon name="arrow" size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
