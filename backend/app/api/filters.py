from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.dependencies import get_database
from app.api.responses import success_object
from app.api.schemas import APIResponse, FiltersData
from app.config import get_settings
from app.services.common import find_tournament_id
from app.services.filters import get_event_filters

router = APIRouter()


@router.get("/filters", response_model=APIResponse[FiltersData])
def get_filters(database: Database = Depends(get_database)):
  settings = get_settings()
  tournament_id = find_tournament_id(database, settings.tournament_slug)

  return success_object(get_event_filters(database, tournament_id))
