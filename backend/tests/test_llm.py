import sys
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pytest
import httpx
from backend.app.main import app
from backend.app.database import init_db


@pytest.mark.asyncio
async def test_llm_routes():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Status
        res = await client.get("/api/llm/status")
        assert res.status_code == 200
        data = res.json()
        assert "active_provider" in data
        assert "available_providers" in data
        assert len(data["available_providers"]) >= 2

        # Test Test Endpoint
        res_test = await client.post("/api/llm/test", json={"query": "Explain normal glucose level."})
        assert res_test.status_code == 200
        test_data = res_test.json()
        assert "response" in test_data
        assert "latency_ms" in test_data
        assert len(test_data["response"]) > 0

        # Test Summarize Endpoint
        res_sum = await client.post("/api/llm/summarize-report", json={
            "findings": [
                {"name": "Hemoglobin", "value": "13.8 g/dL", "range": "12.0-15.5 g/dL", "status": "Normal"},
                {"name": "Vitamin D", "value": "24 ng/mL", "range": "30-100 ng/mL", "status": "Low"}
            ],
            "patient_name": "Test Patient"
        })
        assert res_sum.status_code == 200
        assert "text" in res_sum.json()

        # Test Switch Config
        res_cfg = await client.post("/api/llm/config", json={
            "provider": "local",
            "local_url": "http://localhost:8080/v1",
            "local_model": "test-med-model",
            "persist_to_env": False
        })
        assert res_cfg.status_code == 200
        assert res_cfg.json()["status"]["active_provider"] == "local"
