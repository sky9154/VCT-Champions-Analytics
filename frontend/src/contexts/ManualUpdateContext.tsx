import { createContext, useContext, type ReactNode } from "react";
import type { DataUpdatePhase, DataUpdateStatus, DataUpdateSummary } from "../api/types";


export interface ManualUpdateContextValue {
  apiState: "checking" | "ready" | "unavailable";
  apiMessage: string | null;
  status: DataUpdateStatus;
  isHistorical: boolean;
  phase: DataUpdatePhase | null;
  failureMessage: string | null;
  dataAsOf: string | null;
  lastImportedAt: string | null;
  summary: DataUpdateSummary | null;
  onStart: () => void;
}

const ManualUpdateContext = createContext<ManualUpdateContextValue | null>(null);

const ManualUpdateProvider = ({ value, children }: { value: ManualUpdateContextValue; children: ReactNode }) => (
  <ManualUpdateContext.Provider value={value}>{children}</ManualUpdateContext.Provider>
);

const useManualUpdate = (): ManualUpdateContextValue => {
  const value = useContext(ManualUpdateContext);
  if (value === null) throw new Error("ManualUpdateProvider is missing.");
  return value;
};

export { ManualUpdateProvider, useManualUpdate };