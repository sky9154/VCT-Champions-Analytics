interface StatusBadgeProps {
  status: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "即將開始",
  upcoming: "即將開始",
  live: "進行中",
  ongoing: "進行中",
  completed: "已完成",
  postponed: "延期",
  cancelled: "取消"
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const knownStatus = status !== null && Object.prototype.hasOwnProperty.call(STATUS_LABELS, status)
    ? status
    : "data-pending";
  const label = knownStatus === "data-pending" ? "狀態尚未提供" : STATUS_LABELS[knownStatus];

  return (
    <span className={`status-badge status-badge--${knownStatus}`}>
      {knownStatus === "live" || knownStatus === "ongoing" ? <span className="status-pulse" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
};

export { StatusBadge };