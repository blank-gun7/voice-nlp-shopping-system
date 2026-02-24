"""Recommendation engine orchestrator.

Combines all recommendation layers:
  1. Co-purchase (Apriori rules)
  2. Similarity / substitutes (Item2Vec)
  3. Seasonal (month-based)
  4. Personal (purchase history)
  5. LLM fallback (cold-start)

Deduplicates across layers and caches results with functools.lru_cache.
"""
import logging
from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from backend.config import settings
from backend.models.database import SessionLocal
from backend.models.schemas import ReorderItem, Suggestions, SuggestionItem
from backend.recommendations.co_purchase import CoPurchaseRecommender
from backend.recommendations.seasonal import SeasonalRecommender
from backend.recommendations.similarity import SimilarityRecommender
from backend.recommendations.personal import PersonalRecommender

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Orchestrates all recommendation layers.

    Attributes:
        co_purchase: Apriori lookup.
        similarity: Item2Vec similarity + substitutes.
        seasonal: Month-based seasonal items.
        personal: Purchase history frequency.
        llm: LLM fallback (or None if no API key).
    """

    def __init__(self) -> None:
        data_dir = Path(settings.DATA_DIR)

        self.co_purchase = CoPurchaseRecommender(data_dir / "co_purchase_rules.json")
        self.similarity = SimilarityRecommender(
            data_dir / "item_similarities.json",
            data_dir / "substitutes.json",
        )
        self.seasonal = SeasonalRecommender(data_dir / "seasonal_items.json")
        self.personal = PersonalRecommender()

        self.llm = None
        if settings.GROQ_API_KEY:
            try:
                from backend.recommendations.llm_suggestions import LLMSuggestions
                self.llm = LLMSuggestions()
            except Exception as exc:
                logger.warning("LLM suggestions unavailable: %s", exc)

        logger.info("RecommendationEngine ready")

    async def get_suggestions(
        self,
        item_name: str,
        list_id: int = 1,
        user_id: str = "default_user",
    ) -> Suggestions:
        """Gather suggestions from all layers for a given item.

        Args:
            item_name: The item just added / queried.
            list_id: Active shopping list (unused for now, reserved for future filtering).
            user_id: User for personal recommendations.

        Returns:
            Suggestions schema with co_purchase, substitutes, seasonal, reorder.
        """
        # Layer 1: co-purchase
        co_raw = self.co_purchase.get(item_name, top_k=6)

        # Layer 2: substitutes
        subs_raw = self.similarity.get_substitutes(item_name, top_k=4)

        # Layer 3: seasonal
        seasonal_raw = self.seasonal.get_current(top_k=6)

        # Layer 4: personal reorder
        db: Session = SessionLocal()
        try:
            reorder_raw = self.personal.get_reorder_suggestions(db, user_id=user_id, top_k=4)
        finally:
            db.close()

        # LLM fallback if co-purchase is sparse
        if len(co_raw) < 3 and self.llm:
            llm_items = await self.llm.get(item_name)
            seen = {i.lower() for i in co_raw}
            for s in llm_items:
                if s.lower() not in seen:
                    co_raw.append(s)
                    seen.add(s.lower())
                    if len(co_raw) >= 6:
                        break

        # Deduplicate across all layers using a seen set
        seen_global: set[str] = {item_name.lower()}

        def _dedup(names: list[str]) -> list[str]:
            result = []
            for n in names:
                if n.lower() not in seen_global:
                    seen_global.add(n.lower())
                    result.append(n)
            return result

        co_dedup = _dedup(co_raw)
        subs_dedup = _dedup(subs_raw)
        seasonal_dedup = _dedup(seasonal_raw)

        # Catalog matches — items whose names contain the queried item as a substring
        catalog_matches_raw = self._catalog_search(item_name, top_k=8)
        catalog_dedup = _dedup(catalog_matches_raw)

        return Suggestions(
            co_purchase=[SuggestionItem(name=n, reason="Frequently bought together") for n in co_dedup],
            substitutes=[SuggestionItem(name=n, reason="Similar item") for n in subs_dedup],
            seasonal=[SuggestionItem(name=n, reason="In season now") for n in seasonal_dedup],
            reorder=[ReorderItem(name=r["name"], reason=r["reason"]) for r in reorder_raw],
            catalog_matches=[SuggestionItem(name=n, reason="Related item") for n in catalog_dedup],
        )

    @staticmethod
    def _catalog_search(item_name: str, top_k: int = 8) -> list[str]:
        """Search catalog for items related to the given item name.

        Returns items that contain the query as a substring, sorted by relevance:
        exact match first, then starts-with, then contains.
        """
        from backend.recommendations._catalog import CATALOG

        query = item_name.lower().strip()
        if not query:
            return []

        matches: list[tuple[int, str]] = []
        for key, product in CATALOG.items():
            if key == query:
                continue  # Skip exact self-match
            if query in key:
                # Prioritise: starts-with (1) > contains (2)
                priority = 1 if key.startswith(query) else 2
                matches.append((priority, product["name_lower"]))
            elif key in query:
                # Reverse containment: "organic mango" query matches "mango" in catalog
                matches.append((3, product["name_lower"]))

        matches.sort(key=lambda x: x[0])
        return [name for _, name in matches[:top_k]]

    def get_home_data(self, user_id: str = "default_user") -> dict:
        """Assemble homepage data: seasonal, popular from catalog, reorder, categories.

        Returns:
            Dict with keys: seasonal, popular, reorder, categories.
        """
        from backend.recommendations._catalog import CATALOG, CATEGORY_COUNTS

        seasonal_names = self.seasonal.get_current(top_k=8)
        seasonal_products = [CATALOG.get(n.lower()) for n in seasonal_names if n.lower() in CATALOG]
        seasonal_products = [p for p in seasonal_products if p]

        # Popular = top by order_count
        popular = sorted(CATALOG.values(), key=lambda p: p.get("order_count", 0), reverse=True)[:12]

        db: Session = SessionLocal()
        try:
            reorder = self.personal.get_reorder_suggestions(db, user_id=user_id, top_k=5)
        finally:
            db.close()

        categories = [
            {"name": cat, "count": count}
            for cat, count in sorted(CATEGORY_COUNTS.items(), key=lambda x: x[1], reverse=True)
        ]

        return {
            "seasonal": seasonal_products[:8],
            "popular": popular,
            "reorder": reorder,
            "categories": categories,
        }
