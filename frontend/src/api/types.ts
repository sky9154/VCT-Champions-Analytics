export interface ApiResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface DataStatusData {
  dataAsOf: string | null;
  lastImportedAt: string | null;
  nextImportAt: string | null;
  schedulerStatus: "active" | "disabled" | "stale";
  status?: "success" | "partial" | "failed" | null;
  lastSuccessfulAt?: string | null;
  imports?: {
    schedule: { lastSuccessfulAt: string | null; status: "success" | "partial" | "failed" | null };
    stats: { lastSuccessfulAt: string | null; status: "success" | "partial" | "failed" | null };
    assets: { lastSuccessfulAt: string | null; status: "success" | "partial" | "failed" | null };
  };
}

export type DataUpdateStatus = "idle" | "running" | "success" | "partial" | "failed" | "busy";
export type DataUpdatePhase =
  | "getting_source"
  | "reconciling"
  | "applying_schedule"
  | "checking_stats_source"
  | "downloading_stats_source"
  | "validating_stats_source"
  | "stats_source_unchanged"
  | "stats_source_updated"
  | "stats_source_failed"
  | "verifying_stats"
  | "final_validation";

export interface DataUpdateStatusData {
  jobId: string | null;
  status: DataUpdateStatus;
  startedAt: string | null;
  finishedAt: string | null;
  failureMessage: string | null;
  phase: DataUpdatePhase | null;
  dataAsOf: string | null;
  lastImportedAt: string | null;
  summary: DataUpdateSummary | null;
}

export interface DataUpdateSummary {
  scheduleTotal: number;
  scheduleSynced: number;
  statsAvailable: number;
  statsUnavailable: number;
  scheduleCreated: number;
  scheduleUpdated: number;
  scheduleUnchanged: number;
  statsUpdated: number;
  statsCreated: number;
  statsUnchanged: number;
  statsSkipped: number;
  statsSnapshotStatus: "updated" | "unchanged" | "failed" | null;
  conflicts: number;
  ambiguous: number;
  incomplete: number;
  unmatched: number;
  participantsUnresolved: number;
}

export interface DataUpdateAcceptedData {
  jobId: string | null;
  status: "running" | "busy";
  acceptedAt: string;
}

export type SystemSettingKey =
  | "LIQUIPEDIA_REQUEST_INTERVAL_SECONDS"
  | "LIQUIPEDIA_PARSE_INTERVAL_SECONDS"
  | "LIQUIPEDIA_CACHE_TTL_SECONDS"
  | "MATCH_TIME_TOLERANCE_MINUTES";

export interface SystemSettingItem {
  key: SystemSettingKey;
  name: string;
  description: string;
  type: "number";
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  unit: string;
  configured: boolean;
  requiresRestart: "backend";
  pendingRestart: boolean;
}

export type SystemSettingsPatch = Partial<Record<
  | "liquipediaRequestIntervalSeconds"
  | "liquipediaParseIntervalSeconds"
  | "liquipediaCacheTtlSeconds"
  | "matchTimeToleranceMinutes",
  number
>>;

export interface SystemSettingsData {
  frontendPort: 5577;
  backendPort: 8591;
  settings: SystemSettingItem[];
  secrets: {
    MONGODB_URI: { configured: boolean };
    LIQUIPEDIA_USER_AGENT: { configured: boolean };
  };
  configurationValid: boolean;
  pendingBackendRestart: boolean;
  pendingFrontendRestart: boolean;
  schedulerEnabled: boolean;
}

export interface SystemServiceItem {
  status: "running" | "unavailable" | "not-managed";
  port: 5577 | 8591;
  reachable: boolean;
  healthIdentity: string | null;
}

export interface SystemServicesData {
  frontend: SystemServiceItem;
  backend: SystemServiceItem;
  managementMode: "separate";
  managementMessage: string;
}

export interface TeamReference {
  slug: string | null;
  name: string | null;
  shortName: string | null;
  logoUrl: string | null;
}

export interface ScheduleScore {
  teamA: number | null;
  teamB: number | null;
}

export type MatchStatus = "scheduled" | "live" | "completed" | "postponed" | "cancelled";

