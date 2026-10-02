import { requestJson, requestPatchJson } from "./client";
import type { ApiResponse, SystemSettingsData, SystemSettingsPatch, SystemServicesData } from "./types";


export const getSystemSettings = (signal?: AbortSignal): Promise<ApiResponse<SystemSettingsData>> => (
  requestJson<SystemSettingsData>("/system/settings", signal)
);

export const patchSystemSettings = (body: SystemSettingsPatch, signal?: AbortSignal): Promise<ApiResponse<SystemSettingsData>> => (
  requestPatchJson<SystemSettingsData>("/system/settings", body, signal)
);

export const getSystemServices = (signal?: AbortSignal): Promise<ApiResponse<SystemServicesData>> => (
  requestJson<SystemServicesData>("/system/services", signal)
);