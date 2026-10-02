import type { ApiError } from "../../api/client";


interface StateContentProps {
  title: string;
  message: string;
}

interface EmptyStateProps extends StateContentProps {
  actionLabel?: string;
  onAction?: () => void;
}

interface ErrorStateProps extends StateContentProps {
  onRetry: () => void;
}

interface RefreshStateProps {
  isRefreshing: boolean;
  error: ApiError | null;
  onRetry: () => void;
}

type LoadingVariant = "compact" | "overview" | "matches" | "teams" | "players" | "detail" | "player-detail" | "trend";

interface LoadingStateProps extends StateContentProps {
  variant?: LoadingVariant;
}

const SkeletonLine = ({ className = "", width }: { className?: string; width?: string }) => (
  <span className={`skeleton-line ${className}`.trim()} style={width ? { width } : undefined} />
);

const SkeletonTable = ({ columns, rows = 5, className = "", columnTemplate }: {
  columns: number;
  rows?: number;
  className?: string;
  columnTemplate?: string;
}) => (
  <div className={`skeleton-table ${className}`.trim()} aria-hidden="true">
    <div className="skeleton-table-row is-heading" style={{ gridTemplateColumns: columnTemplate ?? `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }, (_, index) => <SkeletonLine key={`heading-${index}`} />)}
    </div>
    {Array.from({ length: rows }, (_, row) => (
      <div className="skeleton-table-row" key={`row-${row}`} style={{ gridTemplateColumns: columnTemplate ?? `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, column) => <SkeletonLine key={`cell-${row}-${column}`} />)}
      </div>
    ))}
  </div>
);

const SkeletonMatchCards = () => (
  <div className="skeleton-match-list" aria-hidden="true">
    {Array.from({ length: 3 }, (_, index) => (
      <div className="skeleton-match-card" key={index}>
        <SkeletonLine width="32%" />
        <div className="skeleton-match-teams"><SkeletonLine width="38%" /><SkeletonLine width="38%" /></div>
        <SkeletonLine width="44%" />
      </div>
    ))}
  </div>
);

const OverviewSkeleton = () => (
  <div className="skeleton-overview" aria-hidden="true">
    <div className="skeleton-overview-hero">
      <div className="skeleton-overview-copy">
        <SkeletonLine width="34%" />
        <SkeletonLine className="is-title" width="76%" />
        <SkeletonLine width="54%" />
        <div className="skeleton-overview-facts"><SkeletonLine width="34%" /><SkeletonLine width="30%" /></div>
      </div>
      <span className="skeleton-progress-ring" />
    </div>
    <div className="skeleton-overview-sections">
      <section className="skeleton-overview-panel"><SkeletonLine width="40%" /><SkeletonMatchCards /></section>
      <section className="skeleton-overview-panel"><SkeletonLine width="40%" /><SkeletonMatchCards /></section>
    </div>
    <div className="skeleton-overview-sections">
      <section className="skeleton-overview-panel">
        <SkeletonLine width="40%" />
        <div className="table-scroll analytics-table-scroll">
          <SkeletonTable columns={5} rows={3} className="skeleton-table--ranking" columnTemplate="64px 176px 136px 96px 96px" />
        </div>
      </section>
      <section className="skeleton-overview-panel">
        <SkeletonLine width="40%" />
        <div className="table-scroll analytics-table-scroll">
          <SkeletonTable columns={4} rows={3} className="skeleton-table--ranking" columnTemplate="64px 220px 104px 112px" />
        </div>
      </section>
    </div>
  </div>
);

