import { requestJson } from "./client";
import type { ApiResponse, FiltersData } from "./types";


export const getFilters = (signal?: AbortSignal): Promise<ApiResponse<FiltersData>> => (
  requestJson<FiltersData>("/filters", signal)
);