import logging
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
    """Initialise database tables and seed default user on first run."""
    logger.info("Starting up Voice Shopping Assistant backend…")
    init_db()
    logger.info("Database ready.")

    # Services will be attached to app.state in later phases:
    #   app.state.stt        ← Phase 2
    #   app.state.nlp        ← Phase 3
    #   app.state.list_mgr   ← Phase 4
    #   app.state.rec_engine ← Phase 5


app.include_router(health.router)
app.include_router(voice.router)
app.include_router(lists.router)
app.include_router(store.router)
