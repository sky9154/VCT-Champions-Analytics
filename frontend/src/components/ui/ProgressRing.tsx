import { motion } from "motion/react";
import { formatPercent } from "../../utils/formatters";
import { useMotionReduced } from "../../contexts/UserPreferencesContext";


interface ProgressRingProps {
  label: string;
  completed: number | null;
  total: number | null;
  percentage: number | null;
}

const ProgressRing = ({ label, completed, total, percentage }: ProgressRingProps) => {
  const reduceMotion = useMotionReduced();
  const strokeOffset = percentage === null ? 100 : 100 - percentage;
  const hasMatchCounts = completed !== null && total !== null;
  const progressDescription = percentage === null
    ? `${label}尚無進度資料`
    : `${label}${formatPercent(percentage)}，已完成 ${completed} 場，共 ${total} 場`;

  return (
    <div className="progress-ring-wrap">
      <svg className="progress-ring" viewBox="0 0 120 120" role="img" aria-label={progressDescription}>
        <circle className="progress-ring-track" cx="60" cy="60" r="49" pathLength="100" />
        <motion.circle
          className="progress-ring-value"
          cx="60"
          cy="60"
          r="49"
          pathLength="100"
          initial={reduceMotion ? false : { strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: strokeOffset }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
        />
        <circle className="progress-ring-tick" cx="60" cy="11" r="2" />
      </svg>
      <div className="progress-ring-copy" aria-hidden="true">
        <span className="progress-ring-count">
          {hasMatchCounts ? <>{completed}<span>/</span>{total}</> : "尚無資料"}
        </span>
        <span className="progress-ring-label">場次完成</span>
        <span className="progress-ring-percent">{percentage === null ? "尚無資料" : formatPercent(percentage)}</span>
      </div>
    </div>
  );
};

export { ProgressRing };