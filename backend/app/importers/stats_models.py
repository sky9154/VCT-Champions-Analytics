from datetime import datetime
from math import isfinite
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _to_camel(value: str) -> str:
  first, *rest = value.split("_")

  return first + "".join(part.capitalize() for part in rest)


class StatsDTO(BaseModel):
  model_config = ConfigDict(extra="forbid",
                            alias_generator=_to_camel,
                            populate_by_name=True)


class PlayerDTO(StatsDTO):
  external_id: str
  name: str | None
  country: str | None
  url: str | None


class PlayerMapStatsDTO(StatsDTO):
  external_player_id: str
  team_idx: int = Field(strict=True, ge=0, le=1)
  player: PlayerDTO
  agents: list[str] | None

  rating_all: float | None = Field(default=None, ge=0)
  rating_atk: float | None = Field(default=None, ge=0)
  rating_def: float | None = Field(default=None, ge=0)
  acs_all: int | None = Field(default=None, strict=True, ge=0)
  acs_atk: int | None = Field(default=None, strict=True, ge=0)
  acs_def: int | None = Field(default=None, strict=True, ge=0)
  adr_all: int | None = Field(default=None, strict=True, ge=0)
  adr_atk: int | None = Field(default=None, strict=True, ge=0)
  adr_def: int | None = Field(default=None, strict=True, ge=0)
  kills_all: int | None = Field(default=None, strict=True, ge=0)
  kills_atk: int | None = Field(default=None, strict=True, ge=0)
  kills_def: int | None = Field(default=None, strict=True, ge=0)
  deaths_all: int | None = Field(default=None, strict=True, ge=0)
  deaths_atk: int | None = Field(default=None, strict=True, ge=0)
  deaths_def: int | None = Field(default=None, strict=True, ge=0)
  assists_all: int | None = Field(default=None, strict=True, ge=0)
  assists_atk: int | None = Field(default=None, strict=True, ge=0)
  assists_def: int | None = Field(default=None, strict=True, ge=0)
  fk_all: int | None = Field(default=None, strict=True, ge=0)
  fk_atk: int | None = Field(default=None, strict=True, ge=0)
  fk_def: int | None = Field(default=None, strict=True, ge=0)
  fd_all: int | None = Field(default=None, strict=True, ge=0)
  fd_atk: int | None = Field(default=None, strict=True, ge=0)
  fd_def: int | None = Field(default=None, strict=True, ge=0)
  kast_all: int | None = Field(default=None, strict=True, ge=0, le=100)
  kast_atk: int | None = Field(default=None, strict=True, ge=0, le=100)
  kast_def: int | None = Field(default=None, strict=True, ge=0, le=100)
  hs_pct_all: int | None = Field(default=None, strict=True, ge=0, le=100)
  hs_pct_atk: int | None = Field(default=None, strict=True, ge=0, le=100)
  hs_pct_def: int | None = Field(default=None, strict=True, ge=0, le=100)
  clutch_1v1: int | None = Field(default=None, strict=True, ge=0)
  clutch_1v2: int | None = Field(default=None, strict=True, ge=0)
  clutch_1v3: int | None = Field(default=None, strict=True, ge=0)
  clutch_1v4: int | None = Field(default=None, strict=True, ge=0)
  clutch_1v5: int | None = Field(default=None, strict=True, ge=0)

  @field_validator("rating_all", "rating_atk", "rating_def")
  @classmethod
  def validate_finite_rating(cls, value: float | None) -> float | None:
    if value is not None and not isfinite(value):
      raise ValueError("rating must be finite")

    return value


class RoundStatsDTO(StatsDTO):
  round_num: int = Field(strict=True, ge=1)
  winner_team: int = Field(strict=True, ge=0, le=1)
  side: str


class MapStatsDTO(StatsDTO):
  match_id: str
  game_id: str | None
  map_name: str | None
  score0: int | None = Field(default=None, strict=True, ge=0)
  score1: int | None = Field(default=None, strict=True, ge=0)
  picked_by_team: int | None = Field(default=None, strict=True, ge=0, le=1)
  performance_available: bool | None
  economy_available: bool | None
  player_rows: list[PlayerMapStatsDTO] = Field(default_factory=list)
  rounds: list[RoundStatsDTO] = Field(default_factory=list)
  source_errors: list[str] = Field(default_factory=list)


class SourceMatchStatsDTO(StatsDTO):
  match_id: str
  event_slug: str
  listing_status: str | None
  status: str | None
  team0_id: str | None
  team1_id: str | None
  utc_timestamp: datetime | None
  source_url: str | None
  maps: list[MapStatsDTO] = Field(default_factory=list)
  source_errors: list[str] = Field(default_factory=list)


class TeamMapStatsDTO(StatsDTO):
  external_match_id: str
  external_map_id: str
  team_slug: str
  opponent_team_slug: str
  document_template: dict


class PlayerMapStatOperationDTO(StatsDTO):
  external_match_id: str
  external_map_id: str
  player_slug: str
  document_template: dict


class MatchMapOperationDTO(StatsDTO):
  external_match_id: str
  external_map_id: str
  map_number: int = Field(strict=True, ge=1)
  document_template: dict
