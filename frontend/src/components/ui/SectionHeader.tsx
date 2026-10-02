import type { ReactNode } from "react";


interface SectionHeaderProps {
  eyebrow?: string;
  headingId: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

const SectionHeader = ({ eyebrow, headingId, title, description, action }: SectionHeaderProps) => (
  <div className="section-header">
    <div>
      {eyebrow ? <div className="section-kicker"><span>{eyebrow}</span></div> : null}
      <h2 id={headingId}>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
    {action ? <div className="section-action">{action}</div> : null}
  </div>
);

export { SectionHeader };