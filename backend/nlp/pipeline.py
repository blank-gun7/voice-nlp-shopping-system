"""Hybrid NLP pipeline: spaCy primary → Groq LLM fallback.

Routing logic:
  1. Preprocess raw text.
  2. Run spaCy parser.
  3. If confidence < NLP_CONFIDENCE_THRESHOLD AND LLM is available → LLM fallback.
  4. Return ParsedCommand with timing metadata.
"""
import logging
import time
from typing import Optional

from backend.config import settings
from backend.nlp.preprocessor import preprocess
from backend.nlp.spacy_parser import SpacyParser

logger = logging.getLogger(__name__)


class NLPPipeline:
    """Orchestrates preprocessing → spaCy → optional LLM fallback.

    Attributes:
        spacy_parser: Loaded SpacyParser instance.
        llm_fallback: LLMFallback instance or None if no API key.
    """

    def __init__(self) -> None:
        self.spacy_parser = SpacyParser()

        self.llm_fallback: Optional[object] = None
        if settings.GROQ_API_KEY:
            try:
                from backend.nlp.llm_fallback import LLMFallback
                self.llm_fallback = LLMFallback()
            except Exception as exc:
                logger.error("Failed to init LLM fallback: %s", exc)
        else:
            logger.warning("GROQ_API_KEY not set — LLM fallback disabled")

        logger.info(
            "NLPPipeline ready (threshold=%.2f, llm=%s)",
            settings.NLP_CONFIDENCE_THRESHOLD,
            "yes" if self.llm_fallback else "no",
        )

    async def process(self, raw_text: str) -> dict:
        """Full pipeline: raw text → structured ParsedCommand dict.

        Args:
            raw_text: Raw transcript from STT or direct user input.

        Returns:
            Dict matching the ParsedCommand schema with an additional
            ``latency`` key (dict of stage → seconds).
        """
        timing: dict[str, float] = {}

        # Stage 1: Preprocess
        t0 = time.perf_counter()
        clean_text = preprocess(raw_text)
        timing["preprocess"] = round(time.perf_counter() - t0, 4)

        # Stage 2: spaCy
        t1 = time.perf_counter()
        result = self.spacy_parser.parse(clean_text)
        timing["spacy"] = round(time.perf_counter() - t1, 4)

        logger.debug(
            "spaCy confidence=%.2f for %r (threshold=%.2f)",
            result["confidence"],
            clean_text,
            settings.NLP_CONFIDENCE_THRESHOLD,
        )

        # Stage 3: LLM fallback if confidence is low
        if result["confidence"] < settings.NLP_CONFIDENCE_THRESHOLD and self.llm_fallback:
            logger.info("Confidence %.2f < %.2f — invoking LLM fallback", result["confidence"], settings.NLP_CONFIDENCE_THRESHOLD)
            t2 = time.perf_counter()
            try:
                result = await self.llm_fallback.parse(clean_text)
            except Exception as exc:
                logger.warning("LLM fallback failed (%s) — using spaCy result", exc)
            timing["llm"] = round(time.perf_counter() - t2, 4)

        result["latency"] = timing
        result["preprocessed_text"] = clean_text
        return result
