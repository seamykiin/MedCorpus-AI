import { useRef, useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router";
import ReportToolsBar from "../components/ReportToolsBar";
import { Icon } from "./HomePage";
import { api, type ReportSummary } from "../services/api";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  source?: string;
};

type VoiceResultEvent = {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
      length: number;
    };
    length: number;
  };
};

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: VoiceResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

const sampleQuestions = [
  "What was my Vitamin D result?",
  "Which results were outside the normal range?",
  "Explain my hemoglobin result",
  "Summarize all findings",
];

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

export default function VoiceAssistantPage() {
  const [activeReport, setActiveReport] = useState<ReportSummary | null>(() => getActiveReport());
  const findings = activeReport?.findings || [];
  const initialPage = findings.length > 0 ? findings[0].page : 1;
  const initialHighlight = findings.length > 0 ? findings[0].name : "Hemoglobin";

  // Voice Engine Mode: "whisper" (cloud-backed audio AI) or "web_speech" (browser speech synthesis)
  const [engineMode, setEngineMode] = useState<"whisper" | "web_speech">("whisper");

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const userSpokeRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>("");

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>("");
  const [permError, setPermError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePage, setActivePage] = useState(initialPage);
  const [highlight, setHighlight] = useState(initialHighlight);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: activeReport
        ? `I’m ready to answer questions about ${activeReport.patient_name}’s ${activeReport.file_name || "report"}. Ask about any result, range, or flagged finding.`
        : "I’m ready to answer questions about your diagnostic report. Ask about any biomarker result, reference range, or flagged finding.",
      source: "Grounded in the verified medical report",
    },
  ]);

  useEffect(() => {
    let isMounted = true;
    async function syncLatest() {
      try {
        const latest = await api.getLatestReport();
        if (latest && isMounted) {
          setActiveReport(latest);
          window.localStorage.setItem("medcorpus-active-report", JSON.stringify(latest));
          if (latest.findings && latest.findings.length > 0) {
            setActivePage(latest.findings[0].page);
            setHighlight(latest.findings[0].name);
            setMessages([
              {
                id: 1,
                role: "assistant",
                text: `I’m ready to answer questions about ${latest.patient_name}’s ${latest.file_name || "report"}. Ask about any result, reference range, or flagged finding.`,
                source: "Grounded in verified report findings",
              },
            ]);
          }
        }
      } catch (e) {
        console.warn("Could not load latest report in voice assistant:", e);
      }
    }
    syncLatest();
    return () => {
      isMounted = false;
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const askQuestion = async (question: string) => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: cleanQuestion },
    ]);
    setInput("");
    setVoiceStatus("");

    try {
      const res = await api.queryVoice(cleanQuestion, activeReport?.id || "latest");
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: res.text,
          source: res.source,
        },
      ]);
      if (res.page) setActivePage(res.page);
      if (res.highlight) setHighlight(res.highlight);
      window.setTimeout(() => speak(res.text), 100);
    } catch (err) {
      // Local fallback
      const normalized = cleanQuestion.toLowerCase();
      let answerText = "I couldn’t find enough information in this report to answer that question.";
      let pageNum = 1;
      let matchedName = "";

      for (const f of findings) {
        if (normalized.includes(f.name.toLowerCase()) || (f.id && normalized.includes(f.id))) {
          answerText = `Your ${f.name} result was ${f.value}. The reference range is ${f.range}, so it is marked ${f.status}.`;
          pageNum = f.page;
          matchedName = f.name;
          break;
        }
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: answerText,
          source: matchedName ? `Page ${pageNum} · ${matchedName}` : "Report overview",
        },
      ]);
      if (pageNum) setActivePage(pageNum);
      if (matchedName) setHighlight(matchedName);
      window.setTimeout(() => speak(answerText), 100);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    askQuestion(input);
  };

  // -------------------------------------------------------------
  // ENGINE 1: WHISPER AI MODE (Primary & Universal)
  // -------------------------------------------------------------
  const startWhisperListening = async () => {
    setPermError(null);
    setVoiceStatus("Requesting microphone access...");
    audioChunksRef.current = [];
    userSpokeRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: unknown) {
      console.error("Microphone permission error:", err);
      const errObj = err as { name?: string };
      if (errObj?.name === "NotAllowedError" || errObj?.name === "PermissionDeniedError") {
        setPermError("Microphone blocked. Please click the lock 🔒 or camera icon in your address bar, set Microphone to 'Allow', and refresh.");
      } else if (errObj?.name === "NotFoundError") {
        setPermError("No microphone device found on this system. You can type or use the test voice queries below.");
      } else {
        setPermError("Microphone initialization error. Please check your browser audio settings.");
      }
      setIsListening(false);
      setVoiceStatus("");
      return;
    }

    setIsListening(true);
    setVoiceStatus("Listening... speak your question now");

    // Connect AudioContext analyser for live volume meters & auto-silence detection
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkAudio = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const level = Math.min(100, Math.round(avg * 1.6));
          setAudioLevel(level);

          // Auto-silence trigger: if user spoke and now stopped speaking for 1.6s, auto-send!
          if (level > 12) {
            userSpokeRef.current = true;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (userSpokeRef.current && level < 8) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = window.setTimeout(() => {
                stopWhisperListening();
              }, 1600);
            }
          }

          animFrameRef.current = requestAnimationFrame(checkAudio);
        };
        checkAudio();
      }
    } catch (e) {
      console.warn("Audio analyser unavailable:", e);
    }

    // Start MediaRecorder
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100);
    } catch (recErr) {
      console.error("MediaRecorder start failed:", recErr);
      setVoiceStatus("Audio recorder failed. Type your question below.");
      setIsListening(false);
    }
  };

  const stopWhisperListening = async () => {
    setIsListening(false);
    setAudioLevel(0);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      setIsTranscribing(true);
      setVoiceStatus("Transcribing with MedCorpus Whisper AI...");

      recorder.onstop = async () => {
        // Release hardware mic track
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }

        try {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          if (audioBlob.size > 100) {
            const transRes = await api.transcribeAudio(audioBlob);
            if (transRes && transRes.text && transRes.text.trim()) {
              const transcribed = transRes.text.trim();
              setInput(transcribed);
              setIsTranscribing(false);
              setVoiceStatus("");
              askQuestion(transcribed);
              return;
            }
          }
          setIsTranscribing(false);
          setVoiceStatus("No clear speech heard. Speak clearly into your microphone or choose a sample question.");
        } catch (transErr) {
          console.error("Transcription error:", transErr);
          setIsTranscribing(false);
          setVoiceStatus("Couldn’t process audio. Tap mic to try again or type below.");
        }
      };

      recorder.stop();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setVoiceStatus("");
    }
  };

  // -------------------------------------------------------------
  // ENGINE 2: WEB SPEECH API MODE (Browser Native)
  // -------------------------------------------------------------
  const startWebSpeechListening = () => {
    setPermError(null);
    latestTranscriptRef.current = "";

    const Recognition = recognitionWindow?.SpeechRecognition || recognitionWindow?.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceStatus("Web Speech not supported in this browser. Switching to Whisper AI mode.");
      setEngineMode("whisper");
      startWhisperListening();
      return;
    }

    try {
      const recognition = new Recognition();
      recognition.continuous = false; // Auto-stops on sentence boundary
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: VoiceResultEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript + " ";
          } else {
            interim += res[0].transcript;
          }
        }
        const text = (final + interim).trim();
        if (text) {
          setInput(text);
          latestTranscriptRef.current = text;
          setVoiceStatus(`Hearing: "${text}"`);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Web Speech error:", event.error);
        if (event.error === "network") {
          setVoiceStatus("Web Speech network error. Switching automatically to Whisper AI.");
          setEngineMode("whisper");
          setIsListening(false);
          setTimeout(() => startWhisperListening(), 400);
        } else if (event.error === "not-allowed") {
          setPermError("Microphone access denied in browser settings.");
          setIsListening(false);
        } else {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalTxt = latestTranscriptRef.current.trim();
        if (finalTxt) {
          askQuestion(finalTxt);
        } else {
          setVoiceStatus("No speech detected. Try again or type below.");
        }
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      setVoiceStatus("Listening... speak your question now");
      recognition.start();
    } catch (e) {
      console.warn("SpeechRecognition failed to start:", e);
      setEngineMode("whisper");
      startWhisperListening();
    }
  };

  const stopWebSpeechListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (engineMode === "whisper") {
        stopWhisperListening();
      } else {
        stopWebSpeechListening();
      }
    } else {
      if (engineMode === "whisper") {
        startWhisperListening();
      } else {
        startWebSpeechListening();
      }
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const totalPages = activeReport?.pages?.length || 4;
  const findingsOnPage = findings.filter((f) => f.page === activePage);

  return (
    <main className="voice-page">
      <ReportToolsBar />
      <header className="voice-header">
        <Link className="onboarding-brand" to="/">
          <span className="onboarding-brand-mark">
            <span />
            <span />
            <span />
          </span>
          MedCorpus
        </Link>
        <div className="voice-header-title">
          <span className="voice-live-dot" />
          <span>
            <strong>Report voice assistant</strong>
            <small>Answers grounded in {activeReport?.file_name || "your report"}</small>
          </span>
        </div>
        <div className="voice-header-actions">
          <Link to="/start">Upload new report</Link>
        </div>
      </header>

      <div className="voice-layout">
        <section className="voice-conversation">
          <div className="voice-conversation-head">
            <span className="voice-assistant-mark">
              <Icon name="sparkles" size={20} />
            </span>
            <div>
              <span>MedCorpus assistant</span>
              <strong>Ask about your results</strong>
            </div>
            <span className="report-connected">
              <Icon name="check" size={12} /> Report connected
            </span>
          </div>

          <div className="voice-messages">
            {messages.map((message) => (
              <div className={`voice-message ${message.role}`} key={message.id}>
                {message.role === "assistant" && (
                  <span className="message-avatar">
                    <Icon name="sparkles" size={15} />
                  </span>
                )}
                <div>
                  <p>{message.text}</p>
                  {message.source && (
                    <button
                      onClick={() =>
                        document.querySelector(".voice-source-panel")?.scrollIntoView({
                          behavior: "smooth",
                        })
                      }
                    >
                      <Icon name="document" size={13} />
                      {message.source}
                      <Icon name="arrow" size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="voice-controls">
            {/* Engine switcher */}
            <div className="voice-engine-switch">
              <span>
                Engine: {engineMode === "whisper" ? "⚡ Whisper AI (Recommended)" : "🎙️ Web Speech API"}
              </span>
              <button
                type="button"
                onClick={() => {
                  stopAllMedia();
                  setIsListening(false);
                  setEngineMode(engineMode === "whisper" ? "web_speech" : "whisper");
                  setVoiceStatus("");
                }}
              >
                Switch to {engineMode === "whisper" ? "Web Speech" : "Whisper AI"}
              </button>
            </div>

            {permError && (
              <div className="voice-perm-banner">
                <strong>Microphone Permission Required</strong>
                <p>{permError}</p>
                <div className="voice-perm-banner-actions">
                  <button type="button" onClick={() => startWhisperListening()}>
                    Try Microphone Again
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setPermError(null);
                      askQuestion("What was my Vitamin D result?");
                    }}
                  >
                    Simulate Voice Question
                  </button>
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="suggested-questions">
                <span>Try asking</span>
                <div>
                  {sampleQuestions.map((question) => (
                    <button key={question} onClick={() => askQuestion(question)}>
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`listening-status ${isListening ? "active" : ""}`}>
              <div className="voice-wave" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const scale = isListening && audioLevel > 5
                    ? Math.max(0.6, (audioLevel / 40) * (bar % 2 === 0 ? 1.3 : 0.8))
                    : 1;
                  return (
                    <span
                      key={bar}
                      style={isListening ? { transform: `scaleY(${scale})` } : undefined}
                    />
                  );
                })}
              </div>
              <span>
                {voiceStatus ||
                  (isListening
                    ? "Listening... speak now (auto-sends when done)"
                    : isTranscribing
                    ? "Transcribing with Whisper AI..."
                    : "Tap the microphone to speak")}
              </span>
            </div>

            <button
              aria-label={isListening ? "Stop listening and send" : "Start microphone"}
              className={`main-mic-button ${isListening ? "active" : ""}`}
              onClick={toggleListening}
              type="button"
              title={isListening ? "Tap to stop & analyze" : "Tap to speak into microphone"}
            >
              <Icon name={isListening ? "check" : "mic"} size={28} />
              <span className="mic-ring ring-one" />
              <span className="mic-ring ring-two" />
            </button>

            <form className="voice-text-form" onSubmit={handleSubmit}>
              <input
                aria-label="Type a question about the report"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Or type a question about this report..."
                value={input}
              />
              <button aria-label="Send question" disabled={!input.trim()} type="submit">
                <Icon name="arrow" size={17} />
              </button>
            </form>

            {isSpeaking && (
              <button className="stop-speaking" onClick={stopSpeaking}>
                <span className="speaking-bars">
                  <i />
                  <i />
                  <i />
                </span>
                Assistant is speaking · Stop
              </button>
            )}
          </div>
        </section>

        <aside className="voice-source-panel">
          <div className="voice-source-head">
            <span>
              <Icon name="document" size={16} />
              Source evidence
            </span>
            <span>Page {activePage} of {totalPages}</span>
          </div>

          <div className="voice-report-context">
            <div className="voice-report-file">
              <span className="report-mini-icon">
                <Icon name="document" size={18} />
              </span>
              <span>
                <strong>{activeReport?.report_title || activeReport?.file_name || "Diagnostic Report"}</strong>
                <small>{activeReport?.report_date || "Current report"}</small>
              </span>
              <span className="verified-badge">
                <Icon name="check" size={11} /> Verified
              </span>
            </div>

            <div className="voice-source-document">
              <div className="voice-doc-head">
                <span>{activeReport?.lab_name?.slice(0, 2).toUpperCase() || "MC"}</span>
                <div>
                  <strong>{activeReport?.lab_name || "Diagnostic Laboratory"}</strong>
                  <small>Clinical Laboratory Services</small>
                </div>
              </div>
              <div className="voice-doc-meta">
                <span>Patient: <strong>{activeReport?.patient_name || "Patient"}</strong></span>
                <span>Report: <strong>{activeReport?.id?.toUpperCase().slice(0, 12) || "REPORT"}</strong></span>
              </div>
              <h2>Page {activePage} Findings</h2>
              <div className="voice-doc-table">
                <div>
                  <strong>Investigation</strong>
                  <strong>Result</strong>
                  <strong>Reference</strong>
                </div>
                {findingsOnPage.length > 0 ? (
                  findingsOnPage.map((f) => (
                    <div
                      className={highlight === f.name ? `active ${f.status !== "Normal" ? "warning" : ""}` : ""}
                      key={f.id}
                      onClick={() => setHighlight(f.name)}
                    >
                      <span>{f.name}</span>
                      <span>{f.value}</span>
                      <span>{f.range}</span>
                    </div>
                  ))
                ) : (
                  findings.map((f) => (
                    <div
                      className={highlight === f.name ? `active ${f.status !== "Normal" ? "warning" : ""}` : ""}
                      key={f.id}
                      onClick={() => setHighlight(f.name)}
                    >
                      <span>{f.name}</span>
                      <span>{f.value}</span>
                      <span>{f.range}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="voice-safety-note">
            <Icon name="shield" size={16} />
            <span>
              <strong>Evidence-only answers</strong>
              The assistant answers strictly from this report and cites exact passages.
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
