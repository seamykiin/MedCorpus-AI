const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export interface Finding {
  id: string;
  name: string;
  category?: string;
  value: string;
  numeric_value?: number;
  unit?: string;
  range: string;
  status: "Normal" | "Low" | "High" | "Critical" | string;
  page: number;
  position: number;
  explanation: string;
  detail: string;
  matched_quote: string;
  is_exact_match: boolean;
  is_overridden?: boolean;
  override_notes?: string;
}

export interface Trend {
  label: string;
  tested: number;
  previous: number | null;
  normalMin: number;
  normalMax: number;
  chartMin: number;
  chartMax: number;
  unit: string;
}

export interface Flag {
  id: string;
  level: "Conflict" | "Needs context" | "Missing" | "Critical" | string;
  title: string;
  detail: string;
  sources: string[];
  suggested_step?: string;
  resolved: boolean;
}

export interface ReportPage {
  page_number: number;
  page_title?: string;
  extracted_text: string;
  has_table: boolean;
  table_data?: Record<string, any>[];
}

export interface ReportSummary {
  id: string;
  file_name: string;
  report_title: string;
  patient_name: string;
  patient_age: string;
  patient_sex: string;
  doctor_name: string;
  lab_name: string;
  report_date: string;
  total_findings: number;
  normal_count: number;
  abnormal_count: number;
  normality_percentage: number;
  overall_summary_text: string;
  is_verified: boolean;
  clinician_signed_off?: boolean;
  signed_off_by?: string;
  signed_off_at?: string;
  clinician_notes?: string;
  file_url?: string;
  findings: Finding[];
  trends: Trend[];
  flags: Flag[];
  pages: ReportPage[];
}

export interface VoiceQueryResponse {
  question: string;
  text: string;
  source: string;
  page: number;
  highlight: string;
  is_grounded: boolean;
  suggested_followups?: string[];
}

export interface ExplainResponse {
  selected_text: string;
  topic: string;
  language: string;
  mode: string;
  explanation: string;
  clinical_note?: string;
  provider?: string;
  model?: string;
  latency_ms?: number;
  is_simulated?: boolean;
  disclaimer: string;
}

export interface WellnessPlanResponse {
  report_id: string;
  report_title?: string;
  patient_name?: string;
  abnormal_findings: string[];
  all_findings?: any[];
  plans: Record<string, string[]>;
  disclaimer: string;
}

export interface MiniDoctorChatResponse {
  question: string;
  answer: string;
  role: string;
  context_used?: string;
  provider?: string;
  model?: string;
  latency_ms?: number;
  is_simulated?: boolean;
  disclaimer: string;
}


