import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getFilters } from "../api/filters";
import { getSchedule, type ScheduleFilters } from "../api/schedule";
import type { ApiResponse, FiltersData, ScheduleMatch } from "../api/types";
import { EmptyState, ErrorState, LoadingState, RefreshState } from "../components/ui/DataState";
import { MatchCard } from "../components/ui/MatchCard";
import { Select, type SelectOption } from "../components/ui/Select";
import { useApiResource } from "../hooks/useApiResource";
import { formatStageLabel } from "../utils/formatters";


const SCHEDULE_STATUSES = ["all", "upcoming", "live", "completed"] as const;
type ScheduleStatus = typeof SCHEDULE_STATUSES[number];

const STATUS_LABELS: Record<ScheduleStatus, string> = {
  all: "全部",
  upcoming: "即將開始",
  live: "進行中",
  completed: "已完成"
};

const isScheduleStatus = (value: string | null): value is ScheduleStatus => (
  value !== null && SCHEDULE_STATUSES.some((status) => status === value)
);

const SchedulePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersResource = useApiResource<ApiResponse<FiltersData>>("schedule-filters", getFilters);
  const rawStatus = searchParams.get("status");
  const status: ScheduleStatus = isScheduleStatus(rawStatus) ? rawStatus : "all";
  const stage = searchParams.get("stage")?.trim() || null;
  const team = searchParams.get("team")?.trim() || null;
  const scheduleFilters: ScheduleFilters = { status, stage, team };
  const scheduleKey = JSON.stringify([status, stage, team]);
  const scheduleResource = useApiResource<ApiResponse<ScheduleMatch[]>>(
    scheduleKey,
    (signal) => getSchedule(scheduleFilters, signal),
    { keepPreviousData: true }
  );
  const availableFilters = filtersResource.state.status === "success"
    ? filtersResource.state.data.data
    : null;

  useEffect(() => {
    if (!rawStatus || (isScheduleStatus(rawStatus) && rawStatus !== "all")) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("status");
    setSearchParams(nextParams, { replace: true });
  }, [rawStatus, searchParams, setSearchParams]);

  const updateFilter = (key: "status" | "stage" | "team", value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!value || (key === "status" && value === "all")) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("status");
    nextParams.delete("stage");
    nextParams.delete("team");
    setSearchParams(nextParams);
  };

  const hasActiveFilters = status !== "all" || stage !== null || team !== null;
  const stageOptions: SelectOption[] = [
    { value: "", label: "所有階段" },
    ...(stage && availableFilters && !availableFilters.stages.includes(stage)
      ? [{ value: stage, label: `目前條件：${formatStageLabel(stage)}`, disabled: true }]
      : []),
    ...(availableFilters?.stages ?? []).map((value) => ({ value, label: formatStageLabel(value) }))
  ];
  const teamOptions: SelectOption[] = [
    { value: "", label: "所有隊伍" },
    ...(team && availableFilters && !availableFilters.teams.some((item) => item.slug === team)
      ? [{ value: team, label: `目前條件：${team}`, disabled: true }]
      : []),
    ...(availableFilters?.teams ?? []).flatMap((item) => (
      item.slug === null
        ? []
        : [{
          value: item.slug,
          label: `${item.name ?? item.slug}${item.shortName ? ` | ${item.shortName}` : ""}`
        }]
    ))
  ];

  return (
    <div className="page-container schedule-page">
      <div className="schedule-page-heading">
        <div>
          <span className="section-kicker">CHAMPIONS 2026</span>
          <h1 tabIndex={-1}>賽程</h1>
          <p>依狀態、階段與隊伍查看比賽時程。</p>
        </div>
        <Link className="quiet-link" to="/">返回總覽 <span aria-hidden="true">↗</span></Link>
      </div>

      <section className="schedule-filters" aria-label="賽程篩選">
        <label className="schedule-filter-field">
          <span>狀態</span>
          <Select
            label="賽程狀態"
            value={status}
            options={SCHEDULE_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
            onChange={(value) => updateFilter("status", value)}
          />
        </label>
        <label className="schedule-filter-field">
          <span>階段</span>
          <Select
            label="賽程階段"
            value={stage ?? ""}
            disabled={availableFilters === null}
            options={stageOptions}
            onChange={(value) => updateFilter("stage", value)}
          />
        </label>
        <label className="schedule-filter-field">
          <span>隊伍</span>
          <Select
            label="賽程隊伍"
            value={team ?? ""}
            disabled={availableFilters === null}
            options={teamOptions}
            onChange={(value) => updateFilter("team", value)}
          />
        </label>
      </section>

      {filtersResource.state.status === "loading" || filtersResource.state.status === "idle" ? (
        <p className="schedule-filter-message" role="status">正在載入可用篩選條件</p>
      ) : null}
      {filtersResource.state.status === "error" ? (
        <div className="schedule-filter-error">
          <ErrorState
            title="篩選資料暫時無法載入"
            message={filtersResource.state.error.userMessage}
            onRetry={filtersResource.retry}
          />
        </div>
      ) : null}

      <section className="schedule-results" aria-labelledby="schedule-results-title" aria-live="polite" aria-busy={scheduleResource.isRefreshing}>
        <div className="schedule-results-heading">
          <h2 id="schedule-results-title">比賽列表</h2>
          {scheduleResource.isRefreshing || scheduleResource.refreshError ? (
            <RefreshState
              isRefreshing={scheduleResource.isRefreshing}
              error={scheduleResource.refreshError}
              onRetry={scheduleResource.retry}
            />
          ) : scheduleResource.state.status === "success" ? (
            <span>{scheduleResource.state.data.data.length} 場賽事</span>
          ) : null}
        </div>
        {scheduleResource.state.status === "idle" || scheduleResource.state.status === "loading" ? (
          <div className="schedule-results-state">
            <LoadingState title="賽程載入中" message="正在載入賽事資料" variant="matches" />
          </div>
        ) : null}
        {scheduleResource.state.status === "error" ? (
          <div className="schedule-results-state">
            <ErrorState
              title="目前無法載入賽程"
              message={scheduleResource.state.error.userMessage}
              onRetry={scheduleResource.retry}
            />
          </div>
        ) : null}
        {scheduleResource.state.status === "success" && scheduleResource.state.data.data.length === 0 ? (
          <EmptyState
            title="沒有符合條件的賽事"
            message="請調整篩選條件後再查看。"
            actionLabel={hasActiveFilters ? "清除篩選" : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : null}
        {scheduleResource.state.status === "success" && scheduleResource.state.data.data.length > 0 ? (
          <div className="match-list schedule-match-list">
            {scheduleResource.state.data.data.map((match, index) => (
              <MatchCard
                key={match.id ?? `${match.scheduledAt ?? "schedule"}-${index}`}
                match={match}
                variant={match.status === "completed" ? "result" : "upcoming"}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export { SchedulePage };