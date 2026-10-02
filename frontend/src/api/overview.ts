import { requestJson } from "./client";
import type { ApiResponse, OverviewData } from "./types";


export const getOverview = (signal?: AbortSignal): Promise<ApiResponse<OverviewData>> => (
  requestJson<OverviewData>("/overview", signal)
);