import { METRIC_DESCRIPTIONS } from "../../utils/metricDescriptions";
import { Tooltip } from "./Tooltip";


export type MetricId = keyof typeof METRIC_DESCRIPTIONS;

interface MetricLabelProps {
  label: string;
  metric: MetricId;
}

const MetricLabel = ({ label, metric }: MetricLabelProps) => (
  <Tooltip label={label} content={METRIC_DESCRIPTIONS[metric]} />
);

export { MetricLabel };