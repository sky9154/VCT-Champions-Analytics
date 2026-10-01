import type { DataUpdatePhase, DataUpdateStatus, DataUpdateSummary } from "../api/types";
import { formatDateTimeForZone } from "../utils/formatters";
import type { DisplayTimeZone } from "../contexts/UserPreferencesContext";


interface ManualUpdatePanelProps {
  apiState: "checking" | "ready" | "unavailable";
  apiMessage: string | null;
  status: DataUpdateStatus;
  isHistorical: boolean;
  phase: DataUpdatePhase | null;
  failureMessage: string | null;
  dataAsOf: string | null;
  summary: DataUpdateSummary | null;
  onStart: () => void;
  timeZone: DisplayTimeZone;
}

const phaseMessages: Record<DataUpdatePhase, string> = {
  getting_source: "正在取得最新賽程",
  reconciling: "正在核對賽程資料",
  applying_schedule: "正在套用賽程",
  checking_stats_source: "正在檢查最新統計資料",
  downloading_stats_source: "正在下載統計資料",
  validating_stats_source: "正在驗證統計資料",
  stats_source_unchanged: "統計來源沒有更新",
  stats_source_updated: "統計來源已更新",
  stats_source_failed: "統計資料來源無法更新，已保留上一次成功資料。",
  verifying_stats: "正在核對詳細統計",
  final_validation: "正在確認統計結果"
};

const statusMessage = (
  status: DataUpdateStatus,
  phase: DataUpdatePhase | null,
  failureMessage: string | null,
  summary: DataUpdateSummary | null
): string => {
  if (status === "running") return phase ? phaseMessages[phase] : "正在更新資料";
  if (status === "busy") return "資料正在更新中，完成後會自動重新載入。";
  if (status === "success") return "資料更新完成";
  if (status === "partial") {
    if (summary && summary.scheduleSynced < summary.scheduleTotal) {
      return "資料部分更新完成。部分賽事因來源尚未一致，暫緩套用。";
    }

    if (summary?.statsSnapshotStatus === "failed") {
      return "資料部分更新完成。統計資料更新失敗，已保留上一次成功資料。";
    }

    return "資料部分更新完成。部分詳細統計尚未提供，或目前無法確認對應賽事。";
  }
  if (status === "failed") {
    return failureMessage ?? "資料更新未完成，已保留上一次成功資料。";
  }

  return "按下按鈕即可更新資料。";
};

const ManualUpdatePanel = ({
  apiState,
  apiMessage,
  status,
  isHistorical,
  phase,
  failureMessage,
  dataAsOf,
  summary,
  onStart,
  timeZone,
}: ManualUpdatePanelProps) => {
  const isActive = status === "running" || status === "busy";
  const buttonLabel = apiState === "checking"
    ? "正在確認 API 服務"
    : apiState === "unavailable"
      ? "API 服務無法連線"
      : status === "running"
        ? "正在更新資料"
        : status === "busy"
          ? "資料正在更新中"
          : status === "failed" && !isHistorical
            ? "重試"
            : "立即更新資料";
  const message = apiState === "checking"
    ? "正在確認 API 服務狀態。"
    : apiState === "unavailable"
      ? apiMessage ?? "目前無法連線至 API 服務，請確認服務已啟動。"
      : isHistorical && status === "success"
        ? "最近一次資料更新已完成。"
        : isHistorical && status === "partial"
          ? "最近一次資料部分更新完成；部分詳細統計尚未提供，或仍在等待核對。"
          : isHistorical && status === "failed"
            ? "最近一次資料更新失敗；如要再試一次，請按下按鈕。"
            : statusMessage(status, phase, failureMessage, summary);
  const dataAsOfLabel = dataAsOf ? formatDateTimeForZone(dataAsOf, timeZone) : "尚無紀錄";
  return (
    <div className="manual-update-layout" aria-busy={isActive}>
      <section className="manual-update-panel" aria-label="手動更新資料">
        <p className="data-update-message" data-state={status} role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
        <p className="manual-update-time">資料時間：{dataAsOfLabel}</p>
        <div className="manual-update-summary-slot">
          {(status === "success" || status === "partial") && summary && summary.scheduleTotal > 0 ? (
            <div className="data-update-summary" role="note" aria-label={isHistorical ? "最近一次更新摘要" : "更新摘要"}>
              <strong>已同步賽事：{summary.scheduleSynced} 場</strong>
              <span>已有詳細統計：{summary.statsAvailable} 場</span>
              <span>詳細統計尚未提供：{summary.statsUnavailable} 場</span>
              <details className="data-update-summary-details">
                <summary>查看更新摘要</summary>
                <dl>
                  <div><dt>新增賽事</dt><dd>{summary.scheduleCreated}</dd></div>
                  <div><dt>更新賽事</dt><dd>{summary.scheduleUpdated}</dd></div>
                  <div><dt>賽程無需更新</dt><dd>{summary.scheduleUnchanged}</dd></div>
                  <div><dt>新增統計</dt><dd>{summary.statsCreated}</dd></div>
                  <div><dt>更新統計</dt><dd>{summary.statsUpdated}</dd></div>
                  <div><dt>統計無需更新</dt><dd>{summary.statsUnchanged}</dd></div>
                  <div><dt>未套用的統計</dt><dd>{summary.statsSkipped}</dd></div>
                  {summary.statsSnapshotStatus ? (
                    <div>
                      <dt>統計資料來源</dt>
                      <dd>{summary.statsSnapshotStatus === "updated" ? "已更新" : summary.statsSnapshotStatus === "unchanged" ? "無需更新" : "更新失敗，已保留舊資料"}</dd>
                    </div>
                  ) : null}
                  <div><dt>來源差異</dt><dd>{summary.conflicts}</dd></div>
                  <div><dt>結果等待來源確認</dt><dd>{summary.ambiguous}</dd></div>
                  <div><dt>資料尚未完整</dt><dd>{summary.incomplete}</dd></div>
                  <div><dt>無法配對的資料</dt><dd>{summary.unmatched}</dd></div>
                  <div><dt>參賽隊伍尚未確認</dt><dd>{summary.participantsUnresolved}</dd></div>
                </dl>
              </details>
            </div>
          ) : (
            <p className="data-update-summary-placeholder">更新完成後會顯示摘要。</p>
          )}
        </div>
        <button
          className="data-update-button"
          type="button"
          onClick={onStart}
          disabled={isActive || apiState !== "ready"}
          aria-busy={isActive}
        >
          {isActive ? <span className="data-update-spinner" aria-hidden="true" /> : null}
          {buttonLabel}
        </button>
      </section>
    </div>
  );
};

export { ManualUpdatePanel };