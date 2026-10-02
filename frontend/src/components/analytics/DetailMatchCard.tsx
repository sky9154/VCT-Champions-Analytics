import { Link } from "react-router-dom";
import type { PlayerRecentMatch, TeamRecentMatch } from "../../api/types";
import { formatDateTimeForZone, formatNumber } from "../../utils/formatters";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { TeamMark } from "../ui/TeamMark";


interface DetailMatchCardProps {
  match: TeamRecentMatch | PlayerRecentMatch;
}

const DetailMatchCard = ({ match }: DetailMatchCardProps) => {
  const { preferences } = useUserPreferences();
  const isOngoing = match.status === "live";
  const resultLabel = isOngoing
    ? "進行中"
    : match.result.win === true
      ? "勝"
      : match.result.win === false
        ? "敗"
        : "結果確認中";
  const resultClass = isOngoing
    ? "detail-match-result--ongoing"
    : match.result.win === true
      ? "detail-match-result--win"
      : match.result.win === false
        ? "detail-match-result--loss"
        : "detail-match-result--unknown";
  const score = match.result.ownScore !== null && match.result.opponentScore !== null
    ? `${match.result.ownScore} - ${match.result.opponentScore}`
    : "尚無比分";
  const playerStats = "rating" in match
    ? `Rating ${formatNumber(match.rating, 2)}｜ACS ${formatNumber(match.acs, 0)}｜K/D ${formatNumber(match.kd, 2)}`
    : null;

  return (
    <article className="detail-match-card">
      <div className="detail-match-heading">
        <time dateTime={match.scheduledAt ?? undefined}>{match.scheduledAt ? formatDateTimeForZone(match.scheduledAt, preferences.timeZone) : "尚未排程"}</time>
        <span className={`detail-match-result ${resultClass}`}>{resultLabel}</span>
      </div>
      <div className="detail-match-body">
        <div>
          <span className="detail-match-label">對手</span>
          <div className="detail-match-team">
            <TeamMark
              name={match.opponent?.name ?? null}
              shortName={match.opponent?.name ?? null}
              logoUrl={match.opponent?.logoUrl}
              size="small"
            />
            {match.opponent?.slug ? (
              <Link to={`/teams/${match.opponent.slug}`} className="detail-match-opponent">
                {match.opponent.name ?? "對手資料尚未提供"}
              </Link>
            ) : (
              <strong className="detail-match-opponent">{match.opponent?.name ?? "對手資料尚未提供"}</strong>
            )}
          </div>
        </div>
        <div className="detail-match-score-block">
          <span className="detail-match-label">系列賽比分</span>
          <strong className="detail-match-score">{score}</strong>
        </div>
      </div>
      {playerStats ? <p className="detail-match-player-stats">{playerStats}</p> : null}
    </article>
  );
};

export { DetailMatchCard };