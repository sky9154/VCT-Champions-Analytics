import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { getPlayerTrend } from "../../api/players";
import { getTeamTrend } from "../../api/teams";
import type {
  ApiResponse,
  PlayerTrendData,
  PlayerTrendMetric,
  TeamTrendData,
  TeamTrendMetric,
  TrendCoverage,
  TrendInterval,
  TrendPoint,
  TrendRange,
  TrendSide
} from "../../api/types";
import { EmptyState, ErrorState, LoadingState, RefreshState } from "../ui/DataState";
import { Select } from "../ui/Select";
import { Tooltip } from "../ui/Tooltip";
import { useApiResource } from "../../hooks/useApiResource";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { formatDateTimeForZone, formatNumber } from "../../utils/formatters";
import { METRIC_DESCRIPTIONS } from "../../utils/metricDescriptions";
import { formatMapName } from "../../utils/valorantNames";


type TrendKind = "team" | "player";
type MetricFormat = "percent" | "signed" | "decimal" | "integer";

interface TrendMetricOption {
  value: TeamTrendMetric | PlayerTrendMetric;
  label: string;
  format: MetricFormat;
  descriptionKey: keyof typeof METRIC_DESCRIPTIONS;
}

interface TrendChartProps {
  kind: TrendKind;
  slug: string;
}

interface TrendChartData {
  metric: string;
  interval: TrendInterval;
  average: number | null;
  points: TrendPoint[];
  coverage: TrendCoverage;
}

const TEAM_METRICS: TrendMetricOption[] = [
  { value: "roundWinPercentage", label: "回合勝率", format: "percent", descriptionKey: "roundWinPercentage" },
  { value: "roundDifferential", label: "回合差", format: "signed", descriptionKey: "roundDifferential" },
  { value: "attackRoundWinPercentage", label: "攻方回合勝率", format: "percent", descriptionKey: "attackRoundWinPercentage" },
  { value: "defenseRoundWinPercentage", label: "守方回合勝率", format: "percent", descriptionKey: "defenseRoundWinPercentage" },
  { value: "kd", label: "擊殺死亡比 K/D", format: "decimal", descriptionKey: "kd" },
  { value: "avgAcs", label: "平均戰鬥分數 ACS", format: "decimal", descriptionKey: "acs" },
  { value: "avgRating", label: "平均 Rating 評分", format: "decimal", descriptionKey: "rating" },
  { value: "kast", label: "回合影響率 KAST", format: "percent", descriptionKey: "kast" },
  { value: "adr", label: "每回合傷害 ADR", format: "decimal", descriptionKey: "adr" },
  { value: "firstKillPercentage", label: "首殺率", format: "percent", descriptionKey: "firstKillPercentage" }
];

const PLAYER_METRICS: TrendMetricOption[] = [
  { value: "rating", label: "Rating 評分", format: "decimal", descriptionKey: "rating" },
  { value: "acs", label: "平均戰鬥分數 ACS", format: "decimal", descriptionKey: "acs" },
  { value: "kd", label: "擊殺死亡比 K/D", format: "decimal", descriptionKey: "kd" },
  { value: "kast", label: "回合影響率 KAST", format: "percent", descriptionKey: "kast" },
  { value: "adr", label: "每回合傷害 ADR", format: "decimal", descriptionKey: "adr" },
  { value: "kpr", label: "每回合擊殺 KPR", format: "decimal", descriptionKey: "kpr" },
  { value: "apr", label: "每回合助攻 APR", format: "decimal", descriptionKey: "apr" },
  { value: "fkpr", label: "每回合首殺 FKPR", format: "decimal", descriptionKey: "fkpr" },
  { value: "fdpr", label: "每回合首死 FDPR", format: "decimal", descriptionKey: "fdpr" },
  { value: "hs", label: "爆頭率 HS %", format: "percent", descriptionKey: "hs" }
];

const RANGE_OPTIONS: Array<{ value: TrendRange; label: string }> = [
  { value: "all", label: "全部" },
  { value: "last5", label: "最近 5 場" },
  { value: "last10", label: "最近 10 場" }
];

const SIDE_LABELS: Record<TrendSide, string> = {
  overall: "整體",
  attack: "攻方",
  defense: "守方"
};

const formatTrendValue = (value: number | null, format: MetricFormat): string => {
  if (value === null) {
    return "尚無資料";
  }

  if (format === "percent") {
    return `${formatNumber(value, 1)}%`;
  }

  if (format === "signed") {
    return `${value > 0 ? "+" : ""}${formatNumber(value, 1)}`;
  }

  return formatNumber(value, format === "integer" ? 0 : 2);
};

