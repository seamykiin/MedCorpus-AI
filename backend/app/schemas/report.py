from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, AliasChoices

class FindingResponse(BaseModel):
    id: str
    name: str
    category: Optional[str] = "General"
    value: str
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    range: str
    ref_min: Optional[float] = None
    ref_max: Optional[float] = None
    status: str  # Normal, Low, High, Critical
    page: int
    position: float
    explanation: str
    detail: str
    matched_quote: str
    is_exact_match: bool = True
    is_overridden: Optional[bool] = False
    override_notes: Optional[str] = None

    class Config:
        from_attributes = True

class TrendResponse(BaseModel):
    label: str
    tested: float
    previous: Optional[float] = None
    normalMin: float = Field(validation_alias=AliasChoices("normalMin", "normal_min"))
    normalMax: float = Field(validation_alias=AliasChoices("normalMax", "normal_max"))
    chartMin: float = Field(validation_alias=AliasChoices("chartMin", "chart_min"))
    chartMax: float = Field(validation_alias=AliasChoices("chartMax", "chart_max"))
    unit: str

    class Config:
        from_attributes = True
        populate_by_name = True

class FlagResponse(BaseModel):
    id: str
    level: str
    title: str
    detail: str
    sources: List[str]
    suggested_step: Optional[str] = None
    resolved: bool = Field(default=False, validation_alias=AliasChoices("resolved", "is_resolved"))

    class Config:
        from_attributes = True
        populate_by_name = True

class ReportPageResponse(BaseModel):
    page_number: int
    page_title: Optional[str] = None
    extracted_text: str
    has_table: bool = False
    table_data: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class ReportSummaryResponse(BaseModel):
    id: str
    file_name: str
    report_title: str
    patient_name: str
    patient_age: str
    patient_sex: str
    doctor_name: str
    lab_name: str
    report_date: str
    total_findings: int
    normal_count: int
    abnormal_count: int
    normality_percentage: float
    overall_summary_text: str
    is_verified: bool
    clinician_signed_off: Optional[bool] = False
    signed_off_by: Optional[str] = None
    signed_off_at: Optional[str] = None
    clinician_notes: Optional[str] = None
    file_url: Optional[str] = None
    findings: List[FindingResponse]
    trends: List[TrendResponse]
    flags: List[FlagResponse]
    pages: List[ReportPageResponse]

    class Config:
        from_attributes = True

class ReportUploadResponse(BaseModel):
    success: bool
    message: str
    report_id: str
    summary: ReportSummaryResponse

class ReportOverrideRequest(BaseModel):
    finding_id: str
    new_value: str
    new_range: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ReportSignoffRequest(BaseModel):
    doctor_name: str
    license_number: Optional[str] = None
    notes: Optional[str] = None

class ReportPatientQARequest(BaseModel):
    question: str

class ReportPatientQAResponse(BaseModel):
    question: str
    answer: str
    grounded_findings: List[str]
    disclaimer: str
    provider: Optional[str] = None
    model: Optional[str] = None

