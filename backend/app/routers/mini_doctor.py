from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models.report import Report
from backend.app.schemas.mini_doctor import (
    WellnessPlanResponse,
    MiniDoctorChatRequest,
    MiniDoctorChatResponse
)
from backend.app.services.mini_doctor import mini_doctor_service
from backend.app.utils.sample_data import SAMPLE_REPORT_ID, SAMPLE_FINDINGS, SAMPLE_REPORT_METADATA

router = APIRouter(prefix="/api/mini-doctor", tags=["Mini Doctor Box"])

async def _get_report_or_fallback(report_id: Optional[str], db: AsyncSession) -> Optional[Report]:
    if not report_id or report_id in ["latest", "recent", SAMPLE_REPORT_ID, "null", "undefined"]:
        res = await db.execute(
            select(Report).where(Report.is_sample == False).order_by(Report.created_at.desc())
        )
        report = res.scalars().first()
        if report:
            return report
        report_id = SAMPLE_REPORT_ID

    if report_id == SAMPLE_REPORT_ID:
        res = await db.execute(select(Report).where(Report.id == SAMPLE_REPORT_ID))
        report = res.scalars().first()
        return report

    res = await db.execute(select(Report).where(Report.id == report_id))
    return res.scalars().first()

@router.get("/plans", response_model=WellnessPlanResponse)
@router.get("/plans/{report_id}", response_model=WellnessPlanResponse)
async def get_wellness_plans(
    report_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns AI-generated wellness suggestions: routine, diet, and nutrition
    grounded directly in the findings of the uploaded diagnostic PDF.
    """
    report = await _get_report_or_fallback(report_id, db)

    if report:
        findings_data = [
            {
                "id": f.id,
                "name": f.name,
                "value": f.value,
                "range": f.reference_range,
                "status": f.status,
                "page": f.page_number,
                "matched_quote": f.matched_quote
            }
            for f in report.findings
        ]
        patient_name = report.patient_name
        lab_name = report.lab_name
        rep_id = report.id
        rep_title = report.file_name or report.report_title
    else:
        findings_data = SAMPLE_FINDINGS
        patient_name = SAMPLE_REPORT_METADATA["patient_name"]
        lab_name = SAMPLE_REPORT_METADATA["lab_name"]
        rep_id = SAMPLE_REPORT_ID
        rep_title = SAMPLE_REPORT_METADATA["file_name"]

    res = await mini_doctor_service.get_wellness_plans(
        findings=findings_data,
        patient_name=patient_name,
        lab_name=lab_name,
        report_id=rep_id,
        report_title=rep_title
    )

    return WellnessPlanResponse(
        report_id=res["report_id"],
        report_title=res.get("report_title"),
        patient_name=res.get("patient_name"),
        abnormal_findings=res["abnormal_findings"],
        all_findings=res.get("all_findings"),
        plans=res["plans"],
        disclaimer=res["disclaimer"]
    )

@router.post("/chat", response_model=MiniDoctorChatResponse)
async def chat_mini_doctor(
    req: MiniDoctorChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Interactive Q&A with Mini Doctor assistant for routine, diet, and nutrition guidance
    strictly grounded in the uploaded report's findings.
    """
    report = await _get_report_or_fallback(req.report_id, db)

    if report:
        findings_data = [
            {
                "id": f.id,
                "name": f.name,
                "value": f.value,
                "range": f.reference_range,
                "status": f.status,
                "page": f.page_number,
                "matched_quote": f.matched_quote
            }
            for f in report.findings
        ]
        patient_name = report.patient_name
        lab_name = report.lab_name
        rep_id = report.id
    else:
        findings_data = SAMPLE_FINDINGS
        patient_name = SAMPLE_REPORT_METADATA["patient_name"]
        lab_name = SAMPLE_REPORT_METADATA["lab_name"]
        rep_id = SAMPLE_REPORT_ID

    res = await mini_doctor_service.answer_question(
        question=req.question,
        findings=findings_data,
        context_finding=req.context_finding,
        patient_name=patient_name,
        lab_name=lab_name,
        report_id=rep_id
    )

    return MiniDoctorChatResponse(
        question=req.question,
        answer=res["answer"],
        role="assistant",
        context_used=res.get("context_used"),
        provider=res.get("provider"),
        model=res.get("model"),
        latency_ms=res.get("latency_ms"),
        is_simulated=res.get("is_simulated"),
        disclaimer=res["disclaimer"]
    )
