import { requestJson } from "./client";
import type { ApiResponse, SearchData } from "./types";


export const getSearch = (query: string, signal?: AbortSignal): Promise<ApiResponse<SearchData>> => {
  const params = new URLSearchParams({ q: query.trim() });

  return requestJson<SearchData>(`/search?${params.toString()}`, signal);
};