import { useState, useEffect } from "react";
import { api, type LLMStatusResponse, type LLMTestResponse } from "../services/api";
import { Icon } from "../pages/HomePage";

interface AIEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: LLMStatusResponse) => void;
}

export default function AIEngineModal({ isOpen, onClose, onStatusChange }: AIEngineModalProps) {
  const [status, setStatus] = useState<LLMStatusResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  
  // Gemini fields
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [geminiModel, setGeminiModel] = useState<string>("gemini-1.5-flash");
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);

  // Local fields
  const [localUrl, setLocalUrl] = useState<string>("http://localhost:11434/v1");
  const [localModel, setLocalModel] = useState<string>("medcorpus-local");

  // Groq fields
  const [groqKey, setGroqKey] = useState<string>("");

  // Testing & Saving states
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<LLMTestResponse | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setTestResult(null);
      setSaveMessage(null);
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const res = await api.getLLMStatus();
      setStatus(res);
      setSelectedProvider(res.active_provider || "gemini");
      if (res.available_providers) {
        const localP = res.available_providers.find((p) => p.id === "local");
        if (localP && localP.url) setLocalUrl(localP.url);
        if (localP && localP.model) setLocalModel(localP.model);
      }
      if (onStatusChange) onStatusChange(res);
    } catch (e) {
      console.warn("Failed to load LLM status:", e);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSaveMessage(null);
    try {
      // First apply temporary config if user changed it in form
      await api.updateLLMConfig({
        provider: selectedProvider,
        gemini_key: selectedProvider === "gemini" && geminiKey ? geminiKey : undefined,
        gemini_model: selectedProvider === "gemini" ? geminiModel : undefined,
        local_url: selectedProvider === "local" ? localUrl : undefined,
        local_model: selectedProvider === "local" ? localModel : undefined,
        groq_key: selectedProvider === "groq" && groqKey ? groqKey : undefined,
        persist_to_env: false,
      });

      const res = await api.testLLM("Summarize clinical importance of Vitamin D.");
      setTestResult(res);
      const updated = await api.getLLMStatus();
      setStatus(updated);
      if (onStatusChange) onStatusChange(updated);
    } catch (e: any) {
      alert(`Connection test failed: ${e.message || e}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndApply = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.updateLLMConfig({
        provider: selectedProvider,
        gemini_key: selectedProvider === "gemini" && geminiKey ? geminiKey : undefined,
        gemini_model: selectedProvider === "gemini" ? geminiModel : undefined,
        local_url: selectedProvider === "local" ? localUrl : undefined,
        local_model: selectedProvider === "local" ? localModel : undefined,
        groq_key: selectedProvider === "groq" && groqKey ? groqKey : undefined,
        persist_to_env: true,
      });
      setStatus(res.status);
      setSaveMessage(`Successfully activated ${selectedProvider.toUpperCase()} provider!`);
      if (onStatusChange) onStatusChange(res.status);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      alert(`Failed to save AI configuration: ${e.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <span className="ai-modal-icon">🤖</span>
            <div>
              <h3>AI Engine & LLM Switcher</h3>
              <p>Connect cloud APIs (Gemini) or switch to your locally trained LLM</p>
            </div>
          </div>
          <button className="ai-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Current Active Status Pill */}
        <div className="ai-status-banner">
          <div className="ai-status-left">
            <span
              className={`status-dot ${
                status?.is_configured ? "dot-online" : "dot-demo"
              }`}
            />
            <span>
              Active: <strong>{status?.active_provider?.toUpperCase()}</strong>
              {status?.active_model ? ` (${status.active_model})` : ""}
            </span>
          </div>
          <span className="ai-status-badge">
            {status?.is_configured ? "Ready for Live Inference" : "Fallback / Demo Mode"}
          </span>
        </div>

        {/* Provider Tabs */}
        <div className="ai-provider-tabs">
          <button
            type="button"
            className={`ai-tab-btn ${selectedProvider === "gemini" ? "active" : ""}`}
            onClick={() => setSelectedProvider("gemini")}
          >
            <span className="tab-icon">✨</span>
            Google Gemini API
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${selectedProvider === "local" ? "active" : ""}`}
            onClick={() => setSelectedProvider("local")}
          >
            <span className="tab-icon">💻</span>
            Locally Trained LLM
          </button>
          <button
            type="button"
            className={`ai-tab-btn ${selectedProvider === "groq" ? "active" : ""}`}
            onClick={() => setSelectedProvider("groq")}
          >
            <span className="tab-icon">⚡</span>
            Groq API
          </button>
        </div>

        {/* Tab 1: Gemini */}
        {selectedProvider === "gemini" && (
          <div className="ai-tab-content">
            <div className="ai-input-group">
              <label>
                Google Gemini API Key
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="ai-link"
                >
                  Get free key at Google AI Studio ↗
                </a>
              </label>
              <div className="ai-input-wrapper">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  placeholder={status?.is_configured && status.active_provider === "gemini" ? "•••••••••••••••••••••••• (Configured)" : "Paste your Gemini API key (AIzaSy...)"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="ai-text-input"
                />
                <button
                  type="button"
                  className="ai-toggle-vis"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? "Hide" : "Show"}
                </button>
              </div>
              <small className="ai-hint">
                Keys are stored securely in your local environment file (<code>.env</code>) and never shared.
              </small>
            </div>

            <div className="ai-input-group">
              <label>Model Version</label>
              <select
                className="ai-select-input"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast, high quota, recommended)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-gen fast)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep complex analysis)</option>
              </select>
            </div>
          </div>
        )}

        {/* Tab 2: Locally Trained LLM */}
        {selectedProvider === "local" && (
          <div className="ai-tab-content">
            <div className="local-model-explainer">
              <span className="explainer-icon">🧠</span>
              <div>
                <strong>MedCorpus Local Clinical Model (Active)</strong>
                <p>
                  Fine-tuned specifically for Problem Statement 17 (Fact vs Interpretation separation, plain-language translation, and Mini Doctor Box wellness guidance). Served locally on your Apple Silicon hardware via Ollama / OpenAI-compatible endpoint.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <button
                type="button"
                className="ai-preset-btn active"
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                }}
                onClick={() => {
                  setLocalUrl("http://localhost:11434/v1");
                  setLocalModel("medcorpus-local");
                }}
              >
                🦙 Active: medcorpus-local (Ollama Port 11434)
              </button>
            </div>

            <div className="ai-input-group">
              <label>Local Endpoint URL (OpenAI-compatible /v1)</label>
              <input
                type="text"
                className="ai-text-input"
                placeholder="http://localhost:8080/v1 or http://localhost:11434/v1"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
              />
              <small className="ai-hint">
                Example: <code>http://localhost:8080/v1</code> (PyTorch server) or <code>http://localhost:11434/v1</code> (Ollama).
              </small>
            </div>

            <div className="ai-input-group">
              <label>Local Model Tag / Name</label>
              <input
                type="text"
                className="ai-text-input"
                placeholder="medcorpus-local"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
              />
            </div>

            <div className="local-run-command-box">
              <code>python backend/local_llm/serve_local_model.py --model-path ./weights --port 8080</code>
            </div>
          </div>
        )}

        {/* Tab 3: Groq */}
        {selectedProvider === "groq" && (
          <div className="ai-tab-content">
            <div className="ai-input-group">
              <label>Groq API Key</label>
              <input
                type="password"
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="ai-text-input"
              />
              <small className="ai-hint">Ultra-fast inference using LLaMA-3.3-70b.</small>
            </div>
          </div>
        )}

        {/* Test Result Display */}
        {testResult && (
          <div className="ai-test-card">
            <div className="test-card-header">
              <span className="test-status-badge">
                ✔ Generated by {testResult.provider.toUpperCase()} ({testResult.model})
              </span>
              <span className="test-latency">{testResult.latency_ms} ms</span>
            </div>
            <p className="test-response-text">{testResult.response}</p>
          </div>
        )}

        {saveMessage && (
          <div className="ai-save-success">
            ✔ {saveMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="ai-modal-footer">
          <button
            type="button"
            className="ai-btn ai-btn-secondary"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? "Testing LLM..." : "⚡ Test Connection"}
          </button>
          <div className="ai-footer-right">
            <button type="button" className="ai-btn ai-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="ai-btn ai-btn-primary"
              onClick={handleSaveAndApply}
              disabled={isSaving}
            >
              {isSaving ? "Activating..." : "Save & Activate Engine"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
