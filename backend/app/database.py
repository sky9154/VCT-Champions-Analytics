from datetime import timezone
from pymongo import MongoClient

from app.config import Settings


def create_mongodb_client(settings: Settings) -> MongoClient:
  return MongoClient(settings.mongodb_uri,
                     connect=False,
                     tz_aware=True,
                     tzinfo=timezone.utc)
