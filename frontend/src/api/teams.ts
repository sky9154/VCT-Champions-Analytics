import { requestJson } from "./client";
import { requireTrendContract } from "./trends";
import type {
  ApiResponse,
  SortOrder,
  TeamDetailData,
  TeamRankingRow,
  TeamSortField,
  TeamTrendData,
  TeamTrendMetric,
  TrendInterval,
  TrendRange
} from "./types";


export interface TeamListQuery {
  stage: string | null;
  sort: TeamSortField;
  order: SortOrder;
}

export interface TeamTrendQuery {
  metric: TeamTrendMetric;
  interval: TrendInterval;
  range: TrendRange;
}

export const getTeams = (
  query: TeamListQuery,
  signal?: AbortSignal
): Promise<ApiResponse<TeamRankingRow[]>> => {
  const params = new URLSearchParams();

  if (query.stage) {
    params.set("stage", query.stage);
  }

  params.set("sort", query.sort);
  params.set("order", query.order);

  return requestJson<TeamRankingRow[]>(`/teams?${params.toString()}`, signal);
};

export const getTeam = (slug: string, signal?: AbortSignal): Promise<ApiResponse<TeamDetailData>> => (
  requestJson<TeamDetailData>(`/teams/${encodeURIComponent(slug)}`, signal)
);

export const getTeamTrend = (
  slug: string,
  query: TeamTrendQuery,
  signal?: AbortSignal
): Promise<ApiResponse<TeamTrendData>> => {
  const params = new URLSearchParams({
    metric: query.metric,
    interval: query.interval,
    range: query.range
  });

  return requestJson<TeamTrendData>(
    `/teams/${encodeURIComponent(slug)}/trend?${params.toString()}`,
    signal
  ).then(requireTrendContract);
};