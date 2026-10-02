import { Link, useParams } from "react-router-dom";
import { getPlayer } from "../api/players";
import type { ApiResponse, PlayerDetailData } from "../api/types";
import { DetailMatchCard } from "../components/analytics/DetailMatchCard";
import { MetricSummary } from "../components/analytics/MetricSummary";
import { TrendChart } from "../components/analytics/TrendChart";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/DataState";
import { MetricLabel } from "../components/ui/MetricLabel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { TeamMark } from "../components/ui/TeamMark";
import { useApiResource } from "../hooks/useApiResource";
import { formatNumber, formatPercent } from "../utils/formatters";
import { formatAgentName, formatMapName } from "../utils/valorantNames";


const PlayerDetailPage = () => {
  const { slug } = useParams();
  const playerSlug = slug ?? "";
  const resource = useApiResource<ApiResponse<PlayerDetailData>>(
    playerSlug ? `player-detail:${playerSlug}` : null,
    (signal) => getPlayer(playerSlug, signal)
  );

  if (resource.state.status === "idle" || resource.state.status === "loading") {
    return (
      <div className="page-container detail-page detail-resource-state">
        <h1 tabIndex={-1}>選手資料</h1>
        <LoadingState title="選手資料載入中" message="正在載入選手賽事統計" variant="player-detail" />
      </div>
    );
  }

  if (resource.state.status === "error") {
    if (resource.state.error.code === "NOT_FOUND") {
      return (
        <div className="page-container detail-page detail-resource-state">
          <h1 tabIndex={-1}>找不到選手</h1>
          <EmptyState title="選手不存在於目前賽事資料" message="請返回選手列表，選擇目前可用的選手資料。" />
          <Link className="quiet-link detail-return-link" to="/players">返回選手列表 <span aria-hidden="true">↗</span></Link>
        </div>
      );
    }

    return (
      <div className="page-container detail-page detail-resource-state">
        <h1 tabIndex={-1}>選手資料</h1>
        <ErrorState title="目前無法載入選手" message={resource.state.error.userMessage} onRetry={resource.retry} />
        <Link className="quiet-link detail-return-link" to="/players">返回選手列表 <span aria-hidden="true">↗</span></Link>
      </div>
    );
  }

  const { player, summary, mapPerformance, agentPerformance, recentMatches } = resource.state.data.data;
  const playerTeamLogoUrl = player.team?.logoUrl?.startsWith("/api/assets/team-logos/")
    ? player.team.logoUrl
    : player.team?.slug
      ? `/api/assets/team-logos/${encodeURIComponent(player.team.slug)}`
      : null;
  const playerTeamName = player.team?.name ?? player.team?.shortName ?? "隊伍";
  const hasCurrentTeam = player.team !== null && (
    player.team.slug !== null
    || player.team.name !== null
    || player.team.shortName !== null
  );
  const summaryItems = [
    { label: "地圖／回合", value: `${formatNumber(summary.mapsPlayed)} / ${formatNumber(summary.roundsPlayed)}` },
    { label: "Rating", value: formatNumber(summary.rating, 2), metric: "rating" as const },
    { label: "ACS", value: formatNumber(summary.acs, 0), metric: "acs" as const },
    { label: "K/D", value: formatNumber(summary.kd, 2), metric: "kd" as const },
    { label: "KAST", value: formatPercent(summary.kast), metric: "kast" as const },
    { label: "ADR", value: formatNumber(summary.adr, 1), metric: "adr" as const },
    { label: "KPR", value: formatNumber(summary.kpr, 2), metric: "kpr" as const },
    { label: "APR", value: formatNumber(summary.apr, 2), metric: "apr" as const },
    { label: "擊殺／死亡／助攻", value: `${formatNumber(summary.kills)} / ${formatNumber(summary.deaths)} / ${formatNumber(summary.assists)}` },
    { label: "首殺／首死", value: `${formatNumber(summary.firstKills)} / ${formatNumber(summary.firstDeaths)}`, metric: "fkfdCounts" as const },
    { label: "FK/FD", value: formatNumber(summary.fkfd, 2), metric: "fkfd" as const },
    { label: "HS %", value: formatPercent(summary.headshotPercentage), metric: "hs" as const }
  ];

  return (
    <div className="page-container detail-page player-detail-page">
      <header className="detail-page-heading">
        <div className="detail-identity">
          <div>
            <p className="detail-entity-type">選手</p>
            <h1 tabIndex={-1}>{player.handle ?? "選手名稱尚未提供"}</h1>
            {player.realName ? <p className="detail-entity-meta">{player.realName}</p> : null}
            <div className="player-team-reference">
              {hasCurrentTeam && player.team ? (
                <>
                  <TeamMark name={player.team.name} shortName={player.team.shortName ?? player.team.name} logoUrl={playerTeamLogoUrl} size="medium" />
                  {player.team.slug ? (
                    <Link to={`/teams/${player.team.slug}`}>{playerTeamName}</Link>
                  ) : (
                    <span>{playerTeamName}</span>
                  )}
                </>
              ) : (
                <span className="player-team-unassigned">目前無所屬隊伍</span>
              )}
            </div>
          </div>
        </div>
        <Link className="quiet-link" to="/players">返回選手 <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="detail-section" aria-labelledby="player-summary-title">
        <SectionHeader headingId="player-summary-title" title="選手摘要" description="依賽事資料彙整" />
        <MetricSummary items={summaryItems} />
      </section>

      <div className="detail-content-grid">
        <section className="detail-section" aria-labelledby="player-map-title">
        <SectionHeader headingId="player-map-title" title="地圖表現" description="依地圖彙整" />
          {mapPerformance.length === 0 ? (
            <EmptyState title="尚無地圖統計" message="目前沒有可顯示的地圖表現資料。" />
          ) : (
            <div className="table-scroll analytics-table-scroll" tabIndex={0} aria-label="選手地圖表現，可水平捲動">
              <table className="data-table detail-performance-table player-performance-table">
                <caption className="visually-hidden">{player.handle ?? "選手"} 各地圖表現</caption>
                <colgroup>
                  {[140, 120, 96, 96, 96, 96, 96].map((width, index) => (
                    <col key={index} style={{ width: `${width}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">地圖</th>
                    <th scope="col" className="numeric-cell">地圖／回合</th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="Rating" metric="rating" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="ACS" metric="acs" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="K/D" metric="kd" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="KAST" metric="kast" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="ADR" metric="adr" /></th>
                  </tr>
                </thead>
                <tbody>
                  {mapPerformance.map((row) => (
                    <tr key={row.map}>
                      <th scope="row" title={formatMapName(row.map)}>{formatMapName(row.map)}</th>
                      <td className="numeric-cell">{formatNumber(row.mapsPlayed)} / {formatNumber(row.roundsPlayed)}</td>
                      <td className="numeric-cell">{formatNumber(row.rating, 2)}</td>
                      <td className="numeric-cell">{formatNumber(row.acs, 0)}</td>
                      <td className="numeric-cell">{formatNumber(row.kd, 2)}</td>
                      <td className="numeric-cell">{formatPercent(row.kast)}</td>
                      <td className="numeric-cell">{formatNumber(row.adr, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="detail-section" aria-labelledby="player-agent-title">
          <SectionHeader headingId="player-agent-title" title="特務表現" description="依使用特務彙整" />
          {agentPerformance.length === 0 ? (
            <EmptyState title="尚無特務統計" message="目前沒有可顯示的特務表現資料。" />
          ) : (
            <div className="table-scroll analytics-table-scroll" tabIndex={0} aria-label="選手特務表現，可水平捲動">
              <table className="data-table detail-performance-table player-agent-table">
                <caption className="visually-hidden">{player.handle ?? "選手"} 各特務表現</caption>
                <colgroup>
                  {[160, 120, 96, 96, 96, 96, 96].map((width, index) => (
                    <col key={index} style={{ width: `${width}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">特務</th>
                    <th scope="col" className="numeric-cell">地圖／回合</th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="Rating" metric="rating" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="ACS" metric="acs" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="K/D" metric="kd" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="KAST" metric="kast" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="ADR" metric="adr" /></th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((row) => (
                    <tr key={row.agent}>
                      <th scope="row" title={formatAgentName(row.agent)}>{formatAgentName(row.agent)}</th>
                      <td className="numeric-cell">{formatNumber(row.mapsPlayed)} / {formatNumber(row.roundsPlayed)}</td>
                      <td className="numeric-cell">{formatNumber(row.rating, 2)}</td>
                      <td className="numeric-cell">{formatNumber(row.acs, 0)}</td>
                      <td className="numeric-cell">{formatNumber(row.kd, 2)}</td>
                      <td className="numeric-cell">{formatPercent(row.kast)}</td>
                      <td className="numeric-cell">{formatNumber(row.adr, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="detail-section" aria-labelledby="player-recent-title">
          <SectionHeader headingId="player-recent-title" title="近期比賽" description="選手個人表現與系列賽結果" />
          {recentMatches.length === 0 ? (
            <EmptyState title="尚無近期比賽" message="目前沒有可顯示的已完成系列賽。" />
          ) : (
            <div className="detail-match-list">
              {recentMatches.map((match, index) => (
                <DetailMatchCard key={match.matchId ?? `${match.scheduledAt ?? "match"}-${index}`} match={match} />
              ))}
            </div>
          )}
        </section>

        <div className="detail-section detail-section--wide">
          <TrendChart kind="player" slug={playerSlug} />
        </div>
      </div>
    </div>
  );
};

export { PlayerDetailPage };