from typing import Literal

from app.importers.models import DTOModel


class AssetImageDTO(DTOModel):
  source_url: str
  source_identity: str
  logo_url: str
  source_page: str
  image_name: str
  mime_type: str
  storage_identity: str
  content_sha256: str
  size_bytes: int
  retrieved_at: str
  file_reused: bool


class TeamAssetReferenceDTO(DTOModel):
  slug: str
  name: str
  source_provider: str
  source_external_id: str


class TeamAssetOperationDTO(DTOModel):
  operation: Literal["update"] = "update"
  collection: Literal["teams"] = "teams"
  reference: TeamAssetReferenceDTO
  logo: AssetImageDTO
