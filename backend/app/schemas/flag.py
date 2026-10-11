from typing import List, Optional
from pydantic import BaseModel
from backend.app.schemas.report import FlagResponse

class ResolveFlagRequest(BaseModel):
    is_resolved: bool = True
    user_note: Optional[str] = None

class FlagUpdateResponse(BaseModel):
    flag_id: str
    is_resolved: bool
    message: str
