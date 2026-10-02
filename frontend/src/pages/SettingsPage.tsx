import { useApiResource } from "../hooks/useApiResource";
import { getBackendHealth } from "../api/health";
import { getDataStatus } from "../api/dataStatus";
import { getOverview } from "../api/overview";
import type { ApiResponse, DataStatusData, OverviewData } from "../api/types";
import { ManualUpdatePanel } from "../components/ManualUpdatePanel";
import { Select } from "../components/ui/Select";
import { useManualUpdate } from "../contexts/ManualUpdateContext";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import type { DisplayTimeZone } from "../contexts/UserPreferencesContext";
import { formatDateTimeForZone, formatNumber } from "../utils/formatters";
import { SystemSettingsPanel } from "../components/settings/SystemSettingsPanel";
import { SystemServicesPanel } from "../components/settings/SystemServicesPanel";


const CAPABILITY_LABELS: Record<string, string> = {
  overview: "賽事總覽",
  schedule: "賽程查詢",
  "team-trends": "隊伍趨勢",
  "player-trends": "選手趨勢",
  "manual-data-update": "手動資料更新",
  "data-status": "資料狀態查詢",
  "system-settings": "系統設定",
  "system-services": "唯讀服務狀態"
};

const IMPORT_STATUS_LABELS = {
  success: "更新完成",
  partial: "部分完成",
  failed: "更新失敗"
} as const;

interface ImportRunSummary {
  lastSuccessfulAt: string | null;
  status: "success" | "partial" | "failed" | null;
}

const getImportSummaryLabel = (importRun: ImportRunSummary, timeZone: DisplayTimeZone): string => {
  const formattedAt = importRun.lastSuccessfulAt
    ? formatDateTimeForZone(importRun.lastSuccessfulAt, timeZone)
    : null;
  const timeLabel = formattedAt && formattedAt !== "尚無資料" ? formattedAt : null;
  const statusLabel = importRun.status ? IMPORT_STATUS_LABELS[importRun.status] : null;

  if (timeLabel) {
    return statusLabel
      ? `最近更新：${timeLabel}｜${statusLabel}`
      : `最近更新：${timeLabel}`;
  }

  return statusLabel ?? "最近更新：尚無結果";
};

