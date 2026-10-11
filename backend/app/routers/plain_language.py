from fastapi import APIRouter
from backend.app.schemas.plain_language import ExplainRequest, ExplainResponse
from backend.app.services.plain_language import plain_language_service

router = APIRouter(prefix="/api/plain-language", tags=["Plain Language & Translation"])

@router.post("/explain", response_model=ExplainResponse)
async def explain_text(req: ExplainRequest):
    """
    Translates and explains selected medical terms or findings in
    English, Hindi, Kannada, Spanish, French, or German,
    with Layman or Clinical style.
    """
    result = await plain_language_service.explain(
        text=req.text,
        language=req.language,
        mode=req.mode
    )
    return ExplainResponse(
        selected_text=result["selected_text"],
        topic=result["topic"],
        language=result["language"],
        mode=result["mode"],
        explanation=result["explanation"],
        clinical_note=result.get("clinical_note"),
        provider=result.get("provider"),
        model=result.get("model"),
        latency_ms=result.get("latency_ms"),
        is_simulated=result.get("is_simulated"),
        disclaimer=result["disclaimer"]
    )

@router.get("/languages")
async def get_supported_languages():
    return {
        "languages": ["English", "Hindi", "Kannada", "Spanish", "French", "German"],
        "modes": ["layman", "clinical"]
    }
