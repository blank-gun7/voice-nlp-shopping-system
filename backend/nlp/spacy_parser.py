"""spaCy-based intent classifier and entity extractor.

Primary NLP layer.  Uses PhraseMatcher against item_catalog.json for item
recognition, then pattern-based intent detection.  Returns a confidence score
so the hybrid pipeline can decide whether to invoke the LLM fallback.
"""
import json
import logging
import re
from pathlib import Path
from typing import Optional

import spacy
from spacy.matcher import PhraseMatcher

from backend.config import settings

logger = logging.getLogger(__name__)

# ── Unit keywords ──────────────────────────────────────────────────────────────

UNIT_KEYWORDS: set[str] = {
    "kg", "kilogram", "kilograms", "g", "gram", "grams",
    "lb", "lbs", "pound", "pounds", "oz", "ounce", "ounces",
    "l", "liter", "liters", "litre", "litres",
    "ml", "milliliter", "milliliters", "millilitre", "millilitres",
    "piece", "pieces", "pc", "pcs",
    "pack", "packs", "packet", "packets",
    "bag", "bags", "box", "boxes", "can", "cans",
    "bottle", "bottles", "bunch", "bunches",
    "dozen", "loaf", "loaves", "jar", "jars",
    "carton", "cartons", "tray", "trays", "roll", "rolls",
    "cup", "cups", "tbsp", "tablespoon", "tablespoons",
    "tsp", "teaspoon", "teaspoons", "slice", "slices",
}

# ── Intent → trigger keywords ──────────────────────────────────────────────────

_INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("clear_list",    ["clear", "empty", "reset", "wipe", "start over", "delete all", "remove all", "remove everything"]),
    ("list_items",    ["show", "list", "read", "tell me", "what's on", "what is on", "what do i have", "display", "view"]),
    ("get_suggestions", ["suggest", "recommend", "what else", "what should", "ideas", "idea", "help me"]),
    ("check_item",    ["check", "mark", "got", "have", "checked", "tick", "done with", "bought", "purchased"]),
    ("search_item",   ["search", "find", "look for", "where", "locate", "do you have", "is there"]),
    ("remove_item",   ["remove", "delete", "take out", "take off", "cross off", "get rid of", "don't need", "do not need"]),
    ("modify_item",   ["change", "update", "modify", "set", "make it", "adjust"]),
    ("add_item",      ["add", "put", "get", "buy", "need", "want", "throw in", "pick up", "grab", "include", "i need", "i want"]),
]

# Price patterns
_PRICE_RE = re.compile(r"\$?\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)?", re.IGNORECASE)


