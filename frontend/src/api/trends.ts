import { ApiError } from "./client";
import type { ApiResponse, TrendCoverage } from "./types";


interface TrendContractData {
  coverage: TrendCoverage;
  points: Array<{ dataAvailability: "available" | "pending" }>;
}

export const requireTrendContract = <T extends TrendContractData>(response: ApiResponse<T>): ApiResponse<T> => {
  const { coverage, points } = response.data;
  const validCount = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;

  if (
    !coverage
    || !validCount(coverage.pointCount)
    || !validCount(coverage.availableCount)
    || coverage.pointCount !== points.length
    || coverage.availableCount > coverage.pointCount
    || points.some((point) => point.dataAvailability !== "available" && point.dataAvailability !== "pending")
  ) {
    throw new ApiError("INVALID_RESPONSE", "API 服務版本不相容，請更新並重新啟動服務。", 200);
  }

  return response;
};