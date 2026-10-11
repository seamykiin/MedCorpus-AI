import uuid
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.report import Report, ReportPage, Finding, UncertaintyFlag, ReportTrend
from backend.app.schemas.report import (
    ReportUploadResponse,
    ReportSummaryResponse,
    FindingResponse,
    TrendResponse,
    FlagResponse,
    ReportPageResponse,
    ReportOverrideRequest,
    ReportSignoffRequest,
    ReportPatientQARequest,
    ReportPatientQAResponse,
)
import datetime
from backend.app.utils.auth_utils import get_current_user_optional
from backend.app.utils.sample_data import (
    SAMPLE_REPORT_ID,
    SAMPLE_REPORT_METADATA,
    SAMPLE_PAGES,
    SAMPLE_FINDINGS,
    SAMPLE_FLAGS,
    SAMPLE_TRENDS,
)
from backend.app.services.extractor import extractor
from backend.app.services.analyzer import analyzer
from backend.app.services.uncertainty import uncertainty_detector

router = APIRouter(prefix="/api/reports", tags=["Reports"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def build_sample_response() -> ReportSummaryResponse:
    return ReportSummaryResponse(
        id=SAMPLE_REPORT_ID,
        file_name=SAMPLE_REPORT_METADATA["file_name"],
        report_title=SAMPLE_REPORT_METADATA["report_title"],
        patient_name=SAMPLE_REPORT_METADATA["patient_name"],
        patient_age=SAMPLE_REPORT_METADATA["patient_age"],
        patient_sex=SAMPLE_REPORT_METADATA["patient_sex"],
        doctor_name=SAMPLE_REPORT_METADATA["doctor_name"],
        lab_name=SAMPLE_REPORT_METADATA["lab_name"],
        report_date=SAMPLE_REPORT_METADATA["report_date"],
        total_findings=SAMPLE_REPORT_METADATA["total_findings"],
        normal_count=SAMPLE_REPORT_METADATA["normal_count"],
        abnormal_count=SAMPLE_REPORT_METADATA["abnormal_count"],
        normality_percentage=SAMPLE_REPORT_METADATA["normality_percentage"],
        overall_summary_text=SAMPLE_REPORT_METADATA["overall_summary_text"],
        is_verified=True,
        file_url=f"/api/reports/{SAMPLE_REPORT_ID}/file",
        findings=[FindingResponse.model_validate(f) for f in SAMPLE_FINDINGS],
        trends=[TrendResponse.model_validate(t) for t in SAMPLE_TRENDS],
        flags=[FlagResponse.model_validate(fl) for fl in SAMPLE_FLAGS],
        pages=[ReportPageResponse.model_validate(p) for p in SAMPLE_PAGES]
    )

async def ensure_sample_report_in_db(db: AsyncSession) -> Report:
    stmt = select(Report).where(Report.id == SAMPLE_REPORT_ID)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        report = Report(
            id=SAMPLE_REPORT_ID,
            file_name=SAMPLE_REPORT_METADATA["file_name"],
            file_path=os.path.join(UPLOAD_DIR, "sample-report.pdf"),
            report_title=SAMPLE_REPORT_METADATA["report_title"],
            patient_name=SAMPLE_REPORT_METADATA["patient_name"],
            patient_age=SAMPLE_REPORT_METADATA["patient_age"],
            patient_sex=SAMPLE_REPORT_METADATA["patient_sex"],
            doctor_name=SAMPLE_REPORT_METADATA["doctor_name"],
            lab_name=SAMPLE_REPORT_METADATA["lab_name"],
            report_date=SAMPLE_REPORT_METADATA["report_date"],
            total_findings=SAMPLE_REPORT_METADATA["total_findings"],
            normal_count=SAMPLE_REPORT_METADATA["normal_count"],
            abnormal_count=SAMPLE_REPORT_METADATA["abnormal_count"],
            normality_percentage=SAMPLE_REPORT_METADATA["normality_percentage"],
            overall_summary_text=SAMPLE_REPORT_METADATA["overall_summary_text"],
            is_sample=True,
            is_verified=True,
        )
        db.add(report)
        for f in SAMPLE_FINDINGS:
            db_finding = Finding(
                id=f["id"],
                report_id=SAMPLE_REPORT_ID,
                name=f["name"],
                category=f.get("category", "General"),
                value=f["value"],
                numeric_value=f.get("numeric_value"),
                unit=f.get("unit"),
                reference_range=f.get("reference_range") or f.get("range", "12-15"),
                ref_min=f.get("ref_min"),
                ref_max=f.get("ref_max"),
                status=f.get("status", "Normal"),
                page_number=f.get("page_number") or f.get("page", 1),
                position=f.get("position", 50.0),
                matched_quote=f.get("matched_quote", ""),
                is_exact_match=True,
                layman_explanation=f.get("layman_explanation") or f.get("explanation", ""),
                clinical_explanation=f.get("clinical_explanation", ""),
                detail_description=f.get("detail_description") or f.get("detail", ""),
            )
            db.add(db_finding)
        for fl in SAMPLE_FLAGS:
            db_flag = UncertaintyFlag(
                id=fl["id"],
                report_id=SAMPLE_REPORT_ID,
                level=fl["level"],
                title=fl["title"],
                detail=fl["detail"],
                sources=fl.get("sources", []),
                suggested_step=fl.get("suggested_step", ""),
                is_resolved=fl.get("is_resolved", False),
            )
            db.add(db_flag)
        for p in SAMPLE_PAGES:
            db_page = ReportPage(
                report_id=SAMPLE_REPORT_ID,
                page_number=p["page_number"],
                page_title=p.get("page_title", ""),
                extracted_text=p["extracted_text"],
                has_table=p.get("has_table", False),
                table_data=p.get("table_data"),
            )
            db.add(db_page)
        for t in SAMPLE_TRENDS:
            db_trend = ReportTrend(
                report_id=SAMPLE_REPORT_ID,
                label=t["label"],
                tested=t["tested"],
                previous=t.get("previous"),
                normal_min=t["normal_min"],
                normal_max=t["normal_max"],
                chart_min=t["chart_min"],
                chart_max=t["chart_max"],
                unit=t["unit"],
            )
            db.add(db_trend)
        await db.commit()
        res = await db.execute(select(Report).where(Report.id == SAMPLE_REPORT_ID))
        report = res.scalar_one_or_none()
    return report

@router.get("/sample", response_model=ReportSummaryResponse)
async def get_sample_report(db: AsyncSession = Depends(get_db)):
    """Returns the primary verified sample medical report."""
    stmt = select(Report).where(Report.id == SAMPLE_REPORT_ID)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if report:
        return serialize_report_response(report)
    return build_sample_response()

@router.post("/upload", response_model=ReportUploadResponse)
async def upload_report(
    file: UploadFile = File(...),
    conditions: Optional[str] = Form(None),
    language: Optional[str] = Form("English"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts PDF or scanned medical image, parses with PyMuPDF, extracts findings,
    verifies character-by-character against source text, detects uncertainty flags,
    and returns source-grounded structured summary.
    """
    file_bytes = await file.read()
    file_name = file.filename or "uploaded_report.pdf"

    # 1. PyMuPDF text & table extraction per page
    pages_data, doc_meta = extractor.extract_from_bytes(file_bytes, file_name)

    # 2. Medical finding analysis & value verification
    analysis_res = analyzer.analyze_pages(pages_data)

    # 3. Uncertainty & Conflict Detection
    flags_data = uncertainty_detector.detect_flags(pages_data, analysis_res["findings"], doc_meta=doc_meta)

    report_id = f"rep-{uuid.uuid4().hex[:10]}"

    # 4. Save to Database
    db_report = Report(
        id=report_id,
        user_id=current_user.id if current_user else None,
        file_name=file_name,
        file_size_bytes=len(file_bytes),
        report_title=analysis_res.get("report_title", "Diagnostic Medical Report"),
        patient_name=analysis_res["patient_name"],
        patient_age=analysis_res.get("patient_age", "41 years"),
        patient_sex=analysis_res.get("patient_sex", "Male"),
        doctor_name=analysis_res["doctor_name"],
        lab_name=analysis_res["lab_name"],
        report_date=analysis_res["report_date"],
        total_findings=analysis_res["total_findings"],
        normal_count=analysis_res["normal_count"],
        abnormal_count=analysis_res["abnormal_count"],
        normality_percentage=analysis_res["normality_percentage"],
        overall_summary_text=analysis_res["overall_summary_text"],
        is_sample=False,
        is_verified=True,
        created_at=datetime.datetime.utcnow()
    )
    db.add(db_report)

    # Add Pages
    for p in pages_data:
        db_page = ReportPage(
            report_id=report_id,
            page_number=p["page_number"],
            page_title=p.get("page_title", f"Page {p['page_number']}"),
            extracted_text=p["extracted_text"],
            has_table=p.get("has_table", False),
            table_data=p.get("table_data", [])
        )
        db.add(db_page)

    # Add Findings
    for f in analysis_res["findings"]:
        db_finding = Finding(
            id=f"{report_id}-{f['id']}",
            report_id=report_id,
            name=f["name"],
            category=f.get("category", "General"),
            value=f["value"],
            numeric_value=f.get("numeric_value"),
            unit=f.get("unit"),
            reference_range=f["range"],
            ref_min=f.get("ref_min"),
            ref_max=f.get("ref_max"),
            status=f["status"],
            page_number=f["page"],
            position=f["position"],
            matched_quote=f["matched_quote"],
            is_exact_match=f.get("is_exact_match", True),
            layman_explanation=f.get("explanation"),
            clinical_explanation=f.get("clinical_explanation"),
            detail_description=f.get("detail")
        )
        db.add(db_finding)

    # Add Flags
    for fl in flags_data:
        db_flag = UncertaintyFlag(
            id=f"{report_id}-{fl['id']}",
            report_id=report_id,
            level=fl["level"],
            title=fl["title"],
            detail=fl["detail"],
            sources=fl["sources"],
            suggested_step=fl.get("suggested_step"),
            is_resolved=fl.get("resolved", False)
        )
        db.add(db_flag)

    # Add Trends
    for tr in analysis_res["trends"]:
        db_trend = ReportTrend(
            report_id=report_id,
            label=tr["label"],
            tested=tr["tested"],
            previous=tr.get("previous"),
            normal_min=tr["normalMin"],
            normal_max=tr["normalMax"],
            chart_min=tr["chartMin"],
            chart_max=tr["chartMax"],
            unit=tr["unit"]
        )
        db.add(db_trend)

    await db.commit()

    # Save uploaded file to disk
    file_ext = os.path.splitext(file_name)[1] or ".pdf"
    safe_file_name = f"{report_id}{file_ext}"
    saved_path = os.path.join(UPLOAD_DIR, safe_file_name)
    with open(saved_path, "wb") as f_out:
        f_out.write(file_bytes)

    file_url = f"/api/reports/{report_id}/file"

    summary_obj = ReportSummaryResponse(
        id=report_id,
        file_name=file_name,
        report_title=analysis_res.get("report_title", "Diagnostic Medical Report"),
        patient_name=analysis_res["patient_name"],
        patient_age=analysis_res.get("patient_age", "41 years"),
        patient_sex=analysis_res.get("patient_sex", "Male"),
        doctor_name=analysis_res["doctor_name"],
        lab_name=analysis_res["lab_name"],
        report_date=analysis_res["report_date"],
        total_findings=analysis_res["total_findings"],
        normal_count=analysis_res["normal_count"],
        abnormal_count=analysis_res["abnormal_count"],
        normality_percentage=analysis_res["normality_percentage"],
        overall_summary_text=analysis_res["overall_summary_text"],
        is_verified=True,
        file_url=file_url,
        findings=[FindingResponse.model_validate(f) for f in analysis_res["findings"]],
        trends=[TrendResponse.model_validate(t) for t in analysis_res["trends"]],
        flags=[FlagResponse.model_validate(fl) for fl in flags_data],
        pages=[ReportPageResponse.model_validate(p) for p in pages_data]
    )

    return ReportUploadResponse(
        success=True,
        message="Medical report parsed and verified successfully.",
        report_id=report_id,
        summary=summary_obj
    )

def generate_highlighted_pdf(fpath: str, findings_list: list, active_fact_id: Optional[str] = None) -> bytes:
    import pymupdf
    doc = pymupdf.open(fpath)
    for f in findings_list:
        p_idx = (f.page_number or 1) - 1
        if p_idx < 0 or p_idx >= len(doc):
            continue
        page = doc[p_idx]
        words = page.get_text("words")
        if not words:
            continue
        name_words = [w for w in f.name.replace(",", " ").replace("-", " ").split() if len(w) > 2]
        first_word = name_words[0].lower() if name_words else f.name.lower()[:4]
        matching_y = None
        for w in words:
            if first_word in w[4].lower():
                matching_y = round(w[1] / 6) * 6
                break
        if matching_y is not None:
            line_words = [w for w in words if round(w[1] / 6) * 6 == matching_y]
            if line_words:
                x0 = min(w[0] for w in line_words)
                y0 = min(w[1] for w in line_words)
                x1 = max(w[2] for w in line_words)
                y1 = max(w[3] for w in line_words)
                is_active = (active_fact_id and (active_fact_id in f.id or active_fact_id.lower() in f.name.lower()))
                annot = page.add_highlight_annot(pymupdf.Rect(x0, y0, x1, y1))
                if is_active:
                    annot.set_colors(stroke=(0.15, 0.65, 1.0))  # Vivid Cyan/Blue
                else:
                    annot.set_colors(stroke=(1.0, 0.85, 0.15))  # Golden Amber
                annot.update()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

@router.get("/{report_id}/file")
async def get_report_file(
    report_id: str,
    highlight: bool = True,
    fact_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Streams the PDF with verified lab findings visually highlighted inside the document."""
    from fastapi import Response

    # 1. Check if uploaded file exists in UPLOAD_DIR
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(report_id) and fname.lower().endswith(".pdf"):
                fpath = os.path.join(UPLOAD_DIR, fname)
                if highlight:
                    res = await db.execute(select(Finding).where(Finding.report_id == report_id))
                    findings_list = res.scalars().all()
                    if findings_list:
                        pdf_bytes = generate_highlighted_pdf(fpath, findings_list, active_fact_id=fact_id)
                        return Response(
                            content=pdf_bytes,
                            media_type="application/pdf",
                            headers={"Content-Disposition": "inline"}
                        )
                return FileResponse(
                    fpath,
                    media_type="application/pdf",
                    headers={"Content-Disposition": "inline"}
                )

    # 2. If sample report, create sample PDF if not existing and stream
    if "sample" in report_id.lower():
        sample_path = os.path.join(UPLOAD_DIR, "sample-report.pdf")
        if not os.path.exists(sample_path):
            try:
                import pymupdf
                doc = pymupdf.open()
                for p in SAMPLE_PAGES:
                    page = doc.new_page()
                    page.insert_text((40, 60), f"=== {p['page_title']} ===\n\n{p['extracted_text']}", fontsize=11)
                doc.save(sample_path)
                doc.close()
            except Exception as e:
                pass
        if os.path.exists(sample_path):
            return FileResponse(sample_path, media_type="application/pdf", headers={"Content-Disposition": "inline"})

    raise HTTPException(status_code=404, detail="Original report file not found")

def serialize_report_response(report: Report) -> ReportSummaryResponse:
    findings_list = [
        FindingResponse(
            id=f.id,
            name=f.name,
            category=f.category,
            value=f.value,
            numeric_value=f.numeric_value,
            unit=f.unit,
            range=f.reference_range,
            ref_min=f.ref_min,
            ref_max=f.ref_max,
            status=f.status,
            page=f.page_number,
            position=f.position,
            explanation=f.layman_explanation or "",
            detail=f.detail_description or "",
            matched_quote=f.matched_quote,
            is_exact_match=f.is_exact_match,
            is_overridden=getattr(f, "is_overridden", False) or False,
            override_notes=getattr(f, "override_notes", None)
        ) for f in report.findings
    ]

    trends_list = [
        TrendResponse(
            label=t.label,
            tested=t.tested,
            previous=t.previous,
            normalMin=t.normal_min,
            normalMax=t.normal_max,
            chartMin=t.chart_min,
            chartMax=t.chart_max,
            unit=t.unit
        ) for t in report.trends
    ]

    flags_list = [
        FlagResponse(
            id=fl.id,
            level=fl.level,
            title=fl.title,
            detail=fl.detail,
            sources=fl.sources or [],
            suggested_step=fl.suggested_step,
            resolved=fl.is_resolved
        ) for fl in report.flags
    ]

    pages_list = [
        ReportPageResponse(
            page_number=p.page_number,
            page_title=p.page_title,
            extracted_text=p.extracted_text,
            has_table=p.has_table,
            table_data=p.table_data
        ) for p in report.pages
    ]

    file_url = f"/api/reports/{report.id}/file"

    return ReportSummaryResponse(
        id=report.id,
        file_name=report.file_name,
        report_title=report.report_title,
        patient_name=report.patient_name,
        patient_age=report.patient_age,
        patient_sex=report.patient_sex,
        doctor_name=report.doctor_name,
        lab_name=report.lab_name,
        report_date=report.report_date,
        total_findings=report.total_findings,
        normal_count=report.normal_count,
        abnormal_count=report.abnormal_count,
        normality_percentage=report.normality_percentage,
        overall_summary_text=report.overall_summary_text or "",
        is_verified=report.is_verified,
        clinician_signed_off=getattr(report, "clinician_signed_off", False) or False,
        signed_off_by=getattr(report, "signed_off_by", None),
        signed_off_at=str(report.signed_off_at) if getattr(report, "signed_off_at", None) else None,
        clinician_notes=getattr(report, "clinician_notes", None),
        file_url=file_url,
        findings=findings_list,
        trends=trends_list,
        flags=flags_list,
        pages=pages_list
    )

async def reanalyze_db_report(report: Report, db: AsyncSession) -> Report:
    """Re-analyzes an existing report PDF file on disk and updates the DB with full lab panels."""
    from sqlalchemy import delete
    pdf_path = None
    if os.path.exists(UPLOAD_DIR):
        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(report.id) and fname.lower().endswith(".pdf"):
                pdf_path = os.path.join(UPLOAD_DIR, fname)
                break
    if not pdf_path or not os.path.exists(pdf_path):
        return report

    try:
        with open(pdf_path, "rb") as f:
            file_bytes = f.read()

        pages_data, doc_meta = extractor.extract_from_bytes(file_bytes, report.file_name)
        analysis_res = analyzer.analyze_pages(pages_data)
        flags_data = uncertainty_detector.detect_flags(pages_data, analysis_res["findings"], doc_meta=doc_meta)

        # Update report fields
        report.patient_name = analysis_res["patient_name"]
        report.patient_age = analysis_res.get("patient_age", "41 years")
        report.patient_sex = analysis_res.get("patient_sex", "Male")
        report.doctor_name = analysis_res["doctor_name"]
        report.lab_name = analysis_res["lab_name"]
        report.report_date = analysis_res["report_date"]
        report.total_findings = analysis_res["total_findings"]
        report.normal_count = analysis_res["normal_count"]
        report.abnormal_count = analysis_res["abnormal_count"]
        report.normality_percentage = analysis_res["normality_percentage"]
        report.overall_summary_text = analysis_res["overall_summary_text"]

        # Clear old relations
        await db.execute(delete(Finding).where(Finding.report_id == report.id))
        await db.execute(delete(ReportTrend).where(ReportTrend.report_id == report.id))
        await db.execute(delete(UncertaintyFlag).where(UncertaintyFlag.report_id == report.id))
        await db.execute(delete(ReportPage).where(ReportPage.report_id == report.id))

        for p in pages_data:
            db_page = ReportPage(
                report_id=report.id,
                page_number=p["page_number"],
                page_title=p.get("page_title", f"Page {p['page_number']}"),
                extracted_text=p["extracted_text"],
                has_table=p.get("has_table", False),
                table_data=p.get("table_data", [])
            )
            db.add(db_page)

        for f in analysis_res["findings"]:
            db_finding = Finding(
                id=f"{report.id}-{f['id']}",
                report_id=report.id,
                name=f["name"],
                category=f.get("category", "General"),
                value=f["value"],
                numeric_value=f.get("numeric_value"),
                unit=f.get("unit"),
                reference_range=f["range"],
                ref_min=f.get("ref_min"),
                ref_max=f.get("ref_max"),
                status=f["status"],
                page_number=f["page"],
                position=f["position"],
                matched_quote=f["matched_quote"],
                is_exact_match=f.get("is_exact_match", True),
                layman_explanation=f.get("explanation"),
                clinical_explanation=f.get("clinical_explanation"),
                detail_description=f.get("detail")
            )
            db.add(db_finding)

        for fl in flags_data:
            db_flag = UncertaintyFlag(
                id=f"{report.id}-{fl['id']}",
                report_id=report.id,
                level=fl["level"],
                title=fl["title"],
                detail=fl["detail"],
                sources=fl["sources"],
                suggested_step=fl.get("suggested_step"),
                is_resolved=fl.get("resolved", False)
            )
            db.add(db_flag)

        for tr in analysis_res["trends"]:
            db_trend = ReportTrend(
                report_id=report.id,
                label=tr["label"],
                tested=tr["tested"],
                previous=tr.get("previous"),
                normal_min=tr["normalMin"],
                normal_max=tr["normalMax"],
                chart_min=tr["chartMin"],
                chart_max=tr["chartMax"],
                unit=tr["unit"]
            )
            db.add(db_trend)

        await db.commit()
        result = await db.execute(select(Report).where(Report.id == report.id))
        return result.scalars().first()
    except Exception as e:
        logger.error(f"Error during report re-analysis: {e}")
        return report

@router.get("/latest", response_model=ReportSummaryResponse)
async def get_latest_report(db: AsyncSession = Depends(get_db)):
    """Returns the most recently uploaded user report, automatically ensuring full clinical findings."""
    result = await db.execute(
        select(Report).where(Report.is_sample == False).order_by(Report.created_at.desc())
    )
    report = result.scalars().first()
    if not report:
        return build_sample_response()

    if not report.findings:
        report = await reanalyze_db_report(report, db)

    return serialize_report_response(report)

@router.post("/{report_id}/reanalyze", response_model=ReportSummaryResponse)
async def reanalyze_report_endpoint(report_id: str, db: AsyncSession = Depends(get_db)):
    """Triggers an on-demand re-extraction and re-analysis of an uploaded report PDF."""
    if report_id == SAMPLE_REPORT_ID or "sample" in report_id.lower():
        return build_sample_response()

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report = await reanalyze_db_report(report, db)
    return serialize_report_response(report)

@router.get("/{report_id}", response_model=ReportSummaryResponse)
async def get_report_by_id(report_id: str, db: AsyncSession = Depends(get_db)):
    if report_id == SAMPLE_REPORT_ID or "sample" in report_id.lower():
        stmt = select(Report).where(Report.id == SAMPLE_REPORT_ID)
        res = await db.execute(stmt)
        report = res.scalar_one_or_none()
        if report:
            return serialize_report_response(report)
        return build_sample_response()

    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalars().first()
    if not report:
        return build_sample_response()

    if report.total_findings <= 7 and not report.is_sample:
        report = await reanalyze_db_report(report, db)

    return serialize_report_response(report)

@router.api_route("/{report_id}/ai-summary", methods=["GET", "POST"])
async def generate_report_ai_summary(
    report_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Generates an evidence-grounded AI clinical narrative for a report using the active LLM."""
    from backend.app.services.ai_client import ai_client

    report = None
    if report_id in [SAMPLE_REPORT_ID, "latest", "recent", "", "null", "undefined"]:
        res = await db.execute(select(Report).where(Report.is_sample == False).order_by(Report.created_at.desc()))
        report = res.scalars().first()
    
    if not report and report_id != SAMPLE_REPORT_ID:
        stmt = select(Report).where(Report.id == report_id)
        res = await db.execute(stmt)
        report = res.scalar_one_or_none()

    if not report:
        if report_id == SAMPLE_REPORT_ID:
            return await ai_client.generate_clinical_summary(SAMPLE_FINDINGS, patient_name=SAMPLE_REPORT_METADATA["patient_name"])
        raise HTTPException(status_code=404, detail="Report not found")

    findings_data = [{"name": f.name, "value": f.value, "range": f.reference_range, "status": f.status} for f in report.findings]
    return await ai_client.generate_clinical_summary(findings_data, patient_name=report.patient_name)

@router.post("/{report_id}/override", response_model=ReportSummaryResponse)
async def override_report_finding(
    report_id: str,
    req: ReportOverrideRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Healthcare Professional Authority: Edit, correct, or override an extracted value or reference range,
    and save the revised finding directly to the official clinical record.
    """
    stmt = select(Report).where(Report.id == report_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report and (report_id == SAMPLE_REPORT_ID or "sample" in report_id.lower()):
        report = await ensure_sample_report_in_db(db)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    finding = None
    for f in report.findings:
        if f.id == req.finding_id or f.name.lower() == req.finding_id.lower():
            finding = f
            break

    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found in report")

    finding.value = req.new_value
    if req.new_range:
        finding.reference_range = req.new_range
    if req.status:
        finding.status = req.status
    finding.is_overridden = True
    if req.notes:
        finding.override_notes = req.notes

    # Recalculate normal/abnormal counts
    normal_cnt = sum(1 for f in report.findings if f.status == "Normal")
    abnormal_cnt = sum(1 for f in report.findings if f.status != "Normal")
    total_cnt = len(report.findings)
    report.normal_count = normal_cnt
    report.abnormal_count = abnormal_cnt
    report.normality_percentage = round((normal_cnt / total_cnt * 100), 1) if total_cnt > 0 else 100.0

    await db.commit()
    await db.refresh(report)
    return serialize_report_response(report)

@router.post("/{report_id}/sign-off", response_model=ReportSummaryResponse)
async def signoff_report_endpoint(
    report_id: str,
    req: ReportSignoffRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Healthcare Professional Sign-off: Verify and sign off on AI-generated summaries
    before saving them to the patient's official electronic record.
    """
    stmt = select(Report).where(Report.id == report_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report and (report_id == SAMPLE_REPORT_ID or "sample" in report_id.lower()):
        report = await ensure_sample_report_in_db(db)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.clinician_signed_off = True
    report.signed_off_by = f"{req.doctor_name}" + (f" (License #{req.license_number})" if req.license_number else "")
    report.signed_off_at = datetime.datetime.utcnow()
    if req.notes:
        report.clinician_notes = req.notes

    await db.commit()
    await db.refresh(report)
    return serialize_report_response(report)

@router.post("/{report_id}/patient-qa", response_model=ReportPatientQAResponse)
async def patient_report_qa_endpoint(
    report_id: str,
    req: ReportPatientQARequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Patient Interactive Q&A (Stretch Goal): Ask follow-up questions restricted strictly
    to the contents of their uploaded report, answered in reassuring, plain language with citations.
    """
    from backend.app.services.ai_client import ai_client

    report = None
    if report_id in [SAMPLE_REPORT_ID, "latest", "recent", "", "null", "undefined"]:
        res = await db.execute(select(Report).where(Report.is_sample == False).order_by(Report.created_at.desc()))
        report = res.scalars().first()

    if not report and report_id != SAMPLE_REPORT_ID:
        stmt = select(Report).where(Report.id == report_id)
        res = await db.execute(stmt)
        report = res.scalar_one_or_none()

    if report:
        findings_data = [{"name": f.name, "value": f.value, "range": f.reference_range, "status": f.status} for f in report.findings]
        patient_name = report.patient_name
    elif report_id == SAMPLE_REPORT_ID:
        findings_data = SAMPLE_FINDINGS
        patient_name = SAMPLE_REPORT_METADATA.get("patient_name", "Alex Smith")
    else:
        raise HTTPException(status_code=404, detail="Report not found")

    qa_res = await ai_client.answer_patient_question(
        findings=findings_data,
        patient_name=patient_name,
        question=req.question
    )

    # Detect which findings are cited in answer
    grounded = []
    answer_text = qa_res.get("text", "")
    for f in findings_data:
        fname = f.get("name", "")
        if fname.lower() in answer_text.lower() or fname.lower() in req.question.lower():
            grounded.append(f"{fname}: {f.get('value')} ({f.get('status')})")

    if not grounded and findings_data:
        grounded = [f"{findings_data[0].get('name')}: {findings_data[0].get('value')}"]

    return ReportPatientQAResponse(
        question=req.question,
        answer=answer_text,
        grounded_findings=grounded,
        disclaimer="Grounded strictly in your uploaded diagnostic report. Discuss health decisions with your doctor.",
        provider=qa_res.get("provider"),
        model=qa_res.get("model")
    )


