import React, { useId } from 'react';

// A titled panel (a chart, map, grid or list with a heading) as a Syncfusion Card: icon and title, an
// optional sub-title, and an optional note or control on the right of the header; the content below.
interface PanelCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Right side of the header: a hint, a count or a control. */
  aside?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export const PanelCard: React.FC<PanelCardProps> = ({ title, subtitle, icon, aside, className = '', contentClassName = '', children }) => {
  const titleId = useId();
  return (
    <section className={`e-card rep-panel ${className}`} aria-labelledby={titleId}>
      <div className="e-card-header">
        {icon && <span className="rep-panel-icon" aria-hidden="true">{icon}</span>}
        <div className="e-card-header-caption">
          <h2 id={titleId} className="e-card-header-title">{title}</h2>
          {subtitle && <div className="e-card-sub-title">{subtitle}</div>}
        </div>
        {aside && <div className="rep-panel-aside">{aside}</div>}
      </div>
      <div className={`e-card-content ${contentClassName}`}>{children}</div>
    </section>
  );
};
