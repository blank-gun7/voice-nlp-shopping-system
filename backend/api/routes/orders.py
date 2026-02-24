"""Order routes.

POST /api/orders/place    — record list items to PurchaseHistory + clear list
GET  /api/orders/history  — return all past orders grouped by date
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.models.database import get_db
from backend.models.orm import ShoppingList
from backend.models.schemas import (
    ActionResult,
    OrderHistoryResponse,
    PlaceOrderRequest,
)
from backend.services.list_manager import ListManager

router = APIRouter(prefix="/api/orders", tags=["orders"])
logger = logging.getLogger(__name__)


def _get_list_manager(request: Request) -> ListManager:
    mgr = getattr(request.app.state, "list_mgr", None)
    if mgr is None:
        raise HTTPException(status_code=503, detail="List manager unavailable")
    return mgr


@router.post("/place", response_model=ActionResult)
def place_order(
    body: PlaceOrderRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> ActionResult:
    """Record all items from the given list to PurchaseHistory, then clear the list."""
    sl = db.get(ShoppingList, body.list_id)
    if not sl:
        raise HTTPException(status_code=404, detail=f"List {body.list_id} not found")

    mgr = _get_list_manager(request)
    return mgr.place_order(db, body.list_id)


@router.get("/history", response_model=OrderHistoryResponse)
def get_order_history(
    request: Request,
    db: Session = Depends(get_db),
) -> OrderHistoryResponse:
    """Return all past orders grouped by purchased_at timestamp."""
    mgr = _get_list_manager(request)
    return mgr.get_order_history(db)
