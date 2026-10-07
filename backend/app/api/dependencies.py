from fastapi import Request
from pymongo.database import Database

from app.config import get_settings
from app.database import create_mongodb_client


def get_database(request: Request) -> Database:
  settings = get_settings()

  with request.app.state.mongodb_client_lock:
    client = request.app.state.mongodb_client

    if client is None:
      client = create_mongodb_client(settings)
      request.app.state.mongodb_client = client

  return client[settings.mongodb_database]
