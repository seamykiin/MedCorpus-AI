import json
import logging
from typing import Dict, List, Any, Optional
from backend.app.services.ai_client import ai_client

logger = logging.getLogger(__name__)

DEFAULT_WELLNESS_PLANS = {
    "Routine": [
        "Spend a short period outdoors during morning sunlight when appropriate and safe.",
        "Keep a consistent sleep and wake schedule to support metabolic regulation.",
        "Add gentle, regular movement (such as 20-30 minutes of walking) suited to your ability."
    ],
    "Diet": [
        "Discuss Vitamin D-rich foods such as fortified dairy, eggs, or plant alternatives with a professional.",
        "Include varied whole foods across daily meals to support overall micronutrient intake.",
        "Avoid major restrictive dietary changes based on a single lab test alone."
    ],
    "Nutrition": [
        "Do not begin high-dose supplements without professional clinical guidance and baseline verification.",
        "Ask your doctor whether follow-up testing in 3-6 months may be appropriate.",
        "Bring the original diagnostic report to your next medical appointment."
    ]
}

class MiniDoctorService:
    @staticmethod
    def _generate_rule_based_plans(findings: List[Dict[str, Any]], patient_name: str) -> Dict[str, List[str]]:
        """
        Builds clinically sound wellness suggestions directly from the specific findings
        extracted from the uploaded PDF.
        """
        abnormal = [f for f in findings if f.get("status") in ["Low", "High", "Critical"]]
        abnormal_names = [f.get("name", "").lower() for f in abnormal]

        has_lipid = any(k in name for name in abnormal_names for k in ["cholesterol", "lipid", "triglyceride", "ldl", "vldl"])
        has_liver = any(k in name for name in abnormal_names for k in ["alt", "sgpt", "ast", "sgot", "bilirubin", "alkaline phosphatase", "ggt"])
        has_sugar = any(k in name for name in abnormal_names for k in ["glucose", "sugar", "hba1c", "fbs"])
        has_heme = any(k in name for name in abnormal_names for k in ["hemoglobin", "rbc", "hematocrit", "iron", "ferritin"])
        has_renal = any(k in name for name in abnormal_names for k in ["creatinine", "bun", "urea", "uric acid", "egfr"])
        has_vit_d = any("vitamin d" in name for name in abnormal_names)
        has_thyroid = any(k in name for name in abnormal_names for k in ["tsh", "t3", "t4", "thyroid"])

        routine: List[str] = []
        diet: List[str] = []
        nutrition: List[str] = []

        # Lipid profile suggestions
        if has_lipid:
            routine.append("Incorporate 30 minutes of moderate aerobic activity (e.g. brisk walking or cycling) on most days of the week.")
            routine.append("Focus on restorative sleep (7–8 hours) and stress reduction to support healthy lipid metabolism.")
            diet.append("Prioritize soluble dietary fiber from whole oats, beans, lentils, and ground flaxseeds.")
            diet.append("Substitute saturated and trans fats with heart-healthy monounsaturated fats like extra virgin olive oil and avocados.")
            nutrition.append("Discuss omega-3 fatty acid food sources (such as salmon or walnuts) with your physician before considering supplements.")
            nutrition.append("Request a follow-up lipid panel in 3 months to monitor whether dietary modifications are having a positive effect.")

        # Hepatic / Liver suggestions
        if has_liver:
            routine.append("Maintain consistent daily hydration (2 to 2.5 liters of water) to support natural hepatic filtration.")
            routine.append("Limit or avoid alcoholic beverages and discuss any non-essential over-the-counter medications with your physician.")
            diet.append("Incorporate cruciferous vegetables (broccoli, cabbage, Brussels sprouts) and colorful antioxidant-rich vegetables.")
            diet.append("Minimize processed foods high in added fructose, high-fructose corn syrup, and refined cooking oils.")
            nutrition.append("Review all current supplements and botanical remedies with your physician to prevent hepatic workload.")

        # Glycemic / Glucose suggestions
        if has_sugar:
            routine.append("Take a light 10–15 minute walk shortly after your primary meals to assist muscle glucose uptake.")
            routine.append("Maintain consistent meal timings to prevent wide fluctuations in blood sugar levels throughout the day.")
            diet.append("Pair complex carbohydrates with lean protein and fiber to smooth the post-prandial glycemic response.")
            diet.append("Limit sugar-sweetened beverages, fruit juices, and refined flour products.")
            nutrition.append("Discuss whether a home glucose monitor or HbA1c re-check in 90 days is warranted with your healthcare provider.")

        # Hematology / Anemia suggestions
        if has_heme:
            routine.append("Pace your daily exertion and ensure adequate rest intervals between demanding physical activities.")
            routine.append("Prioritize restful nighttime sleep to support red blood cell regeneration and cellular recovery.")
            diet.append("Include dietary iron sources (spinach, lentils, beans, poultry, or lean cuts) in your weekly meal planning.")
            diet.append("Pair non-heme plant iron with vitamin C sources (such as bell peppers or citrus) to enhance absorption; avoid drinking tea or coffee directly with meals.")
            nutrition.append("Do not start unprescribed iron supplements without baseline serum ferritin testing, as excess iron can accumulate.")

        # Renal / Kidney suggestions
        if has_renal:
            routine.append("Maintain adequate, steady fluid intake throughout the day unless your clinician has advised fluid restriction.")
            routine.append("Avoid routine or excessive use of NSAID pain relievers (such as ibuprofen or naproxen) without consulting your doctor.")
            diet.append("Moderate dietary sodium by seasoning foods with herbs and spices instead of processed table salt.")
            nutrition.append("Avoid high-dose protein shakes or unregulated creatine supplements until reviewed with your nephrology care team.")

        # Vitamin D suggestions
        if has_vit_d:
            routine.append("Spend 10–15 minutes in gentle morning sunlight when climate and skin tolerance allow.")
            diet.append("Discuss Vitamin D-fortified whole foods (milk, plant milks, fortified cereals) and eggs with your care team.")
            nutrition.append("Ask your physician whether targeted Vitamin D3 supplementation is suitable based on your exact lab level.")

        # Thyroid suggestions
        if has_thyroid:
            routine.append("Keep a structured daily routine with regular morning sunlight exposure to support circadian hormone rhythms.")
            diet.append("Maintain a balanced diet including adequate trace minerals such as selenium and iodine from varied food sources.")
            nutrition.append("Ensure consistent timing if taking thyroid medications, taking them on an empty stomach with plain water.")

        # Fallback / General healthy baseline if normal or incomplete
        if not routine:
            routine = [
                "Maintain a consistent sleep-wake schedule to support circadian hormonal regulation.",
                "Engage in 20–30 minutes of regular, gentle physical activity suited to your current fitness level.",
                "Dedicate 10 minutes daily to stress reduction practices like deep breathing or guided meditation."
            ]
        if not diet:
            diet = [
                "Include a diverse variety of colorful vegetables, whole grains, and lean proteins in daily meals.",
                "Ensure sufficient daily water intake to support cellular hydration and metabolic waste clearance.",
                "Avoid drastic dietary changes based on a single laboratory report alone without professional guidance."
            ]
        if not nutrition:
            nutrition = [
                "Discuss these findings and your routine dietary intake with a registered dietitian or physician.",
                "Avoid high-dose commercial supplements without verified baseline deficiencies.",
                "Bring this official diagnostic report to your next scheduled clinical checkup."
            ]

        return {
            "Routine": routine[:3],
            "Diet": diet[:3],
            "Nutrition": nutrition[:3]
        }

    @staticmethod
    async def get_wellness_plans(
        findings: Optional[List[Dict[str, Any]]] = None,
        patient_name: str = "Patient",
        lab_name: str = "Diagnostic Laboratory",
        report_id: str = "sample-report-001",
        report_title: str = "Diagnostic Medical Report"
    ) -> Dict[str, Any]:
        """
        Returns dynamic wellness suggestions synthesized from the uploaded PDF's
        actual findings using the active LLM engine with fallback to rule-based engine.
        """
        findings = findings or []
        abnormal = []
        for f in findings:
            st = str(f.get("status", "")).strip().capitalize()
            if st in ["Low", "High", "Critical"]:
                abnormal.append(f"{f.get('name')} ({f.get('value')}) - {st}")

        # Generate rule-based baseline plans from the real findings
        rule_plans = MiniDoctorService._generate_rule_based_plans(findings, patient_name)

        # Attempt synthesis with active LLM if abnormal findings exist
        if abnormal:
            try:
                prompt = (
                    f"You are the MedCorpus Mini Doctor wellness engine. Based on the following laboratory findings extracted directly from the uploaded patient diagnostic report:\n"
                    f"Patient: {patient_name}\n"
                    f"Laboratory: {lab_name}\n"
                    f"Biomarkers:\n" + "\n".join([f"- {f.get('name')}: {f.get('value')} (Range: {f.get('range', f.get('reference_range', 'Normal'))}) -> Status: {f.get('status')}" for f in findings[:15]]) + "\n\n"
                    f"Abnormal Results:\n" + "\n".join([f"- {a}" for a in abnormal]) + "\n\n"
                    f"Generate exactly 3 concise, evidence-grounded wellness suggestions for each of these 3 categories:\n"
                    f"1. Routine (daily movement, sleep, hydration, pacing)\n"
                    f"2. Diet (whole foods to discuss, dietary patterns, foods to limit)\n"
                    f"3. Nutrition (nutrient targets to discuss, food pairings, precautions)\n\n"
                    f"CRITICAL RULES:\n"
                    f"- Suggest ONLY non-pharmacological wellness & lifestyle ideas strictly grounded in the abnormal findings.\n"
                    f"- NEVER prescribe dosages or drugs.\n"
                    f"- Return valid JSON with keys: \"Routine\", \"Diet\", \"Nutrition\", each containing an array of exactly 3 strings."
                )
                system_prompt = "You are a clinical wellness assistant synthesizing lifestyle guidance grounded strictly in verified laboratory metrics. Output valid JSON only."
                meta = await ai_client.generate_with_metadata(prompt, system_prompt=system_prompt, temperature=0.2)
                raw_text = meta.get("text", "").strip()

                # Clean potential markdown fences
                cleaned_json = raw_text
                if "```json" in cleaned_json:
                    cleaned_json = cleaned_json.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned_json:
                    cleaned_json = cleaned_json.split("```")[1].split("```")[0].strip()

                parsed = None
                try:
                    parsed = json.loads(cleaned_json)
                except Exception:
                    pass

                if isinstance(parsed, dict) and any(k in parsed for k in ["Routine", "Diet", "Nutrition"]):
                    rule_plans = {
                        "Routine": [str(x) for x in parsed.get("Routine", rule_plans["Routine"])[:3]],
                        "Diet": [str(x) for x in parsed.get("Diet", rule_plans["Diet"])[:3]],
                        "Nutrition": [str(x) for x in parsed.get("Nutrition", rule_plans["Nutrition"])[:3]]
                    }
                else:
                    # Parse structured markdown sections produced by local model
                    parsed_sections: Dict[str, List[str]] = {"Routine": [], "Diet": [], "Nutrition": []}
                    current_section = None
                    for line in raw_text.splitlines():
                        line_s = line.strip()
                        if not line_s:
                            continue
                        lower_line = line_s.lower()
                        if "routine" in lower_line and ("1" in lower_line or ":" in lower_line or "#" in lower_line or "**" in lower_line):
                            current_section = "Routine"
                            continue
                        elif "diet" in lower_line and ("2" in lower_line or ":" in lower_line or "#" in lower_line or "**" in lower_line):
                            current_section = "Diet"
                            continue
                        elif "nutrition" in lower_line and ("3" in lower_line or ":" in lower_line or "#" in lower_line or "**" in lower_line):
                            current_section = "Nutrition"
                            continue
                        
                        if current_section and (line_s.startswith(("-", "*", "•")) or (len(line_s) > 2 and line_s[0].isdigit() and line_s[1] in [".", ")"])):
                            cleaned_bullet = re.sub(r"^[-*•\d\.\)\s]+", "", line_s).strip()
                            if len(cleaned_bullet) > 10:
                                parsed_sections[current_section].append(cleaned_bullet)

                    if any(len(items) > 0 for items in parsed_sections.values()):
                        for sec in ["Routine", "Diet", "Nutrition"]:
                            if parsed_sections[sec]:
                                rule_plans[sec] = parsed_sections[sec][:3]
            except Exception as e:
                logger.info(f"Using rule-based clinical wellness generator for report {report_id}: {e}")

        return {
            "report_id": report_id,
            "report_title": report_title,
            "patient_name": patient_name,
            "abnormal_findings": abnormal or ["All biomarkers within reference range"],
            "all_findings": findings,
            "plans": rule_plans,
            "disclaimer": "These suggestions are informational and grounded in verified findings from your uploaded diagnostic report. Always consult a qualified healthcare professional before modifying diet, medications, or routine."
        }

    @staticmethod
    async def answer_question(
        question: str,
        findings: Optional[List[Dict[str, Any]]] = None,
        context_finding: Optional[str] = None,
        patient_name: str = "Patient",
        lab_name: str = "Laboratory",
        report_id: str = "sample-report-001"
    ) -> Dict[str, Any]:
        """
        Answers patient questions strictly grounded in the uploaded report findings.
        """
        findings = findings or []
        findings_summary = "\n".join([
            f"- {f.get('name')}: {f.get('value')} (Range: {f.get('range', f.get('reference_range', 'Normal'))}) -> {f.get('status')}"
            for f in findings[:20]
        ])

        if not context_finding and findings:
            abnormal = [f for f in findings if f.get("status") in ["Low", "High", "Critical"]]
            if abnormal:
                context_finding = f"{abnormal[0].get('name')} ({abnormal[0].get('value')}) - {abnormal[0].get('status')}"
            else:
                context_finding = f"{findings[0].get('name')} ({findings[0].get('value')})"

        context_finding = context_finding or "Comprehensive Diagnostic Panel"

        prompt = (
            f"You are the Mini Doctor wellness assistant in MedCorpus.\n"
            f"Patient: {patient_name}\n"
            f"Issuing Lab: {lab_name}\n"
            f"Report ID: {report_id}\n\n"
            f"VERIFIED FINDINGS FROM UPLOADED PDF:\n"
            f"{findings_summary or 'No specific biomarkers extracted.'}\n\n"
            f"Primary Focal Biomarker: {context_finding}\n"
            f"Patient Question: \"{question}\"\n\n"
            f"CLINICAL RULES:\n"
            f"1. Answer strictly based on the extracted lab results from the uploaded report above.\n"
            f"2. Emphasize evidence-grounded lifestyle, routine, diet, and nutrition suggestions.\n"
            f"3. Never provide speculative medical diagnoses or prescribe medications.\n"
            f"4. Clearly advise consulting their treating physician or care team.\n"
            f"5. Keep the response reassuring, easy to understand, and under 3 short paragraphs."
        )
        system_prompt = "You are MedCorpus Mini Doctor, providing safe, evidence-grounded wellness suggestions based on diagnostic laboratory findings from the patient's uploaded PDF."

        meta = await ai_client.generate_with_metadata(prompt, system_prompt=system_prompt, temperature=0.25)
        answer = meta.get("text", "").strip()

        return {
            "question": question,
            "answer": answer,
            "role": "assistant",
            "context_used": context_finding,
            "provider": meta.get("provider"),
            "model": meta.get("model"),
            "latency_ms": meta.get("latency_ms"),
            "is_simulated": meta.get("is_simulated"),
            "disclaimer": "Informational wellness suggestions only. Grounded in uploaded diagnostic report. Not a medical diagnosis or prescription."
        }

mini_doctor_service = MiniDoctorService()
