"""Voice API routes.

POST /api/voice/transcribe  — audio bytes → transcript (STT only)
POST /api/voice/process     — text → ParsedCommand (NLP only)
POST /api/voice/command     — audio → STT → NLP → list action → response (full pipeline)
"""
import logging
import time

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from backend.models.schemas import (
    ActionResult,
    ParsedCommand,
    ProcessRequest,
    Suggestions,
    TranscribeResponse,
    VoiceCommandResponse,
)

router = APIRouter(prefix="/api/voice", tags=["voice"])
logger = logging.getLogger(__name__)

DEFAULT_LIST_ID = 1  # Fallback list ID (no auth in v1)


# ── POST /api/voice/transcribe ────────────────────────────────────────────────

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    request: Request,
    file: UploadFile = File(..., description="Audio file (webm/opus from MediaRecorder)"),
) -> TranscribeResponse:
    """STT only — audio bytes → transcript.

    Raises:
        503: STT service unavailable (no GROQ_API_KEY).
        400: Empty audio file.
        500: Groq API error.
    """
    stt = getattr(request.app.state, "stt", None)
    if stt is None:
        raise HTTPException(
            status_code=503,
            detail="STT service unavailable — set GROQ_API_KEY and restart",
        )

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

    mime_type: str = file.content_type or "audio/webm"

    try:
        result = await stt.transcribe(audio_bytes, mime_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Groq transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc

    return TranscribeResponse(**result)


# ── POST /api/voice/process ────────────────────────────────────────────────────

@router.post("/process", response_model=ParsedCommand)
async def process_text(request: Request, body: ProcessRequest) -> ParsedCommand:
    """NLP only — text → ParsedCommand.

    Useful for testing the NLP pipeline without audio.

    Raises:
        503: NLP pipeline unavailable.
        400: Empty text.
    """
    nlp = getattr(request.app.state, "nlp", None)
    if nlp is None:
        raise HTTPException(
            status_code=503,
            detail="NLP pipeline unavailable — backend startup error",
        )

    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty")

    try:
        result = await nlp.process(body.text)
    except Exception as exc:
        logger.exception("NLP processing failed")
        raise HTTPException(status_code=500, detail=f"NLP processing failed: {exc}") from exc

    return ParsedCommand(**result)


# ── POST /api/voice/command ────────────────────────────────────────────────────

@router.post("/command", response_model=VoiceCommandResponse)
async def voice_command(
    request: Request,
    file: UploadFile = File(..., description="Audio file from MediaRecorder"),
    list_id: int = Form(DEFAULT_LIST_ID),
) -> VoiceCommandResponse:
    """Full pipeline: audio → STT → NLP → list action → response.

    Raises:
        503: Required services unavailable.
        400: Empty audio.
        500: Pipeline error.
    """
    stt = getattr(request.app.state, "stt", None)
    nlp = getattr(request.app.state, "nlp", None)
    list_mgr = getattr(request.app.state, "list_mgr", None)
    rec_engine = getattr(request.app.state, "rec_engine", None)

    if stt is None:
        raise HTTPException(status_code=503, detail="STT service unavailable — set GROQ_API_KEY")
    if nlp is None:
        raise HTTPException(status_code=503, detail="NLP pipeline unavailable")
    if list_mgr is None:
        raise HTTPException(status_code=503, detail="List manager unavailable")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

    latency: dict[str, float] = {}
    mime_type: str = file.content_type or "audio/webm"

    # Stage 1: STT
    t0 = time.perf_counter()
    try:
        stt_result = await stt.transcribe(audio_bytes, mime_type)
    except Exception as exc:
        logger.exception("STT failed in voice command")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc
    latency["stt"] = round(time.perf_counter() - t0, 3)
    transcript: str = stt_result["transcript"]

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Empty transcript — could not understand audio")

    # Stage 2: NLP
    t1 = time.perf_counter()
    try:
        parsed_dict = await nlp.process(transcript)
    except Exception as exc:
        logger.exception("NLP failed in voice command")
        raise HTTPException(status_code=500, detail=f"NLP failed: {exc}") from exc
    latency["nlp"] = round(time.perf_counter() - t1, 3)

    # Merge inner NLP latency
    for k, v in (parsed_dict.get("latency") or {}).items():
        latency[f"nlp_{k}"] = v

    parsed = ParsedCommand(**parsed_dict)

    # Stage 3: Execute list action
    t2 = time.perf_counter()
    try:
        action_result, updated_list = await list_mgr.execute(
            list_id=list_id,
            parsed=parsed,
            raw_transcript=transcript,
        )
    except Exception as exc:
        logger.exception("List action failed")
        raise HTTPException(status_code=500, detail=f"List action failed: {exc}") from exc
    latency["action"] = round(time.perf_counter() - t2, 3)

    # Stage 4: Recommendations (optional, non-blocking)
    suggestions = None
    if rec_engine and parsed.item:
        try:
            t3 = time.perf_counter()
            suggestions = await rec_engine.get_suggestions(
                item_name=parsed.item,
                list_id=list_id,
            )
            latency["recommendations"] = round(time.perf_counter() - t3, 3)
        except Exception as exc:
            logger.warning("Recommendations failed (non-fatal): %s", exc)

    latency["total"] = sum(v for k, v in latency.items() if k != "total")

    return VoiceCommandResponse(
        transcript=transcript,
        parsed=parsed,
        action_result=action_result,
        updated_list=updated_list,
        suggestions=suggestions,
        latency=latency,
    )
