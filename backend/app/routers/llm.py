import os
import re
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from backend.app.services.ai_client import ai_client
from backend.app.config import settings

router = APIRouter(prefix="/api/llm", tags=["LLM Engine"])

class LLMConfigRequest(BaseModel):
    provider: Optional[str] = None          # 'gemini', 'local', 'groq', 'openai', 'ollama'
    gemini_key: Optional[str] = None
    gemini_model: Optional[str] = None
    local_url: Optional[str] = None          # e.g. 'http://localhost:11434/v1' or 'http://localhost:8000/v1'
    local_model: Optional[str] = None        # e.g. 'medcorpus-local' or custom model
    groq_key: Optional[str] = None
    openai_key: Optional[str] = None
    persist_to_env: Optional[bool] = True

class LLMTestRequest(BaseModel):
    query: Optional[str] = "What is the clinical significance of Vitamin D levels in a diagnostic blood test?"

class LLMSummarizeRequest(BaseModel):
    findings: List[Dict[str, Any]]
    patient_name: Optional[str] = "Patient"

def _update_env_file(key: str, value: str):
    """Safely updates or appends a key in .env file in the workspace root."""
    try:
        env_paths = [
            os.path.join(os.getcwd(), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        ]
        for env_path in env_paths:
            content = ""
            if os.path.exists(env_path):
                with open(env_path, "r", encoding="utf-8") as f:
                    content = f.read()
            
            pattern = rf"^{re.escape(key)}=.*$"
            if re.search(pattern, content, flags=re.MULTILINE):
                content = re.sub(pattern, f"{key}={value}", content, flags=re.MULTILINE)
            else:
                if content and not content.endswith("\n"):
                    content += "\n"
                content += f"{key}={value}\n"
            
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)
    except Exception as e:
        # Silently log warning, not critical if write fails
        pass

@router.get("/status")
async def get_llm_status():
    """Returns the current LLM status, active provider, model name, and connection readiness."""
    return ai_client.get_status()

@router.post("/config")
async def update_llm_config(req: LLMConfigRequest):
    """
    Dynamically switches LLM providers (e.g. Gemini <-> Locally Trained LLM)
    and updates API credentials on the fly without restarting the server.
    """
    ai_client.update_config(
        provider=req.provider,
        gemini_key=req.gemini_key,
        gemini_model=req.gemini_model,
        local_url=req.local_url,
        local_model=req.local_model,
        groq_key=req.groq_key,
        openai_key=req.openai_key,
    )

    if req.persist_to_env:
        if req.provider:
            _update_env_file("ACTIVE_LLM_PROVIDER", req.provider)
        if req.gemini_key is not None:
            _update_env_file("GEMINI_API_KEY", req.gemini_key)
        if req.gemini_model:
            _update_env_file("GEMINI_MODEL", req.gemini_model)
        if req.local_url:
            _update_env_file("LOCAL_LLM_URL", req.local_url)
        if req.local_model:
            _update_env_file("LOCAL_LLM_MODEL", req.local_model)
        if req.groq_key is not None:
            _update_env_file("GROQ_API_KEY", req.groq_key)

    return {
        "success": True,
        "message": f"AI Engine configuration updated. Active provider: {ai_client.active_provider}",
        "status": ai_client.get_status()
    }

@router.post("/test")
async def test_llm_connection(req: LLMTestRequest):
    """
    Runs a live prompt through the active LLM engine (Gemini or Local LLM)
    and reports execution latency, model identity, and response text.
    """
    prompt = req.query or "What does a normal hemoglobin level indicate?"
    system_prompt = "You are MedCorpus Clinical AI. Provide a concise, 1-2 sentence evidence-grounded medical explanation."
    
    result = await ai_client.generate_with_metadata(prompt, system_prompt=system_prompt, temperature=0.2)
    return {
        "query": prompt,
        "response": result.get("text"),
        "provider": result.get("provider"),
        "model": result.get("model"),
        "latency_ms": result.get("latency_ms"),
        "is_simulated": result.get("is_simulated")
    }

@router.post("/summarize-report")
async def summarize_report_findings(req: LLMSummarizeRequest):
    """
    Generates an executive clinical summary of diagnostic lab findings using the active LLM.
    """
    if not req.findings:
        raise HTTPException(status_code=400, detail="No findings provided to summarize.")
    
    summary_meta = await ai_client.generate_clinical_summary(req.findings, req.patient_name or "Patient")
    return summary_meta