export interface ScheduleMatch {
  id: string | null;
  stage: string | null;
  group: string | null;
  round: string | null;
  scheduledAt: string | null;
  status: string | null;
  bestOf: number | null;
  teamA: TeamReference | null;
  teamB: TeamReference | null;
  score: ScheduleScore | null;
}

export interface PlayerStats {
  mapsPlayed: number;
  roundsPlayed: number;
  rating: number | null;
  acs: number | null;
  kills: number;
  deaths: number;
  assists: number;
  kd: number | null;
  kast: number | null;
  adr: number | null;
  kpr: number | null;
  apr: number | null;
  firstKills: number;
  firstDeaths: number;
  fkfd: number | null;
  fkpr: number | null;
  fdpr: number | null;
  headshotPercentage: number | null;
}

export interface PlayerRankingRow {
  rank: number;
  player: {
    slug: string | null;
    handle: string | null;
    role: string | null;
    imageUrl?: string | null;
    team: {
      slug: string | null;
      name: string | null;
      shortName: string | null;
      logoUrl?: string | null;
    } | null;
  };
  stats: PlayerStats;
}

export interface TeamStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchWinPercentage: number | null;
  mapsPlayed: number;
  mapsWon: number;
  mapsLost: number;
  mapWinPercentage: number | null;
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  roundWinPercentage: number | null;
  attackRoundWinPercentage: number | null;
  defenseRoundWinPercentage: number | null;
  roundDifferential: number | null;
  kd: number | null;
  firstKillPercentage: number | null;
}

export interface TeamRankingRow {
  rank: number;
  team: TeamReference & { region: string | null };
  stats: TeamStats;
}