export const api = {
  async getSampleReport(): Promise<ReportSummary> {
    const res = await fetch(`${API_BASE_URL}/api/reports/sample`);
    if (!res.ok) throw new Error("Failed to fetch sample report");
    return res.json();
  },

  async uploadReport(file: File, conditions: string[] = [], language = "English"): Promise<{ success: boolean; report_id: string; summary: ReportSummary }> {
    const formData = new FormData();
    formData.append("file", file);
    if (conditions.length > 0) {
      formData.append("conditions", conditions.join(","));
    }
    formData.append("language", language);

    const res = await fetch(`${API_BASE_URL}/api/reports/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload report");
    return res.json();
  },

  async getReportById(id: string): Promise<ReportSummary> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch report ${id}`);
    return res.json();
  },

  async getLatestReport(): Promise<ReportSummary | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/latest`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch latest report:", e);
    }
    return null;
  },

  async reanalyzeReport(id: string): Promise<ReportSummary> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${id}/reanalyze`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`Failed to reanalyze report ${id}`);
    return res.json();
  },

  async explainText(text: string, language = "English", mode: "layman" | "clinical" = "layman"): Promise<ExplainResponse> {
    const res = await fetch(`${API_BASE_URL}/api/plain-language/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, mode }),
    });
    if (!res.ok) throw new Error("Failed to explain text");
    return res.json();
  },

  async queryVoice(question: string, reportId = "latest"): Promise<VoiceQueryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/voice/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, report_id: reportId }),
    });
    if (!res.ok) throw new Error("Voice query failed");
    return res.json();
  },

  async transcribeAudio(audioBlob: Blob): Promise<{ text: string; success: boolean; provider?: string }> {
    const formData = new FormData();
    const file = new File([audioBlob], "speech.webm", { type: audioBlob.type || "audio/webm" });
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to transcribe audio");
    return res.json();
  },

  async getWellnessPlans(reportId?: string): Promise<WellnessPlanResponse> {
    const url = reportId
      ? `${API_BASE_URL}/api/mini-doctor/plans?report_id=${encodeURIComponent(reportId)}`
      : `${API_BASE_URL}/api/mini-doctor/plans`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to get wellness plans");
    return res.json();
  },

  async chatMiniDoctor(question: string, reportId?: string, contextFinding?: string): Promise<MiniDoctorChatResponse> {
    const res = await fetch(`${API_BASE_URL}/api/mini-doctor/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        report_id: reportId || "latest",
        context_finding: contextFinding
      }),
    });
    if (!res.ok) throw new Error("Mini doctor chat failed");
    return res.json();
  },

  async getFlags(reportId = "latest"): Promise<Flag[]> {
    const res = await fetch(`${API_BASE_URL}/api/flags/${reportId}`);
    if (!res.ok) throw new Error("Failed to get flags");
    return res.json();
  },

  async resolveFlag(flagId: string, isResolved = true): Promise<{ flag_id: string; is_resolved: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/flags/${flagId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_resolved: isResolved }),
    });
    if (!res.ok) throw new Error("Failed to update flag");
    return res.json();
  },



  async getLLMStatus(): Promise<LLMStatusResponse> {
    const res = await fetch(`${API_BASE_URL}/api/llm/status`);
    if (!res.ok) throw new Error("Failed to fetch LLM engine status");
    return res.json();
  },

  async updateLLMConfig(data: {
    provider?: string;
    gemini_key?: string;
    gemini_model?: string;
    local_url?: string;
    local_model?: string;
    groq_key?: string;
    openai_key?: string;
    persist_to_env?: boolean;
  }): Promise<{ success: boolean; message: string; status: LLMStatusResponse }> {
    const res = await fetch(`${API_BASE_URL}/api/llm/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update AI engine configuration");
    return res.json();
  },

  async testLLM(query?: string): Promise<LLMTestResponse> {
    const res = await fetch(`${API_BASE_URL}/api/llm/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error("LLM connection test failed");
    return res.json();
  },

  async getReportAISummary(reportId = "latest"): Promise<AISummaryResponse> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/ai-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to generate AI clinical summary");
    return res.json();
  },

  async overrideReportFinding(reportId: string, findingId: string, newValue: string, newRange?: string, status?: string, notes?: string): Promise<ReportSummary> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/override`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finding_id: findingId, new_value: newValue, new_range: newRange, status, notes }),
    });
    if (!res.ok) throw new Error("Failed to override report finding");
    return res.json();
  },

  async signoffReport(reportId: string, doctorName: string, licenseNumber?: string, notes?: string): Promise<ReportSummary> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/sign-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_name: doctorName, license_number: licenseNumber, notes }),
    });
    if (!res.ok) throw new Error("Failed to sign off on report");
    return res.json();
  },

  async askPatientQA(reportId: string, question: string): Promise<PatientQAResponse> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/patient-qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error("Failed to get answer from report assistant");
    return res.json();
  },

  async getPatientProfile(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/profile/me`);
    if (!res.ok) throw new Error("Failed to fetch patient profile");
    return res.json();
  },

  async updatePatientProfile(data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/profile/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },

  async getDoctorProfile(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/profile/doctor/me`);
    if (!res.ok) throw new Error("Failed to fetch doctor profile");
    return res.json();
  },

  async getDoctorPatients(role: "doctor" | "patient" = "doctor"): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/profile/doctor/patients`, {
      headers: { "X-User-Role": role }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch doctor patient roster");
    }
    return res.json();
  },

  async getPatientHistoryForDoctor(patientName: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/profile/doctor/patients/${encodeURIComponent(patientName)}`);
    if (!res.ok) throw new Error("Failed to fetch patient history");
    return res.json();
  },

  async saveDoctorNotes(patientName: string, notes: string, status = "Under Active Management", role: "doctor" | "patient" = "doctor"): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/profile/doctor/patients/${encodeURIComponent(patientName)}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Role": role,
      },
      body: JSON.stringify({ notes, status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save doctor notes");
    }
    return res.json();
  },

  async login(email: string, password: string, role?: string): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed");
    }
    const data: TokenResponse = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("medcorpus_token", data.access_token);
      localStorage.setItem("medcorpus_user", JSON.stringify(data.user));
    }
    return data;
  },

  async signup(payload: {
    name: string;
    email: string;
    password: string;
    role: "patient" | "doctor";
    specialty?: string;
    license_number?: string;
    hospital_affiliation?: string;
    age?: number;
    blood_group?: string;
  }): Promise<TokenResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Sign up failed");
    }
    const data: TokenResponse = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("medcorpus_token", data.access_token);
      localStorage.setItem("medcorpus_user", JSON.stringify(data.user));
    }
    return data;
  },

  getCurrentUser(): UserOut | null {
    if (typeof window === "undefined") return null;
    const str = localStorage.getItem("medcorpus_user");
    if (!str) return null;
    try {
      return JSON.parse(str) as UserOut;
    } catch {
      return null;
    }
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("medcorpus_token");
      localStorage.removeItem("medcorpus_user");
    }
  },
};

export interface UserOut {
  id: number;
  email: string;
  name?: string;
  role: string;
  is_active: boolean;
  specialty?: string;
  license_number?: string;
  hospital_affiliation?: string;
  age?: number;
  blood_group?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export interface LLMProviderInfo {
  id: string;
  name: string;
  model: string;
  url?: string;
  is_ready: boolean;
  description: string;
}

export interface LLMStatusResponse {
  active_provider: string;
  active_model: string;
  is_configured: boolean;
  available_providers: LLMProviderInfo[];
}

export interface LLMTestResponse {
  query: string;
  response: string;
  provider: string;
  model: string;
  latency_ms: number;
  is_simulated: boolean;
}

export interface AISummaryResponse {
  text: string;
  provider: string;
  model: string;
  latency_ms: number;
  is_simulated: boolean;
}

export interface PatientQAResponse {
  question: string;
  answer: string;
  grounded_findings: string[];
  sources?: string[];
  disclaimer: string;
  provider?: string;
  model?: string;
}


