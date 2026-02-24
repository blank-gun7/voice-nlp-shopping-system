"""Store / marketplace routes.

GET /api/store/home                       — homepage data
GET /api/store/category/{name}?page=1     — paginated products in category
GET /api/store/product/{name}/related     — co-purchase + substitutes
GET /api/store/search?q=apples            — search catalog
"""
import logging
import math
from typing import Optional
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException, Query, Request

from backend.models.schemas import (
    CategoryMeta,
    CategoryPageResponse,
    HomePageData,
    ProductOut,
    RelatedResponse,
    ReorderItem,
    SearchResponse,
)

router = APIRouter(prefix="/api/store", tags=["store"])
logger = logging.getLogger(__name__)

PAGE_SIZE = 20


def _get_engine(request: Request):
    engine = getattr(request.app.state, "rec_engine", None)
    if engine is None:
        raise HTTPException(status_code=503, detail="Recommendation engine unavailable")
    return engine


# ── GET /api/store/home ───────────────────────────────────────────────────────

@router.get("/home", response_model=HomePageData)
def store_home(request: Request) -> HomePageData:
    """Homepage data: seasonal, popular, reorder suggestions, category list."""
    engine = _get_engine(request)
    data = engine.get_home_data()

    return HomePageData(
        seasonal=[ProductOut(**p) for p in data["seasonal"]],
        popular=[ProductOut(**p) for p in data["popular"]],
        reorder=[ReorderItem(**r) for r in data["reorder"]],
        categories=[CategoryMeta(**c) for c in data["categories"]],
    )


# ── GET /api/store/category/{name} ────────────────────────────────────────────

@router.get("/category/{name}", response_model=CategoryPageResponse)
def store_category(
    name: str,
    request: Request,
    page: int = Query(default=1, ge=1),
) -> CategoryPageResponse:
    """Paginated list of products in a given category."""
    from backend.recommendations._catalog import CATALOG

    category = unquote(name).lower().strip()
    all_in_cat = [p for p in CATALOG.values() if p.get("category", "").lower() == category]
    all_in_cat.sort(key=lambda p: p.get("order_count", 0), reverse=True)

    total = len(all_in_cat)
    pages = max(1, math.ceil(total / PAGE_SIZE))
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE

    return CategoryPageResponse(
        category=category,
        products=[ProductOut(**p) for p in all_in_cat[start:end]],
        total=total,
        page=page,
        pages=pages,
    )


# ── GET /api/store/product/{name}/related ─────────────────────────────────────

@router.get("/product/{name}/related", response_model=RelatedResponse)
async def product_related(name: str, request: Request) -> RelatedResponse:
    """Co-purchase and substitute suggestions for a product."""
    engine = _get_engine(request)
    item_name = unquote(name).strip()

    co = engine.co_purchase.get(item_name, top_k=6)
    subs = engine.similarity.get_substitutes(item_name, top_k=4)

    return RelatedResponse(co_purchase=co, substitutes=subs)


# ── GET /api/store/search ─────────────────────────────────────────────────────

@router.get("/search", response_model=SearchResponse)
def store_search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(default=20, ge=1, le=100),
    price_max: Optional[float] = Query(default=None, ge=0, description="Maximum price filter"),
) -> SearchResponse:
    """Search the item catalog by name (case-insensitive substring match)."""
    from backend.recommendations._catalog import CATALOG

    query = q.lower().strip()
    matches = [
        p for key, p in CATALOG.items()
        if query in key
    ]

    if price_max is not None:
        matches = [p for p in matches if (p.get("avg_price") or 0) <= price_max]

    matches.sort(key=lambda p: (
        # Exact match first, then starts-with, then contains
        0 if p["name_lower"] == query else
        1 if p["name_lower"].startswith(query) else
        2
    ))

    return SearchResponse(
        results=[ProductOut(**p) for p in matches[:limit]],
        total=len(matches),
        query=q,
    )
