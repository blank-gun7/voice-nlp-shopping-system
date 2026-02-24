"""Shopping list business logic.

Translates ParsedCommand intents into DB operations.  All public methods are
async (IO-bound DB calls are run via run_in_executor when needed, but
SQLAlchemy sync sessions are fine here since we stay on the same thread).
"""
import logging
from datetime import datetime
from difflib import SequenceMatcher
from itertools import groupby
from typing import Optional

from sqlalchemy.orm import Session

from backend.models.database import SessionLocal
from backend.models.orm import ListItem, PurchaseHistory, ShoppingList
from backend.models.schemas import (
    ActionResult,
    AddItemRequest,
    CategoryGroupOut,
    ListItemOut,
    OrderHistoryResponse,
    OrderItemOut,
    OrderOut,
    ParsedCommand,
    ShoppingListOut,
    UpdateItemRequest,
)

logger = logging.getLogger(__name__)

# Category lookup loaded from item_catalog at manager creation time
_CATEGORY_MAP: dict[str, str] = {}

FUZZY_THRESHOLD = 0.70  # SequenceMatcher similarity to consider a match


class ListManager:
    """Handles add, remove, modify, check, clear, and search operations.

    Uses a SQLAlchemy session-per-request pattern — each public method opens
    and closes its own session to keep things simple (no async SQLAlchemy).
    """

    def __init__(self, category_map: Optional[dict[str, str]] = None) -> None:
        global _CATEGORY_MAP
        if category_map:
            _CATEGORY_MAP = category_map
        logger.info("ListManager ready")

    # ── Public entry point ─────────────────────────────────────────────────────

    async def execute(
        self,
        list_id: int,
        parsed: ParsedCommand,
        raw_transcript: Optional[str] = None,
    ) -> tuple[ActionResult, ShoppingListOut]:
        """Dispatch parsed intent to the correct handler.

        Returns:
            Tuple of (ActionResult, updated ShoppingListOut).
        """
        intent = parsed.intent
        db = SessionLocal()
        try:
            if intent == "add_item":
                result = self._add_item(db, list_id, parsed, raw_transcript)
            elif intent == "remove_item":
                result = self._remove_item(db, list_id, parsed)
            elif intent == "modify_item":
                result = self._modify_item(db, list_id, parsed)
            elif intent == "check_item":
                result = self._check_item(db, list_id, parsed)
            elif intent == "clear_list":
                result = self._clear_list(db, list_id)
            elif intent == "search_item":
                result = self._search_item(db, list_id, parsed)
            elif intent in {"list_items", "get_suggestions"}:
                # Read-only intents — no DB change
                result = ActionResult(status="success", message="Here is your list.")
            else:
                result = ActionResult(status="no_change", message=f"Unknown intent: {intent}")

            updated_list = _build_list_out(db, list_id)
        except Exception as exc:
            db.rollback()
            logger.exception("ListManager.execute failed")
            result = ActionResult(status="error", message=str(exc))
            updated_list = _build_list_out(db, list_id)
        finally:
            db.close()

        return result, updated_list

    # ── CRUD helpers (used by routes directly too) ─────────────────────────────

    def add(self, db: Session, list_id: int, req: AddItemRequest) -> tuple[ActionResult, ListItemOut]:
        """Add an item to the list, detecting duplicates."""
        existing = _find_item(db, list_id, req.item_name)
        if existing:
            # Increment quantity instead of duplicating
            existing.quantity += req.quantity
            db.commit()
            db.refresh(existing)
            return (
                ActionResult(status="success", message=f"Updated {existing.item_name} quantity to {existing.quantity}"),
                ListItemOut.model_validate(existing),
            )

        category = req.category or _lookup_category(req.item_name)
        item = ListItem(
            list_id=list_id,
            item_name=req.item_name,
            item_name_lower=req.item_name.lower().strip(),
            quantity=req.quantity,
            unit=req.unit,
            category=category,
            added_via=req.added_via,
            raw_transcript=req.raw_transcript,
            nlp_method=req.nlp_method,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return (
            ActionResult(status="success", message=f"Added {item.item_name}"),
            ListItemOut.model_validate(item),
        )

    def remove(self, db: Session, list_id: int, item_id: int) -> ActionResult:
        """Remove an item by ID."""
        item = db.query(ListItem).filter(
            ListItem.id == item_id, ListItem.list_id == list_id
        ).first()
        if not item:
            return ActionResult(status="error", message="Item not found")
        db.delete(item)
        db.commit()
        return ActionResult(status="success", message=f"Removed {item.item_name}")

    def update(self, db: Session, list_id: int, item_id: int, req: UpdateItemRequest) -> tuple[ActionResult, ListItemOut]:
        """Update quantity, unit, or checked state."""
        item = db.query(ListItem).filter(
            ListItem.id == item_id, ListItem.list_id == list_id
        ).first()
        if not item:
            return ActionResult(status="error", message="Item not found"), None
        if req.quantity is not None:
            item.quantity = req.quantity
        if req.unit is not None:
            item.unit = req.unit
        if req.is_checked is not None:
            item.is_checked = req.is_checked
        db.commit()
        db.refresh(item)
        return ActionResult(status="success", message="Updated"), ListItemOut.model_validate(item)

    def get_list(self, db: Session, list_id: int) -> ShoppingListOut:
        """Retrieve the full list grouped by category."""
        return _build_list_out(db, list_id)

    def clear(self, db: Session, list_id: int) -> ActionResult:
        """Delete all items from the list."""
        db.query(ListItem).filter(ListItem.list_id == list_id).delete()
        db.commit()
        return ActionResult(status="success", message="List cleared")

    def get_share_text(self, db: Session, list_id: int) -> str:
        """Return a human-readable text representation of the list."""
        items = db.query(ListItem).filter(ListItem.list_id == list_id).all()
        if not items:
            return "Your shopping list is empty."
        lines = ["My Shopping List:"]
        for item in items:
            check = "[x]" if item.is_checked else "[ ]"
            lines.append(f"  {check} {item.quantity} {item.unit} {item.item_name}")
        return "\n".join(lines)

    # ── Private intent handlers ────────────────────────────────────────────────

    def _add_item(
        self, db: Session, list_id: int, parsed: ParsedCommand, raw_transcript: Optional[str]
    ) -> ActionResult:
        if not parsed.item:
            return ActionResult(status="error", message="No item found in command")
        req = AddItemRequest(
            item_name=parsed.item,
            quantity=parsed.quantity or 1.0,
            unit=parsed.unit or "pieces",
            category=parsed.category,
            added_via="voice",
            raw_transcript=raw_transcript,
            nlp_method=parsed.method,
        )
        result, _ = self.add(db, list_id, req)
        return result

    def _remove_item(self, db: Session, list_id: int, parsed: ParsedCommand) -> ActionResult:
        if not parsed.item:
            return ActionResult(status="error", message="No item specified to remove")
        item = _find_item(db, list_id, parsed.item)
        if not item:
            return ActionResult(status="no_change", message=f"{parsed.item} not found in list")
        db.delete(item)
        db.commit()
        return ActionResult(status="success", message=f"Removed {item.item_name}")

    def _modify_item(self, db: Session, list_id: int, parsed: ParsedCommand) -> ActionResult:
        if not parsed.item:
            return ActionResult(status="error", message="No item specified to modify")
        item = _find_item(db, list_id, parsed.item)
        if not item:
            return ActionResult(status="no_change", message=f"{parsed.item} not found in list")
        if parsed.quantity is not None:
            item.quantity = parsed.quantity
        if parsed.unit is not None:
            item.unit = parsed.unit
        db.commit()
        return ActionResult(status="success", message=f"Updated {item.item_name}")

    def _check_item(self, db: Session, list_id: int, parsed: ParsedCommand) -> ActionResult:
        if not parsed.item:
            return ActionResult(status="error", message="No item specified to check")
        item = _find_item(db, list_id, parsed.item)
        if not item:
            return ActionResult(status="no_change", message=f"{parsed.item} not found in list")
        item.is_checked = not item.is_checked
        db.commit()
        state = "checked" if item.is_checked else "unchecked"
        return ActionResult(status="success", message=f"{item.item_name} {state}")

    def _clear_list(self, db: Session, list_id: int) -> ActionResult:
        db.query(ListItem).filter(ListItem.list_id == list_id).delete()
        db.commit()
        return ActionResult(status="success", message="List cleared")

    def _search_item(self, db: Session, list_id: int, parsed: ParsedCommand) -> ActionResult:
        """Search the catalog for items matching the parsed query."""
        if not parsed.item:
            return ActionResult(status="no_change", message="No search term specified")

        from backend.recommendations._catalog import CATALOG

        query = parsed.item.lower().strip()
        matches = [name for name in CATALOG if query in name]

        # Filter by price_max if specified
        if parsed.price_max is not None:
            matches = [n for n in matches if (CATALOG[n].get("avg_price") or 0) <= parsed.price_max]

        if matches:
            top = matches[:5]
            price_note = f" under ${parsed.price_max}" if parsed.price_max is not None else ""
            return ActionResult(
                status="success",
                message=f"Found {len(matches)} results for \"{parsed.item}\"{price_note}: {', '.join(top)}",
            )
        return ActionResult(status="no_change", message=f"No items found for \"{parsed.item}\"")

    # ── Order operations ────────────────────────────────────────────────────────

    def place_order(self, db: Session, list_id: int, user_id: str = "default_user") -> ActionResult:
        """Record all list items to PurchaseHistory and clear the list.

        All items share the same purchased_at timestamp for grouping.
        """
        items = db.query(ListItem).filter(ListItem.list_id == list_id).all()
        if not items:
            return ActionResult(status="no_change", message="List is empty — nothing to order")

        now = datetime.utcnow()
        for item in items:
            record = PurchaseHistory(
                user_id=user_id,
                item_name=item.item_name,
                item_name_lower=item.item_name_lower,
                category=item.category,
                quantity=item.quantity,
                unit=item.unit,
                source_list_id=list_id,
                purchased_at=now,
            )
            db.add(record)

        # Clear list after recording
        db.query(ListItem).filter(ListItem.list_id == list_id).delete()
        db.commit()

        return ActionResult(status="success", message=f"Order placed with {len(items)} items")

    def get_order_history(self, db: Session, user_id: str = "default_user") -> OrderHistoryResponse:
        """Return all past orders grouped by purchased_at timestamp."""
        records = (
            db.query(PurchaseHistory)
            .filter(PurchaseHistory.user_id == user_id)
            .order_by(PurchaseHistory.purchased_at.desc())
            .all()
        )

        orders: list[OrderOut] = []
        # Group by purchased_at timestamp (same timestamp = same order)
        for ts, group in groupby(records, key=lambda r: r.purchased_at):
            items_list = list(group)
            order_id = ts.isoformat() if ts else "unknown"
            orders.append(
                OrderOut(
                    order_id=order_id,
                    purchased_at=ts.isoformat() if ts else "",
                    item_count=len(items_list),
                    items=[
                        OrderItemOut(
                            item_name=r.item_name,
                            quantity=r.quantity or 1.0,
                            unit=r.unit or "pieces",
                            category=r.category or "other",
                        )
                        for r in items_list
                    ],
                )
            )

        return OrderHistoryResponse(orders=orders, total=len(orders))


# ── Module-level helpers ───────────────────────────────────────────────────────

def _find_item(db: Session, list_id: int, name: str) -> Optional[ListItem]:
    """Find an item by exact match, then article-stripped, then substring, then fuzzy."""
    name_lower = name.lower().strip()

    # Strip leading articles for matching
    for article in ("the ", "a ", "an ", "some "):
        if name_lower.startswith(article):
            name_lower = name_lower[len(article):]
            break

    # Exact match
    item = db.query(ListItem).filter(
        ListItem.list_id == list_id,
        ListItem.item_name_lower == name_lower,
    ).first()
    if item:
        return item

    items = db.query(ListItem).filter(ListItem.list_id == list_id).all()

    # Substring/contains match — handles "fresh mango" matching "mango" and vice versa
    for candidate in items:
        if name_lower in candidate.item_name_lower or candidate.item_name_lower in name_lower:
            return candidate

    # Fuzzy match
    best: Optional[ListItem] = None
    best_score = 0.0
    for candidate in items:
        score = SequenceMatcher(None, name_lower, candidate.item_name_lower).ratio()
        if score > best_score:
            best_score = score
            best = candidate

    if best_score >= FUZZY_THRESHOLD:
        return best
    return None


def _lookup_category(item_name: str) -> str:
    """Look up category from the global category map."""
    return _CATEGORY_MAP.get(item_name.lower().strip(), "other")


def _build_list_out(db: Session, list_id: int) -> ShoppingListOut:
    """Build ShoppingListOut with items grouped by category."""
    shopping_list = db.get(ShoppingList, list_id)
    if not shopping_list:
        # Return empty list representation
        return ShoppingListOut(id=list_id, name="My Shopping List", categories=[], total_items=0, checked_items=0)

    items = db.query(ListItem).filter(ListItem.list_id == list_id).all()

    # Group by category
    groups: dict[str, list[ListItemOut]] = {}
    for item in items:
        cat = item.category or "other"
        groups.setdefault(cat, []).append(ListItemOut.model_validate(item))

    categories = [
        CategoryGroupOut(category=cat, items=item_list, count=len(item_list))
        for cat, item_list in sorted(groups.items())
    ]
    total = len(items)
    checked = sum(1 for i in items if i.is_checked)

    return ShoppingListOut(
        id=shopping_list.id,
        name=shopping_list.name,
        categories=categories,
        total_items=total,
        checked_items=checked,
    )
