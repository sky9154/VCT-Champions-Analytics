import { MetricLabel, type MetricId } from "../ui/MetricLabel";


interface MetricSummaryItem {
  label: string;
  value: string;
  metric?: MetricId;
}

interface MetricSummaryProps {
  items: MetricSummaryItem[];
}

const MetricSummary = ({ items }: MetricSummaryProps) => (
  <dl className="metric-summary">
    {items.map((item) => (
      <div className="metric-summary-item" key={item.label}>
        <dt>{item.metric ? <MetricLabel label={item.label} metric={item.metric} /> : item.label}</dt>
        <dd>{item.value}</dd>
      </div>
    ))}
  </dl>
);

export type { MetricSummaryItem };
export { MetricSummary };