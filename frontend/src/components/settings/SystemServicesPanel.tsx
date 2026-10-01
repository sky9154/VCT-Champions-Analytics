import { getSystemServices } from "../../api/system";
import type { ApiResponse, SystemServicesData } from "../../api/types";
import { useApiResource } from "../../hooks/useApiResource";


const SERVICE_STATUS_LABELS = {
  running: "執行中",
  unavailable: "無法連線",
  "not-managed": "由使用者自行管理"
} as const;

const SystemServicesPanel = () => {
  const resource = useApiResource<ApiResponse<SystemServicesData>>(
    "system-services",
    getSystemServices,
    { keepPreviousData: true }
  );
  const data = resource.state.status === "success" ? resource.state.data.data : null;

  return (
    <section className="settings-section" aria-labelledby="settings-services-title">
      <div className="settings-section-heading">
        <div>
          <h2 id="settings-services-title">服務狀態</h2>
          <p>網頁服務與 API 服務由不同程式執行。</p>
        </div>
      </div>
      {data ? (
        <>
          <dl className="settings-service-grid">
            <div>
              <dt>網頁服務</dt>
              <dd><span className={`service-status-dot is-${data.frontend.status}`} />{SERVICE_STATUS_LABELS[data.frontend.status]}</dd>
              <small>連接埠：{data.frontend.port}</small>
            </div>
            <div>
              <dt>API 服務</dt>
              <dd><span className={`service-status-dot is-${data.backend.status}`} />{SERVICE_STATUS_LABELS[data.backend.status]}</dd>
              <small>連接埠：{data.backend.port}</small>
              {data.backend.healthIdentity ? <small>服務識別：{data.backend.healthIdentity}</small> : null}
            </div>
          </dl>
          <p className="settings-inline-message">需要套用新設定時，請手動重新啟動對應服務。</p>
        </>
      ) : (
        <p className="settings-inline-message" role="status">
          {resource.state.status === "error" ? "目前無法連線至 API 服務，請確認服務已啟動。" : "正在確認服務狀態…"}
        </p>
      )}
    </section>
  );
};

export { SystemServicesPanel };