const SettingsPage = () => {
  const { preferences, updatePreference } = useUserPreferences();
  const update = useManualUpdate();
  const overview = useApiResource<ApiResponse<OverviewData>>("settings-overview", getOverview, { keepPreviousData: true });
  const dataStatus = useApiResource<ApiResponse<DataStatusData>>("settings-data-status", getDataStatus, { keepPreviousData: true });
  const health = useApiResource("settings-backend-health", getBackendHealth, { keepPreviousData: true });
  const overviewData = overview.state.status === "success" ? overview.state.data.data : null;
  const dataStatusData = dataStatus.state.status === "success" ? dataStatus.state.data.data : null;
  const healthData = health.state.status === "success" ? health.state.data.data : null;
  const statsSummary = update.summary;
  const statsTotal = statsSummary ? statsSummary.statsAvailable + statsSummary.statsUnavailable : null;
  const scheduleImport = dataStatusData?.imports?.schedule;
  const statsImport = dataStatusData?.imports?.stats;
  const schedulerLabel = dataStatusData?.schedulerStatus === "disabled"
    ? "已停用"
    : dataStatusData?.schedulerStatus === "active"
      ? "執行中"
      : dataStatusData?.schedulerStatus === "stale"
        ? "狀態等待確認"
        : "無法取得";

  return (
    <div className="page-container settings-page">
      <header className="analytics-page-heading">
        <div>
          <h1 tabIndex={-1}>設定</h1>
          <p>調整顯示偏好與資料更新方式，並查看服務狀態。</p>
        </div>
      </header>

      <section className="settings-section" aria-labelledby="settings-update-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="settings-update-title">資料更新</h2>
          </div>
        </div>
        <ManualUpdatePanel
          apiState={update.apiState}
          apiMessage={update.apiMessage}
          status={update.status}
          isHistorical={update.isHistorical}
          phase={update.phase}
          failureMessage={update.failureMessage}
          dataAsOf={update.dataAsOf}
          summary={update.summary}
          onStart={update.onStart}
          timeZone={preferences.timeZone}
        />
      </section>

      <section className="settings-section" aria-labelledby="settings-preferences-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="settings-preferences-title">顯示偏好</h2>
            <p>偏好只儲存在目前的瀏覽器，不會修改 API 服務設定。</p>
          </div>
        </div>
        <div className="settings-preferences-grid">
          <label className="settings-control">
            <span>時間顯示</span>
            <Select
              label="時間顯示時區"
              value={preferences.timeZone}
              options={[
                { value: "Asia/Taipei", label: "台北時間（GMT+8）" },
                { value: "UTC", label: "UTC" }
              ]}
              onChange={(value) => updatePreference("timeZone", value as "Asia/Taipei" | "UTC")}
            />
          </label>
          <label className="settings-control">
            <span>動態效果</span>
            <Select
              label="動態效果偏好"
              value={preferences.motion}
              options={[
                { value: "system", label: "依照系統" },
                { value: "full", label: "完整動態" },
                { value: "reduced", label: "減少動態" }
              ]}
              onChange={(value) => updatePreference("motion", value as "system" | "full" | "reduced")}
            />
          </label>
          <label className="settings-control">
            <span>趨勢預設範圍</span>
            <Select
              label="趨勢預設範圍"
              value={preferences.trendRange}
              options={[
                { value: "all", label: "全部" },
                { value: "last5", label: "最近 5 場" },
                { value: "last10", label: "最近 10 場" }
              ]}
              onChange={(value) => updatePreference("trendRange", value as "all" | "last5" | "last10")}
            />
          </label>
          <label className="settings-control">
            <span>趨勢預設區間</span>
            <Select
              label="趨勢預設區間"
              value={preferences.trendInterval}
              options={[
                { value: "match", label: "對戰" },
                { value: "map", label: "地圖" }
              ]}
              onChange={(value) => updatePreference("trendInterval", value as "match" | "map")}
            />
          </label>
        </div>
      </section>

      <SystemSettingsPanel />
      <SystemServicesPanel />

      <section className="settings-section" aria-labelledby="settings-system-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="settings-system-title">賽事資料概況</h2>
            <p>此區僅供檢視，不會修改賽事資料。</p>
          </div>
        </div>
        <dl className="settings-system-grid">
          <div>
            <dt>API 服務</dt>
            <dd>{healthData?.status === "ok"
              ? "連線正常"
              : health.state.status === "error"
                ? "目前無法連線至 API 服務，請確認服務已啟動。"
                : "正在確認 API 服務狀態…"}</dd>
            {healthData?.service ? <small>{healthData.service}</small> : null}
          </div>
          <div>
            <dt>賽事</dt>
            <dd>{overviewData
              ? overviewData.tournament.name ?? "賽事名稱尚未提供"
              : overview.state.status === "error"
                ? "目前無法取得資料，請稍後再試。"
                : "正在載入賽事資料…"}</dd>
            {overviewData?.tournament.slug ? <small>{overviewData.tournament.slug}</small> : null}
          </div>
          <div>
            <dt>賽事進度</dt>
            <dd>{overviewData
              ? `${formatNumber(overviewData.progress.matchesCompleted)} 場已完成／共 ${formatNumber(overviewData.progress.matchesTotal)} 場`
              : overview.state.status === "error"
                ? "目前無法取得資料，請稍後再試。"
                : "正在載入賽程資料…"}</dd>
            {scheduleImport ? <small>{getImportSummaryLabel(scheduleImport, preferences.timeZone)}</small> : null}
          </div>
          <div>
            <dt>統計資料涵蓋範圍</dt>
            <dd>{statsSummary && statsTotal !== null
              ? `已有詳細統計：${formatNumber(statsSummary.statsAvailable)} 場；詳細統計尚未提供：${formatNumber(statsSummary.statsUnavailable)} 場`
              : "尚無更新摘要"}</dd>
            {statsImport ? <small>{getImportSummaryLabel(statsImport, preferences.timeZone)}</small> : null}
          </div>
          <div>
            <dt>排程狀態</dt>
            <dd>{schedulerLabel}</dd>
          </div>
          <div>
            <dt>API 服務功能</dt>
            <dd>
              {healthData?.capabilities?.length
                ? healthData.capabilities.map((capability) => CAPABILITY_LABELS[capability] ?? "其他服務").join("、")
                : healthData
                  ? "API 服務版本不相容，請更新並重新啟動服務。"
                  : health.state.status === "error"
                    ? "目前無法連線至 API 服務，請確認服務已啟動。"
                    : "正在載入服務功能…"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
};

export { SettingsPage };