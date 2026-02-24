"""Groq Llama 3.1 8B fallback for low-confidence NLP results.

Sends the preprocessed text to Groq and requests a structured JSON parse.
Runs synchronously inside run_in_executor so it never blocks the event loop.
"""
import asyncio
import json
import logging
from functools import partial
from typing import Optional

from groq import Groq

from backend.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a voice shopping assistant NLP parser.
Given a shopping voice command, extract structured information and return ONLY valid JSON.

Supported intents: add_item, remove_item, modify_item, check_item, search_item, list_items, clear_list, get_suggestions

JSON schema (all fields required, use null if not found):
{
  "intent": "<intent>",
  "item": "<item name or null>",
  "quantity": <number or null>,
  "unit": "<unit string or null>",
  "category": "<grocery category or null>",
  "brand": "<brand name or null>",
  "price_max": <number or null>
}

Examples:
"add 2 bananas" → {"intent":"add_item","item":"bananas","quantity":2,"unit":null,"category":"produce","brand":null,"price_max":null}
"remove milk from my list" → {"intent":"remove_item","item":"milk","quantity":null,"unit":null,"category":null,"brand":null,"price_max":null}
"show my list" → {"intent":"list_items","item":null,"quantity":null,"unit":null,"category":null,"brand":null,"price_max":null}
"clear my list" → {"intent":"clear_list","item":null,"quantity":null,"unit":null,"category":null,"brand":null,"price_max":null}"""


class LLMFallback:
    """Groq LLM-based NLP fallback for complex / low-confidence commands.

    Attributes:
        _client: Groq synchronous client.
    """

    def __init__(self) -> None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY not set — LLM fallback unavailable")
        self._client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info("LLMFallback ready (model=%s)", settings.GROQ_LLM_MODEL)

    def _call_sync(self, text: str) -> dict:
        """Blocking Groq API call; runs inside a thread pool."""
        response = self._client.chat.completions.create(
            model=settings.GROQ_LLM_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f'Parse this shopping command: "{text}"'},
            ],
            temperature=0.0,
            max_tokens=200,
            timeout=settings.LLM_TIMEOUT,
        )
        raw = response.choices[0].message.content or "{}"
        raw = raw.strip()

        # Extract JSON block if wrapped in markdown fences
        if "```" in raw:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            raw = raw[start:end]

        data = json.loads(raw)
        return data

    async def parse(self, text: str) -> dict:
        """Parse a shopping command via Groq LLM.

        Args:
            text: Preprocessed lowercase command text.

        Returns:
            Dict with keys: intent, item, quantity, unit, category, brand,
            price_max, confidence, method.

        Raises:
            Exception: Propagates Groq/JSON errors to the caller.
        """
        loop = asyncio.get_event_loop()
        try:
            data = await asyncio.wait_for(
                loop.run_in_executor(None, partial(self._call_sync, text)),
                timeout=settings.LLM_TIMEOUT + 1.0,
            )
        except asyncio.TimeoutError:
            logger.warning("LLM fallback timed out for: %r", text)
            raise

        result = {
            "intent": data.get("intent", "add_item"),
            "item": data.get("item"),
            "quantity": _to_float(data.get("quantity")),
            "unit": data.get("unit"),
            "category": data.get("category"),
            "brand": data.get("brand"),
            "price_max": _to_float(data.get("price_max")),
            "confidence": 0.90,  # LLM output gets a fixed high score
            "method": "llm_fallback",
        }
        logger.debug("LLMFallback result: %s", result)
        return result


def _to_float(value: Optional[object]) -> Optional[float]:
    """Safely coerce a JSON value to float."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None
