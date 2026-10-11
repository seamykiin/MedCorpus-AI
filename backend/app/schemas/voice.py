from typing import Optional, List
from pydantic import BaseModel

class VoiceQueryRequest(BaseModel):
    report_id: Optional[str] = "sample-report-001"
    question: str
    language: Optional[str] = "en-US"

class VoiceQueryResponse(BaseModel):
    question: str
    text: str
    source: str
    page: int
    highlight: str
    is_grounded: bool = True
    provider: Optional[str] = None
    model: Optional[str] = None
    latency_ms: Optional[int] = None
    is_simulated: Optional[bool] = False
    audio_base64: Optional[str] = None
    suggested_followups: Optional[List[str]] = None

