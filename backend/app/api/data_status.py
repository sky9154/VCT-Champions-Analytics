from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.dependencies import get_database
from app.api.responses import success_object
from app.api.schemas import DataStatusResponse
from app.config import get_settings
from app.services.data_status import get_data_status

router = APIRouter()


@router.get("/data-status", response_model=DataStatusResponse)
def get_data_status_endpoint(database: Database = Depends(get_database)):
  settings = get_settings()
  data = get_data_status(database, settings.tournament_slug)

  return success_object(data)
