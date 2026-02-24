"""Pydantic request / response schemas shared across routes."""
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ── NLP / Voice schemas ───────────────────────────────────────────────────────

class ParsedCommand(BaseModel):
    intent: str
    item: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    price_max: Optional[float] = None
    confidence: float
    method: Literal["spacy", "llm_fallback"]
    preprocessed_text: Optional[str] = None
    latency: Optional[dict[str, float]] = None


class ProcessRequest(BaseModel):
    text: str = Field(..., description="Raw or preprocessed text command")


class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    confidence: float


# ── List / Item schemas ────────────────────────────────────────────────────────

class ListItemOut(BaseModel):
    id: int
    item_name: str
    quantity: float
    unit: str
    category: str
    is_checked: bool
    added_via: str

    class Config:
        from_attributes = True


class CategoryGroupOut(BaseModel):
    category: str
    items: list[ListItemOut]
    count: int


class ShoppingListOut(BaseModel):
    id: int
    name: str
    categories: list[CategoryGroupOut]
    total_items: int
    checked_items: int

    class Config:
        from_attributes = True


class AddItemRequest(BaseModel):
    item_name: str
    quantity: float = 1.0
    unit: str = "pieces"
    category: Optional[str] = None
    added_via: Literal["voice", "manual", "suggestion"] = "manual"
    raw_transcript: Optional[str] = None
    nlp_method: Optional[str] = None


class UpdateItemRequest(BaseModel):
    quantity: Optional[float] = None
    unit: Optional[str] = None
    is_checked: Optional[bool] = None


# ── Action result ──────────────────────────────────────────────────────────────

class ActionResult(BaseModel):
    status: Literal["success", "error", "no_change"]
    message: Optional[str] = None


# ── Voice command (full pipeline) ─────────────────────────────────────────────

class SuggestionItem(BaseModel):
    name: str
    reason: Optional[str] = None


class Suggestions(BaseModel):
    co_purchase: list[SuggestionItem] = []
    substitutes: list[SuggestionItem] = []
    seasonal: list[SuggestionItem] = []
    reorder: list[dict] = []


class VoiceCommandResponse(BaseModel):
    transcript: str
    parsed: ParsedCommand
    action_result: ActionResult
    updated_list: ShoppingListOut
    suggestions: Optional[Suggestions] = None
    latency: dict[str, float] = Field(default_factory=dict)


# ── Store schemas ──────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    name: str
    name_lower: str
    category: str
    common_units: list[str] = []
    avg_price: Optional[float] = None
    is_seasonal: bool = False
    order_count: int = 0


class ReorderItem(BaseModel):
    name: str
    reason: str


class CategoryMeta(BaseModel):
    name: str
    count: int


class HomePageData(BaseModel):
    seasonal: list[ProductOut]
    popular: list[ProductOut]
    reorder: list[ReorderItem]
    categories: list[CategoryMeta]


class CategoryPageResponse(BaseModel):
    category: str
    products: list[ProductOut]
    total: int
    page: int
    pages: int


class SearchResponse(BaseModel):
    results: list[ProductOut]
    total: int
    query: str


class RelatedResponse(BaseModel):
    co_purchase: list[str]
    substitutes: list[str]