const DetailSkeleton = ({ showTeamMark }: { showTeamMark: boolean }) => (
  <div className={`skeleton-detail${showTeamMark ? "" : " skeleton-detail--player"}`} aria-hidden="true">
    <div className="skeleton-detail-identity">
      {showTeamMark ? <span className="skeleton-avatar" /> : null}
      <div><SkeletonLine width="96px" /><SkeletonLine className="is-title" width="220px" /><SkeletonLine width="160px" /></div>
    </div>
    <div className="skeleton-detail-summary">
      <SkeletonLine width="140px" />
      <div className="skeleton-summary-grid">
        {Array.from({ length: 4 }, (_, index) => <SkeletonLine key={index} width="100%" />)}
      </div>
    </div>
    <div className="skeleton-detail-sections">
      {showTeamMark ? (
        <>
          <section><SkeletonLine width="45%" /><div className="skeleton-roster-list">{Array.from({ length: 5 }, (_, index) => <SkeletonLine key={index} width={index % 2 === 0 ? "64%" : "48%"} />)}</div></section>
          <section><SkeletonLine width="45%" /><SkeletonMatchCards /></section>
          <section className="is-wide">
            <SkeletonLine width="45%" />
            <div className="table-scroll analytics-table-scroll">
              <SkeletonTable columns={10} rows={4} className="skeleton-table--team-map" columnTemplate="160px 104px 112px 104px 112px 128px 128px 104px 96px 112px" />
            </div>
          </section>
        </>
      ) : (
        <>
          <section>
            <SkeletonLine width="45%" />
            <div className="table-scroll analytics-table-scroll">
              <SkeletonTable columns={7} rows={4} className="skeleton-table--detail-map" columnTemplate="140px 120px 96px 96px 96px 96px 96px" />
            </div>
          </section>
          <section>
            <SkeletonLine width="45%" />
            <div className="table-scroll analytics-table-scroll">
              <SkeletonTable columns={7} rows={4} className="skeleton-table--detail-agent" columnTemplate="160px 120px 96px 96px 96px 96px 96px" />
            </div>
          </section>
          <section className="is-wide"><SkeletonLine width="45%" /><SkeletonMatchCards /></section>
        </>
      )}
      <section className="is-wide"><SkeletonLine width="140px" /><div className="skeleton-chart" /></section>
    </div>
  </div>
);

const TrendSkeleton = () => (
  <div className="skeleton-trend" aria-hidden="true">
    <div className="skeleton-chart" />
    <div className="table-scroll trend-point-scroll">
      <SkeletonTable columns={5} rows={3} className="skeleton-table--trend" columnTemplate="184px 136px 184px 112px 112px" />
    </div>
  </div>
);

const LoadingState = ({ title, message, variant = "compact" }: LoadingStateProps) => (
  <div
    className={`loading-state loading-state--${variant}${variant === "compact" ? " data-state data-state--loading" : ""}`}
    role="status"
    aria-busy="true"
  >
    <span className="visually-hidden">{title}。{message}</span>
    {variant === "overview" ? <OverviewSkeleton /> : null}
    {variant === "matches" ? <SkeletonMatchCards /> : null}
    {variant === "teams" ? (
      <div className="table-scroll analytics-table-scroll" aria-hidden="true">
        <SkeletonTable
          columns={10}
          className="skeleton-table--teams"
          columnTemplate="64px 220px 104px 112px 112px 120px 120px 112px 96px 112px"
        />
      </div>
    ) : null}
    {variant === "players" ? (
      <div className="table-scroll analytics-table-scroll">
        <SkeletonTable
          columns={13}
          className="skeleton-table--players"
          columnTemplate="64px 176px 136px 120px repeat(9, 96px)"
        />
      </div>
    ) : null}
    {variant === "detail" || variant === "player-detail" ? <DetailSkeleton showTeamMark={variant === "detail"} /> : null}
    {variant === "trend" ? <TrendSkeleton /> : null}
    {variant === "compact" ? <><span className="state-marker" aria-hidden="true" /><div><strong>{title}</strong><p>{message}</p></div></> : null}
  </div>
);

const EmptyState = ({ title, message, actionLabel, onAction }: EmptyStateProps) => (
  <div className="data-state data-state--empty" role="status">
    <span className="state-marker" aria-hidden="true">∅</span>
    <div>
      <strong>{title}</strong>
      <p>{message}</p>
      {actionLabel && onAction ? <button type="button" className="text-button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  </div>
);

const PartialState = ({ title, message }: StateContentProps) => (
  <aside className="partial-state" role="note">
    <span className="partial-state-mark" aria-hidden="true">i</span>
    <div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  </aside>
);

const ErrorState = ({ title, message, onRetry }: ErrorStateProps) => (
  <div className="data-state data-state--error" role="alert">
    <span className="state-marker" aria-hidden="true">!</span>
    <div>
      <strong>{title}</strong>
      <p>{message}</p>
      <button type="button" className="text-button" onClick={onRetry}>重試</button>
    </div>
  </div>
);

const RefreshState = ({ isRefreshing, error, onRetry }: RefreshStateProps) => (
  isRefreshing || error ? (
    <div className={`resource-refresh-status${error ? " is-error" : ""}`} role="status" aria-live="polite">
      <span>{error ? "重新載入失敗，已保留目前資料" : "正在更新"}</span>
      {error ? <button type="button" className="text-button" onClick={onRetry}>重試</button> : null}
    </div>
  ) : null
);

export { EmptyState, ErrorState, LoadingState, PartialState, RefreshState };