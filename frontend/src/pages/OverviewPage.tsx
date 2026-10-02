import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { getOverview } from "../api/overview";
import type { ApiResponse, OverviewData, PlayerRankingRow, TeamRankingRow } from "../api/types";
import type { RankingColumn } from "../components/ui/RankingTable";
import { MatchCard } from "../components/ui/MatchCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/DataState";
import { ProgressRing } from "../components/ui/ProgressRing";
import { RankingTable } from "../components/ui/RankingTable";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { TeamMark } from "../components/ui/TeamMark";
import { MetricLabel } from "../components/ui/MetricLabel";
import { useApiResource } from "../hooks/useApiResource";
import { formatLocalDate, formatNumber, formatPercent, formatStageLabel } from "../utils/formatters";
import { useMotionReduced } from "../contexts/UserPreferencesContext";


const OverviewPage = () => {
  const reduceMotion = useMotionReduced();
  const resource = useApiResource<ApiResponse<OverviewData>>("overview", getOverview);

  const playerColumns: RankingColumn<PlayerRankingRow>[] = [{
    key: "rank",
    label: "名次",
    width: 64,
    render: (row) => <span className="rank-number">{String(row.rank).padStart(2, "0")}</span>
  }, {
    key: "player",
    label: "選手",
    width: 176,
    render: (row) => (
      row.player.slug ? (
        <Link to={`/players/${row.player.slug}`} className="ranking-primary-link" title={row.player.handle ?? undefined}>{row.player.handle ?? "選手名稱尚未提供"}</Link>
      ) : (
        <span className="ranking-primary-link" title={row.player.handle ?? undefined}>{row.player.handle ?? "選手名稱尚未提供"}</span>
      )
    )
  }, {
    key: "team",
    label: "目前隊伍",
    width: 136,
    render: (row) => {
      const teamName = row.player.team
        ? row.player.team.shortName ?? row.player.team.name ?? "隊伍名稱尚未提供"
        : "目前無所屬隊伍";
      return row.player.team?.slug ? (
        <Link to={`/teams/${row.player.team.slug}`} className="table-team-link">{teamName}</Link>
      ) : (
        <span>{teamName}</span>
      );
    }
  }, {
    key: "rating",
    label: <MetricLabel label="Rating" metric="rating" />,
    width: 96,
    align: "right",
    render: (row) => <span className="metric-value">{formatNumber(row.stats.rating, 2)}</span>
  }, {
    key: "acs",
    label: <MetricLabel label="ACS" metric="acs" />,
    width: 96,
    align: "right",
    render: (row) => <span className="metric-muted">{formatNumber(row.stats.acs, 0)}</span>
  }];

  const teamColumns: RankingColumn<TeamRankingRow>[] = [{
    key: "rank",
    label: "名次",
    width: 64,
    render: (row) => <span className="rank-number">{String(row.rank).padStart(2, "0")}</span>
  }, {
    key: "team",
    label: "隊伍",
    width: 220,
    render: (row) => (
      <div className="ranking-team">
        <TeamMark name={row.team.name} shortName={row.team.shortName} logoUrl={row.team.logoUrl} size="small" />
        {row.team.slug ? (
          <Link to={`/teams/${row.team.slug}`} className="ranking-primary-link" title={row.team.name ?? undefined}>{row.team.name ?? "隊伍名稱尚未提供"}</Link>
        ) : (
          <span className="ranking-primary-link" title={row.team.name ?? undefined}>{row.team.name ?? "隊伍名稱尚未提供"}</span>
        )}
      </div>
    )
  }, {
    key: "maps",
    label: "地圖勝負",
    width: 104,
    align: "right",
    render: (row) => <span className="metric-muted">{row.stats.mapsWon}–{row.stats.mapsLost}</span>
  }, {
    key: "map-win",
    label: <MetricLabel label="地圖勝率" metric="mapWinPercentage" />,
    width: 112,
    align: "right",
    render: (row) => <span className="metric-value">{formatPercent(row.stats.mapWinPercentage)}</span>
  }];

  if (resource.state.status === "idle" || resource.state.status === "loading") {
    return (
      <div className="overview-page page-container overview-resource-state">
        <h1 className="visually-hidden" tabIndex={-1}>賽事總覽</h1>
        <LoadingState title="賽事資料載入中" message="正在載入賽事資料" variant="overview" />
      </div>
    );
  }

  if (resource.state.status === "error") {
    return (
      <div className="overview-page page-container overview-resource-state">
        <h1 className="overview-state-title" tabIndex={-1}>賽事總覽</h1>
        <ErrorState
          title="目前無法載入賽事資料"
          message={resource.state.error.userMessage}
          onRetry={resource.retry}
        />
      </div>
    );
  }

  const { data: overview } = resource.state.data;
  const { tournament, progress } = overview;
  const percentage = progress.matchesTotal === 0
    ? null
    : progress.matchesCompleted / progress.matchesTotal * 100;

  return (
    <div className="overview-page page-container">
      <section className="tournament-hero" aria-labelledby="overview-title">
        <div className="hero-copy">
          <div className="section-kicker hero-kicker">
            <span>賽事概況</span>
            <span className="kicker-line" aria-hidden="true" />
            <StatusBadge status={tournament.status} />
          </div>
          <motion.h1
            id="overview-title"
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <span>{tournament.name ?? "賽事名稱尚未提供"}</span>
          </motion.h1>
          <p className="hero-subtitle">查看賽程、結果、隊伍與選手統計。</p>
          <div className="hero-facts">
            {tournament.startDate || tournament.endDate ? (
              <div>
                <span className="fact-label">賽事期間</span>
                <span className="fact-value">
                  {tournament.startDate && tournament.endDate
                    ? `${formatLocalDate(tournament.startDate)} 至 ${formatLocalDate(tournament.endDate)}`
                    : tournament.startDate
                      ? `自 ${formatLocalDate(tournament.startDate)} 起`
                      : `截至 ${formatLocalDate(tournament.endDate)}`}
                </span>
              </div>
            ) : null}
            <div>
              <span className="fact-label">目前階段</span>
              <span className="fact-value stage-value"><i aria-hidden="true" />{formatStageLabel(tournament.currentStage)}</span>
            </div>
          </div>
        </div>
        <div className="hero-progress">
          <span className="progress-overline">賽事進度</span>
          <ProgressRing
            label="賽事"
            completed={progress.matchesCompleted}
            total={progress.matchesTotal}
            percentage={percentage}
          />
        </div>
      </section>

      <div className="overview-content-grid">
        <motion.section
          className="content-section upcoming-section"
          aria-labelledby="upcoming-title"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
        >
          <SectionHeader
            headingId="upcoming-title"
            title="即將開打"
            description="依排定時間排列，顯示本地時間"
            action={<Link className="quiet-link" to="/schedule">查看賽程 <span aria-hidden="true">↗</span></Link>}
          />
          {overview.upcomingMatches.length > 0 ? (
            <div className="match-list">
              {overview.upcomingMatches.map((match, index) => (
                <MatchCard key={match.id ?? `${match.scheduledAt ?? "upcoming"}-${index}`} match={match} variant="upcoming" />
              ))}
            </div>
          ) : (
            <EmptyState title="尚無近期賽程" message="目前沒有可顯示的賽事，請稍後再查看。" />
          )}
        </motion.section>

        <section className="content-section results-section" aria-labelledby="results-title">
          <SectionHeader headingId="results-title" title="近期結果" description="已完成對局與比分" />
          {overview.recentResults.length > 0 ? (
            <div className="match-list match-list--results">
              {overview.recentResults.map((match, index) => (
                <MatchCard key={match.id ?? `${match.scheduledAt ?? "result"}-${index}`} match={match} variant="result" />
              ))}
            </div>
          ) : (
            <EmptyState title="尚無完賽結果" message="賽事完成後，近期比分會顯示於此。" />
          )}
        </section>
      </div>

      <div className="overview-ranking-grid">
        <motion.section
          className="content-section players-section"
          aria-labelledby="players-title"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <SectionHeader
            headingId="players-title"
            title="選手排名"
            description="依 Rating 排序，顯示前五名"
            action={<Link className="quiet-link" to="/players">全部選手 <span aria-hidden="true">↗</span></Link>}
          />
          {overview.topPlayers.length > 0 ? (
            <RankingTable
              caption="前五名選手 Rating 排名"
              columns={playerColumns}
              rows={overview.topPlayers}
              getRowKey={(row) => row.player.slug ?? row.player.handle ?? String(row.rank)}
            />
          ) : (
            <EmptyState title="尚無選手統計" message="可用的選手資料會顯示於此。" />
          )}
        </motion.section>

        <motion.section
          className="content-section teams-section"
          aria-labelledby="teams-title"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.14 }}
        >
          <SectionHeader
            headingId="teams-title"
            title="隊伍排名"
            description="依地圖勝率排序，顯示前五隊"
            action={<Link className="quiet-link" to="/teams">所有隊伍 <span aria-hidden="true">↗</span></Link>}
          />
          {overview.topTeams.length > 0 ? (
            <RankingTable
              caption="前五名隊伍地圖勝率排名"
              columns={teamColumns}
              rows={overview.topTeams}
              getRowKey={(row) => row.team.slug ?? row.team.name ?? String(row.rank)}
            />
          ) : (
            <EmptyState title="尚無隊伍統計" message="可用的隊伍資料會顯示於此。" />
          )}
        </motion.section>
      </div>
    </div>
  );
};

export { OverviewPage };