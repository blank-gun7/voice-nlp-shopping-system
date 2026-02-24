"""Co-purchase recommendations from Apriori association rules.

Loads co_purchase_rules.json at startup and provides instant O(1) lookups.
"""
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class CoPurchaseRecommender:
    """Lookup-based co-purchase suggestions from pre-computed Apriori rules.

    Attributes:
        _rules: dict mapping item_name_lower → list of related item names.
    """

    def __init__(self, rules_path: Path) -> None:
        self._rules: dict[str, list[str]] = {}
        if not rules_path.exists():
            logger.warning("co_purchase_rules.json not found at %s", rules_path)
            return
        with open(rules_path, encoding="utf-8") as fh:
            self._rules = json.load(fh)
        logger.info("CoPurchaseRecommender loaded %d rules", len(self._rules))

    def get(self, item_name: str, top_k: int = 5) -> list[str]:
        """Return top-k co-purchase suggestions for an item.

        Args:
            item_name: Item name (case-insensitive).
            top_k: Maximum number of suggestions to return.

        Returns:
            List of item name strings (may be empty if item unknown).
        """
        key = item_name.lower().strip()
        suggestions = self._rules.get(key, [])
        # Rules may be stored as strings or dicts with a "consequent" key
        result: list[str] = []
        for s in suggestions[:top_k]:
            if isinstance(s, str):
                result.append(s)
            elif isinstance(s, dict):
                result.append(s.get("consequent", s.get("item", "")))
        return [r for r in result if r]
