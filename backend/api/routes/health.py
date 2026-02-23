from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check():
    """Liveness probe — used by UptimeRobot to keep Render warm."""
    return {
        "status": "ok",
        "service": "voice-shopping-assistant",
        "timestamp": datetime.utcnow().isoformat(),
    }
