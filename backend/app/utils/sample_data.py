import uuid

SAMPLE_REPORT_ID = "sample-report-001"

SAMPLE_PAGES = [
    {
        "page_number": 1,
        "page_title": "Patient & Order Details",
        "extracted_text": """CITY DIAGNOSTICS - Clinical Laboratory Services
Report ID: CD-2025-0618
Patient Name: Alex Smith
Age / Sex: 34 Y / Sample Patient
Referred By: Dr. Maya Rao
Sample Collected: 18 Jun 2025 · Report Issued: 18 Jun 2025
Clinical History: Routine Annual Wellness Screening
Tests Ordered: Comprehensive Blood Panel (CBC, Metabolic, Vitamin D, TSH)""",
        "has_table": False,
        "table_data": []
    },
    {
        "page_number": 2,
        "page_title": "Complete Blood Count & Metabolic Panel",
        "extracted_text": """CITY DIAGNOSTICS - Clinical Laboratory Services
Patient: Alex Smith | Collected: 18 Jun 2025 | Report: CD-2025-0618

COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL
Investigation                    Result      Reference Interval   Unit
Hemoglobin                       13.8        12.0–15.5            g/dL
White blood cells                6.4         4.0–11.0             10³/μL
Platelets                        278         150–450              10³/μL
Red blood cells                  4.7         4.2–5.4              10⁶/μL
Hematocrit                       41.2        36.0–46.0            %
Fasting Plasma Glucose           92          70–99                mg/dL

Clinical Note: Values should be interpreted alongside clinical history and examination. Reference intervals may vary by laboratory method.""",
        "has_table": True,
        "table_data": [
            {"investigation": "Hemoglobin", "result": "13.8", "range": "12.0–15.5", "unit": "g/dL"},
            {"investigation": "White blood cells", "result": "6.4", "range": "4.0–11.0", "unit": "10³/μL"},
            {"investigation": "Platelets", "result": "278", "range": "150–450", "unit": "10³/μL"},
            {"investigation": "Red blood cells", "result": "4.7", "range": "4.2–5.4", "unit": "10⁶/μL"},
            {"investigation": "Hematocrit", "result": "41.2", "range": "36.0–46.0", "unit": "%"},
            {"investigation": "Fasting Plasma Glucose", "result": "92", "range": "70–99", "unit": "mg/dL"},
        ]
    },
    {
        "page_number": 3,
        "page_title": "Vitamin & Thyroid Panel",
        "extracted_text": """CITY DIAGNOSTICS - Clinical Laboratory Services
Patient: Alex Smith | Collected: 17 Jun 2025 | Report: CD-2025-0618

VITAMIN & THYROID PANEL
Investigation                    Result      Reference Interval   Unit
25-OH Vitamin D                  24          30–100               ng/mL
Thyroid stimulating hormone      2.1         0.4–4.0              mIU/L
Vitamin B12                      410         200–900              pg/mL

Clinical Note: Serum 25-hydroxyvitamin D is below reference interval. Consult healthcare provider for clinical correlation.""",
        "has_table": True,
        "table_data": [
            {"investigation": "25-OH Vitamin D", "result": "24", "range": "30–100", "unit": "ng/mL"},
            {"investigation": "Thyroid stimulating hormone", "result": "2.1", "range": "0.4–4.0", "unit": "mIU/L"},
            {"investigation": "Vitamin B12", "result": "410", "range": "200–900", "unit": "pg/mL"},
        ]
    },
    {
        "page_number": 4,
        "page_title": "Laboratory Summary & Verification",
        "extracted_text": """CITY DIAGNOSTICS - Clinical Laboratory Services
Patient: Alex Smith | Report: CD-2025-0618

Quality Control Verified
Verified by: Dr. Priya Menon, Consultant Pathologist
End of Report CD-2025-0618""",
        "has_table": False,
        "table_data": []
    }
]

