import pytest
import asyncio
import io
import sys
import os
import uuid

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pymupdf
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db

@pytest.mark.asyncio
async def test_backend_endpoints():
    await init_db()
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Sample report
        res = await client.get("/api/reports/sample")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == "sample-report-001"
        assert len(data["findings"]) == 4
        assert len(data["trends"]) == 4
        assert len(data["flags"]) == 3
        assert len(data["pages"]) == 4

        # 3. Auth signup & login
        unique_email = f"test_{uuid.uuid4().hex[:6]}@medcorpus.ai"
        signup_res = await client.post("/api/auth/signup", json={
            "email": unique_email,
            "password": "strongpassword123",
            "name": "Test User",
            "role": "patient"
        })
        assert signup_res.status_code == 200
        token = signup_res.json()["access_token"]
        assert token

        login_res = await client.post("/api/auth/login", json={
            "email": unique_email,
            "password": "strongpassword123"
        })
        assert login_res.status_code == 200
        assert login_res.json()["access_token"]

        # 4. Plain Language Explain in multiple languages
        explain_res = await client.post("/api/plain-language/explain", json={
            "text": "Vitamin D 24 ng/mL",
            "language": "Hindi",
            "mode": "layman"
        })
        assert explain_res.status_code == 200
        assert explain_res.json()["topic"] == "vitamin"
        assert len(explain_res.json()["explanation"]) > 5

        explain_kn = await client.post("/api/plain-language/explain", json={
            "text": "Hemoglobin 13.8 g/dL",
            "language": "Kannada",
            "mode": "clinical"
        })
        assert explain_kn.status_code == 200
        assert explain_kn.json()["topic"] == "hemoglobin"

        # 5. Voice Assistant query
        voice_res = await client.post("/api/voice/query", json={
            "question": "What was my Vitamin D result?"
        })
        assert voice_res.status_code == 200
        voice_data = voice_res.json()
        assert "24 ng/mL" in voice_data["text"]
        assert voice_data["page"] == 3
        assert voice_data["highlight"] == "Vitamin D"

        # 6. Mini Doctor Plans and Chat
        plans_res = await client.get("/api/mini-doctor/plans")
        assert plans_res.status_code == 200
        assert "Routine" in plans_res.json()["plans"]
        assert "Diet" in plans_res.json()["plans"]
        assert "Nutrition" in plans_res.json()["plans"]

        chat_res = await client.post("/api/mini-doctor/chat", json={
            "question": "What foods should I eat?"
        })
        assert chat_res.status_code == 200
        assert "food" in chat_res.json()["answer"].lower() or "diet" in chat_res.json()["answer"].lower()

        # 7. Flags
        flag_res = await client.get("/api/flags/sample-report-001")
        assert flag_res.status_code == 200
        flags = flag_res.json()
        assert len(flags) >= 3

        resolve_res = await client.post("/api/flags/date/resolve", json={"is_resolved": True})
        assert resolve_res.status_code == 200
        assert resolve_res.json()["is_resolved"] is True

        # 8. Dynamic PDF Upload with PyMuPDF
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text((50, 72), "CITY DIAGNOSTICS - CLINICAL REPORT\nPatient: Jane Doe | Date: 12 Jan 2025\nHemoglobin: 14.2 g/dL (Range: 12.0-15.5 g/dL)\nFasting Plasma Glucose: 95 mg/dL (Range: 70-99 mg/dL)\n25-OH Vitamin D: 22 ng/mL (Range: 30-100 ng/mL)\n")
        pdf_bytes = doc.tobytes()
        doc.close()

        upload_res = await client.post(
            "/api/reports/upload",
            files={"file": ("test_report.pdf", pdf_bytes, "application/pdf")},
            data={"language": "English"}
        )
        assert upload_res.status_code == 200
        up_data = upload_res.json()
        assert up_data["success"] is True
        assert up_data["report_id"]
        assert up_data["summary"]["patient_name"] == "Jane Doe"
        assert len(up_data["summary"]["findings"]) >= 3
        print("\nAll 8 test suites passed with 100% success!")

if __name__ == "__main__":
    asyncio.run(test_backend_endpoints())
