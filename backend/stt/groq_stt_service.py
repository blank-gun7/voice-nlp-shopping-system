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
        """Blocking Groq transcriptions call — preserves original language."""
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
            "confidence": 1.0,
        }

    def _translate_sync(self, audio_bytes: bytes, filename: str, mime_type: str) -> dict:
        """Blocking Groq translations call — auto-detects language and outputs English."""
        translation = self._client.audio.translations.create(
            file=(filename, audio_bytes, mime_type),
            model=settings.GROQ_STT_MODEL,
            response_format="json",
        )
        transcript: str = (translation.text or "").strip()
        return {
            "transcript": transcript,
            "language": "en",  # translations always outputs English
            "confidence": 1.0,
        }

    async def transcribe(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
        """Transcribe audio bytes with Groq Whisper (raw transcription, no translation).

        Used by the ``/api/voice/transcribe`` endpoint for debugging.

        Args:
            audio_bytes: Raw audio bytes (webm/opus from MediaRecorder API).
            mime_type: MIME type reported by the browser.

        Returns:
            Dict with keys ``transcript``, ``language``, ``confidence``.
        """
        if not audio_bytes:
            raise ValueError("Empty audio — nothing to transcribe")

        ext = _MIME_TO_EXT.get(mime_type, "webm")
        filename = f"recording.{ext}"

        logger.debug("Sending %d bytes (%s) to Groq Whisper (transcribe)", len(audio_bytes), mime_type)

        loop = asyncio.get_event_loop()
        result: dict = await loop.run_in_executor(
            None,
            partial(self._transcribe_sync, audio_bytes, filename, mime_type),
        )

        logger.info("Transcribed: %r (lang=%s)", result["transcript"], result["language"])
        return result

    async def translate(self, audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
        """Translate audio to English via Groq Whisper translations endpoint.

        Auto-detects source language (Hindi, Urdu, etc.) and always outputs
        English text. If the input is already English, it transcribes normally.
        Falls back to transcriptions if translations fails.

        Args:
            audio_bytes: Raw audio bytes (webm/opus from MediaRecorder API).
            mime_type: MIME type reported by the browser.

        Returns:
            Dict with keys ``transcript``, ``language``, ``confidence``.
        """
        if not audio_bytes:
            raise ValueError("Empty audio — nothing to translate")

        ext = _MIME_TO_EXT.get(mime_type, "webm")
        filename = f"recording.{ext}"

        logger.debug("Sending %d bytes (%s) to Groq Whisper (translate)", len(audio_bytes), mime_type)

        loop = asyncio.get_event_loop()
        try:
            result: dict = await loop.run_in_executor(
                None,
                partial(self._translate_sync, audio_bytes, filename, mime_type),
            )
            logger.info("Translated: %r (lang=%s)", result["transcript"], result["language"])
            return result
        except Exception as exc:
            logger.warning("Translation failed, falling back to transcription: %s", exc)
            # Create a fresh client — the previous failure may have corrupted
            # the shared HTTP connection pool (SSL state, etc.)
            self._client = Groq(api_key=settings.GROQ_API_KEY)
            result = await loop.run_in_executor(
                None,
                partial(self._transcribe_sync, audio_bytes, filename, mime_type),
            )
            logger.info("Fallback transcribed: %r (lang=%s)", result["transcript"], result["language"])
            return result
