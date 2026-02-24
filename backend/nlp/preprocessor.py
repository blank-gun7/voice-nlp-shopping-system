"""Text normalisation before NLP parsing.

Responsibilities:
- Remove filler words (um, uh, like, you know…)
- Strip polite prefixes (hey, please, can you…)
- Convert spoken number words → digits ("two" → 2)
- Collapse whitespace and lower-case
"""
import re
import logging

logger = logging.getLogger(__name__)

# ── Number-word → digit mapping ────────────────────────────────────────────────

NUMBER_WORDS: dict[str, float] = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "a": 1, "an": 1,
    "half": 0.5, "couple": 2, "few": 3, "dozen": 12, "handful": 5,
}

# ── Filler / hedge words to strip ─────────────────────────────────────────────

_FILLER_WORDS: set[str] = {
    "um", "uh", "erm", "er", "hmm", "hm", "ah", "oh",
    "like", "basically", "literally", "actually", "really",
    "kind", "sort", "i mean", "you know", "well", "so",
    "just", "maybe", "perhaps", "please",
}

# Prefix patterns to strip (polite openers)
_PREFIX_PATTERN = re.compile(
    r"^(?:hey\s+(?:there\s+)?|hi\s+|hello\s+|okay\s+|ok\s+|"
    r"can\s+you\s+|could\s+you\s+|would\s+you\s+|will\s+you\s+|"
    r"i\s+(?:want\s+(?:you\s+)?to\s+|need\s+you\s+to\s+|'d\s+like\s+(?:you\s+)?to\s+)|"
    r"please\s+)+",
    re.IGNORECASE,
)

# Repeated spaces
_WHITESPACE_RE = re.compile(r"\s+")


_UNIT_WORDS: set[str] = {
    "kg", "kilogram", "kilograms", "gram", "grams", "lb", "lbs",
    "pound", "pounds", "oz", "ounce", "ounces", "liter", "liters",
    "litre", "litres", "ml", "piece", "pieces", "pack", "packs",
    "packet", "packets", "bag", "bags", "box", "boxes", "can", "cans",
    "bottle", "bottles", "bunch", "bunches", "dozen", "loaf", "loaves",
    "jar", "jars", "carton", "cartons", "roll", "rolls", "cup", "cups",
    "slice", "slices", "tray", "trays",
}


def _replace_number_words(text: str) -> str:
    """Replace standalone number words with their digit representation.

    Special handling: "a" and "an" are only converted to "1" when followed
    by a unit word (e.g. "a dozen eggs" → "1 dozen eggs") to avoid
    destroying articles ("add a pizza" should stay as-is).
    """
    tokens = text.split()
    result: list[str] = []
    for i, token in enumerate(tokens):
        clean = token.strip(".,!?")
        if clean in NUMBER_WORDS:
            # "a" / "an" — only convert when next token is a unit word
            if clean in ("a", "an"):
                next_token = tokens[i + 1].strip(".,!?").lower() if i + 1 < len(tokens) else ""
                if next_token in _UNIT_WORDS or next_token in NUMBER_WORDS:
                    result.append("1")
                else:
                    result.append(token)  # keep as article
            else:
                num = NUMBER_WORDS[clean]
                result.append(str(int(num)) if num == int(num) else str(num))
        else:
            result.append(token)
    return " ".join(result)


def _remove_fillers(text: str) -> str:
    """Remove filler words from a tokenised string."""
    tokens = text.split()
    return " ".join(t for t in tokens if t.lower() not in _FILLER_WORDS)


def preprocess(raw: str) -> str:
    """Normalise a voice transcript for NLP parsing.

    Args:
        raw: Raw transcript from STT (e.g. ``"Um, can you add two bananas please"``).

    Returns:
        Normalised lowercase string (e.g. ``"add 2 bananas"``).
    """
    text = raw.strip().lower()

    # Strip polite prefixes
    text = _PREFIX_PATTERN.sub("", text)

    # Remove filler words (multi-word first, then single)
    text = text.replace("you know", "").replace("i mean", "")
    text = text.replace("kind of", "").replace("sort of", "")

    # Replace number words
    text = _replace_number_words(text)

    # Remove single-word fillers
    text = _remove_fillers(text)

    # Strip trailing punctuation
    text = text.strip(".,!?;:")

    # Collapse whitespace
    text = _WHITESPACE_RE.sub(" ", text).strip()

    logger.debug("Preprocessed: %r → %r", raw, text)
    return text
