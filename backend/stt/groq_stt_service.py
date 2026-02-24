import asyncio
import logging
from functools import partial

from groq import Groq
from backend.config import settings

logger = logging.getLogger(__name__)

# Supported MIME types → file extensions accepted by Groq
_MIME_TO_EXT: dict[str, str] = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
}


class GroqSTTService:
    """Groq Whisper large-v3 speech-to-text service.

    Uses the synchronous Groq client wrapped in run_in_executor so that
    FastAPI async endpoints are never blocked.
    """

    def __init__(self) -> None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set — cannot initialise GroqSTTService")
        self._client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info("GroqSTTService ready (model=%s)", settings.GROQ_STT_MODEL)

    def _transcribe_sync(self, audio_bytes: bytes, filename: str, mime_type: str) -> dict:
        """Blocking Groq API call — runs inside a thread pool."""
        transcription = self._client.audio.transcriptions.create(
            file=(filename, audio_bytes, mime_type),
            model=settings.GROQ_STT_MODEL,
            response_format="verbose_json",
        )
        transcript: str = (transcription.text or "").strip()
        language: str = getattr(transcription, "language", "en") or "en"
        return {
            "transcript": transcript,
            "language": language,
            # Groq does not expose per-word confidence; we return 1.0 as a sentinel
            "confidence": 1.0,
        }

    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
        """Transcribe audio bytes with Groq Whisper.

        Args:
            audio_bytes: Raw audio bytes (webm/opus from MediaRecorder API).
            mime_type: MIME type reported by the browser (e.g. ``audio/webm``).

        Returns:
            Dict with keys ``transcript`` (str), ``language`` (str),
            ``confidence`` (float).

        Raises:
            ValueError: If ``audio_bytes`` is empty.
            Exception: Propagates Groq API errors to the caller.
        """
        if not audio_bytes:
            raise ValueError("Empty audio — nothing to transcribe")

        ext = _MIME_TO_EXT.get(mime_type, "webm")
        filename = f"recording.{ext}"

        logger.debug("Sending %d bytes (%s) to Groq Whisper", len(audio_bytes), mime_type)

        loop = asyncio.get_event_loop()
        result: dict = await loop.run_in_executor(
            None,
            partial(self._transcribe_sync, audio_bytes, filename, mime_type),
        )

        logger.info("Transcribed: %r (lang=%s)", result["transcript"], result["language"])
        return result
