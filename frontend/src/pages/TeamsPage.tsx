import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getFilters } from "../api/filters";
import { getTeams, type TeamListQuery } from "../api/teams";
import type { ApiResponse, FiltersData, TeamRankingRow, TeamSortField } from "../api/types";
import { EmptyState, ErrorState, LoadingState, RefreshState } from "../components/ui/DataState";
import { MetricLabel } from "../components/ui/MetricLabel";
import { Select, type SelectOption } from "../components/ui/Select";
import { TeamMark } from "../components/ui/TeamMark";
import { useApiResource } from "../hooks/useApiResource";
import { formatNumber, formatPercent, formatStageLabel } from "../utils/formatters";
import { formatRegionName } from "../utils/valorantNames";
import { getSingleSearchValue, getUnknownSearchKeys, omitDefaultSearchValues, setSearchValue } from "../utils/searchParams";


const DEFAULT_TEAM_SORT: TeamSortField = "mapWinPercentage";
const TEAM_SORT_OPTIONS: Array<{ value: TeamSortField; label: string }> = [
  { value: "matchesPlayed", label: "系列賽場數" },
  { value: "mapsPlayed", label: "地圖場數" },
  { value: "mapWinPercentage", label: "地圖勝率" },
  { value: "roundWinPercentage", label: "回合勝率" },
  { value: "attackRoundWinPercentage", label: "攻方回合勝率" },
  { value: "defenseRoundWinPercentage", label: "守方回合勝率" },
  { value: "roundDifferential", label: "回合差" },
  { value: "matchWinPercentage", label: "系列賽勝率" },
  { value: "matchesWon", label: "系列賽勝場" },
  { value: "mapsWon", label: "地圖勝場" },
  { value: "kd", label: "K/D" },
  { value: "firstKillPercentage", label: "首殺率" }
];

const TEAM_SORT_FIELDS: TeamSortField[] = [
  "matchesPlayed",
  "matchesWon",
  "matchWinPercentage",
  "mapsPlayed",
  "mapsWon",
  "mapWinPercentage",
  "roundWinPercentage",
  "attackRoundWinPercentage",
  "defenseRoundWinPercentage",
  "roundDifferential",
  "kd",
  "firstKillPercentage"
];

const isTeamSortField = (value: string | null): value is TeamSortField => (
  value !== null && TEAM_SORT_FIELDS.some((field) => field === value)
);

const TeamsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersResource = useApiResource<ApiResponse<FiltersData>>("directory-filters", getFilters);
  const stageParam = getSingleSearchValue(searchParams, "stage");
  const sortParam = getSingleSearchValue(searchParams, "sort");
  const orderParam = getSingleSearchValue(searchParams, "order");
  const stage = stageParam.value;
  const sort = isTeamSortField(sortParam.value) ? sortParam.value : DEFAULT_TEAM_SORT;
  const order = orderParam.value === "asc" || orderParam.value === "desc" ? orderParam.value : "desc";
  const filters = filtersResource.state.status === "success" ? filtersResource.state.data.data : null;
  const stageIsUnknown = stage !== null && filters !== null && !filters.stages.includes(stage);
  const unknownKeys = getUnknownSearchKeys(searchParams, ["stage", "sort", "order"]);
  const hasInvalidQuery = unknownKeys.length > 0
    || stageParam.duplicated
    || sortParam.duplicated
    || orderParam.duplicated
    || stage === ""
    || stageIsUnknown
    || (sortParam.value !== null && !isTeamSortField(sortParam.value))
    || (orderParam.value !== null && orderParam.value !== "asc" && orderParam.value !== "desc");
  const canValidateStage = stage === null || filters !== null;
  const canLoadTeams = !hasInvalidQuery && canValidateStage;
  const teamQuery: TeamListQuery = { stage, sort, order };
  const teamQueryKey = canLoadTeams ? JSON.stringify([stage, sort, order]) : null;
  const teamsResource = useApiResource<ApiResponse<TeamRankingRow[]>>(
    teamQueryKey,
    (signal) => getTeams(teamQuery, signal),
    { keepPreviousData: true }
  );

  useEffect(() => {
    const nextParams = omitDefaultSearchValues(searchParams, {
      sort: DEFAULT_TEAM_SORT,
      order: "desc"
    });
    if (nextParams) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleStageChange = (value: string) => {
    setSearchParams(setSearchValue(searchParams, "stage", value));
  };

  const handleSortChange = (value: string) => {
    setSearchParams(setSearchValue(searchParams, "sort", value, DEFAULT_TEAM_SORT));
  };

  const handleOrderChange = (value: string) => {
    setSearchParams(setSearchValue(searchParams, "order", value, "desc"));
  };

  const handleResetQuery = () => setSearchParams(new URLSearchParams());
  const teamRows = teamsResource.state.status === "success" ? teamsResource.state.data.data : [];
  const total = teamsResource.state.status === "success"
    && typeof teamsResource.state.data.meta.total === "number"
    ? teamsResource.state.data.meta.total
    : teamRows.length;
  const stageSelectValue = stageParam.duplicated ? "__multiple__" : stage ?? "";
  const sortSelectValue = sortParam.duplicated ? "__multiple__" : sortParam.value ?? DEFAULT_TEAM_SORT;
  const orderSelectValue = orderParam.duplicated ? "__multiple__" : orderParam.value ?? "desc";

  return (
    <div className="page-container analytics-page teams-page">
      <header className="analytics-page-heading">
        <div>
          <h1 tabIndex={-1}>隊伍</h1>
          <p>依階段檢視系列賽、地圖與回合表現。</p>
        </div>
        <span className="analytics-count">{teamsResource.state.status === "success" ? `${formatNumber(total)} 支隊伍` : "Champions 2026"}</span>
      </header>

      <section className="directory-filter-panel" aria-label="隊伍篩選與排序">
        <label className="analytics-filter-field">
          <span>階段</span>
          <Select
            label="階段"
            value={stageSelectValue}
            options={[
              { value: "", label: "所有階段" },
              ...(stageParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(stage !== null && filters && !filters.stages.includes(stage)
                ? [{ value: stage, label: "網址中的階段無法使用", disabled: true }]
                : []),
              ...(filters?.stages ?? []).map((value) => ({ value, label: formatStageLabel(value) }))
            ] satisfies SelectOption[]}
            onChange={handleStageChange}
          />
        </label>
        <label className="analytics-filter-field">
          <span>排序指標</span>
          <Select
            label="排序指標"
            value={sortSelectValue}
            options={[
              ...(sortParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(sortParam.value !== null && !isTeamSortField(sortParam.value)
                ? [{ value: sortParam.value, label: "網址中的排序無法使用", disabled: true }]
                : []),
              ...TEAM_SORT_OPTIONS
            ] satisfies SelectOption[]}
            onChange={handleSortChange}
          />
        </label>
        <label className="analytics-filter-field">
          <span>排序方向</span>
          <Select
            label="排序方向"
            value={orderSelectValue}
            options={[
              ...(orderParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(orderParam.value !== null && orderParam.value !== "asc" && orderParam.value !== "desc"
                ? [{ value: orderParam.value, label: "網址中的方向無法使用", disabled: true }]
                : []),
              { value: "desc", label: "由高至低" },
              { value: "asc", label: "由低至高" }
            ] satisfies SelectOption[]}
            onChange={handleOrderChange}
          />
        </label>
      </section>

      {filtersResource.state.status === "loading" || filtersResource.state.status === "idle" ? (
        <p className="directory-filter-status" role="status">正在載入可用階段</p>
      ) : null}
      {filtersResource.state.status === "error" ? (
        <div className="directory-filter-error">
          <ErrorState title="篩選資料暫時無法載入" message={filtersResource.state.error.userMessage} onRetry={filtersResource.retry} />
        </div>
      ) : null}

      <section className="directory-results" aria-labelledby="teams-results-title" aria-live="polite" aria-busy={teamsResource.isRefreshing}>
        <div className="directory-results-heading">
          <h2 id="teams-results-title">隊伍排名</h2>
          {teamsResource.isRefreshing || teamsResource.refreshError ? (
            <RefreshState
              isRefreshing={teamsResource.isRefreshing}
              error={teamsResource.refreshError}
              onRetry={teamsResource.retry}
            />
          ) : teamsResource.state.status === "success" ? <span>{formatNumber(total)} 支隊伍</span> : null}
        </div>
        {hasInvalidQuery ? (
          <EmptyState
            title="網址條件無法使用"
            message="部分篩選或排序條件不受支援；條件仍保留在網址中，請調整選項或重設條件。"
            actionLabel="重設條件"
            onAction={handleResetQuery}
          />
        ) : null}
        {!hasInvalidQuery && !canValidateStage && filtersResource.state.status === "error" ? (
          <EmptyState title="目前無法驗證階段條件" message="請先重新載入可用階段，再查看這個網址條件的結果。" />
        ) : null}
        {!hasInvalidQuery && !canValidateStage && (filtersResource.state.status === "idle" || filtersResource.state.status === "loading") ? (
          <LoadingState title="隊伍資料載入中" message="正在確認網址中的階段是否可用" />
        ) : null}
        {!hasInvalidQuery && canLoadTeams && (teamsResource.state.status === "idle" || teamsResource.state.status === "loading") ? (
          <LoadingState title="隊伍資料載入中" message="正在載入排名與統計" variant="teams" />
        ) : null}
        {!hasInvalidQuery && teamsResource.state.status === "error" ? (
          <ErrorState title="目前無法載入隊伍" message={teamsResource.state.error.userMessage} onRetry={teamsResource.retry} />
        ) : null}
        {!hasInvalidQuery && teamsResource.state.status === "success" && teamRows.length === 0 ? (
          <EmptyState title="沒有符合條件的隊伍" message="目前沒有可顯示的隊伍資料，請調整階段或排序條件。" />
        ) : null}
        {!hasInvalidQuery && teamsResource.state.status === "success" && teamRows.length > 0 ? (
          <div className="table-scroll analytics-table-scroll" tabIndex={0} aria-label="隊伍排名表，可水平捲動">
            <table className="data-table team-list-table">
              <caption className="visually-hidden">Champions 2026 隊伍排名</caption>
              <colgroup>
                {[64, 220, 104, 112, 112, 120, 120, 112, 96, 112].map((width, index) => (
                  <col key={index} style={{ width: `${width}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">排名</th>
                  <th scope="col">隊伍</th>
                  <th scope="col">賽區</th>
                  <th scope="col" className="numeric-cell">系列賽</th>
                  <th scope="col" className="numeric-cell">地圖</th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="地圖勝率" metric="mapWinPercentage" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="回合勝率" metric="roundWinPercentage" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="回合差" metric="roundDifferential" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="K/D" metric="kd" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="首殺率" metric="firstKillPercentage" /></th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row) => (
                  <tr key={row.team.slug ?? `${row.team.name ?? "team"}-${row.rank}`}>
                    <td className="rank-number">{String(row.rank).padStart(2, "0")}</td>
                    <td>
                      <div className="analytics-entity-cell">
                        <TeamMark name={row.team.name} shortName={row.team.shortName} logoUrl={row.team.logoUrl} size="small" />
                        {row.team.slug ? (
                          <Link to={`/teams/${row.team.slug}`} className="analytics-entity-link">
                            <strong title={row.team.name ?? undefined}>{row.team.name ?? "隊伍名稱尚未提供"}</strong>
                            {row.team.shortName ? <span>{row.team.shortName}</span> : null}
                          </Link>
                        ) : (
                          <span className="analytics-entity-link">
                            <strong title={row.team.name ?? undefined}>{row.team.name ?? "隊伍名稱尚未提供"}</strong>
                            {row.team.shortName ? <span>{row.team.shortName}</span> : null}
                          </span>
                        )}
                      </div>
                    </td>
                    <td><span className="table-cell-truncate" title={formatRegionName(row.team.region)}>{formatRegionName(row.team.region)}</span></td>
                    <td className="numeric-cell metric-value">{formatNumber(row.stats.matchesWon)}–{formatNumber(row.stats.matchesLost)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.mapsWon)}–{formatNumber(row.stats.mapsLost)}</td>
                    <td className="numeric-cell metric-value">{formatPercent(row.stats.mapWinPercentage)}</td>
                    <td className="numeric-cell metric-value">{formatPercent(row.stats.roundWinPercentage)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.roundDifferential, 0)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.kd, 2)}</td>
                    <td className="numeric-cell metric-muted">{formatPercent(row.stats.firstKillPercentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export { TeamsPage };