export interface OverviewData {
  tournament: {
    slug: string;
    name: string | null;
    status: string | null;
    currentStage: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  progress: {
    matchesCompleted: number;
    matchesTotal: number;
  };
  upcomingMatches: ScheduleMatch[];
  recentResults: ScheduleMatch[];
  topPlayers: PlayerRankingRow[];
  topTeams: TeamRankingRow[];
}

export interface FiltersData {
  stages: string[];
  teams: Array<{
    slug: string | null;
    name: string | null;
    shortName: string | null;
  }>;
  roles: string[];
  agents: string[];
  maps: string[];
  sides: string[];
}

export interface SearchData {
  teams: TeamReference[];
  players: Array<{
    slug: string | null;
    handle: string | null;
    currentTeam: {
      slug: string | null;
      name: string | null;
      shortName: string | null;
    } | null;
  }>;
}

export type TeamSortField =
  | "matchesPlayed"
  | "matchesWon"
  | "matchWinPercentage"
  | "mapsPlayed"
  | "mapsWon"
  | "mapWinPercentage"
  | "roundWinPercentage"
  | "attackRoundWinPercentage"
  | "defenseRoundWinPercentage"
  | "roundDifferential"
  | "kd"
  | "firstKillPercentage";

export type PlayerSortField =
  | "rating"
  | "acs"
  | "kd"
  | "kast"
  | "adr"
  | "kpr"
  | "apr"
  | "fk"
  | "fd"
  | "fkfd"
  | "fkpr"
  | "fdpr"
  | "hs";

export type SortOrder = "asc" | "desc";

export interface TeamRankingTeam extends TeamReference {
  region: string | null;
}

export interface TeamRosterPlayer {
  slug: string | null;
  handle: string | null;
  realName: string | null;
  role: string | null;
  imageUrl: string | null;
}

export interface TeamMapPerformance {
  map: string | null;
  mapsPlayed: number;
  mapsWon: number;
  mapsLost: number;
  roundsPlayed: number;
  roundsWon: number;
  roundsLost: number;
  mapWinPercentage: number | null;
  roundWinPercentage: number | null;
  attackRoundWinPercentage: number | null;
  defenseRoundWinPercentage: number | null;
  roundDifferential: number | null;
  kd: number | null;
  firstKillPercentage: number | null;
}

export interface MatchOpponent {
  slug: string | null;
  name: string | null;
  shortName?: string | null;
  logoUrl?: string | null;
}

export interface MatchResult {
  win: boolean | null;
  ownScore: number | null;
  opponentScore: number | null;
}

export interface TeamRecentMatch {
  matchId: string | null;
  scheduledAt: string | null;
  status: MatchStatus | null;
  opponent: MatchOpponent | null;
  result: MatchResult;
}

export interface TeamDetailData {
  team: TeamRankingTeam;
  summary: TeamStats;
  roster: TeamRosterPlayer[];
  mapPerformance: TeamMapPerformance[];
  recentMatches: TeamRecentMatch[];
}

export interface PlayerTeam {
  slug: string | null;
  name: string | null;
  shortName: string | null;
}

export interface PlayerListProfile {
  slug: string | null;
  handle: string | null;
  role: string | null;
  imageUrl?: string | null;
  team: PlayerTeam | null;
}

export interface PlayerRankingItem {
  rank: number;
  player: PlayerListProfile;
  stats: PlayerStats;
}

export interface PlayerDetailProfile {
  slug: string | null;
  handle: string | null;
  realName: string | null;
  role: string | null;
  imageUrl?: string | null;
  team: PlayerDetailTeam | null;
}

export interface PlayerDetailTeam {
  slug: string | null;
  name: string | null;
  shortName: string | null;
  logoUrl?: string | null;
}

export interface PlayerPerformance {
  mapsPlayed: number;
  roundsPlayed: number;
  rating: number | null;
  acs: number | null;
  kd: number | null;
  kast: number | null;
  adr: number | null;
}

export interface PlayerMapPerformance extends PlayerPerformance {
  map: string;
}

export interface PlayerAgentPerformance extends PlayerPerformance {
  agent: string;
}

export interface PlayerRecentMatch extends TeamRecentMatch {
  rating: number | null;
  acs: number | null;
  kd: number | null;
}

export interface PlayerDetailData {
  player: PlayerDetailProfile;
  summary: PlayerStats;
  mapPerformance: PlayerMapPerformance[];
  agentPerformance: PlayerAgentPerformance[];
  recentMatches: PlayerRecentMatch[];
}

export type TrendRange = "all" | "last5" | "last10";
export type TrendInterval = "map" | "match";
export type TrendSide = "overall" | "attack" | "defense";

export type TeamTrendMetric =
  | "roundWinPercentage"
  | "roundDifferential"
  | "attackRoundWinPercentage"
  | "defenseRoundWinPercentage"
  | "kd"
  | "avgAcs"
  | "avgRating"
  | "kast"
  | "adr"
  | "firstKillPercentage";

export type PlayerTrendMetric =
  | "rating"
  | "acs"
  | "kd"
  | "kast"
  | "adr"
  | "kpr"
  | "apr"
  | "fkpr"
  | "fdpr"
  | "hs";

export interface TrendFilters {
  map: string | null;
  stage: string | null;
  opponent: string | null;
  range: TrendRange;
}

export interface PlayerTrendFilters extends TrendFilters {
  agent: string | null;
  side: TrendSide;
}

export interface TrendPoint {
  timestamp: string | null;
  matchId: string | null;
  matchMapId: string | null;
  opponent: MatchOpponent | null;
  map: string | null;
  value: number | null;
  dataAvailability: "available" | "pending";
  result: MatchResult;
}

export interface TrendCoverage {
  pointCount: number;
  availableCount: number;
}

export interface TeamTrendData {
  metric: TeamTrendMetric;
  interval: TrendInterval;
  filters: TrendFilters;
  average: number | null;
  points: TrendPoint[];
  coverage: TrendCoverage;
}

export interface PlayerTrendMetadata {
  roundsPlayed: number;
  rating: number | null;
  acs: number | null;
  kills: number;
  deaths: number;
  assists: number;
  kd: number | null;
  kast: number | null;
  adr: number | null;
}

export interface PlayerTrendPoint extends TrendPoint {
  agent: string | null;
  metadata: PlayerTrendMetadata | null;
}

export interface PlayerTrendData {
  metric: PlayerTrendMetric;
  interval: TrendInterval;
  filters: PlayerTrendFilters;
  average: number | null;
  points: PlayerTrendPoint[];
  coverage: TrendCoverage;
}