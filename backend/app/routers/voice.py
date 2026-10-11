from fastapi import APIRouter, UploadFile, File
from backend.app.schemas.voice import VoiceQueryRequest, VoiceQueryResponse
from backend.app.services.voice_assistant import voice_service
from backend.app.services.ai_client import ai_client

router = APIRouter(prefix="/api/voice", tags=["Voice Assistant"])

@router.post("/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """
    Transcribes audio recorded from user's microphone using Groq Whisper or Gemini.
    """
    audio_bytes = await file.read()
    res = await ai_client.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=file.filename or "recording.webm",
        mime_type=file.content_type or "audio/webm"
    )
    return res

@router.post("/query", response_model=VoiceQueryResponse)
async def query_voice(req: VoiceQueryRequest):
    """
    Answers questions grounded exclusively in verified report findings,
    citing original page numbers, quotes, and highlighting target items.
    """
    res = await voice_service.process_query(req.question, report_id=req.report_id)
    return VoiceQueryResponse(
        question=req.question,
        text=res["text"],
        source=res["source"],
        page=res["page"],
        highlight=res["highlight"],
        is_grounded=res.get("is_grounded", True),
        provider=res.get("provider"),
        model=res.get("model"),
        latency_ms=res.get("latency_ms"),
        is_simulated=res.get("is_simulated", False),
        suggested_followups=res.get("suggested_followups", [])
    )


@router.get("/sample-questions")
async def get_sample_questions():
    return {
        "questions": [
            "What was my Vitamin D result?",
            "Which results were outside the normal range?",
            "Explain my hemoglobin result",
            "What was my fasting glucose level?",
            "Summarize all findings"
        ]
    }
