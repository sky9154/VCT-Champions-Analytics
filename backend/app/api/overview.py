from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.dependencies import get_database
from app.api.responses import success_object
from app.api.schemas import OverviewResponse
from app.config import get_settings
from app.services.overview import get_overview

router = APIRouter()


@router.get("/overview", response_model=OverviewResponse)
def get_overview_endpoint(database: Database = Depends(get_database)):
  data = get_overview(database, get_settings().tournament_slug)

  return success_object(
      data, {
          "dataCoverage": {
              "schedule": "liquipedia-canonical",
              "stats": "verified-matches-only"
          }
      })
