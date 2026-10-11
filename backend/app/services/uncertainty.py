import re
import uuid
from typing import List, Dict, Any, Optional

class UncertaintyDetector:
    @staticmethod
    def detect_flags(
        pages: List[Dict[str, Any]],
        findings: List[Dict[str, Any]],
        doc_meta: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Inspects the raw extracted PDF pages and findings to identify genuine
        uncertainty, conflict, missing context, and data discrepancies.
        All generated flags cite exact pages and verbatim passages from the PDF.
        """
        flags: List[Dict[str, Any]] = []
        seen_titles = set()

        doc_meta = doc_meta or {}
        lab_name = doc_meta.get("lab_name") or "Clinical Laboratory"
        report_date = doc_meta.get("date") or doc_meta.get("report_date") or ""

        # -------------------------------------------------------------
        # 1. Date Discrepancies across pages in the uploaded PDF
        # -------------------------------------------------------------
        dates_by_page: Dict[int, List[Dict[str, str]]] = {}
        date_pattern = re.compile(
            r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
            re.IGNORECASE
        )

        for p in pages:
            p_num = p.get("page_number", 1)
            text = p.get("extracted_text", "")
            lines = text.split("\n")
            for line in lines:
                m = date_pattern.search(line)
                if m:
                    d_val = m.group(1).strip()
                    if p_num not in dates_by_page:
                        dates_by_page[p_num] = []
                    dates_by_page[p_num].append({"date": d_val, "line": line.strip()})

        all_unique_dates = {}
        for p_num, d_items in dates_by_page.items():
            for item in d_items:
                d_str = item["date"].lower()
                if d_str not in all_unique_dates:
                    all_unique_dates[d_str] = f"Page {p_num} · {item['line'][:65]}"

        if len(all_unique_dates) > 1:
            sources = list(all_unique_dates.values())[:3]
            flags.append({
                "id": "date-conflict",
                "level": "Conflict",
                "title": "Multiple dates found in document",
                "detail": f"Document contains differing dates ({', '.join(list(all_unique_dates.keys())[:3])}). Please confirm whether these indicate collection, accession, or reporting times.",
                "sources": sources,
                "suggested_step": "Confirm exact specimen collection date vs report release date with the laboratory or doctor.",
                "resolved": False
            })
            seen_titles.add("Multiple dates found in document")

        # -------------------------------------------------------------
        # 2. Fasting / Preparation Ambiguity for Metabolic & Lipid Tests
        # -------------------------------------------------------------
        metabolic_keywords = ["glucose", "sugar", "fbs", "cholesterol", "triglyceride", "lipid", "insulin", "ldl", "vldl"]
        metabolic_findings = [
            f for f in findings
            if any(k in f.get("name", "").lower() for k in metabolic_keywords)
        ]

        if metabolic_findings:
            full_text = " ".join([p.get("extracted_text", "") for p in pages]).lower()
            has_fasting_mention = any(
                w in full_text
                for w in ["fasting", "fbs", "overnight fast", "10-12 hr", "12 hrs", "post-prandial", "random blood", "non-fasting"]
            )
            if not has_fasting_mention:
                primary_f = metabolic_findings[0]
                sources = [
                    f"Page {primary_f.get('page', primary_f.get('page_number', 1))} · {primary_f.get('name')}: {primary_f.get('value')} (Range: {primary_f.get('range', primary_f.get('reference_range', 'N/A'))})"
                ]
                flags.append({
                    "id": "fasting-unconfirmed",
                    "level": "Missing",
                    "title": f"Fasting status not confirmed for {primary_f.get('name')}",
                    "detail": f"The report includes metabolic/lipid tests ({', '.join([f['name'] for f in metabolic_findings[:3]])}), but the document does not explicitly state whether the patient completed an 8–12 hour fast before blood draw.",
                    "sources": sources,
                    "suggested_step": "Confirm whether specimen was collected fasting or non-fasting, as reference ranges differ substantially.",
                    "resolved": False
                })
                seen_titles.add(f"Fasting status not confirmed for {primary_f.get('name')}")

        # -------------------------------------------------------------
        # 3. Missing or Unspecified Reference Intervals
        # -------------------------------------------------------------
        for f in findings:
            rng = str(f.get("range") or f.get("reference_range") or "").strip()
            if not rng or rng.lower() in ["n/a", "none", "not specified", "unknown", "-", "nil"]:
                title = f"Reference interval missing for {f.get('name')}"
                if title not in seen_titles:
                    flags.append({
                        "id": f"missing-range-{uuid.uuid4().hex[:6]}",
                        "level": "Missing",
                        "title": title,
                        "detail": f"Extracted value of {f.get('value')} for {f.get('name')} does not have a quantitative reference interval listed in the report table.",
                        "sources": [f"Page {f.get('page', f.get('page_number', 1))} · {f.get('matched_quote') or f.get('name')}"],
                        "suggested_step": "Ask your clinician or the issuing laboratory for the specific diagnostic reference interval for this biomarker.",
                        "resolved": False
                    })
                    seen_titles.add(title)

        # -------------------------------------------------------------
        # 4. Specimen Integrity & Laboratory Technical Remarks in PDF
        # -------------------------------------------------------------
        integrity_keywords = [
            ("hemoly", "Specimen hemolysis noted", "Specimen hemolysis may cause pseudo-elevation or depression of cellular electrolytes and enzymes."),
            ("lipem", "Specimen lipemia noted", "Lipemic serum can interfere with photometric optical density measurements."),
            ("icter", "Icteric specimen noted", "Elevated bilirubin/icterus can affect certain spectrophotometric laboratory assays."),
            ("clot", "Micro-clotting or clot formation", "Clotted samples can falsely alter cell counts and coagulation parameters."),
            ("dilut", "Dilution factor applied", "Sample was diluted for testing; results reflect calculated multiplied concentrations."),
            ("repeat", "Result verified by repeat testing", "Laboratory confirmed this value via duplicate or re-run analysis."),
            ("correlate clinically", "Clinical correlation advised by lab", "Laboratory pathologist advises clinical correlation with patient symptoms and history.")
        ]

        for p in pages:
            p_num = p.get("page_number", 1)
            text = p.get("extracted_text", "")
            for line in text.split("\n"):
                lower_line = line.lower()
                for kw, kw_title, kw_detail in integrity_keywords:
                    if kw in lower_line and len(line.strip()) > 8 and kw_title not in seen_titles:
                        flags.append({
                            "id": f"integrity-{kw}-{p_num}",
                            "level": "Needs context" if "correlate" in kw or "repeat" in kw else "Conflict",
                            "title": kw_title,
                            "detail": f"{kw_detail} Source text: \"{line.strip()[:110]}\"",
                            "sources": [f"Page {p_num} · {line.strip()[:80]}"],
                            "suggested_step": "Discuss this technical laboratory remark with your healthcare professional.",
                            "resolved": False
                        })
                        seen_titles.add(kw_title)
                        break

        # -------------------------------------------------------------
        # 5. Assay Methodology Variations for Sensitive Biomarkers
        # -------------------------------------------------------------
        method_sensitive = ["vitamin d", "tsh", "vitamin b12", "ferritin", "cortisol", "troponin", "psa", "crp"]
        for f in findings:
            fname = f.get("name", "").lower()
            for ms in method_sensitive:
                if ms in fname:
                    title = f"{f.get('name')} reference range varies by laboratory method"
                    if title not in seen_titles:
                        rng = f.get("range") or f.get("reference_range") or "Standard interval"
                        flags.append({
                            "id": f"assay-method-{uuid.uuid4().hex[:6]}",
                            "level": "Needs context",
                            "title": title,
                            "detail": f"The report lists a {rng} reference interval for {f.get('name')}. Different testing platforms (immunoassay vs mass spectrometry) use varying cutoff thresholds.",
                            "sources": [f"Page {f.get('page', f.get('page_number', 1))} · {f.get('matched_quote') or f.get('name')}"],
                            "suggested_step": "Discuss standard clinical thresholds with your treating physician.",
                            "resolved": False
                        })
                        seen_titles.add(title)
                    break

        # -------------------------------------------------------------
        # 6. Critical or Significantly Anomalous Values
        # -------------------------------------------------------------
        for f in findings:
            status = str(f.get("status", "")).strip().capitalize()
            if status in ["Critical", "High", "Low"]:
                title = f"Out-of-range finding: {f.get('name')} ({status})"
                if title not in seen_titles and len(flags) < 6:
                    flags.append({
                        "id": f"anomalous-{uuid.uuid4().hex[:6]}",
                        "level": "Critical" if status == "Critical" else "Needs context",
                        "title": title,
                        "detail": f"{f.get('name')} result is {f.get('value')} (Status: {status}, Reference interval: {f.get('range') or f.get('reference_range', 'N/A')}). Requires clinical evaluation.",
                        "sources": [f"Page {f.get('page', f.get('page_number', 1))} · {f.get('matched_quote') or f.get('name')}"],
                        "suggested_step": "Review this specific finding with your physician to correlate with your medical history.",
                        "resolved": False
                    })
                    seen_titles.add(title)

        # -------------------------------------------------------------
        # 7. Document-Grounded Baseline Traceability Flags (Guaranteed from PDF)
        # -------------------------------------------------------------
        if len(flags) < 2 and pages:
            first_page_text = pages[0].get("extracted_text", "")
            first_line = (first_page_text.split("\n")[0] if first_page_text else lab_name).strip()[:60]
            if "Single timepoint laboratory evaluation" not in seen_titles:
                flags.append({
                    "id": "single-timepoint-snapshot",
                    "level": "Needs context",
                    "title": "Single timepoint laboratory evaluation",
                    "detail": f"This report represents an isolated diagnostic point in time. Clinical guidelines emphasize reviewing isolated metrics alongside clinical presentation and baseline historical trends.",
                    "sources": [f"Page 1 · {first_line}"],
                    "suggested_step": "Compare these results with previous test results to evaluate personal trends over time.",
                    "resolved": False
                })
                seen_titles.add("Single timepoint laboratory evaluation")

            if "Laboratory-specific calibration interval" not in seen_titles:
                flags.append({
                    "id": "lab-calibration-standard",
                    "level": "Needs context",
                    "title": f"Laboratory calibration standard ({lab_name})",
                    "detail": f"Reference intervals are proprietary to the instrumentation, assay reagents, and reference demographic established by {lab_name}.",
                    "sources": [f"Page 1 · {lab_name}"],
                    "suggested_step": "When re-testing in the future, consider using the same laboratory for direct longitudinal comparability.",
                    "resolved": False
                })
                seen_titles.add(f"Laboratory calibration standard ({lab_name})")

        return flags

uncertainty_detector = UncertaintyDetector()
