from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.dependencies import get_database
from app.api.responses import success_object
from app.api.schemas import DataUpdateAcceptedResponse, DataUpdateStatusResponse
from app.config import get_settings
from app.services.data_update import get_data_update_status, start_data_update

router = APIRouter()


@router.post("/data-update",
             status_code=202,
             response_model=DataUpdateAcceptedResponse)
def start_data_update_endpoint(database: Database = Depends(get_database)):
  settings = get_settings()
  data = start_data_update(database, settings)

  return success_object(data)


@router.get("/data-update/status", response_model=DataUpdateStatusResponse)
def get_data_update_status_endpoint(
    database: Database = Depends(get_database)):
  settings = get_settings()
  data = get_data_update_status(database, settings)

  return success_object(data)
