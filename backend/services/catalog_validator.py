"""Catalog validation for voice-added items.

Three-tier matching against the 3000-item catalog:
  1. Exact match (O(1) dict lookup)
  2. Word-boundary substring match (meaningful words only)
  3. Fuzzy match (difflib.get_close_matches)

Heuristics:
  - Reject items shorter than 2 characters
  - Ignore noise/stop words when computing word overlap
  - Require at least one meaningful word (3+ chars, not a number) to match
  - Strip leading numbers from NLP artifacts like "1 pizza" → "pizza"
"""
import logging
import re
from dataclasses import dataclass, field
from difflib import get_close_matches, SequenceMatcher

from backend.config import settings
from backend.recommendations._catalog import CATALOG

logger = logging.getLogger(__name__)

# Words that should NEVER be treated as grocery item names
_NOISE_WORDS: set[str] = {
    # pronouns / articles / prepositions
    "i", "me", "my", "we", "he", "she", "it", "a", "an", "the",
    "to", "of", "in", "on", "at", "for", "is", "am", "are", "was",
    "be", "do", "did", "no", "not", "or", "so", "if", "up", "by",
    # common STT noise
    "sorry", "day", "way", "time", "thing", "stuff", "ok", "okay",
    "yes", "yeah", "no", "nah", "thanks", "thank", "please", "hello",
    "hi", "hey", "bye", "um", "uh", "hmm", "hm", "oh", "ah",
    # numbers as strings (NLP artifacts)
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "0",
}

# Minimum character length for an item name to be considered valid
_MIN_ITEM_LENGTH = 2

# Minimum word length to count as a "meaningful" overlap word
_MIN_MEANINGFUL_WORD_LENGTH = 3

# Pattern to strip leading "number + space" from NLP artifacts like "1 pizza"
_LEADING_NUMBER_RE = re.compile(r"^\d+\s+")


@dataclass
class CatalogValidationResult:
    """Result of validating an item name against the catalog."""

    is_valid: bool
    matched_name: str | None = None
    match_type: str | None = None  # "exact", "substring", "fuzzy"
    match_score: float = 0.0
    suggestions: list[str] = field(default_factory=list)


def validate_item(item_name: str) -> CatalogValidationResult:
    """Validate an item name against the catalog using 3-tier matching.

    Args:
        item_name: The item name extracted by NLP.

    Returns:
        CatalogValidationResult with match info or suggestions.
    """
    if not item_name or not item_name.strip():
        return CatalogValidationResult(is_valid=False, suggestions=[])

    query = item_name.lower().strip()

    # Reject items that are just noise words or too short
    if query in _NOISE_WORDS or len(query) < _MIN_ITEM_LENGTH:
        logger.debug("Catalog rejected noise/short item: %r", query)
        return CatalogValidationResult(is_valid=False, suggestions=[])

    # Strip leading numbers from NLP artifacts: "1 pizza" → "pizza", "2 bananas" → "bananas"
    stripped = _LEADING_NUMBER_RE.sub("", query).strip()
    if stripped and stripped != query and stripped not in _NOISE_WORDS:
        query = stripped

    catalog_keys = list(CATALOG.keys())

    # Tier 1: Exact match
    if query in CATALOG:
        logger.debug("Catalog exact match: %r", query)
        return CatalogValidationResult(
            is_valid=True,
            matched_name=CATALOG[query].get("name", query),
            match_type="exact",
            match_score=1.0,
        )

    # Tier 2: Word-boundary substring match with meaningful-word filter
    query_words = set(query.split())
    # Only consider words that are meaningful (3+ chars, not numbers, not noise)
    meaningful_query_words = {
        w for w in query_words
        if len(w) >= _MIN_MEANINGFUL_WORD_LENGTH
        and w not in _NOISE_WORDS
        and not w.isdigit()
    }

    # If query has no meaningful words after filtering, skip substring matching
    if meaningful_query_words:
        substring_matches: list[str] = []
        for key in catalog_keys:
            key_words = set(key.split())
            # Overlap must be on meaningful words only
            overlap = meaningful_query_words & key_words
            if overlap:
                substring_matches.append(key)
            elif query in key:
                # Full query appears as contiguous substring at word boundary
                idx = key.find(query)
                at_start = idx == 0 or key[idx - 1] == " "
                at_end = (idx + len(query)) == len(key) or key[idx + len(query)] == " "
                if at_start and at_end:
                    substring_matches.append(key)

        if substring_matches:
            # Prefer the shortest match (most specific)
            best = min(substring_matches, key=len)
            catalog_entry = CATALOG[best]
            matched_name = catalog_entry.get("name", best)
            logger.debug("Catalog substring match: %r → %r", query, matched_name)
            return CatalogValidationResult(
                is_valid=True,
                matched_name=matched_name,
                match_type="substring",
                match_score=0.85,
            )

    # Tier 3: Fuzzy match via difflib
    close = get_close_matches(
        query,
        catalog_keys,
        n=settings.CATALOG_MAX_SUGGESTIONS,
        cutoff=settings.CATALOG_FUZZY_THRESHOLD,
    )

    if close:
        best_key = close[0]
        score = SequenceMatcher(None, query, best_key).ratio()
        catalog_entry = CATALOG[best_key]
        matched_name = catalog_entry.get("name", best_key)

        if score >= settings.CATALOG_AUTO_CORRECT_THRESHOLD:
            logger.debug("Catalog fuzzy auto-correct: %r → %r (score=%.2f)", query, matched_name, score)
            return CatalogValidationResult(
                is_valid=True,
                matched_name=matched_name,
                match_type="fuzzy",
                match_score=score,
            )

        # Below auto-correct but above fuzzy — return as suggestions only
        suggestion_names = [CATALOG[k].get("name", k) for k in close]
        logger.debug("Catalog fuzzy suggestions for %r: %s (best=%.2f)", query, suggestion_names, score)
        return CatalogValidationResult(
            is_valid=False,
            suggestions=suggestion_names,
        )

    # All tiers failed — find loose suggestions
    all_close = get_close_matches(
        query,
        catalog_keys,
        n=settings.CATALOG_MAX_SUGGESTIONS,
        cutoff=0.45,
    )
    suggestion_names = [CATALOG[k].get("name", k) for k in all_close]
    logger.debug("Catalog no match for %r, loose suggestions: %s", query, suggestion_names)
    return CatalogValidationResult(
        is_valid=False,
        suggestions=suggestion_names,
    )
