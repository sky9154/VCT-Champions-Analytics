import { Link, useParams } from "react-router-dom";
import { getTeam } from "../api/teams";
import type { ApiResponse, TeamDetailData } from "../api/types";
import { DetailMatchCard } from "../components/analytics/DetailMatchCard";
import { MetricSummary } from "../components/analytics/MetricSummary";
import { TrendChart } from "../components/analytics/TrendChart";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/DataState";
import { SectionHeader } from "../components/ui/SectionHeader";
import { TeamMark } from "../components/ui/TeamMark";
import { MetricLabel } from "../components/ui/MetricLabel";
import { useApiResource } from "../hooks/useApiResource";
import { formatNumber, formatPercent } from "../utils/formatters";
import { formatMapName, formatRegionName } from "../utils/valorantNames";


const TeamDetailPage = () => {
  const { slug } = useParams();
  const teamSlug = slug ?? "";
  const resource = useApiResource<ApiResponse<TeamDetailData>>(
    teamSlug ? `team-detail:${teamSlug}` : null,
    (signal) => getTeam(teamSlug, signal)
  );

  if (resource.state.status === "idle" || resource.state.status === "loading") {
    return (
      <div className="page-container detail-page detail-resource-state">
        <h1 tabIndex={-1}>隊伍資料</h1>
        <LoadingState title="隊伍資料載入中" message="正在載入隊伍與賽事統計" variant="detail" />
      </div>
    );
  }

  if (resource.state.status === "error") {
    if (resource.state.error.code === "NOT_FOUND") {
      return (
        <div className="page-container detail-page detail-resource-state">
          <h1 tabIndex={-1}>找不到隊伍</h1>
          <EmptyState title="隊伍不存在於目前賽事資料" message="請返回隊伍列表，選擇目前可用的隊伍資料。" />
          <Link className="quiet-link detail-return-link" to="/teams">返回隊伍列表 <span aria-hidden="true">↗</span></Link>
        </div>
      );
    }

    return (
      <div className="page-container detail-page detail-resource-state">
        <h1 tabIndex={-1}>隊伍資料</h1>
        <ErrorState title="目前無法載入隊伍" message={resource.state.error.userMessage} onRetry={resource.retry} />
        <Link className="quiet-link detail-return-link" to="/teams">返回隊伍列表 <span aria-hidden="true">↗</span></Link>
      </div>
    );
  }

  const { team, summary, roster, mapPerformance, recentMatches } = resource.state.data.data;
  const namedRoster = roster.flatMap((player, index) => {
    const handle = player.handle?.trim() || "";
    const realName = player.realName?.trim() || "";
    const displayName = handle || realName;
    return displayName ? [{ player, index, displayName, secondaryName: handle && realName && handle !== realName ? realName : null }] : [];
  });
  const summaryItems = [
    { label: "系列賽戰績", value: `${formatNumber(summary.matchesWon)}–${formatNumber(summary.matchesLost)}` },
    { label: "系列賽勝率", value: formatPercent(summary.matchWinPercentage), metric: "matchWinPercentage" as const },
    { label: "地圖戰績", value: `${formatNumber(summary.mapsWon)}–${formatNumber(summary.mapsLost)}` },
    { label: "地圖勝率", value: formatPercent(summary.mapWinPercentage), metric: "mapWinPercentage" as const },
    { label: "回合勝率", value: formatPercent(summary.roundWinPercentage), metric: "roundWinPercentage" as const },
    { label: "回合差", value: formatNumber(summary.roundDifferential), metric: "roundDifferential" as const },
    { label: "K/D", value: formatNumber(summary.kd, 2), metric: "kd" as const },
    { label: "首殺率", value: formatPercent(summary.firstKillPercentage), metric: "firstKillPercentage" as const }
  ];

  return (
    <div className="page-container detail-page team-detail-page">
      <header className="detail-page-heading">
        <div className="detail-identity">
          <TeamMark name={team.name} shortName={team.shortName} logoUrl={team.logoUrl} size="medium" />
          <div>
            <p className="detail-entity-type">隊伍</p>
            <h1 tabIndex={-1}>{team.name ?? "隊伍名稱尚未提供"}</h1>
            {team.shortName || team.region ? (
              <p className="detail-entity-meta">
                {team.shortName ? <span>{team.shortName}</span> : null}
                {team.shortName && team.region ? <span aria-hidden="true">｜</span> : null}
                {team.region ? <span>{formatRegionName(team.region)}</span> : null}
              </p>
            ) : null}
          </div>
        </div>
        <Link className="quiet-link" to="/teams">返回隊伍 <span aria-hidden="true">↗</span></Link>
      </header>

      <section className="detail-section" aria-labelledby="team-summary-title">
        <SectionHeader headingId="team-summary-title" title="隊伍摘要" description="依賽事資料彙整" />
        <MetricSummary items={summaryItems} />
      </section>

      <div className="detail-content-grid">
        <section className="detail-section" aria-labelledby="team-roster-title">
          <SectionHeader headingId="team-roster-title" title="隊伍陣容" description={`${formatNumber(namedRoster.length)} 位選手`} />
          {namedRoster.length === 0 ? (
            <EmptyState title="目前沒有陣容資料" message="尚未提供這支隊伍的賽事陣容。" />
          ) : (
            <ul className="roster-list">
              {namedRoster.map(({ player, index, displayName, secondaryName }) => (
                <li className="roster-item" key={player.slug ?? `${player.handle ?? "player"}-${index}`}>
                  {player.slug ? (
                    <Link to={`/players/${player.slug}`} className="roster-player-link">{displayName}</Link>
                  ) : (
                    <strong className="roster-player-link">{displayName}</strong>
                  )}
                  {secondaryName ? <span className="roster-player-name">{secondaryName}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="detail-section" aria-labelledby="team-recent-title">
          <SectionHeader headingId="team-recent-title" title="近期比賽" description="日期、對手與系列賽結果" />
          {recentMatches.length === 0 ? (
            <EmptyState title="尚無近期比賽" message="目前沒有可顯示的賽事。" />
          ) : (
            <div className="detail-match-list">
              {recentMatches.map((match, index) => (
                <DetailMatchCard key={match.matchId ?? `${match.scheduledAt ?? "match"}-${index}`} match={match} />
              ))}
            </div>
          )}
        </section>

        <section className="detail-section detail-section--wide" aria-labelledby="team-map-title">
          <SectionHeader headingId="team-map-title" title="地圖表現" description="依資料順序排列" />
          {mapPerformance.length === 0 ? (
            <EmptyState title="尚無地圖統計" message="目前沒有可顯示的地圖表現資料。" />
          ) : (
            <div className="table-scroll analytics-table-scroll" tabIndex={0} aria-label="隊伍地圖表現，可水平捲動">
              <table className="data-table detail-performance-table team-map-table">
                <caption className="visually-hidden">{team.name ?? "隊伍"} 各地圖表現</caption>
                <colgroup>
                  {[160, 104, 112, 104, 112, 128, 128, 104, 96, 112].map((width, index) => (
                    <col key={index} style={{ width: `${width}px` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">地圖</th>
                    <th scope="col" className="numeric-cell">地圖戰績</th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="地圖勝率" metric="mapWinPercentage" /></th>
                    <th scope="col" className="numeric-cell">回合戰績</th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="回合勝率" metric="roundWinPercentage" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="攻方回合勝率" metric="attackRoundWinPercentage" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="守方回合勝率" metric="defenseRoundWinPercentage" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="回合差" metric="roundDifferential" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="K/D" metric="kd" /></th>
                    <th scope="col" className="numeric-cell"><MetricLabel label="首殺率" metric="firstKillPercentage" /></th>
                  </tr>
                </thead>
                <tbody>
                  {mapPerformance.map((row, index) => (
                    <tr key={`${row.map ?? "map"}-${index}`}>
                      <th scope="row" title={formatMapName(row.map)}>{formatMapName(row.map)}</th>
                      <td className="numeric-cell">{formatNumber(row.mapsWon)}–{formatNumber(row.mapsLost)}</td>
                      <td className="numeric-cell">{formatPercent(row.mapWinPercentage)}</td>
                      <td className="numeric-cell">{formatNumber(row.roundsWon)}–{formatNumber(row.roundsLost)}</td>
                      <td className="numeric-cell">{formatPercent(row.roundWinPercentage)}</td>
                      <td className="numeric-cell">{formatPercent(row.attackRoundWinPercentage)}</td>
                      <td className="numeric-cell">{formatPercent(row.defenseRoundWinPercentage)}</td>
                      <td className="numeric-cell">{formatNumber(row.roundDifferential)}</td>
                      <td className="numeric-cell">{formatNumber(row.kd, 2)}</td>
                      <td className="numeric-cell">{formatPercent(row.firstKillPercentage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="detail-section detail-section--wide">
          <TrendChart kind="team" slug={teamSlug} />
        </div>
      </div>
    </div>
  );
};

export { TeamDetailPage };
