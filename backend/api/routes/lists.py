"""Shopping list CRUD routes.

POST   /api/lists/                       — create list
GET    /api/lists/{id}                   — get list (items grouped by category)
DELETE /api/lists/{id}                   — delete list
POST   /api/lists/{id}/items             — add item
PATCH  /api/lists/{id}/items/{item_id}   — update item
DELETE /api/lists/{id}/items/{item_id}   — remove item
GET    /api/lists/{id}/share             — shareable text
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.orm import ShoppingList
from backend.models.schemas import (
    ActionResult,
    AddItemRequest,
    ListItemOut,
    ShoppingListOut,
    UpdateItemRequest,
)
from backend.services.list_manager import ListManager, _build_list_out

router = APIRouter(prefix="/api/lists", tags=["lists"])
logger = logging.getLogger(__name__)


def _get_list_manager(request: Request) -> ListManager:
    mgr = getattr(request.app.state, "list_mgr", None)
    if mgr is None:
        raise HTTPException(status_code=503, detail="List manager unavailable")
    return mgr


# ── POST /api/lists/ ──────────────────────────────────────────────────────────

@router.post("/", response_model=ShoppingListOut, status_code=201)
def create_list(
    request: Request,
    db: Session = Depends(get_db),
) -> ShoppingListOut:
    """Create a new shopping list for the default user."""
    sl = ShoppingList(user_id="default_user", name="My Shopping List")
    db.add(sl)
    db.commit()
    db.refresh(sl)
    return _build_list_out(db, sl.id)


# ── GET /api/lists/{id} ───────────────────────────────────────────────────────

@router.get("/{list_id}", response_model=ShoppingListOut)
def get_list(
    list_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> ShoppingListOut:
    """Return the shopping list with items grouped by category."""
    sl = db.get(ShoppingList, list_id)
    if not sl:
        raise HTTPException(status_code=404, detail=f"List {list_id} not found")
    mgr: ListManager = _get_list_manager(request)
    return mgr.get_list(db, list_id)


# ── DELETE /api/lists/{id} ────────────────────────────────────────────────────

@router.delete("/{list_id}", response_model=ActionResult)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
) -> ActionResult:
    """Delete a shopping list and all its items."""
    sl = db.get(ShoppingList, list_id)
    if not sl:
        raise HTTPException(status_code=404, detail=f"List {list_id} not found")
    db.delete(sl)
    db.commit()
    return ActionResult(status="success", message=f"List {list_id} deleted")


# ── POST /api/lists/{id}/items ────────────────────────────────────────────────

@router.post("/{list_id}/items", response_model=ListItemOut, status_code=201)
def add_item(
    list_id: int,
    body: AddItemRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ListItemOut:
    """Add an item to the list (increments quantity if duplicate)."""
    sl = db.get(ShoppingList, list_id)
    if not sl:
        raise HTTPException(status_code=404, detail=f"List {list_id} not found")

    mgr: ListManager = _get_list_manager(request)
    result, item_out = mgr.add(db, list_id, body)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.message)
    return item_out


# ── PATCH /api/lists/{id}/items/{item_id} ─────────────────────────────────────

@router.patch("/{list_id}/items/{item_id}", response_model=ListItemOut)
def update_item(
    list_id: int,
    item_id: int,
    body: UpdateItemRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ListItemOut:
    """Update quantity, unit, or checked state of an item."""
    mgr: ListManager = _get_list_manager(request)
    result, item_out = mgr.update(db, list_id, item_id, body)
    if result.status == "error":
        raise HTTPException(status_code=404, detail=result.message)
    return item_out


# ── DELETE /api/lists/{id}/items/{item_id} ────────────────────────────────────

@router.delete("/{list_id}/items/{item_id}", response_model=ActionResult)
def remove_item(
    list_id: int,
    item_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> ActionResult:
    """Remove a specific item from the list."""
    mgr: ListManager = _get_list_manager(request)
    result = mgr.remove(db, list_id, item_id)
    if result.status == "error":
        raise HTTPException(status_code=404, detail=result.message)
    return result


# ── GET /api/lists/{id}/share ─────────────────────────────────────────────────

@router.get("/{list_id}/share")
def share_list(
    list_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Return a shareable plain-text version of the list."""
    sl = db.get(ShoppingList, list_id)
    if not sl:
        raise HTTPException(status_code=404, detail=f"List {list_id} not found")
    mgr: ListManager = _get_list_manager(request)
    text = mgr.get_share_text(db, list_id)
    return {"text": text}
