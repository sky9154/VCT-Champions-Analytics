import { requestJson } from "./client";
import type { ApiResponse } from "./types";


export interface BackendHealthData {
  status: "ok";
  service: string;
  capabilities: string[];
}

export const getBackendHealth = (signal?: AbortSignal): Promise<ApiResponse<BackendHealthData>> => (
  requestJson<BackendHealthData>("/health", signal)
);