SAMPLE_FINDINGS = [
    {
        "id": "hemoglobin",
        "name": "Hemoglobin",
        "category": "Complete Blood Count",
        "value": "13.8 g/dL",
        "numeric_value": 13.8,
        "unit": "g/dL",
        "range": "12.0–15.5 g/dL",
        "ref_min": 12.0,
        "ref_max": 15.5,
        "status": "Normal",
        "page": 2,
        "position": 64.0,
        "explanation": "Your hemoglobin level is within the expected range.",
        "detail": "Hemoglobin carries oxygen through the blood. This value sits comfortably inside the laboratory’s reference interval, so the report does not flag it for review.",
        "matched_quote": "Hemoglobin 13.8 g/dL — Reference interval 12.0–15.5 g/dL",
        "is_exact_match": True,
        "layman_explanation": "Hemoglobin carries oxygen through your blood. A value inside the report’s range is generally not marked abnormal by the laboratory.",
        "clinical_explanation": "Hemoglobin concentration falls within the laboratory-defined reference interval. Correlate with red-cell indices and clinical context."
    },
    {
        "id": "vitamin-d",
        "name": "Vitamin D",
        "category": "Vitamin & Thyroid Panel",
        "value": "24 ng/mL",
        "numeric_value": 24.0,
        "unit": "ng/mL",
        "range": "30–100 ng/mL",
        "ref_min": 30.0,
        "ref_max": 100.0,
        "status": "Low",
        "page": 3,
        "position": 24.0,
        "explanation": "Your Vitamin D level is slightly lower than the reference range.",
        "detail": "Vitamin D supports bone and muscle health. This result is 6 ng/mL below the laboratory’s lower reference limit. Discuss its relevance with a qualified professional.",
        "matched_quote": "25-OH Vitamin D 24 ng/mL — Reference interval 30–100 ng/mL",
        "is_exact_match": True,
        "layman_explanation": "Vitamin D supports bone and muscle health. A result below the report’s expected range may be worth discussing with a healthcare professional.",
        "clinical_explanation": "Serum 25-hydroxyvitamin D is below the laboratory reference interval. Interpret alongside symptoms, history, and clinician assessment."
    },
    {
        "id": "glucose",
        "name": "Fasting glucose",
        "category": "Metabolic Panel",
        "value": "92 mg/dL",
        "numeric_value": 92.0,
        "unit": "mg/dL",
        "range": "70–99 mg/dL",
        "ref_min": 70.0,
        "ref_max": 99.0,
        "status": "Normal",
        "page": 2,
        "position": 76.0,
        "explanation": "Your fasting glucose is within the expected range.",
        "detail": "Glucose is the main sugar used by the body for energy. The reported value falls within the listed fasting reference interval, assuming fasting status is correct.",
        "matched_quote": "Fasting Plasma Glucose 92 mg/dL — Reference interval 70–99 mg/dL",
        "is_exact_match": True,
        "layman_explanation": "Glucose is the main sugar your body uses for energy. Whether a result is expected can depend on whether the sample was taken while fasting.",
        "clinical_explanation": "Interpret plasma glucose against the stated fasting or non-fasting reference interval and confirm specimen conditions."
    },
    {
        "id": "tsh",
        "name": "Thyroid stimulating hormone",
        "category": "Vitamin & Thyroid Panel",
        "value": "2.1 mIU/L",
        "numeric_value": 2.1,
        "unit": "mIU/L",
        "range": "0.4–4.0 mIU/L",
        "ref_min": 0.4,
        "ref_max": 4.0,
        "status": "Normal",
        "page": 3,
        "position": 48.0,
        "explanation": "Your thyroid stimulating hormone result is within the reference range.",
        "detail": "TSH helps regulate thyroid activity. This result is near the middle of the laboratory’s reference interval and is not marked abnormal in the report.",
        "matched_quote": "Thyroid stimulating hormone 2.1 mIU/L — Reference interval 0.4–4.0 mIU/L",
        "is_exact_match": True,
        "layman_explanation": "TSH helps regulate metabolism and thyroid balance. This level is in the middle of normal range.",
        "clinical_explanation": "TSH within normal euthyroid reference range (0.4–4.0 mIU/L)."
    }
]

SAMPLE_TRENDS = [
    {
        "label": "Hemoglobin",
        "tested": 13.8,
        "previous": 13.2,
        "normal_min": 12.0,
        "normal_max": 15.5,
        "chart_min": 10.0,
        "chart_max": 18.0,
        "unit": "g/dL"
    },
    {
        "label": "Vitamin D",
        "tested": 24.0,
        "previous": 18.0,
        "normal_min": 30.0,
        "normal_max": 100.0,
        "chart_min": 0.0,
        "chart_max": 110.0,
        "unit": "ng/mL"
    },
    {
        "label": "Fasting glucose",
        "tested": 92.0,
        "previous": 88.0,
        "normal_min": 70.0,
        "normal_max": 99.0,
        "chart_min": 50.0,
        "chart_max": 120.0,
        "unit": "mg/dL"
    },
    {
        "label": "TSH",
        "tested": 2.1,
        "previous": None,
        "normal_min": 0.4,
        "normal_max": 4.0,
        "chart_min": 0.0,
        "chart_max": 5.0,
        "unit": "mIU/L"
    }
]

SAMPLE_FLAGS = [
    {
        "id": "date",
        "level": "Conflict",
        "title": "Two collection dates found",
        "detail": "Page 1 lists 18 June, while the footer on page 3 lists 17 June.",
        "sources": ["Page 1 · 18 Jun 2025", "Page 3 · 17 Jun 2025"],
        "suggested_step": "Confirm this information with the issuing laboratory or your healthcare professional.",
        "is_resolved": False
    },
    {
        "id": "range",
        "level": "Needs context",
        "title": "Vitamin D reference range may vary",
        "detail": "The report uses 30–100 ng/mL. Other laboratories may use a different interval.",
        "sources": ["Page 3 · Lab reference interval"],
        "suggested_step": "Discuss reference interval standards with your physician.",
        "is_resolved": False
    },
    {
        "id": "fasting",
        "level": "Missing",
        "title": "Fasting status not confirmed",
        "detail": "A glucose value is present, but the report does not clearly confirm fasting status.",
        "sources": ["Page 2 · Glucose 92 mg/dL"],
        "suggested_step": "Ensure blood was drawn following an 8-12 hour fast for accurate glucose evaluation.",
        "is_resolved": False
    }
]

SAMPLE_REPORT_METADATA = {
    "id": SAMPLE_REPORT_ID,
    "file_name": "Comprehensive_Blood_Panel.pdf",
    "report_title": "Comprehensive blood panel",
    "patient_name": "Alex Smith",
    "patient_age": "34 years",
    "patient_sex": "Sample",
    "doctor_name": "Dr. Maya Rao",
    "lab_name": "City Diagnostics",
    "report_date": "18 June 2025",
    "total_findings": 4,
    "normal_count": 3,
    "abnormal_count": 1,
    "normality_percentage": 75.0,
    "overall_summary_text": "Most results are within their reference ranges. Vitamin D is below the laboratory range and may be worth discussing with your healthcare professional.",
    "is_sample": True,
    "is_verified": True
}
