import React from 'react';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
  HardHat
} from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { sessionStore } from '@/services/sessionStore';
import { PortfolioMap } from '@/components/dashboard/PortfolioMap';
import { NoiChart } from '@/components/dashboard/NoiChart';
import { AssetClassChart } from '@/components/dashboard/AssetClassChart';
import { BAND_TONE, TONE_BADGE, TONE_TEXT, occupancyBand } from '@/styles/palette';

import { KpiCard } from '@/components/cards/KpiCard';
import { PanelCard } from '@/components/cards/PanelCard';

const BRAND_BADGE = 'bg-[var(--color-sf-bg-brand-subtle)] text-[var(--color-sf-fg-brand-primary)]';

// Year-on-year valuation change shown on the first KPI card; its tone follows the sign.
const VALUATION_YOY = 4.2;

export const DashboardPage: React.FC = () => {
  const { state } = useSessionStore();
  const summary = sessionStore.getPortfolioSummary();

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-sf-fg-primary)]">
            Executive Portfolio Overview
          </h1>
          <p className="text-sm text-[var(--color-sf-fg-secondary)] mt-1">
            Aggregated institutional real estate assets, NOI performance, inspection logistics, and target pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-sf-fg-secondary)] bg-[var(--color-sf-bg-surface-muted)] px-3 py-1.5 rounded-md border border-[var(--color-sf-border-primary)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-sf-fg-success-primary)] animate-pulse" />
          <span>Real-time In-Memory Session Cache</span>
        </div>
      </div>

      {/* KPI cards: Syncfusion Card. Icon tones follow
          "Colour semantics": occupancy from its band against the 95% target, the change line from its sign. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Portfolio Valuation" ariaLabel="Total Asset Valuation" value={formatCurrency(summary.totalValuation)}
          icon={<DollarSign size={18} aria-hidden="true" />} iconClassName={BRAND_BADGE}
          detail={<>
            <span className={`font-semibold mr-1.5 ${TONE_TEXT[VALUATION_YOY >= 0 ? 'success' : 'danger']}`}>
              {VALUATION_YOY >= 0 ? '+' : ''}{VALUATION_YOY}% YoY
            </span>
            <span>across {summary.totalProperties} properties</span>
          </>} />
        <KpiCard label="Weighted Occupancy" ariaLabel="Portfolio Occupancy Rate" value={`${summary.averageOccupancy}%`}
          icon={<Percent size={18} aria-hidden="true" />} iconClassName={TONE_BADGE[BAND_TONE[occupancyBand(Number(summary.averageOccupancy))]]}
          detail={<>
            <span className="font-semibold text-[var(--color-sf-fg-primary)] mr-1.5">95.0% Target</span>
            <span>({(summary.totalGrossSqFt / 1_000_000).toFixed(2)}M Gross SF)</span>
          </>} />
        <KpiCard label="Open Inspections" ariaLabel="Open Site Inspections" value={`${summary.openInspections.total} Open`}
          icon={<HardHat size={18} aria-hidden="true" />} iconClassName={TONE_BADGE.warning}
          detail={<>
            {/* The same three open columns as the Workflow Board, in the same words. */}
            <span className="font-semibold text-[var(--color-sf-fg-warning-primary)] mr-1.5">
              {summary.openInspections.highPriority} High Priority
            </span>
            <span>{summary.openInspections.scheduled} scheduled · {summary.openInspections['in-progress']} in progress · {summary.openInspections['pending-report']} awaiting report</span>
          </>} />
        {/* The label named WALT before; the card shows the weighted cap rate (recorded in the plan). */}
        <KpiCard label="Weighted Avg Cap Rate" ariaLabel="Weighted Average Cap Rate" value={`${summary.weightedCapRate.toFixed(2)}%`}
          icon={<Clock size={18} aria-hidden="true" />} iconClassName={BRAND_BADGE}
          detail={<>
            <span className="font-semibold text-[var(--color-sf-fg-primary)] mr-1.5">{formatCurrency(summary.totalNOI)}</span>
            <span>NOI, trailing 12 months, all 30 properties</span>
          </>} />
      </div>

      {/* Panels as Syncfusion Cards. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PanelCard className="lg:col-span-2" title="Geographic Asset Footprint (6 Primary US Markets)"
          icon={<Building2 size={18} />} aside="30 Institutional Properties" contentClassName="flex-1 min-h-[380px]">
          <PortfolioMap properties={state.properties} />
        </PanelCard>
        <PanelCard title="Asset Class Allocation" icon={<TrendingUp size={18} />} aside="Valuation Breakdown"
          contentClassName="flex-1 flex items-center justify-center min-h-[380px]">
          <AssetClassChart properties={state.properties} />
        </PanelCard>
      </div>

      <PanelCard title="Monthly NOI vs. Budget, All 30 Properties" icon={<DollarSign size={18} />}
        subtitle={`Trailing 12 months to Sep 2026; Actual months sum to ${formatCurrency(summary.totalNOI)}, the NOI above`}
        aside={
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--color-sf-fg-success-primary)]" aria-hidden="true" />
              <span className="text-[var(--color-sf-fg-secondary)]">NOI at or above budget</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--color-sf-fg-danger-primary)]" aria-hidden="true" />
              <span className="text-[var(--color-sf-fg-secondary)]">NOI below budget</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[var(--color-sf-chart-reference)]" aria-hidden="true" />
              <span className="text-[var(--color-sf-fg-secondary)]">Budget ($M)</span>
            </div>
          </div>
        }>
        <NoiChart annualNoi={summary.totalNOI} />
      </PanelCard>
    </div>
  );
};
