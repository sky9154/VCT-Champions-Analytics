import { ApiError, requestJson, requestPostJson } from "./client";
import type { ApiResponse, DataStatusData, DataUpdateAcceptedData, DataUpdateStatusData } from "./types";


export const getDataStatus = (signal?: AbortSignal): Promise<ApiResponse<DataStatusData>> => (
  requestJson<DataStatusData>("/data-status", signal)
);

const DATA_UPDATE_PHASES = new Set([
  "getting_source",
  "reconciling",
  "applying_schedule",
  "checking_stats_source",
  "downloading_stats_source",
  "validating_stats_source",
  "stats_source_unchanged",
  "stats_source_updated",
  "stats_source_failed",
  "verifying_stats",
  "final_validation"
]);

export const getDataUpdateStatus = async (signal?: AbortSignal): Promise<ApiResponse<DataUpdateStatusData>> => {
  const response = await requestJson<DataUpdateStatusData>("/data-update/status", signal);
  const data = response.data as DataUpdateStatusData & Record<string, unknown>;
  const hasPhaseField = Object.prototype.hasOwnProperty.call(data, "phase");
  const phaseIsValid = data.phase === null || DATA_UPDATE_PHASES.has(String(data.phase));

  if (!hasPhaseField || !phaseIsValid) {
    throw new ApiError(
      "INVALID_RESPONSE",
      "API 服務版本不相容，請更新並重新啟動服務。",
      200
    );
  }

  return response;
};

export const startDataUpdate = (signal?: AbortSignal): Promise<ApiResponse<DataUpdateAcceptedData>> => (
  requestPostJson<DataUpdateAcceptedData>("/data-update", signal)
);