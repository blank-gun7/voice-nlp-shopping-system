from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Voice Shopping Assistant"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    # Dev:  sqlite:///./shopping.db
    # Prod: mysql+pymysql://user:pass@host:port/dbname?charset=utf8mb4
    DATABASE_URL: str = "sqlite:///./shopping.db"

    # Groq — single key for both STT (Whisper large-v3) and LLM (Llama 3.1 8B)
    GROQ_API_KEY: Optional[str] = None
    GROQ_STT_MODEL: str = "whisper-large-v3"
    GROQ_LLM_MODEL: str = "llama-3.1-8b-instant"
    LLM_TIMEOUT: float = 3.0

    # spaCy — benchmarked in Phase 3, pick sm or md
    SPACY_MODEL: str = "en_core_web_sm"
    NLP_CONFIDENCE_THRESHOLD: float = 0.85

    # Data artifacts directory
    DATA_DIR: str = "./data"

    # CORS — allow Vite dev server and production frontend
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
