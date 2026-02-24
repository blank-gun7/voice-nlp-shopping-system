"""In-memory item catalog loaded once at import time.

Provides CATALOG (item_name_lower → product dict) and CATEGORY_COUNTS
for the store API and recommendation engine.
"""
import json
import logging
from collections import Counter
from pathlib import Path

from backend.config import settings

logger = logging.getLogger(__name__)

CATALOG: dict[str, dict] = {}
CATEGORY_COUNTS: dict[str, int] = {}

_path = Path(settings.DATA_DIR) / "item_catalog.json"
if _path.exists():
    with open(_path, encoding="utf-8") as _fh:
        _items: list[dict] = json.load(_fh)
    CATALOG = {item["name_lower"]: item for item in _items}
    CATEGORY_COUNTS = dict(Counter(item["category"] for item in _items))
    logger.info("Catalog loaded: %d items, %d categories", len(CATALOG), len(CATEGORY_COUNTS))
else:
    logger.warning("item_catalog.json not found at %s", _path)
