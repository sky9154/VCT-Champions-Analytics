import { Link } from "react-router-dom";
import type { ScheduleMatch } from "../../api/types";
import { formatDateTimeForZone, formatRoundLabel, formatStageLabel } from "../../utils/formatters";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { StatusBadge } from "./StatusBadge";
import { TeamMark } from "./TeamMark";


interface MatchCardProps {
  match: ScheduleMatch;
  variant: "upcoming" | "result";
}

const MatchCard = ({ match, variant }: MatchCardProps) => {
  const { preferences } = useUserPreferences();
  const score = match.score === null || match.score.teamA === null || match.score.teamB === null
    ? "尚無比分"
    : `${match.score.teamA} : ${match.score.teamB}`;
  const displayScore = match.status === "completed"
    ? score
    : match.status === "scheduled"
      ? match.bestOf === null ? "尚無比分" : `BO${match.bestOf}`
      : match.score?.teamA !== null && match.score?.teamA !== undefined
        && match.score.teamB !== null && match.score.teamB !== undefined
        ? score
        : "尚無比分";

  const renderTeam = (team: ScheduleMatch["teamA"]) => {
    if (team === null || (!team.slug && !team.name)) {
      return <span className="match-team-tbd">隊伍尚未確認</span>;
    }

    return (
      <>
        <TeamMark name={team.name} shortName={team.shortName} logoUrl={team.logoUrl} size="small" />
        {team.slug ? (
          <Link to={`/teams/${team.slug}`} className="match-team-name">{team.name ?? "隊伍名稱尚未提供"}</Link>
        ) : (
          <span className="match-team-name">{team.name ?? "隊伍名稱尚未提供"}</span>
        )}
      </>
    );
  };

  return (
    <article className={`match-card match-card--${variant}`}>
      <div className="match-card-meta">
        <span className="match-card-stage">{formatStageLabel(match.stage)}{match.group ? `｜${match.group} 組` : ""}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="match-card-body">
        <div className="match-team-list">
          <div className="match-team">{renderTeam(match.teamA)}</div>
          <div className="match-team">{renderTeam(match.teamB)}</div>
        </div>
        <div className="match-card-score" aria-label={match.status === "completed" ? `比分 ${score}` : displayScore}>
          {displayScore}
        </div>
      </div>
      <div className="match-card-foot">
        <span>{formatRoundLabel(match.round)}</span>
        <time dateTime={match.scheduledAt ?? undefined}>{match.scheduledAt ? formatDateTimeForZone(match.scheduledAt, preferences.timeZone) : "尚未排程"}</time>
      </div>
    </article>
  );
};

export { MatchCard };