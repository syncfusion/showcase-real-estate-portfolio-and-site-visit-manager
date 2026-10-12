import React from 'react';

// A KPI as a Syncfusion Card: the label in the card header beside its icon badge, the value and its change line
// in the content. Card is CSS only; the Tailwind 3 bundle styles it. Named by its label.
interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: React.ReactNode;
  /** Tone classes for the icon badge (TONE_BADGE in palette.ts, or the brand tone). */
  iconClassName: string;
  ariaLabel?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, detail, icon, iconClassName, ariaLabel }) => (
  // Display-only: not in the Tab order;
  // a screen reader reads it as a named group.
  <div className="e-card rep-kpi" role="group" aria-label={ariaLabel ?? label}>
    <div className="e-card-header">
      <div className="e-card-header-caption">
        <div className="e-card-header-title">{label}</div>
      </div>
      <div className={`rep-kpi-icon-badge ${iconClassName}`}>{icon}</div>
    </div>
    <div className="e-card-content">
      {/* A div, not a <p>: the theme gives card <p>s a 20px line and hides the overflow, which cut "Pending". */}
      <div className="rep-kpi-value">{value}</div>
      {detail && <div className="rep-kpi-detail flex flex-wrap items-center">{detail}</div>}
    </div>
  </div>
);
