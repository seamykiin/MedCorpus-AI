from typing import Optional
from pydantic import BaseModel

class ExplainRequest(BaseModel):
    text: str
    language: str = "English"  # English, Hindi, Kannada, Spanish, French, German
    mode: str = "layman"      # layman (simple) or clinical
    report_id: Optional[str] = None

class ExplainResponse(BaseModel):
    selected_text: str
    topic: str
    language: str
    mode: str
    explanation: str
    clinical_note: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    latency_ms: Optional[int] = None
    is_simulated: Optional[bool] = None
    disclaimer: str = "AI-assisted explanation · Verify against the original report · Not a medical diagnosis"
