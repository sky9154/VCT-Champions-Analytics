import { requestJson } from "./client";
import { requireTrendContract } from "./trends";
import type {
  ApiResponse,
  PlayerDetailData,
  PlayerRankingItem,
  PlayerSortField,
  PlayerTrendData,
  PlayerTrendMetric,
  SortOrder,
  TrendInterval,
  TrendRange,
  TrendSide
} from "./types";


export interface PlayerListQuery {
  team: string | null;
  agent: string | null;
  map: string | null;
  stage: string | null;
  side: TrendSide;
  minRounds: number;
  sort: PlayerSortField;
  order: SortOrder;
}

export interface PlayerTrendQuery {
  metric: PlayerTrendMetric;
  interval: TrendInterval;
  range: TrendRange;
  side: TrendSide;
}

export const getPlayers = (
  query: PlayerListQuery,
  signal?: AbortSignal
): Promise<ApiResponse<PlayerRankingItem[]>> => {
  const params = new URLSearchParams();
  if (query.team) {
    params.set("team", query.team);
  }

  if (query.agent) {
    params.set("agent", query.agent);
  }

  if (query.map) {
    params.set("map", query.map);
  }

  if (query.stage) {
    params.set("stage", query.stage);
  }

  params.set("side", query.side);
  params.set("minRounds", String(query.minRounds));
  params.set("sort", query.sort);
  params.set("order", query.order);

  return requestJson<PlayerRankingItem[]>(`/players?${params.toString()}`, signal);
};

export const getPlayer = (slug: string, signal?: AbortSignal): Promise<ApiResponse<PlayerDetailData>> => (
  requestJson<PlayerDetailData>(`/players/${encodeURIComponent(slug)}`, signal)
);

export const getPlayerTrend = (
  slug: string,
  query: PlayerTrendQuery,
  signal?: AbortSignal
): Promise<ApiResponse<PlayerTrendData>> => {
  const params = new URLSearchParams({
    metric: query.metric,
    interval: query.interval,
    range: query.range,
    side: query.side
  });
  return requestJson<PlayerTrendData>(
    `/players/${encodeURIComponent(slug)}/trend?${params.toString()}`,
    signal
  ).then(requireTrendContract);
};