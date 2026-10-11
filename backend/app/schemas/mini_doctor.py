from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class WellnessPlanResponse(BaseModel):
    report_id: str
    report_title: Optional[str] = None
    patient_name: Optional[str] = None
    abnormal_findings: List[str]
    all_findings: Optional[List[Dict[str, Any]]] = None
    plans: Dict[str, List[str]]
    disclaimer: str = "These suggestions are informational and grounded in verified findings. Always consult a qualified healthcare professional before modifying diet, medications, or routine."

class MiniDoctorChatRequest(BaseModel):
    report_id: Optional[str] = "sample-report-001"
    question: str
    selected_plan: Optional[str] = "Routine"
    context_finding: Optional[str] = None

class MiniDoctorChatResponse(BaseModel):
    question: str
    answer: str
    role: str = "assistant"
    context_used: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    latency_ms: Optional[int] = None
    is_simulated: Optional[bool] = False
    disclaimer: str = "Informational wellness suggestions only. Not a medical diagnosis or prescription."
