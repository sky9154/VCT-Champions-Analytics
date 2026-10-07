from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

PayloadType = TypeVar("PayloadType")


class APIResponse(BaseModel, Generic[PayloadType]):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: PayloadType
  meta: dict[str, Any]


class TeamSummary(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  shortName: str | None
  logoUrl: str | None


class ScheduleScore(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  teamA: int | None
  teamB: int | None


class ScheduleMatch(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  id: str | None
  stage: str | None
  group: str | None
  round: str | None
  scheduledAt: str | None
  status: str | None
  bestOf: int | None
  teamA: TeamSummary | None
  teamB: TeamSummary | None
  score: ScheduleScore


class FilterTeam(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  shortName: str | None


class FiltersData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  stages: list[str]
  teams: list[FilterTeam]
  roles: list[str]
  agents: list[str]
  maps: list[str]
  sides: list[str]


class SearchTeam(TeamSummary):
  pass


class SearchCurrentTeam(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  shortName: str | None


class SearchPlayer(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  handle: str | None
  currentTeam: SearchCurrentTeam | None


class SearchData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  teams: list[SearchTeam]
  players: list[SearchPlayer]


class TeamRankingTeam(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  shortName: str | None
  region: str | None
  logoUrl: str | None


class TeamStats(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  matchesPlayed: int
  matchesWon: int
  matchesLost: int
  matchWinPercentage: float | None
  mapsPlayed: int
  mapsWon: int
  mapsLost: int
  mapWinPercentage: float | None
  roundsPlayed: int
  roundsWon: int
  roundsLost: int
  roundWinPercentage: float | None
  attackRoundWinPercentage: float | None
  defenseRoundWinPercentage: float | None
  roundDifferential: int | None
  kd: float | None
  firstKillPercentage: float | None


class TeamRankingItem(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  rank: int
  team: TeamRankingTeam
  stats: TeamStats


class TeamRosterPlayer(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  handle: str | None
  realName: str | None
  role: str | None
  imageUrl: str | None


class TeamMapPerformance(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  map: str | None
  mapsPlayed: int
  mapsWon: int
  mapsLost: int
  roundsPlayed: int
  roundsWon: int
  roundsLost: int
  mapWinPercentage: float | None
  roundWinPercentage: float | None
  attackRoundWinPercentage: float | None
  defenseRoundWinPercentage: float | None
  roundDifferential: int | None
  kd: float | None
  firstKillPercentage: float | None


class MatchOpponent(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  shortName: str | None = None


class RecentMatchOpponent(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  logoUrl: str | None


class MatchResult(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  win: bool | None
  ownScore: int | None
  opponentScore: int | None


class TeamRecentMatch(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  matchId: str | None
  scheduledAt: str | None
  status: str | None
  opponent: RecentMatchOpponent | None
  result: MatchResult


class TeamDetailData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  team: TeamRankingTeam
  summary: TeamStats
  roster: list[TeamRosterPlayer]
  mapPerformance: list[TeamMapPerformance]
  recentMatches: list[TeamRecentMatch]


class PlayerTeam(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  name: str | None
  shortName: str | None


class PlayerListProfile(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  handle: str | None
  role: str | None
  team: PlayerTeam | None


class PlayerStats(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  mapsPlayed: int
  roundsPlayed: int
  rating: float | None
  acs: float | None
  kills: int
  deaths: int
  assists: int
  kd: float | None
  kast: float | None
  adr: float | None
  kpr: float | None
  apr: float | None
  firstKills: int
  firstDeaths: int
  fkfd: float | None
  fkpr: float | None
  fdpr: float | None
  headshotPercentage: float | None


class PlayerRankingItem(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  rank: int
  player: PlayerListProfile
  stats: PlayerStats


class PlayerDetailProfile(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str | None
  handle: str | None
  realName: str | None
  role: str | None
  team: MatchOpponent | None


class PlayerPerformance(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  mapsPlayed: int
  roundsPlayed: int
  rating: float | None
  acs: float | None
  kd: float | None
  kast: float | None
  adr: float | None


class PlayerMapPerformance(PlayerPerformance):
  model_config = ConfigDict(extra="forbid", strict=True)

  map: str


class PlayerAgentPerformance(PlayerPerformance):
  model_config = ConfigDict(extra="forbid", strict=True)

  agent: str


class PlayerRecentMatch(TeamRecentMatch):
  model_config = ConfigDict(extra="forbid", strict=True)

  rating: float | None
  acs: float | None
  kd: float | None


class PlayerDetailData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  player: PlayerDetailProfile
  summary: PlayerStats
  mapPerformance: list[PlayerMapPerformance]
  agentPerformance: list[PlayerAgentPerformance]
  recentMatches: list[PlayerRecentMatch]


class TeamTrendFilters(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  map: str | None
  stage: str | None
  opponent: str | None
  range: str


class PlayerTrendFilters(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  map: str | None
  agent: str | None
  stage: str | None
  side: str
  opponent: str | None
  range: str


class TrendPoint(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  timestamp: str | None
  matchId: str | None
  matchMapId: str | None
  opponent: MatchOpponent | None
  map: str | None
  value: float | int | None
  dataAvailability: Literal["available", "pending"]
  result: MatchResult


class TrendCoverage(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  pointCount: int
  availableCount: int


class TeamTrendData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  metric: str
  interval: str
  filters: TeamTrendFilters
  average: float | int | None
  points: list[TrendPoint]
  coverage: TrendCoverage


class PlayerTrendMetadata(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  roundsPlayed: int
  rating: float | None
  acs: float | None
  kills: int
  deaths: int
  assists: int
  kd: float | None
  kast: float | None
  adr: float | None


class PlayerTrendPoint(TrendPoint):
  model_config = ConfigDict(extra="forbid", strict=True)

  agent: str | None
  metadata: PlayerTrendMetadata | None


class PlayerTrendData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  metric: str
  interval: str
  filters: PlayerTrendFilters
  average: float | int | None
  points: list[PlayerTrendPoint]
  coverage: TrendCoverage


class OverviewTournament(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  slug: str
  name: str | None
  status: str | None
  currentStage: str | None
  startDate: str | None
  endDate: str | None


class OverviewProgress(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  matchesCompleted: int
  matchesTotal: int


class OverviewData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  tournament: OverviewTournament
  progress: OverviewProgress
  upcomingMatches: list[ScheduleMatch]
  recentResults: list[ScheduleMatch]
  topPlayers: list[PlayerRankingItem]
  topTeams: list[TeamRankingItem]


class OverviewDataCoverage(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  schedule: Literal["liquipedia-canonical"]
  stats: Literal["verified-matches-only"]


class OverviewMeta(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  dataCoverage: OverviewDataCoverage


class OverviewResponse(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: OverviewData
  meta: OverviewMeta


class DataStatusImport(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  lastSuccessfulAt: str | None
  status: Literal["success", "partial", "failed"] | None


class DataStatusImports(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  schedule: DataStatusImport
  stats: DataStatusImport
  assets: DataStatusImport


class DataStatusHistoricalFailure(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  at: str | None
  code: Literal["SOURCE_UNAVAILABLE", "STATS_SOURCE_FAILED", "PLAN_BLOCKED",
                "PREFLIGHT_BLOCKED", "WRITE_LIMIT_EXCEEDED", "APPLY_FAILED",
                "POST_APPLY_FAILED", "LOCK_BUSY", "INTERNAL_ERROR"] | None


class DataStatusData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  dataAsOf: str | None
  lastImportedAt: str | None
  nextImportAt: str | None
  status: Literal["success", "partial", "failed"] | None
  schedulerStatus: Literal["active", "disabled", "stale"]
  lastAttemptAt: str | None
  lastSuccessfulAt: str | None
  lastFailureAt: str | None
  lastFailureCode: Literal["SOURCE_UNAVAILABLE", "STATS_SOURCE_FAILED",
                           "PLAN_BLOCKED", "PREFLIGHT_BLOCKED",
                           "WRITE_LIMIT_EXCEEDED", "APPLY_FAILED",
                           "POST_APPLY_FAILED", "LOCK_BUSY",
                           "INTERNAL_ERROR"] | None
  historicalFailure: DataStatusHistoricalFailure | None
  lastRunStatus: Literal["success", "partial", "failed"] | None
  imports: DataStatusImports
  statsSnapshotStatus: Literal["updated", "unchanged", "unavailable",
                               "invalid", "failed"] | None = None
  statsImportStatus: Literal["pending", "planning", "ready", "unchanged",
                             "applied", "partial", "failed",
                             "blocked"] = "pending"
  statsPlanRequired: bool = True
  statsLinkedMatches: int | None = None
  statsPendingMatches: int | None = None


class DataStatusResponse(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: DataStatusData
  meta: dict


class DataUpdateAcceptedData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  jobId: str | None
  status: Literal["running", "busy"]
  acceptedAt: str


class DataUpdateSummary(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  scheduleTotal: int
  scheduleSynced: int
  statsAvailable: int
  statsUnavailable: int
  scheduleCreated: int
  scheduleUpdated: int
  scheduleUnchanged: int
  statsUpdated: int
  statsCreated: int = 0
  statsUnchanged: int
  statsSkipped: int = 0
  statsSnapshotStatus: Literal["updated", "unchanged", "unavailable",
                               "invalid", "failed"] | None = None
  statsImportStatus: Literal["pending", "planning", "ready", "unchanged",
                             "applied", "partial", "failed",
                             "blocked"] | None = None
  statsPlanRequired: bool | None = None
  statsLinkedMatches: int | None = None
  statsPendingMatches: int | None = None
  conflicts: int
  ambiguous: int
  incomplete: int
  unmatched: int
  participantsUnresolved: int


class DataUpdateStatusData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  jobId: str | None
  status: Literal["idle", "running", "success", "partial", "failed", "busy"]
  startedAt: str | None
  finishedAt: str | None
  failureMessage: str | None
  phase: Literal["getting_source", "reconciling", "applying_schedule",
                 "checking_stats_source", "downloading_stats_source",
                 "validating_stats_source", "stats_source_unchanged",
                 "stats_source_updated", "stats_source_failed",
                 "verifying_stats", "final_validation"] | None
  dataAsOf: str | None
  lastImportedAt: str | None
  summary: DataUpdateSummary | None


class DataUpdateAcceptedResponse(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: DataUpdateAcceptedData
  meta: dict


class DataUpdateStatusResponse(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: DataUpdateStatusData
  meta: dict


SystemSettingKey = Literal["LIQUIPEDIA_REQUEST_INTERVAL_SECONDS",
                           "LIQUIPEDIA_PARSE_INTERVAL_SECONDS",
                           "LIQUIPEDIA_CACHE_TTL_SECONDS",
                           "MATCH_TIME_TOLERANCE_MINUTES"]
ServiceStatus = Literal["running", "unavailable", "not-managed"]


class SystemSettingItem(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  key: SystemSettingKey
  name: str
  description: str
  type: Literal["number"]
  value: float | int
  minimum: float | int
  maximum: float | int
  step: float | int
  unit: str
  configured: bool
  requiresRestart: Literal["backend"]
  pendingRestart: bool


class SystemSecretConfigured(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  configured: bool


class SystemSecretStatus(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  MONGODB_URI: SystemSecretConfigured
  LIQUIPEDIA_USER_AGENT: SystemSecretConfigured


class SystemSettingsData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  frontendPort: Literal[5577]
  backendPort: Literal[8591]
  settings: list[SystemSettingItem]
  secrets: SystemSecretStatus
  configurationValid: bool
  pendingBackendRestart: bool
  pendingFrontendRestart: bool
  schedulerEnabled: bool


class SystemSettingsPatch(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  liquipediaRequestIntervalSeconds: float | None = Field(default=None,
                                                         ge=2,
                                                         le=60)
  liquipediaParseIntervalSeconds: float | None = Field(default=None,
                                                       ge=30,
                                                       le=3600)
  liquipediaCacheTtlSeconds: int | None = Field(default=None, ge=0, le=86400)
  matchTimeToleranceMinutes: int | None = Field(default=None, ge=0, le=180)


class SystemSettingsResponse(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: SystemSettingsData
  meta: dict


class SystemServiceItem(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  status: ServiceStatus
  port: Literal[5577, 8591]
  reachable: bool
  healthIdentity: str | None


class SystemServicesData(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  frontend: SystemServiceItem
  backend: SystemServiceItem
  managementMode: Literal["separate"]
  managementMessage: str


class SystemServicesResponse(BaseModel):
  model_config = ConfigDict(extra="forbid", strict=True)

  data: SystemServicesData
  meta: dict
