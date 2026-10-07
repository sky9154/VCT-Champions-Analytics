from fastapi import APIRouter

from app.config import get_settings

router = APIRouter()


@router.get("/health")
def get_health():
  settings = get_settings()

  return {
      "data": {
          "status":
          "ok",
          "service":
          settings.app_name,
          "capabilities": [
              "overview", "schedule", "team-trends", "player-trends",
              "manual-data-update", "data-status", "system-settings",
              "system-services"
          ]
      },
      "meta": {}
  }
