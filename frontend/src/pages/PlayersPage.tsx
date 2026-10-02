import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getFilters } from "../api/filters";
import { getPlayers, type PlayerListQuery } from "../api/players";
import type {
  ApiResponse,
  FiltersData,
  PlayerRankingItem,
  PlayerSortField,
  SortOrder,
  TrendSide
} from "../api/types";
import { EmptyState, ErrorState, LoadingState, RefreshState } from "../components/ui/DataState";
import { MetricLabel } from "../components/ui/MetricLabel";
import { Select, type SelectOption } from "../components/ui/Select";
import { useApiResource } from "../hooks/useApiResource";
import { formatNumber, formatPercent, formatStageLabel } from "../utils/formatters";
import { formatAgentName, formatMapName } from "../utils/valorantNames";
import { getSingleSearchValue, getUnknownSearchKeys, omitDefaultSearchValues, setSearchValue } from "../utils/searchParams";


const DEFAULT_PLAYER_SORT: PlayerSortField = "rating";
const PLAYER_SORT_OPTIONS: Array<{ value: PlayerSortField; label: string }> = [
  { value: "rating", label: "Rating" },
  { value: "acs", label: "ACS" },
  { value: "kd", label: "K/D" },
  { value: "kast", label: "KAST" },
  { value: "adr", label: "ADR" },
  { value: "kpr", label: "KPR" },
  { value: "apr", label: "APR" },
  { value: "fk", label: "首殺" },
  { value: "fd", label: "首死" },
  { value: "fkfd", label: "FK/FD" },
  { value: "fkpr", label: "FKPR" },
  { value: "fdpr", label: "FDPR" },
  { value: "hs", label: "HS %" }
];

const PLAYER_SORT_FIELDS: PlayerSortField[] = [
  "rating", "acs", "kd", "kast", "adr", "kpr", "apr", "fk", "fd", "fkfd", "fkpr", "fdpr", "hs"
];
const SIDES: TrendSide[] = ["overall", "attack", "defense"];
const SIDE_LABELS: Record<TrendSide, string> = { overall: "整體", attack: "攻方", defense: "守方" };
const ORDERS: SortOrder[] = ["desc", "asc"];

const isPlayerSortField = (value: string | null): value is PlayerSortField => (
  value !== null && PLAYER_SORT_FIELDS.some((field) => field === value)
);

const isTrendSide = (value: string | null): value is TrendSide => (
  value !== null && SIDES.some((side) => side === value)
);

const PlayersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = useRef(new URLSearchParams(searchParams));
  const pendingSearchParamUpdates = useRef(new Set<string>());
  const filtersResource = useApiResource<ApiResponse<FiltersData>>("directory-filters", getFilters);
  const teamParam = getSingleSearchValue(searchParams, "team");
  const agentParam = getSingleSearchValue(searchParams, "agent");
  const mapParam = getSingleSearchValue(searchParams, "map");
  const stageParam = getSingleSearchValue(searchParams, "stage");
  const sideParam = getSingleSearchValue(searchParams, "side");
  const minRoundsParam = getSingleSearchValue(searchParams, "minRounds");
  const sortParam = getSingleSearchValue(searchParams, "sort");
  const orderParam = getSingleSearchValue(searchParams, "order");
  const filters = filtersResource.state.status === "success" ? filtersResource.state.data.data : null;
  const side: TrendSide = isTrendSide(sideParam.value) ? sideParam.value : "overall";
  const sort: PlayerSortField = isPlayerSortField(sortParam.value) ? sortParam.value : DEFAULT_PLAYER_SORT;
  const order: SortOrder = orderParam.value === "asc" ? "asc" : "desc";
  const minRoundsRaw = minRoundsParam.value;
  const parsedMinRounds = minRoundsRaw === null
    ? 0
    : /^\d+$/.test(minRoundsRaw)
      ? Number(minRoundsRaw)
      : null;
  const minRoundsValid = parsedMinRounds !== null
    && Number.isInteger(parsedMinRounds)
    && parsedMinRounds >= 0
    && parsedMinRounds <= 5000;
  const unknownKeys = getUnknownSearchKeys(searchParams, [
    "team", "agent", "map", "stage", "side", "minRounds", "sort", "order"
  ]);
  const duplicatedParams = [
    teamParam, agentParam, mapParam, stageParam, sideParam, minRoundsParam, sortParam, orderParam
  ].some((param) => param.duplicated);
  const unsupportedValues = filters !== null && (
    (teamParam.value !== null && !filters.teams.some((team) => team.slug === teamParam.value))
    || (agentParam.value !== null && !filters.agents.includes(agentParam.value))
    || (mapParam.value !== null && !filters.maps.includes(mapParam.value))
    || (stageParam.value !== null && !filters.stages.includes(stageParam.value))
    || (sideParam.value !== null && (!isTrendSide(sideParam.value) || !filters.sides.includes(sideParam.value)))
  );
  const hasInvalidQuery = unknownKeys.length > 0
    || duplicatedParams
    || unsupportedValues
    || [teamParam, agentParam, mapParam, stageParam, sideParam].some((param) => param.value === "")
    || (sideParam.value !== null && !isTrendSide(sideParam.value))
    || (sortParam.value !== null && !isPlayerSortField(sortParam.value))
    || (orderParam.value !== null && !ORDERS.includes(orderParam.value as SortOrder))
    || !minRoundsValid;
  const playerQuery: PlayerListQuery = {
    team: teamParam.value,
    agent: agentParam.value,
    map: mapParam.value,
    stage: stageParam.value,
    side,
    minRounds: minRoundsValid ? parsedMinRounds : 0,
    sort,
    order
  };
  const canLoadPlayers = filters !== null && !hasInvalidQuery;
  const defaultMinRoundsValue = minRoundsValid && parsedMinRounds === 0 && minRoundsRaw !== null
    ? minRoundsRaw
    : "0";
  const playerQueryKey = canLoadPlayers ? JSON.stringify(playerQuery) : null;
  const playersResource = useApiResource<ApiResponse<PlayerRankingItem[]>>(
    playerQueryKey,
    (signal) => getPlayers(playerQuery, signal),
    { keepPreviousData: true }
  );

  useEffect(() => {
    const currentQuery = searchParams.toString();

    if (pendingSearchParamUpdates.current.delete(currentQuery)) {
      return;
    }

    pendingSearchParamUpdates.current.clear();
    searchParamsRef.current = new URLSearchParams(searchParams);
  }, [searchParams]);

  useEffect(() => {
    const nextParams = omitDefaultSearchValues(searchParams, {
      side: "overall",
      minRounds: defaultMinRoundsValue,
      sort: DEFAULT_PLAYER_SORT,
      order: "desc"
    });

    if (nextParams) {
      searchParamsRef.current = nextParams;
      pendingSearchParamUpdates.current.add(nextParams.toString());

      setSearchParams(nextParams, { replace: true });
    }
  }, [defaultMinRoundsValue, searchParams, setSearchParams]);

  const updateFilter = (key: string, value: string, defaultValue?: string) => {
    const normalizedDefault = key === "minRounds"
      && value !== ""
      && Number.isInteger(Number(value))
      && Number(value) === 0
      ? value
      : defaultValue;
    const nextParams = setSearchValue(searchParamsRef.current, key, value, normalizedDefault);

    searchParamsRef.current = nextParams;
    pendingSearchParamUpdates.current.add(nextParams.toString());

    setSearchParams(nextParams);
  };

  const handleResetQuery = () => {
    const nextParams = new URLSearchParams();

    searchParamsRef.current = nextParams;
    pendingSearchParamUpdates.current.add(nextParams.toString());

    setSearchParams(nextParams);
  };
  const playerRows = playersResource.state.status === "success" ? playersResource.state.data.data : [];
  const total = playersResource.state.status === "success"
    && typeof playersResource.state.data.meta.total === "number"
    ? playersResource.state.data.meta.total
    : playerRows.length;

  return (
    <div className="page-container analytics-page players-page">
      <header className="analytics-page-heading">
        <div>
          <h1 tabIndex={-1}>選手</h1>
          <p>依隊伍、特務、地圖與攻守側比較賽事表現。</p>
        </div>
        <span className="analytics-count">{playersResource.state.status === "success" ? `${formatNumber(total)} 位選手` : "Champions 2026"}</span>
      </header>

      <section className="directory-filter-panel player-filter-panel" aria-label="選手篩選與排序">
        <label className="analytics-filter-field">
          <span>隊伍</span>
          <Select
            label="隊伍"
            value={teamParam.duplicated ? "__multiple__" : teamParam.value ?? ""}
            options={[
              { value: "", label: "所有隊伍" },
              ...(teamParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(teamParam.value && filters && !filters.teams.some((team) => team.slug === teamParam.value)
                ? [{ value: teamParam.value, label: "網址中的隊伍無法使用", disabled: true }]
                : []),
              ...(filters?.teams ?? []).filter((team) => team.slug !== null).map((team) => ({
                value: team.slug ?? "",
                label: team.name ?? team.shortName ?? "隊伍名稱尚未提供"
              }))
            ] satisfies SelectOption[]}
            disabled={filters === null}
            onChange={(value) => updateFilter("team", value)}
          />
        </label>
        <label className="analytics-filter-field">
          <span>特務</span>
          <Select
            label="特務"
            value={agentParam.duplicated ? "__multiple__" : agentParam.value ?? ""}
            options={[
              { value: "", label: "所有特務" },
              ...(agentParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(agentParam.value && filters && !filters.agents.includes(agentParam.value)
                ? [{ value: agentParam.value, label: "網址中的特務無法使用", disabled: true }]
                : []),
              ...(filters?.agents ?? []).map((value) => ({ value, label: formatAgentName(value) }))
            ] satisfies SelectOption[]}
            disabled={filters === null}
            onChange={(value) => updateFilter("agent", value)}
          />
        </label>
        <label className="analytics-filter-field">
          <span>地圖</span>
          <Select
            label="地圖"
            value={mapParam.duplicated ? "__multiple__" : mapParam.value ?? ""}
            options={[
              { value: "", label: "所有地圖" },
              ...(mapParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(mapParam.value && filters && !filters.maps.includes(mapParam.value)
                ? [{ value: mapParam.value, label: "網址中的地圖無法使用", disabled: true }]
                : []),
              ...(filters?.maps ?? []).map((value) => ({ value, label: formatMapName(value) }))
            ] satisfies SelectOption[]}
            disabled={filters === null}
            onChange={(value) => updateFilter("map", value)}
          />
        </label>
        <label className="analytics-filter-field">
          <span>階段</span>
          <Select
            label="階段"
            value={stageParam.duplicated ? "__multiple__" : stageParam.value ?? ""}
            options={[
              { value: "", label: "所有階段" },
              ...(stageParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(stageParam.value && filters && !filters.stages.includes(stageParam.value)
                ? [{ value: stageParam.value, label: "網址中的階段無法使用", disabled: true }]
                : []),
              ...(filters?.stages ?? []).map((value) => ({ value, label: formatStageLabel(value) }))
            ] satisfies SelectOption[]}
            disabled={filters === null}
            onChange={(value) => updateFilter("stage", value)}
          />
        </label>
        <label className="analytics-filter-field">
          <span>攻守側</span>
          <Select
            label="攻守側"
            value={sideParam.duplicated ? "__multiple__" : sideParam.value ?? "overall"}
            options={[
              ...(sideParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(sideParam.value && filters && !filters.sides.includes(sideParam.value)
                ? [{ value: sideParam.value, label: "網址中的攻守側無法使用", disabled: true }]
                : []),
              ...(filters?.sides ?? SIDES).map((value) => ({
                value,
                label: isTrendSide(value) ? SIDE_LABELS[value] : value
              }))
            ] satisfies SelectOption[]}
            disabled={filters === null}
            onChange={(value) => updateFilter("side", value, "overall")}
          />
        </label>
        <label className="analytics-filter-field">
          <span>最少回合數</span>
          <input
            type="number"
            min="0"
            max="5000"
            step="1"
            inputMode="numeric"
            disabled={filters === null}
            aria-invalid={!minRoundsValid}
            value={minRoundsParam.duplicated ? "" : minRoundsRaw ?? "0"}
            onChange={(event) => updateFilter("minRounds", event.currentTarget.value, "0")}
          />
        </label>
        <label className="analytics-filter-field">
          <span>排序指標</span>
          <Select
            label="排序指標"
            value={sortParam.duplicated ? "__multiple__" : sortParam.value ?? DEFAULT_PLAYER_SORT}
            options={[
              ...(sortParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(sortParam.value && !isPlayerSortField(sortParam.value)
                ? [{ value: sortParam.value, label: "網址中的排序無法使用", disabled: true }]
                : []),
              ...PLAYER_SORT_OPTIONS
            ] satisfies SelectOption[]}
            onChange={(value) => updateFilter("sort", value, DEFAULT_PLAYER_SORT)}
          />
        </label>
        <label className="analytics-filter-field">
          <span>排序方向</span>
          <Select
            label="排序方向"
            value={orderParam.duplicated ? "__multiple__" : orderParam.value ?? "desc"}
            options={[
              ...(orderParam.duplicated ? [{ value: "__multiple__", label: "網址中有重複條件", disabled: true }] : []),
              ...(orderParam.value && !ORDERS.includes(orderParam.value as SortOrder)
                ? [{ value: orderParam.value, label: "網址中的方向無法使用", disabled: true }]
                : []),
              { value: "desc", label: "由高至低" },
              { value: "asc", label: "由低至高" }
            ] satisfies SelectOption[]}
            onChange={(value) => updateFilter("order", value, "desc")}
          />
        </label>
      </section>

      {filtersResource.state.status === "loading" || filtersResource.state.status === "idle" ? (
        <p className="directory-filter-status" role="status">正在載入可用篩選條件</p>
      ) : null}
      {filtersResource.state.status === "error" ? (
        <div className="directory-filter-error">
          <ErrorState title="篩選資料暫時無法載入" message={filtersResource.state.error.userMessage} onRetry={filtersResource.retry} />
        </div>
      ) : null}

      <section className="directory-results" aria-labelledby="players-results-title" aria-live="polite" aria-busy={playersResource.isRefreshing}>
        <div className="directory-results-heading">
          <h2 id="players-results-title">選手排名</h2>
          {playersResource.isRefreshing || playersResource.refreshError ? (
            <RefreshState
              isRefreshing={playersResource.isRefreshing}
              error={playersResource.refreshError}
              onRetry={playersResource.retry}
            />
          ) : playersResource.state.status === "success" ? <span>{formatNumber(total)} 位選手</span> : null}
        </div>
        {hasInvalidQuery ? (
          <EmptyState
            title="網址條件無法使用"
            message="部分篩選、排序或回合數條件不受支援；條件仍保留在網址中，請調整選項或重設條件。"
            actionLabel="重設條件"
            onAction={handleResetQuery}
          />
        ) : null}
        {!hasInvalidQuery && filtersResource.state.status === "loading" ? (
          <LoadingState title="選手資料載入中" message="正在載入可用篩選條件與排名資料" />
        ) : null}
        {!hasInvalidQuery && filtersResource.state.status === "error" ? (
          <EmptyState title="目前無法檢查篩選條件" message="篩選選項載入失敗，請重新載入後再查看排名。" />
        ) : null}
        {!hasInvalidQuery && canLoadPlayers && (playersResource.state.status === "idle" || playersResource.state.status === "loading") ? (
          <LoadingState title="選手資料載入中" message="正在載入排名與統計" variant="players" />
        ) : null}
        {!hasInvalidQuery && playersResource.state.status === "error" ? (
          <ErrorState title="目前無法載入選手" message={playersResource.state.error.userMessage} onRetry={playersResource.retry} />
        ) : null}
        {!hasInvalidQuery && playersResource.state.status === "success" && playerRows.length === 0 ? (
          <EmptyState title="沒有符合條件的選手" message="目前沒有可顯示的選手資料，請調整篩選或排序條件。" />
        ) : null}
        {!hasInvalidQuery && playersResource.state.status === "success" && playerRows.length > 0 ? (
          <div className="table-scroll analytics-table-scroll" tabIndex={0} aria-label="選手排名表，可水平捲動">
            <table className="data-table player-list-table">
              <caption className="visually-hidden">Champions 2026 選手排名</caption>
              <colgroup>
                {[64, 176, 136, 120, 96, 96, 96, 96, 96, 96, 96, 96, 96].map((width, index) => (
                  <col key={index} style={{ width: `${width}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">排名</th>
                  <th scope="col">選手</th>
                  <th scope="col">目前隊伍</th>
                  <th scope="col" className="numeric-cell">地圖／回合</th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="Rating" metric="rating" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="ACS" metric="acs" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="K/D" metric="kd" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="KAST" metric="kast" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="ADR" metric="adr" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="KPR" metric="kpr" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="APR" metric="apr" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="FK/FD" metric="fkfdCounts" /></th>
                  <th scope="col" className="numeric-cell"><MetricLabel label="HS %" metric="hs" /></th>
                </tr>
              </thead>
              <tbody>
                {playerRows.map((row) => (
                  <tr key={row.player.slug ?? `${row.player.handle ?? "player"}-${row.rank}`}>
                    <td className="rank-number">{String(row.rank).padStart(2, "0")}</td>
                    <td>
                      {row.player.slug ? (
                        <Link className="player-name-link" to={`/players/${row.player.slug}`} title={row.player.handle ?? undefined}>{row.player.handle ?? "選手名稱尚未提供"}</Link>
                      ) : (
                        <strong className="player-name-link" title={row.player.handle ?? undefined}>{row.player.handle ?? "選手名稱尚未提供"}</strong>
                      )}
                    </td>
                    <td title={row.player.team?.name ?? row.player.team?.shortName ?? undefined}>
                      {row.player.team?.slug ? (
                        <Link className="table-team-link" to={`/teams/${row.player.team.slug}`}>
                          {row.player.team.shortName ?? row.player.team.name ?? "隊伍名稱尚未提供"}
                        </Link>
                      ) : row.player.team?.shortName ?? row.player.team?.name ?? "目前無所屬隊伍"}
                    </td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.mapsPlayed)} / {formatNumber(row.stats.roundsPlayed)}</td>
                    <td className="numeric-cell metric-value">{formatNumber(row.stats.rating, 2)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.acs, 0)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.kd, 2)}</td>
                    <td className="numeric-cell metric-muted">{formatPercent(row.stats.kast)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.adr, 1)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.kpr, 2)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.apr, 2)}</td>
                    <td className="numeric-cell metric-muted">{formatNumber(row.stats.firstKills)} / {formatNumber(row.stats.firstDeaths)}</td>
                    <td className="numeric-cell metric-muted">{formatPercent(row.stats.headshotPercentage)}</td>
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

export { PlayersPage };