import { useEffect, useState } from "react";
import { ApiError, getServiceErrorMessage } from "../../api/client";
import { getSystemSettings, patchSystemSettings } from "../../api/system";
import type { ApiResponse, SystemSettingItem, SystemSettingsData, SystemSettingsPatch } from "../../api/types";
import { useApiResource } from "../../hooks/useApiResource";


const PATCH_KEY_BY_ENV_KEY: Record<SystemSettingItem["key"], keyof SystemSettingsPatch> = {
  LIQUIPEDIA_REQUEST_INTERVAL_SECONDS: "liquipediaRequestIntervalSeconds",
  LIQUIPEDIA_PARSE_INTERVAL_SECONDS: "liquipediaParseIntervalSeconds",
  LIQUIPEDIA_CACHE_TTL_SECONDS: "liquipediaCacheTtlSeconds",
  MATCH_TIME_TOLERANCE_MINUTES: "matchTimeToleranceMinutes"
};

const ERROR_MESSAGES: Record<string, string> = {
  SETTING_OVERRIDDEN_BY_PROCESS: "此設定由 API 服務的啟動環境管理，請在該環境調整。",
  SETTINGS_WRITE_UNAVAILABLE: "無法安全儲存設定，原設定未變更。",
  INVALID_SETTING: "設定未通過檢查，請確認數值範圍。",
  INVALID_PARAMETER: "設定內容不符合欄位規則，請確認後再儲存。"
};

const toDrafts = (settings: SystemSettingItem[]): Record<string, string> => Object.fromEntries(
  settings.map((setting) => [setting.key, String(setting.value)])
);

const isValidDraft = (setting: SystemSettingItem, rawValue: string): boolean => {
  if (rawValue.trim() === "") {
    return false;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < setting.minimum || value > setting.maximum) {
    return false;
  }

  return Math.abs((value - setting.minimum) / setting.step - Math.round((value - setting.minimum) / setting.step)) < 0.000001;
};

const getSaveError = (error: unknown): string => {
  return getServiceErrorMessage(error)
    ?? (error instanceof ApiError ? ERROR_MESSAGES[error.code] : null)
    ?? "目前無法儲存設定，請稍後再試。";
};

const SystemSettingsPanel = () => {
  const resource = useApiResource<ApiResponse<SystemSettingsData>>(
    "system-settings",
    getSystemSettings,
    { keepPreviousData: true }
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<"success" | "error">("success");
  const [patchResult, setPatchResult] = useState<SystemSettingsData | null>(null);
  const loadedSettings = resource.state.status === "success" ? resource.state.data.data : null;
  const settingsData = patchResult ?? loadedSettings;

  useEffect(() => {
    if (loadedSettings) {
      setDrafts(toDrafts(loadedSettings.settings));
      setPatchResult(null);
    }
  }, [loadedSettings]);

  const settings = settingsData?.settings ?? [];
  const hasInvalidValue = settings.some((setting) => !isValidDraft(setting, drafts[setting.key] ?? String(setting.value)));
  const changedSettings = settings.filter((setting) => Number(drafts[setting.key] ?? setting.value) !== setting.value);

  const saveSettings = async () => {
    if (isSaving || changedSettings.length === 0 || hasInvalidValue) {
      return;
    }

    const patch: SystemSettingsPatch = {};

    changedSettings.forEach((setting) => {
      const key = PATCH_KEY_BY_ENV_KEY[setting.key];
      patch[key] = Number(drafts[setting.key]);
    });

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await patchSystemSettings(patch);
      setPatchResult(response.data);
      setMessageState("success");
      setMessage("設定已儲存。請手動重新啟動 API 服務，讓變更生效。");

      resource.retry();
    } catch (error) {
      setMessageState("error");
      setMessage(getSaveError(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (resource.state.status === "error" && !settingsData) {
    return (
      <section className="settings-section" aria-labelledby="settings-env-title">
        <div className="settings-section-heading">
          <div>
            <h2 id="settings-env-title">系統設定</h2>
            <p>僅提供固定項目，不開放編輯其他環境變數。</p>
          </div>
        </div>
        <p className="settings-inline-message" role="status">{getServiceErrorMessage(resource.state.error) ?? "目前無法取得設定，請稍後再試。"}</p>
      </section>
    );
  }

  return (
    <section className="settings-section" aria-labelledby="settings-env-title">
      <div className="settings-section-heading">
        <div>
          <h2 id="settings-env-title">系統設定</h2>
          <p>可調整 Liquipedia 讀取與賽程核對設定；儲存後需重新啟動 API 服務才會生效。</p>
        </div>
      </div>

      {settingsData ? (
        <>
          {!settingsData.configurationValid ? (
            <p className="settings-inline-message is-error" role="status">部分設定未通過檢查，請修正後再儲存。</p>
          ) : null}
          <div className="settings-env-grid">
            {settings.map((setting) => {
              const rawValue = drafts[setting.key] ?? String(setting.value);
              const valid = isValidDraft(setting, rawValue);
              const changed = Number(rawValue) !== setting.value;

              return (
                <label className="settings-env-control" key={setting.key}>
                  <span className="settings-env-label">{setting.name}</span>
                  <span className="settings-env-description">{setting.description}</span>
                  <span className="settings-number-input-wrap">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={setting.minimum}
                      max={setting.maximum}
                      step={setting.step}
                      value={rawValue}
                      aria-invalid={!valid}
                      onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
                    />
                    <span>{setting.unit}</span>
                  </span>
                  <small className="settings-env-range">允許範圍：{setting.minimum}–{setting.maximum} {setting.unit}</small>
                  {changed ? <small className="settings-pending-label">尚未套用，需重新啟動 API 服務</small> : null}
                </label>
              );
            })}
          </div>

          <div className="settings-system-readonly">
            <h3>唯讀設定與敏感值狀態</h3>
            <dl className="settings-readonly-grid">
              <div><dt>網頁服務連接埠</dt><dd>5577</dd></div>
              <div><dt>API 服務連接埠</dt><dd>8591</dd></div>
              <div><dt>排程</dt><dd>{settingsData.schedulerEnabled ? "啟用中" : "停用"}（本頁不提供啟用設定）</dd></div>
              <div><dt>MongoDB 連線設定</dt><dd>{settingsData.secrets.MONGODB_URI.configured ? "已設定" : "尚未設定"}</dd></div>
              <div><dt>Liquipedia User-Agent</dt><dd>{settingsData.secrets.LIQUIPEDIA_USER_AGENT.configured ? "已設定" : "尚未設定"}</dd></div>
            </dl>
          </div>

          {settingsData.pendingBackendRestart ? (
            <p className="settings-inline-message" role="status">部分設定尚未套用；請手動重新啟動 API 服務。</p>
          ) : null}
        </>
      ) : (
        <p className="settings-inline-message" role="status">正在載入系統設定…</p>
      )}

      <div className="settings-save-row">
        <p className={`settings-inline-message${messageState === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
          {message ?? "僅更新固定設定；留白或未修改的欄位會保留原值。"}
        </p>
        <button
          className="settings-save-button"
          type="button"
          onClick={() => void saveSettings()}
          disabled={!settingsData || isSaving || changedSettings.length === 0 || hasInvalidValue || !settingsData.configurationValid}
        >
          {isSaving ? "正在儲存" : "儲存系統設定"}
        </button>
      </div>
    </section>
  );
};

export { SystemSettingsPanel };
