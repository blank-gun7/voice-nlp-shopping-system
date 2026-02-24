"""Item2Vec similarity-based recommendations and substitutes.

Loads item_similarities.json and substitutes.json at startup.
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class SimilarityRecommender:
    """Item2Vec cosine-similarity recommendations.

    Attributes:
        _similarities: item → list of similar items (from item_similarities.json).
        _substitutes: item → list of substitute items (from substitutes.json).
    """

    def __init__(self, similarities_path: Path, substitutes_path: Path) -> None:
        self._similarities: dict[str, list[str]] = {}
        self._substitutes: dict[str, list[str]] = {}

        if similarities_path.exists():
            with open(similarities_path, encoding="utf-8") as fh:
                raw = json.load(fh)
            # Normalise: values may be list[str] or list[dict]
            self._similarities = {k: _normalise_list(v) for k, v in raw.items()}
            logger.info("SimilarityRecommender: %d similarity entries", len(self._similarities))
        else:
            logger.warning("item_similarities.json not found at %s", similarities_path)

        if substitutes_path.exists():
            with open(substitutes_path, encoding="utf-8") as fh:
                raw = json.load(fh)
            self._substitutes = {k: _normalise_list(v) for k, v in raw.items()}
            logger.info("SimilarityRecommender: %d substitute entries", len(self._substitutes))
        else:
            logger.warning("substitutes.json not found at %s", substitutes_path)

    def get_similar(self, item_name: str, top_k: int = 5) -> list[str]:
        """Return top-k similar items."""
        key = item_name.lower().strip()
        return self._similarities.get(key, [])[:top_k]

    def get_substitutes(self, item_name: str, top_k: int = 5) -> list[str]:
        """Return top-k substitute items."""
        key = item_name.lower().strip()
        return self._substitutes.get(key, [])[:top_k]


def _normalise_list(raw: list) -> list[str]:
    """Normalise a list of str or dict entries to a flat list of strings."""
    result: list[str] = []
    for item in raw:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            name = item.get("name") or item.get("item") or item.get("consequent", "")
            if name:
                result.append(name)
    return result
