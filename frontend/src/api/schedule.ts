import { requestJson } from "./client";
import type { ApiResponse, ScheduleMatch } from "./types";


export interface ScheduleFilters {
  status: "all" | "upcoming" | "live" | "completed";
  stage: string | null;
  team: string | null;
}

export const getSchedule = (
  filters: ScheduleFilters,
  signal?: AbortSignal
): Promise<ApiResponse<ScheduleMatch[]>> => {
  const params = new URLSearchParams();

  params.set("status", filters.status);

  if (filters.stage) {
    params.set("stage", filters.stage);
  }

  if (filters.team) {
    params.set("team", filters.team);
  }

  return requestJson<ScheduleMatch[]>(`/schedule?${params.toString()}`, signal);
};