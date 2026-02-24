"""Personal reorder recommendations based on purchase history frequency."""
import logging
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.models.orm import PurchaseHistory

logger = logging.getLogger(__name__)

REORDER_WINDOW_DAYS = 30
TOP_K_DEFAULT = 5


class PersonalRecommender:
    """Analyses purchase_history to suggest frequently-bought items for reorder."""

    def get_reorder_suggestions(
        self,
        db: Session,
        user_id: str = "default_user",
        top_k: int = TOP_K_DEFAULT,
        days: int = REORDER_WINDOW_DAYS,
    ) -> list[dict]:
        """Return items the user frequently buys, ordered by frequency.

        Args:
            db: Active SQLAlchemy session.
            user_id: User identifier (default ``"default_user"``).
            top_k: Maximum number of suggestions.
            days: Look back window in days.

        Returns:
            List of dicts with ``name`` and ``reason`` keys.
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        rows = (
            db.query(PurchaseHistory)
            .filter(
                PurchaseHistory.user_id == user_id,
                PurchaseHistory.purchased_at >= cutoff,
            )
            .all()
        )

        if not rows:
            # Broader window if recent history is empty
            rows = (
                db.query(PurchaseHistory)
                .filter(PurchaseHistory.user_id == user_id)
                .limit(200)
                .all()
            )

        counts: Counter = Counter(row.item_name_lower for row in rows)
        suggestions = []
        for item_name, count in counts.most_common(top_k):
            # Use original casing from latest record
            original = next(
                (r.item_name for r in rows if r.item_name_lower == item_name), item_name
            )
            suggestions.append({"name": original, "reason": f"Bought {count}x recently"})

        return suggestions
