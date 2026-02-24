"""LLM fallback suggestions for cold-start items not in the catalog.

Used when co-purchase and similarity lookups return too few results.
"""
import asyncio
import json
import logging
from functools import partial

from groq import Groq

from backend.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a grocery shopping assistant.
Given an item name, suggest 5 commonly bought-together grocery items.
Return ONLY a JSON array of strings.
Example: ["item1", "item2", "item3", "item4", "item5"]"""


class LLMSuggestions:
    """Groq LLM fallback for generating co-purchase suggestions."""

    def __init__(self) -> None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY not set")
        self._client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info("LLMSuggestions ready")

    def _call_sync(self, item_name: str) -> list[str]:
        """Blocking Groq API call."""
        response = self._client.chat.completions.create(
            model=settings.GROQ_LLM_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"Item: {item_name}"},
            ],
            temperature=0.3,
            max_tokens=100,
            timeout=settings.LLM_TIMEOUT,
        )
        raw = (response.choices[0].message.content or "[]").strip()
        if "```" in raw:
            start = raw.find("[")
            end = raw.rfind("]") + 1
            raw = raw[start:end]
        return json.loads(raw)

    async def get(self, item_name: str) -> list[str]:
        """Return LLM-generated co-purchase suggestions.

        Args:
            item_name: Item for which to generate suggestions.

        Returns:
            List of suggestion strings (may be empty on error).
        """
        loop = asyncio.get_event_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(None, partial(self._call_sync, item_name)),
                timeout=settings.LLM_TIMEOUT + 1.0,
            )
            return [str(s) for s in result if s]
        except Exception as exc:
            logger.warning("LLM suggestions failed for %r: %s", item_name, exc)
            return []
