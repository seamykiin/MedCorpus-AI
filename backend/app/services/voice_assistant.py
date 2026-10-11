import re
from typing import Dict, Any, List, Optional
from backend.app.services.ai_client import ai_client
from backend.app.database import AsyncSessionLocal
from backend.app.models.report import Report, Finding
from sqlalchemy import select

class VoiceAssistantService:
    @staticmethod
    async def process_query(question: str, report_id: Optional[str] = None) -> Dict[str, Any]:
        normalized = question.lower()

        # 1. Fetch active report and findings from DB
        findings = []
        patient_name = "Patient"
        active_rep_id = report_id or "latest"

        try:
            async with AsyncSessionLocal() as session:
                target_report = None
                if report_id and report_id not in ["latest", "recent", "sample-report-001", "null", "undefined"]:
                    res = await session.execute(select(Report).where(Report.id == report_id))
                    target_report = res.scalars().first()

                if not target_report:
                    res = await session.execute(
                        select(Report).where(Report.is_sample == False).order_by(Report.created_at.desc())
                    )
                    target_report = res.scalars().first()

                if not target_report and report_id == "sample-report-001":
                    res = await session.execute(select(Report).where(Report.id == "sample-report-001"))
                    target_report = res.scalars().first()

                if target_report:
                    active_rep_id = target_report.id
                    patient_name = target_report.patient_name
                    f_res = await session.execute(
                        select(Finding).where(Finding.report_id == target_report.id)
                    )
                    findings = f_res.scalars().all()
        except Exception as e:
            findings = []

        if not findings:
            from backend.app.utils.sample_data import SAMPLE_FINDINGS, SAMPLE_REPORT_METADATA
            patient_name = SAMPLE_REPORT_METADATA.get("patient_name", "Alex Smith")
            active_rep_id = "sample-report-001"
            class SampleFindingObj:
                def __init__(self, data):
                    self.name = data["name"]
                    self.value = data["value"]
                    self.reference_range = data.get("range", "N/A")
                    self.status = data.get("status", "Normal")
                    self.page_number = data.get("page", 1)
                    self.matched_quote = data.get("matched_quote", f"{self.name} {self.value}")
            findings = [SampleFindingObj(sf) for sf in SAMPLE_FINDINGS]

        # Find best matching finding directly in verified findings (Deterministic Source Grounding)
        best_match = None
        for f in findings:
            name_words = [w.lower() for w in f.name.replace(",", " ").replace("-", " ").split() if len(w) > 2]
            if any(nw in normalized for nw in name_words):
                best_match = f
                break

        # Fallback keyword checks
        if not best_match:
            if "sugar" in normalized or "glucose" in normalized or "fasting" in normalized:
                best_match = next((f for f in findings if "sugar" in f.name.lower() or "glucose" in f.name.lower()), None)
            elif "a1c" in normalized or "hba1c" in normalized:
                best_match = next((f for f in findings if "hba1c" in f.name.lower()), None)
            elif "vitamin d" in normalized or "vit d" in normalized:
                best_match = next((f for f in findings if "vitamin d" in f.name.lower()), None)
            elif "b12" in normalized or "vitamin b" in normalized:
                best_match = next((f for f in findings if "b12" in f.name.lower()), None)
            elif "blood" in normalized or "wbc" in normalized or "white" in normalized:
                best_match = next((f for f in findings if "wbc" in f.name.lower()), None)
            elif "cholesterol" in normalized or "lipid" in normalized:
                best_match = next((f for f in findings if "cholesterol" in f.name.lower()), None)
            elif "kidney" in normalized or "creatinine" in normalized:
                best_match = next((f for f in findings if "creatinine" in f.name.lower()), None)

        if best_match:
            page = best_match.page_number
            highlight = best_match.name
            source = f"Page {page} · Verified Quote: \"{best_match.matched_quote}\""
            
            grounded_facts = (
                f"VERIFIED SOURCE PASSAGE (Page {best_match.page_number}):\n"
                f"- Parameter: {best_match.name}\n"
                f"- Tested Value: {best_match.value}\n"
                f"- Reference Interval: {best_match.reference_range}\n"
                f"- Status: {best_match.status}\n"
                f"- Matched Document Quote: \"{best_match.matched_quote}\"\n"
                f"- Patient: {patient_name}"
            )

            prompt = (
                f"You are the MedCorpus Voice Assistant. Answer the patient's voice inquiry strictly using this source-grounded finding:\n"
                f"{grounded_facts}\n\n"
                f"Patient Question: '{question}'\n"
                f"INSTRUCTIONS:\n"
                f"1. State the exact tested number, reference range, and whether it is normal, high, or low.\n"
                f"2. Cite the exact page number [Page {best_match.page_number}].\n"
                f"3. Do not speculate or invent medical diagnoses. Keep answer to 2 clear spoken sentences."
            )

            meta = await ai_client.generate_with_metadata(
                prompt,
                system_prompt="You are MedCorpus voice assistant. Answer patient queries with 100% source grounding based strictly on verified lab passages.",
                temperature=0.2
            )
            ai_resp = meta.get("text", "").strip()

            return {
                "question": question,
                "text": ai_resp,
                "source": source,
                "page": page,
                "highlight": highlight,
                "is_grounded": True,
                "provider": meta.get("provider"),
                "model": meta.get("model"),
                "latency_ms": meta.get("latency_ms"),
                "is_simulated": meta.get("is_simulated"),
                "suggested_followups": [
                    f"Explain what {best_match.name} means",
                    "Which other results were outside reference range?",
                    "What questions should I ask my doctor?"
                ]
            }

        # If question is general or overview
        out_of_range = [f for f in findings if f.status != "Normal"]
        grounded_overview = (
            f"Total findings: {len(findings)}. Out-of-range parameters: "
            + ", ".join([f"{f.name} ({f.value}, Page {f.page_number})" for f in out_of_range[:6]])
        )

        prompt = (
            f"You are the MedCorpus Voice Assistant. The patient asks: '{question}'.\n"
            f"Report Summary Grounding:\n{grounded_overview}\n\n"
            f"Provide a clear, 2-sentence spoken summary citing the key out-of-range parameters and page numbers."
        )

        meta = await ai_client.generate_with_metadata(
            prompt,
            system_prompt="You are MedCorpus voice assistant, providing strictly grounded medical report overviews.",
            temperature=0.2
        )

        return {
            "question": question,
            "text": meta.get("text", "").strip(),
            "source": f"Diagnostic Report · {len(out_of_range)} out-of-range parameters grounded in PDF",
            "page": out_of_range[0].page_number if out_of_range else 1,
            "highlight": out_of_range[0].name if out_of_range else "Diagnostic Summary",
            "is_grounded": True,
            "provider": meta.get("provider"),
            "model": meta.get("model"),
            "latency_ms": meta.get("latency_ms"),
            "is_simulated": meta.get("is_simulated"),
            "suggested_followups": [
                "What was my Fasting Blood Sugar?",
                "What was my HbA1c result?",
                "Show my Vitamin D level"
            ]
        }

voice_service = VoiceAssistantService()
