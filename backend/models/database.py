import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.config import settings
from backend.models.orm import Base, User, ShoppingList

logger = logging.getLogger(__name__)

connect_args: dict = {}
engine_kwargs: dict = {}

if "sqlite" in settings.DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif "mysql" in settings.DATABASE_URL:
    engine_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 3600,   # Reconnect every hour (Aiven idle timeout)
        "pool_pre_ping": True,  # Verify connection before use
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables and seed the default user + list."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.get(User, "default_user"):
            db.add(User(id="default_user", name="Default User"))
            default_list = ShoppingList(user_id="default_user", name="My Shopping List")
            db.add(default_list)
            db.commit()
            logger.info("Seeded default user and shopping list (id=1)")
    except Exception as exc:
        db.rollback()
        logger.error(f"DB seed failed: {exc}")
    finally:
        db.close()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