class SpacyParser:
    """Loads a spaCy model and item catalog; parses NLP commands.

    Attributes:
        nlp: The loaded spaCy Language model.
        matcher: PhraseMatcher loaded with item catalog entries.
        catalog_items: Flat list of item name strings.
    """

    def __init__(self, catalog_path: Optional[Path] = None) -> None:
        logger.info("Loading spaCy model: %s", settings.SPACY_MODEL)
        try:
            self.nlp = spacy.load(settings.SPACY_MODEL)
        except OSError:
            logger.warning("spaCy model %s not found — falling back to en_core_web_sm", settings.SPACY_MODEL)
            self.nlp = spacy.load("en_core_web_sm")

        self.matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        self.catalog_items: list[str] = []

        if catalog_path is None:
            catalog_path = Path(settings.DATA_DIR) / "item_catalog.json"

        self._load_catalog(catalog_path)
        logger.info("SpacyParser ready (%d catalog items)", len(self.catalog_items))

    def _load_catalog(self, path: Path) -> None:
        """Load item catalog and add entries to PhraseMatcher."""
        if not path.exists():
            logger.warning("item_catalog.json not found at %s — item matching will be limited", path)
            return
        with open(path, encoding="utf-8") as fh:
            catalog = json.load(fh)
        self.catalog_items = [item["name_lower"] for item in catalog]
        patterns = [self.nlp.make_doc(name) for name in self.catalog_items]
        self.matcher.add("ITEM", patterns)

    # ── Public parse method ────────────────────────────────────────────────────

    def parse(self, text: str) -> dict:
        """Parse a preprocessed text command.

        Args:
            text: Preprocessed lowercase string.

        Returns:
            Dict with keys: intent, item, quantity, unit, category, brand,
            price_max, confidence, method.
        """
        doc = self.nlp(text)

        intent = self._detect_intent(text)
        item = self._extract_item(doc, text)
        quantity = self._extract_quantity(doc, text)
        unit = self._extract_unit(doc)
        price_max = self._extract_price(text)
        confidence = self._score_confidence(intent, item, quantity)

        result = {
            "intent": intent,
            "item": item,
            "quantity": quantity,
            "unit": unit,
            "category": None,
            "brand": None,
            "price_max": price_max,
            "confidence": confidence,
            "method": "spacy",
        }
        logger.debug("SpacyParser result: %s", result)
        return result

    # ── Private helpers ────────────────────────────────────────────────────────

    def _detect_intent(self, text: str) -> str:
        """Return the best-matching intent string."""
        text_lower = text.lower()
        for intent, keywords in _INTENT_PATTERNS:
            for kw in keywords:
                # Use word-boundary check for single words
                if " " in kw:
                    if kw in text_lower:
                        return intent
                else:
                    if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                        return intent
        # Default fallback
        return "add_item"

    def _extract_item(self, doc, text: str) -> Optional[str]:
        """Extract item name via PhraseMatcher first, then noun chunks."""
        matches = self.matcher(doc)
        if matches:
            # Return the longest match
            longest = max(matches, key=lambda m: m[2] - m[1])
            _, start, end = longest
            return doc[start:end].text

        # Fallback: use noun chunks, skip quantity/unit tokens
        stop_words = {"list", "all", "everything", "me", "my", "the", "some", "any"}
        chunks = [
            chunk.text for chunk in doc.noun_chunks
            if chunk.text.lower() not in stop_words
            and chunk.text.lower() not in UNIT_KEYWORDS
        ]
        if chunks:
            return chunks[-1]  # last noun chunk usually is the item

        # Last resort: extract nouns that aren't stop/unit words
        nouns = [
            token.text for token in doc
            if token.pos_ in {"NOUN", "PROPN"}
            and token.text.lower() not in stop_words
            and token.text.lower() not in UNIT_KEYWORDS
            and not token.is_stop
        ]
        return nouns[-1] if nouns else None

    def _extract_quantity(self, doc, text: str) -> Optional[float]:
        """Extract quantity from the doc (NUM tokens or digit strings)."""
        for token in doc:
            if token.like_num:
                try:
                    return float(token.text.replace(",", ""))
                except ValueError:
                    pass
        # Scan for standalone digits in text
        digit_match = re.search(r"\b(\d+(?:\.\d+)?)\b", text)
        if digit_match:
            return float(digit_match.group(1))
        return None

    def _extract_unit(self, doc) -> Optional[str]:
        """Extract measurement unit token."""
        for token in doc:
            if token.text.lower() in UNIT_KEYWORDS:
                return token.text.lower()
        return None

    def _extract_price(self, text: str) -> Optional[float]:
        """Extract price ceiling from text."""
        match = _PRICE_RE.search(text)
        if match:
            return float(match.group(1))
        return None

    def _score_confidence(self, intent: str, item: Optional[str], quantity: Optional[float]) -> float:
        """Heuristic confidence in [0, 1]."""
        score = 0.5  # base

        # Intent is always detected (worst-case default)
        score += 0.2

        # Item extracted boosts confidence
        if item:
            # Higher if it's a catalog match
            if item.lower() in self.catalog_items:
                score += 0.25
            else:
                score += 0.1

        # Quantity found adds a bit
        if quantity is not None:
            score += 0.05

        return min(round(score, 2), 1.0)
