from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models.report import Report, UncertaintyFlag
from backend.app.schemas.flag import ResolveFlagRequest, FlagUpdateResponse, FlagResponse
from backend.app.utils.sample_data import SAMPLE_FLAGS, SAMPLE_REPORT_ID
from backend.app.services.uncertainty import uncertainty_detector

router = APIRouter(prefix="/api/flags", tags=["Uncertainty & Conflict Flags"])

@router.get("", response_model=List[FlagResponse])
@router.get("/latest", response_model=List[FlagResponse])
async def get_latest_flags(db: AsyncSession = Depends(get_db)):
    """Returns uncertainty flags derived directly from the most recently uploaded report."""
    return await get_report_flags("latest", db=db)

@router.get("/{report_id}", response_model=List[FlagResponse])
async def get_report_flags(report_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns uncertainty flags extracted from the uploaded diagnostic PDF.
    If flags are not yet stored for an uploaded report, dynamically generates them
    from the report's parsed pages and findings.
    """
    target_report: Optional[Report] = None

    if report_id in ["latest", "recent", "", SAMPLE_REPORT_ID]:
        res = await db.execute(
            select(Report).where(Report.is_sample == False).order_by(Report.created_at.desc())
        )
        user_rep = res.scalars().first()
        if user_rep:
            target_report = user_rep
        elif report_id == SAMPLE_REPORT_ID:
            res = await db.execute(select(Report).where(Report.id == SAMPLE_REPORT_ID))
            target_report = res.scalars().first()
    else:
        res = await db.execute(select(Report).where(Report.id == report_id))
        target_report = res.scalars().first()

    if target_report and not target_report.is_sample:
        # Check existing flags in DB
        result = await db.execute(
            select(UncertaintyFlag).where(UncertaintyFlag.report_id == target_report.id)
        )
        flags = result.scalars().all()

        # If flags missing or empty, detect them directly from the report pages and findings
        if not flags:
            pages_data = [
                {"page_number": p.page_number, "extracted_text": p.extracted_text}
                for p in target_report.pages
            ]
            findings_data = [
                {
                    "name": f.name,
                    "value": f.value,
                    "range": f.reference_range,
                    "status": f.status,
                    "page": f.page_number,
                    "matched_quote": f.matched_quote
                }
                for f in target_report.findings
            ]
            doc_meta = {
                "lab_name": target_report.lab_name,
                "date": target_report.report_date,
                "patient_name": target_report.patient_name
            }
            new_flags = uncertainty_detector.detect_flags(pages_data, findings_data, doc_meta=doc_meta)

            for fl in new_flags:
                db_flag = UncertaintyFlag(
                    id=f"{target_report.id}-{fl['id']}",
                    report_id=target_report.id,
                    level=fl["level"],
                    title=fl["title"],
                    detail=fl["detail"],
                    sources=fl.get("sources", []),
                    suggested_step=fl.get("suggested_step"),
                    is_resolved=fl.get("resolved", False)
                )
                db.add(db_flag)
            await db.commit()

            result = await db.execute(
                select(UncertaintyFlag).where(UncertaintyFlag.report_id == target_report.id)
            )
            flags = result.scalars().all()

        return [
            FlagResponse(
                id=f.id,
                level=f.level,
                title=f.title,
                detail=f.detail,
                sources=f.sources or [],
                suggested_step=f.suggested_step,
                resolved=f.is_resolved
            ) for f in flags
        ]

    # Sample report check
    result = await db.execute(select(UncertaintyFlag).where(UncertaintyFlag.report_id == SAMPLE_REPORT_ID))
    db_sample_flags = result.scalars().all()
    if db_sample_flags:
        return [
            FlagResponse(
                id=f.id,
                level=f.level,
                title=f.title,
                detail=f.detail,
                sources=f.sources or [],
                suggested_step=f.suggested_step,
                resolved=f.is_resolved
            ) for f in db_sample_flags
        ]

    return [FlagResponse.model_validate(f) for f in SAMPLE_FLAGS]

@router.post("/{flag_id}/resolve", response_model=FlagUpdateResponse)
async def toggle_resolve_flag(flag_id: str, req: ResolveFlagRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UncertaintyFlag).where(UncertaintyFlag.id == flag_id))
    flag = result.scalars().first()
    if flag:
        flag.is_resolved = req.is_resolved
        await db.commit()

    return FlagUpdateResponse(
        flag_id=flag_id,
        is_resolved=req.is_resolved,
        message="Flag status updated successfully."
    )
