"""Month-based seasonal item recommendations.

Loads seasonal_items.json at startup.
"""
import json
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class SeasonalRecommender:
    """Returns items that are in season for the current month.

    Attributes:
        _data: Month number (1–12) → list of item name strings.
    """

    def __init__(self, seasonal_path: Path) -> None:
        self._data: dict[int, list[str]] = {}
        if not seasonal_path.exists():
            logger.warning("seasonal_items.json not found at %s", seasonal_path)
            return
        with open(seasonal_path, encoding="utf-8") as fh:
            raw = json.load(fh)

        # Support both string keys ("1", "January") and int keys
        for k, v in raw.items():
            month_num = _parse_month_key(k)
            if month_num is not None:
                items = _normalise_items(v)
                self._data[month_num] = items

        logger.info("SeasonalRecommender loaded %d months", len(self._data))

    def get_current(self, top_k: int = 8) -> list[str]:
        """Return top-k seasonal items for today's month."""
        month = datetime.utcnow().month
        return self._data.get(month, [])[:top_k]

    def get_for_month(self, month: int, top_k: int = 8) -> list[str]:
        """Return seasonal items for a specific month number (1–12)."""
        return self._data.get(month, [])[:top_k]


_MONTH_NAMES = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
}


def _parse_month_key(key: str) -> int | None:
    """Convert string month key to int."""
    try:
        return int(key)
    except ValueError:
        return _MONTH_NAMES.get(key.lower().strip())


def _normalise_items(raw) -> list[str]:
    """Accept list[str] or list[dict] and return flat list of names."""
    if isinstance(raw, list):
        result: list[str] = []
        for item in raw:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                name = item.get("name") or item.get("item", "")
                if name:
                    result.append(name)
        return result
    return []