const getMatchResultLabel = (point: TrendPoint): string => (
  point.result.win === true ? "勝" : point.result.win === false ? "敗" : "結果確認中"
);

const getResultWithScore = (point: TrendPoint): string => {
  const label = getMatchResultLabel(point);
  return point.result.ownScore !== null && point.result.opponentScore !== null
    ? `${label} ${point.result.ownScore}–${point.result.opponentScore}`
    : label;
};

const getPointPosition = (
  index: number,
  value: number,
  pointCount: number,
  minValue: number,
  maxValue: number
) => {
  const chartWidth = 760;
  const chartHeight = 260;
  const padding = { top: 20, right: 22, bottom: 20, left: 22 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const x = padding.left + (pointCount === 1 ? plotWidth / 2 : (index / (pointCount - 1)) * plotWidth);
  const y = maxValue === minValue
    ? padding.top + plotHeight / 2
    : padding.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

  return { x, y };
};

const getMetricValueMessage = (point: TrendPoint, format: MetricFormat): string => {
  if (point.value !== null) {
    return formatTrendValue(point.value, format);
  }

  return point.dataAvailability === "pending" ? "尚無詳細統計" : "尚無資料";
};

const TrendChart = ({ kind, slug }: TrendChartProps) => {
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const tooltipId = useId();
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const chartSvgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);
  const touchInteractionRef = useRef(false);
  const { preferences } = useUserPreferences();
  const metricOptions = kind === "team" ? TEAM_METRICS : PLAYER_METRICS;
  const [metric, setMetric] = useState<TeamTrendMetric | PlayerTrendMetric>(kind === "team" ? "roundWinPercentage" : "rating");
  const [interval, setInterval] = useState<TrendInterval>(preferences.trendInterval);
  const [range, setRange] = useState<TrendRange>(preferences.trendRange);
  const [side, setSide] = useState<TrendSide>("overall");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const metricOption = metricOptions.find((option) => option.value === metric) ?? metricOptions[0];
  const activeTooltipIndex = focusedIndex ?? hoveredIndex ?? pinnedIndex;
  const queryKey = JSON.stringify([kind, slug, metric, interval, range, kind === "player" ? side : null]);
  const resource = useApiResource<ApiResponse<TeamTrendData | PlayerTrendData>>(
    queryKey,
    (signal) => kind === "team"
      ? getTeamTrend(slug, { metric: metric as TeamTrendMetric, interval, range }, signal)
      : getPlayerTrend(slug, { metric: metric as PlayerTrendMetric, interval, range, side }, signal),
    { keepPreviousData: true }
  );
  const trendData: TrendChartData | null = resource.state.status === "success" ? resource.state.data.data : null;
  const chartValues = [
    ...(trendData?.points.flatMap((point) => point.value === null ? [] : [point.value]) ?? []),
    ...(trendData?.average === null || trendData?.average === undefined ? [] : [trendData.average])
  ];
  const minValue = chartValues.length > 0 ? Math.min(...chartValues) : 0;
  const maxValue = chartValues.length > 0 ? Math.max(...chartValues) : 1;
  const availablePointCount = trendData?.points.filter((point) => point.value !== null).length ?? 0;
  const chartId = `trend-chart-${chartTitleId}`;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !chartFrameRef.current?.contains(event.target)) {
        setPinnedIndex(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinnedIndex(null);
        setHoveredIndex(null);
        setFocusedIndex(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handlePointKeyDown = (event: ReactKeyboardEvent<SVGCircleElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (pinnedIndex === index) {
        setPinnedIndex(null);
        setFocusedIndex(null);
        setHoveredIndex(null);
      } else {
        setPinnedIndex(index);
      }
    }
  };

  const handlePointPointerDown = (event: ReactPointerEvent<SVGCircleElement>) => {
    touchInteractionRef.current = event.pointerType === "touch";
  };

  const handlePointClick = (index: number) => {
    const isTouchInteraction = touchInteractionRef.current;

    touchInteractionRef.current = false;

    setPinnedIndex((current) => current === index ? null : index);

    if (isTouchInteraction) {
      setHoveredIndex(null);
      setFocusedIndex(null);
    }
  };

  const coverage = trendData?.coverage;
  const coverageUnit = interval === "match" ? "場比賽" : "張地圖";
  const tooltipPoint = activeTooltipIndex === null ? null : trendData?.points[activeTooltipIndex] ?? null;
  const tooltipPosition = tooltipPoint && activeTooltipIndex !== null
    ? getPointPosition(
      activeTooltipIndex,
      tooltipPoint.value ?? (trendData?.average ?? (minValue + maxValue) / 2),
      trendData?.points.length ?? 0,
      minValue,
      maxValue
    )
    : null;

  useLayoutEffect(() => {
    const frame = chartFrameRef.current;
    const svg = chartSvgRef.current;
    const tooltip = tooltipRef.current;

    if (!frame || !svg || !tooltip || !tooltipPosition) {
      setTooltipStyle(null);

      return;
    }

    const updateTooltipPosition = () => {
      const frameRect = frame.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const scale = Math.min(svgRect.width / 760, svgRect.height / 260);
      const letterboxX = (svgRect.width - 760 * scale) / 2;
      const letterboxY = (svgRect.height - 260 * scale) / 2;
      const anchorX = svgRect.left + letterboxX + tooltipPosition.x * scale;
      const anchorY = svgRect.top + letterboxY + tooltipPosition.y * scale;
      const frameLeft = frameRect.left + frame.clientLeft;
      const frameTop = frameRect.top + frame.clientTop;
      const horizontalInset = 8;
      const verticalInset = 8;
      const bounds = {
        left: Math.max(frameLeft + horizontalInset, 8),
        right: Math.min(frameRect.right - frame.clientLeft - horizontalInset, window.innerWidth - 8),
        top: Math.max(frameTop + verticalInset, 8),
        bottom: Math.min(frameRect.bottom - frame.clientTop - verticalInset, window.innerHeight - 8)
      };
      const width = tooltipRect.width;
      const height = tooltipRect.height;
      const gap = 21;
      let left = Math.max(bounds.left, Math.min(anchorX - width / 2, bounds.right - width));
      const upperSpace = anchorY - bounds.top;
      const lowerSpace = bounds.bottom - anchorY;
      let top: number;

      if (upperSpace >= height + gap) {
        top = anchorY - height - gap;
      } else if (lowerSpace >= height + gap) {
        top = anchorY + gap;
      } else {
        const rightSpace = bounds.right - anchorX;
        const leftSpace = anchorX - bounds.left;

        if (rightSpace >= width + gap || leftSpace >= width + gap) {
          left = rightSpace >= leftSpace
            ? anchorX + gap
            : anchorX - width - gap;
          top = Math.max(bounds.top, Math.min(anchorY - height / 2, bounds.bottom - height));
        } else {
          top = upperSpace >= lowerSpace ? anchorY - height - gap : anchorY + gap;
          top = Math.max(bounds.top, Math.min(top, bounds.bottom - height));
        }
      }

      left = Math.max(bounds.left, Math.min(left, bounds.right - width));
      top = Math.max(bounds.top, Math.min(top, bounds.bottom - height));
      setTooltipStyle({
        left: `${left - frameLeft}px`,
        top: `${top - frameTop}px`
      });
    };

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition, true);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateTooltipPosition);
    resizeObserver?.observe(frame);
    resizeObserver?.observe(tooltip);
    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition, true);
      resizeObserver?.disconnect();
    };
  }, [activeTooltipIndex, tooltipPosition?.x, tooltipPosition?.y, tooltipPoint]);

  return (
    <section className="trend-section" aria-labelledby={`${chartId}-heading`}>
      <div className="trend-heading">
        <div>
          <h2 id={`${chartId}-heading`}>趨勢</h2>
          <p>尚未提供的統計仍會保留在賽事時間軸上，且不納入平均值。</p>
          {coverage ? (
            <p className="trend-coverage" aria-live="polite">
              {formatNumber(coverage.pointCount)} {coverageUnit}，其中 {formatNumber(coverage.availableCount)} {coverageUnit}已有詳細統計
            </p>
          ) : null}
        </div>
        {trendData ? (
          <p className="trend-average">
            平均值 <strong>{formatTrendValue(trendData.average, metricOption.format)}</strong>
          </p>
        ) : null}
      </div>

      <div className="trend-controls" aria-label="趨勢圖設定">
        <label>
          <span className="trend-control-label">
            <span>指標</span>
            <Tooltip label={metricOption.label} content={METRIC_DESCRIPTIONS[metricOption.descriptionKey]} />
          </span>
          <Select label="趨勢指標" value={metric} options={metricOptions.map((option) => ({ value: option.value, label: option.label }))} onChange={(value) => setMetric(value as TeamTrendMetric | PlayerTrendMetric)} />
        </label>
        <label>
          <span>區間</span>
          <Select label="趨勢區間" value={interval} options={[{ value: "match", label: "對戰" }, { value: "map", label: "地圖" }]} onChange={(value) => setInterval(value as TrendInterval)} />
        </label>
        <label>
          <span>範圍</span>
          <Select label="趨勢範圍" value={range} options={RANGE_OPTIONS} onChange={(value) => setRange(value as TrendRange)} />
        </label>
        {kind === "player" ? (
          <label>
            <span>攻守側</span>
            <Select label="趨勢攻守側" value={side} options={Object.entries(SIDE_LABELS).map(([value, label]) => ({ value, label }))} onChange={(value) => setSide(value as TrendSide)} />
          </label>
        ) : null}
      </div>

      <div className="trend-content" aria-live="polite" aria-busy={resource.isRefreshing}>
        <RefreshState isRefreshing={resource.isRefreshing} error={resource.refreshError} onRetry={resource.retry} />
        {resource.state.status === "idle" || resource.state.status === "loading" ? (
          <LoadingState title="趨勢載入中" message="正在載入趨勢資料" variant="trend" />
        ) : null}
        {resource.state.status === "error" ? (
          <ErrorState title="目前無法載入趨勢" message={resource.state.error.userMessage} onRetry={resource.retry} />
        ) : null}
        {trendData && trendData.points.length === 0 ? (
          <EmptyState title="尚無趨勢資料" message={interval === "match" ? "目前沒有已完成的比賽可供比較。" : "目前沒有可用的地圖統計資料。"} />
        ) : null}
        {trendData && trendData.points.length > 0 ? (
          <>
            <div className="trend-chart-frame" ref={chartFrameRef}>
              <svg ref={chartSvgRef} className="trend-chart-svg" viewBox="0 0 760 260" role="group" aria-labelledby={chartTitleId} aria-describedby={chartDescriptionId}>
                <title id={chartTitleId}>{metricOption.label}趨勢圖</title>
                <desc id={chartDescriptionId}>
                  共 {trendData.points.length} 個賽事時間點；空缺位置以空心點標示並中斷折線。選取圖點可檢視日期、對手、系列賽比分與指標數值。
                </desc>
                <line className="trend-axis-line" x1="22" y1="20" x2="22" y2="240" />
                <line className="trend-axis-line" x1="22" y1="240" x2="738" y2="240" />
                {trendData.average !== null && availablePointCount > 1 ? (
                  <line
                    className="trend-average-line"
                    x1="22"
                    y1={getPointPosition(0, trendData.average, trendData.points.length, minValue, maxValue).y}
                    x2="738"
                    y2={getPointPosition(0, trendData.average, trendData.points.length, minValue, maxValue).y}
                  />
                ) : null}
                {(() => {
                  const pathSegments: string[] = [];
                  let currentSegment: string[] = [];
                  trendData.points.forEach((point, index) => {
                    if (point.value === null) {
                      if (currentSegment.length > 1) {
                        pathSegments.push(currentSegment.join(" "));
                      }

                      currentSegment = [];

                      return;
                    }
                    const position = getPointPosition(index, point.value, trendData.points.length, minValue, maxValue);
                    currentSegment.push(`${currentSegment.length === 0 ? "M" : "L"} ${position.x} ${position.y}`);
                  });
                  if (currentSegment.length > 1) {
                    pathSegments.push(currentSegment.join(" "));
                  }

                  return pathSegments.map((path) => <path className="trend-line" d={path} key={path} aria-hidden="true" />);
                })()}
                {trendData.points.map((point, index) => {
                  const position = getPointPosition(
                    index,
                    point.value ?? (trendData.average ?? (minValue + maxValue) / 2),
                    trendData.points.length,
                    minValue,
                    maxValue
                  );
                  const opponentName = point.opponent?.name ?? point.opponent?.shortName ?? "對手資料尚未提供";
                  const mapName = point.map ? formatMapName(point.map) : null;
                  const result = getResultWithScore(point);
                  const metricValue = getMetricValueMessage(point, metricOption.format);
                  const accessibleLabel = [
                    formatDateTimeForZone(point.timestamp, preferences.timeZone),
                    opponentName,
                    mapName,
                    `結果：${result}`,
                    `${metricOption.label} : ${metricValue}`
                  ].filter(Boolean).join("；");
                  return (
                    <circle
                      className={`trend-point${point.value === null ? " trend-point--pending" : ""}`}
                      cx={position.x}
                      cy={position.y}
                      r={5}
                      key={`${point.matchMapId ?? point.matchId ?? "point"}-${index}`}
                      role="button"
                      tabIndex={0}
                      aria-label={accessibleLabel}
                      aria-describedby={activeTooltipIndex === index ? tooltipId : undefined}
                      onPointerDown={handlePointPointerDown}
                      onPointerCancel={() => { touchInteractionRef.current = false; }}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") {
                          setHoveredIndex(index);
                        }
                      }}
                      onPointerLeave={(event) => {
                        if (event.pointerType === "mouse") {
                          setHoveredIndex((current) => current === index ? null : current);
                        }
                      }}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex((current) => current === index ? null : current)}
                      onClick={() => handlePointClick(index)}
                      onKeyDown={(event) => handlePointKeyDown(event, index)}
                    />
                  );
                })}
              </svg>
              {trendData.average !== null && availablePointCount > 1 ? (
                <span
                  className="trend-average-label"
                  aria-hidden="true"
                  style={{ top: `${(getPointPosition(0, trendData.average, trendData.points.length, minValue, maxValue).y / 260) * 100}%` }}
                >平均</span>
              ) : null}
              {tooltipPoint && tooltipPosition ? (
                <div
                  ref={tooltipRef}
                  className="trend-point-tooltip"
                  id={tooltipId}
                  role="tooltip"
                  style={tooltipStyle ?? { visibility: "hidden" }}
                >
                  <strong>{metricOption.label} : {getMetricValueMessage(tooltipPoint, metricOption.format)}</strong>
                  <span>日期：{formatDateTimeForZone(tooltipPoint.timestamp, preferences.timeZone)}</span>
                  <span>對手：{tooltipPoint.opponent?.name ?? tooltipPoint.opponent?.shortName ?? "對手資料尚未提供"}</span>
                  {tooltipPoint.map ? <span>地圖：{formatMapName(tooltipPoint.map)}</span> : null}
                  <span>{interval === "match" ? "系列賽結果" : "地圖結果"} : {getResultWithScore(tooltipPoint)}</span>
                </div>
              ) : null}
            </div>
            <div className="trend-legend" aria-label="圖表圖例">
              <span><i className="trend-legend-dot" aria-hidden="true" />已有資料</span>
              <span><i className="trend-legend-dot trend-legend-dot--pending" aria-hidden="true" />統計資料尚未提供</span>
              {trendData.average !== null && availablePointCount > 1 ? <span><i className="trend-legend-average" aria-hidden="true" />平均值</span> : null}
            </div>
            <div className="table-scroll trend-point-scroll" tabIndex={0} aria-label="趨勢資料，可水平捲動">
              <table className={`data-table trend-point-table trend-point-table--${interval}`}>
                <caption className="visually-hidden">{metricOption.label} 趨勢資料</caption>
                <colgroup>
                  {interval === "match"
                    ? [184, 184, 140, 184, 152].map((width, index) => <col key={index} style={{ width: `${width}px` }} />)
                    : [184, 144, 184, 140, 184].map((width, index) => <col key={index} style={{ width: `${width}px` }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">日期</th>
                    {interval === "map" ? <th scope="col">地圖</th> : null}
                    <th scope="col">對手</th>
                    <th scope="col">{interval === "match" ? "系列賽結果" : "地圖結果"}</th>
                    <th scope="col" className="numeric-cell">{metricOption.label}</th>
                    {interval === "match" ? <th scope="col">詳細統計</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {trendData.points.map((point, index) => (
                    <tr key={`${point.matchMapId ?? point.matchId ?? "point"}-${index}`}>
                      <td title={formatDateTimeForZone(point.timestamp, preferences.timeZone)}>{formatDateTimeForZone(point.timestamp, preferences.timeZone)}</td>
                      {interval === "map" ? <td title={point.map ? formatMapName(point.map) : undefined}>{point.map ? formatMapName(point.map) : "尚未提供"}</td> : null}
                      <td title={point.opponent?.name ?? point.opponent?.shortName ?? undefined}>{point.opponent?.name ?? point.opponent?.shortName ?? "對手資料尚未提供"}</td>
                      <td>
                        <span className={`trend-result trend-result--${point.result.win === null ? "unknown" : point.result.win ? "win" : "loss"}`}>
                          {getResultWithScore(point)}
                        </span>
                      </td>
                      <td className="numeric-cell metric-value" title={getMetricValueMessage(point, metricOption.format)}>
                        {point.value === null && point.dataAvailability === "pending"
                          ? <span className="trend-value-pending">尚無詳細統計</span>
                          : formatTrendValue(point.value, metricOption.format)}
                      </td>
                      {interval === "match" ? (
                        <td><span className={`trend-availability trend-availability--${point.dataAvailability}`}>
                          {point.dataAvailability === "available" ? "已有詳細統計" : "尚無詳細統計"}
                        </span></td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

export { TrendChart };