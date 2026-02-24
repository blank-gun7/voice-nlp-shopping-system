import json
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.models.database import init_db
from backend.api.routes import health, voice, lists, store

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    """Initialise all services at startup."""
    logger.info("Starting up Voice Shopping Assistant backend…")

    # ── Database ──────────────────────────────────────────────────────────────
    init_db()
    logger.info("Database ready.")

    # ── Phase 2: STT service ──────────────────────────────────────────────────
    if settings.GROQ_API_KEY:
        try:
            from backend.stt.groq_stt_service import GroqSTTService
            app.state.stt = GroqSTTService()
        except Exception as exc:
            logger.error("Failed to init GroqSTTService: %s", exc)
            app.state.stt = None
    else:
        app.state.stt = None
        logger.warning("GROQ_API_KEY not set — STT endpoint will return 503")

    # ── Phase 3: NLP Pipeline ─────────────────────────────────────────────────
    try:
        from backend.nlp.pipeline import NLPPipeline
        app.state.nlp = NLPPipeline()
        logger.info("NLP pipeline ready.")
    except Exception as exc:
        logger.error("Failed to init NLPPipeline: %s", exc)
        app.state.nlp = None

    # ── Phase 4: List Manager ─────────────────────────────────────────────────
    try:
        from backend.services.list_manager import ListManager

        # Build category map from item_catalog for item categorisation
        catalog_path = Path(settings.DATA_DIR) / "item_catalog.json"
        category_map: dict[str, str] = {}
        if catalog_path.exists():
            with open(catalog_path, encoding="utf-8") as fh:
                items = json.load(fh)
            category_map = {item["name_lower"]: item["category"] for item in items}
            logger.info("Category map loaded: %d items", len(category_map))

        app.state.list_mgr = ListManager(category_map=category_map)
        logger.info("List manager ready.")
    except Exception as exc:
        logger.error("Failed to init ListManager: %s", exc)
        app.state.list_mgr = None

    # ── Phase 5: Recommendation Engine ───────────────────────────────────────
    try:
        from backend.recommendations.engine import RecommendationEngine
        app.state.rec_engine = RecommendationEngine()
        logger.info("Recommendation engine ready.")
    except Exception as exc:
        logger.error("Failed to init RecommendationEngine: %s", exc)
        app.state.rec_engine = None


app.include_router(health.router)
app.include_router(voice.router)
app.include_router(lists.router)
app.include_router(store.router)
