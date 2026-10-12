import React, { useMemo, useCallback } from 'react';
import {
  KanbanComponent,
  ColumnsDirective,
  ColumnDirective
} from '@syncfusion/ej2-react-kanban';
import { Handshake, DollarSign, Target, TrendingUp, BarChart3, Percent } from 'lucide-react';
import { KpiCard } from '@/components/cards/KpiCard';
import { PanelCard } from '@/components/cards/PanelCard';
import { DealValueChart, CapRateChart } from '@/components/pipeline/PipelineCharts';
import { useSessionStore } from '@/hooks/useSessionStore';
import { sessionStore } from '@/services/sessionStore';
import { PipelineDeal, PipelineStage } from '@/domain/types';
import { DealFields } from '@/components/editors/DealFields';
import { placeErrorUnderField } from '@/components/editors/placeError';

// Kanban hands a numeric box's display text ("$185,000,000", "6.75") and a date picker's Date or text.
const toNumber = (value: unknown) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const toIsoDate = (value: unknown) => {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
type FormRules = { addRules: (name: string, rules: Record<string, unknown>) => void; customPlacement?: (input: HTMLElement, error: HTMLElement) => void };

// Kanban keys each card by cardSettings.headerField, so it is the deal id (deal names happened to be
// unique, but are not a key); the card shows the deal, its asset class and city. Module level: templates read only the record.
const dealCard = (deal: PipelineDeal) => (
  <div className="px-3 py-2.5">
    <div className="text-sm font-medium text-[var(--color-sf-fg-primary)]">{deal.dealName}</div>
    <div className="mt-1 text-sm text-[var(--color-sf-fg-secondary)]">{deal.assetClass} · {deal.targetCity}</div>
  </div>
);

// Allowed moves: one stage forward, or one back to rework; a stage is never skipped.
const BRAND_BADGE = 'bg-[var(--color-sf-bg-brand-subtle)] text-[var(--color-sf-fg-brand-primary)]';

const DEAL_MOVES: Record<PipelineStage, PipelineStage[]> = {
  sourcing: ['loi'],
  loi: ['due-diligence', 'sourcing'],
  'due-diligence': ['underwriting', 'loi'],
  underwriting: ['closing', 'due-diligence'],
  closing: ['underwriting']
};

export const PipelinePage: React.FC = () => {
  const { state } = useSessionStore();

  const totalPipelineValue = useMemo(
    () => state.pipelineDeals.reduce((sum, d) => sum + d.estimatedValuation, 0),
    [state.pipelineDeals]
  );

  const weightedPipelineValue = useMemo(
    () =>
      state.pipelineDeals.reduce(
        (sum, d) => sum + (d.estimatedValuation * d.probability) / 100,
        0
      ),
    [state.pipelineDeals]
  );

  const brokers = useMemo(() => [...new Set(state.pipelineDeals.map((d) => d.leadBroker))].sort(), [state.pipelineDeals]);

  // The card dialog: the deal's fields; Delete hidden.
  const dealDialog = useCallback((props: PipelineDeal) => <DealFields data={props} brokers={brokers} />, [brokers]);
  const onDialogOpen = (args: { element?: HTMLElement }) => {
    args.element?.querySelectorAll<HTMLElement>('.e-dialog-delete').forEach((b) => { b.style.display = 'none'; });
    const title = args.element?.querySelector('.e-dlg-header');
    if (title) title.textContent = 'Edit deal';
    const validator = (args.element?.querySelector('.e-kanban-form') as (Element & { ej2_instances?: FormRules[] }) | null)?.ej2_instances?.[0];
    if (validator) validator.customPlacement = placeErrorUnderField;
    for (const name of ['dealName', 'targetCity']) validator?.addRules(name, { required: [true, 'Required'] });
  };

  // A drag changes the stage; the card dialog changes the deal's fields.
  const handleKanbanActionComplete = (args: {
    requestType?: string;
    changedRecords?: Array<Partial<Record<keyof PipelineDeal, unknown>>>;
  }) => {
    if (args.requestType === 'cardChanged' && args.changedRecords && args.changedRecords.length > 0) {
      const record = args.changedRecords[0];
      const current = state.pipelineDeals.find((d) => d.id === record.id);
      if (!current || typeof record.id !== 'string') return;
      if (record.stage && record.stage !== current.stage) {
        sessionStore.updateDealStage(record.id, record.stage as PipelineStage);
      }
      const changes: Partial<PipelineDeal> = {};
      if (typeof record.dealName === 'string') changes.dealName = record.dealName;
      if (typeof record.assetClass === 'string') changes.assetClass = record.assetClass as PipelineDeal['assetClass'];
      if (typeof record.targetCity === 'string') changes.targetCity = record.targetCity;
      if (typeof record.leadBroker === 'string') changes.leadBroker = record.leadBroker;
      if (record.estimatedValuation != null) changes.estimatedValuation = toNumber(record.estimatedValuation);
      if (record.projectedCapRate != null) changes.projectedCapRate = toNumber(record.projectedCapRate);
      if (record.probability != null) changes.probability = Math.min(100, toNumber(record.probability));
      const closing = toIsoDate(record.targetClosingDate);
      if (closing) changes.targetClosingDate = closing;
      sessionStore.updateDeal(record.id, changes);
    }
  };

  const formatCurrency = (val: number) => `$${(val / 1_000_000).toFixed(1)}M`;
  const lateStageDeals = state.pipelineDeals.filter((d) => d.stage === 'underwriting' || d.stage === 'closing').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-sf-fg-primary)]">
            Acquisition Pipeline
          </h1>
          <p className="text-sm text-[var(--color-sf-fg-secondary)] mt-1">
            Institutional investment opportunities moving through Sourcing, LOI, Due Diligence, and Closing.
          </p>
        </div>
      </div>

      {/* KPI cards: Syncfusion Card. Counts judge nothing, so the
          icons use the brand tone, not green or amber ("Colour semantics"). */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Gross Pipeline Volume" ariaLabel="Total Pipeline Volume" value={formatCurrency(totalPipelineValue)}
          detail={`${state.pipelineDeals.length} active opportunities`} icon={<DollarSign size={18} aria-hidden="true" />} iconClassName={BRAND_BADGE} />
        <KpiCard label="Probability-Weighted" ariaLabel="Weighted Pipeline Volume" value={formatCurrency(weightedPipelineValue)}
          detail="Risk-adjusted acquisition allocation" icon={<Target size={18} aria-hidden="true" />} iconClassName={BRAND_BADGE} />
        <KpiCard label="Underwriting & Closing" ariaLabel="Late-Stage Deals" value={`${lateStageDeals} Deals`}
          detail="Targeting close in next 90 days" icon={<TrendingUp size={18} aria-hidden="true" />} iconClassName={BRAND_BADGE} />
      </div>

      {/* Pipeline charts: value by stage, and how the deals' cap rates spread. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelCard title="Deal Value by Stage" subtitle="Total and probability-weighted valuation, in workflow order"
          icon={<BarChart3 size={18} />}>
          <DealValueChart deals={state.pipelineDeals} />
        </PanelCard>
        <PanelCard title="Projected Cap Rate Distribution" subtitle="Deals per half-point band"
          icon={<Percent size={18} />}>
          <CapRateChart deals={state.pipelineDeals} />
        </PanelCard>
      </div>

      {/* Kanban Board */}
      <PanelCard title={`Deal Flow Pipeline (${state.pipelineDeals.length} Opportunities)`} icon={<Handshake size={18} />}
        aside="Drag a deal one stage forward, or one stage back; stages are never skipped" contentClassName="rep-panel-flush">
        <div className="p-4 min-h-[620px]">
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Deal flow pipeline board (scrolls sideways on narrow screens)">
            {/* About 220px per column: on a phone the board scrolls instead of squeezing cards to one letter per line. */}
            <div className="min-w-[1100px]">
            <KanbanComponent
            id="pipeline-deals-kanban"
            keyField="stage"
            dataSource={state.pipelineDeals}
            cardSettings={{
              headerField: 'id',
              template: dealCard
            }}
            dialogSettings={{ template: dealDialog, model: { width: 'min(560px, calc(100vw - 32px))' } }}
            dialogOpen={onDialogOpen}
            actionComplete={handleKanbanActionComplete}
          >
            <ColumnsDirective>
              <ColumnDirective headerText="Sourcing" keyField="sourcing" transitionColumns={DEAL_MOVES.sourcing} />
              <ColumnDirective headerText="LOI" keyField="loi" transitionColumns={DEAL_MOVES.loi} />
              <ColumnDirective headerText="Due Diligence" keyField="due-diligence" transitionColumns={DEAL_MOVES['due-diligence']} />
              <ColumnDirective headerText="Underwriting" keyField="underwriting" transitionColumns={DEAL_MOVES.underwriting} />
              <ColumnDirective headerText="Closing" keyField="closing" transitionColumns={DEAL_MOVES.closing} />
            </ColumnsDirective>
          </KanbanComponent>
            </div>
          </div>
        </div>
      </PanelCard>
    </div>
  );
};
