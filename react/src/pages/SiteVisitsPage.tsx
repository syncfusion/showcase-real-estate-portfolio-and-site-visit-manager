import React, { useState, useMemo, useCallback } from 'react';
import {
  ScheduleComponent,
  Day,
  Week,
  Month,
  Agenda,
  Inject,
  ViewsDirective,
  ViewDirective,
  DragAndDrop,
  Resize,
  ActionEventArgs,
  PopupOpenEventArgs
} from '@syncfusion/ej2-react-schedule';
import {
  KanbanComponent,
  ColumnsDirective,
  ColumnDirective
} from '@syncfusion/ej2-react-kanban';
import { CalendarClock, Kanban, Calendar } from 'lucide-react';
import { useSessionStore } from '@/hooks/useSessionStore';
import { useTheme } from '@/context/ThemeContext';
import { LoadingState } from '@/components/LoadingState';
import { PanelCard } from '@/components/cards/PanelCard';
import { sessionStore } from '@/services/sessionStore';
import { SiteVisit, SiteVisitStatus } from '@/domain/types';
import { VisitFields, VisitFormData } from '@/components/editors/VisitFields';
import { placeErrorUnderField } from '@/components/editors/placeError';
import { VISIT_STATUS_TEXT } from '@/domain/visitOptions';

// A calendar event carries the visit's fields under the visit's own names; Id, Subject, StartTime and
// EndTime are the Scheduler's.
type VisitEvent = VisitFormData & { Id?: string; Subject?: string; StartTime: Date; EndTime: Date };

// The fields an editor may change; status moves on the board, the id never changes.
const EDITABLE = ['propertyId', 'type', 'inspectorName', 'priority', 'findingsSummary', 'estimatedRepairCost'] as const;

// A form validator instance the Scheduler and Kanban attach to their editor form (ej2_instances[0]).
type FormRules = {
  addRules: (name: string, rules: Record<string, unknown>) => void;
  customPlacement?: (input: HTMLElement, error: HTMLElement) => void;
};
const formValidator = (form: Element | null) =>
  (form as (Element & { ej2_instances?: FormRules[] }) | null)?.ej2_instances?.[0];

// Kanban keys each card by cardSettings.headerField, so it is the visit id; the card shows the property and
// the visit type. Keyed by property name before,
// two visits to one property shared a key and a drag moved the wrong card. Module level: templates read
// only the record.
const visitCard = (visit: SiteVisit) => (
  <div className="px-3 py-2.5">
    <div className="text-sm font-medium text-[var(--color-sf-fg-primary)]">{visit.propertyName}</div>
    <div className="mt-1 text-sm text-[var(--color-sf-fg-secondary)]">{visit.type}</div>
  </div>
);

// Allowed moves: forward through the workflow, one step back where rework is real; a
// cleared visit is closed. A closed column lists only itself: an empty list would allow every column.
const VISIT_MOVES: Record<SiteVisitStatus, SiteVisitStatus[]> = {
  scheduled: ['in-progress'],
  'in-progress': ['pending-report', 'scheduled'],
  'pending-report': ['cleared', 'in-progress'],
  cleared: ['cleared']
};

export const SiteVisitsPage: React.FC = () => {
  const { ready: themeReady } = useTheme();
  const { state } = useSessionStore();
  const [viewMode, setViewMode] = useState<'calendar' | 'kanban'>('calendar');

  // Each visit as a calendar event with its own fields.
  const scheduleEvents = useMemo<VisitEvent[]>(() => state.siteVisits.map((v) => ({
    ...v,
    Id: v.id,
    Subject: `${v.type} — ${v.propertyName}`,
    StartTime: new Date(v.scheduledStart),
    EndTime: new Date(v.scheduledEnd)
  })), [state.siteVisits]);

  const propertyOptions = useMemo(() => state.properties.map((p) => ({ id: p.id, name: p.name })), [state.properties]);
  const inspectorEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of state.siteVisits) map.set(v.inspectorName, v.inspectorEmail);
    return map;
  }, [state.siteVisits]);
  const inspectors = useMemo(() => [...inspectorEmail.keys()].sort(), [inspectorEmail]);

  // An editor's values as visit fields: the property's name and the inspector's email follow their choice.
  const toVisitFields = useCallback((data: VisitFormData) => {
    const fields: Partial<SiteVisit> = {};
    for (const key of EDITABLE) if (data[key] !== undefined) (fields as Record<string, unknown>)[key] = data[key];
    if (fields.propertyId) fields.propertyName = state.properties.find((p) => p.id === fields.propertyId)?.name ?? '';
    if (fields.inspectorName) fields.inspectorEmail = inspectorEmail.get(fields.inspectorName) ?? '';
    // Kanban hands the numeric box's display text ("$12,500"); the Scheduler hands the number.
    if (fields.estimatedRepairCost != null) fields.estimatedRepairCost = Number(String(fields.estimatedRepairCost).replace(/[^0-9.-]/g, '')) || 0;
    return fields;
  }, [state.properties, inspectorEmail]);

  // The visit editor. The Scheduler fills its fields from the event data after the template renders, so a
  // new visit's defaults are set on that data in onPopupOpen.
  const editorTemplate = useCallback((props?: VisitEvent) => props
    ? <VisitFields idPrefix="visit-editor" data={props} properties={propertyOptions} inspectors={inspectors} withTimes />
    : <div />, [propertyOptions, inspectors]);

  // Required fields and End after Start, on the editor form's own validator; no Delete for a visit that is
  // under way or done; no quick-add pop-up on an empty cell (it creates an event with a title only).
  const onPopupOpen = (args: PopupOpenEventArgs) => {
    const data = args.data as VisitEvent | undefined;
    if (args.type === 'QuickInfo' && !data?.Id) { args.cancel = true; return; }
    if (args.type === 'Editor' || args.type === 'QuickInfo') {
      const remove = args.element?.querySelector<HTMLElement>('.e-event-delete');
      if (remove) remove.style.display = data?.Id && data.status !== 'scheduled' ? 'none' : '';
    }
    if (args.type === 'Editor' && !data?.Id) {
      // A new visit: the Scheduler fills the fields from the clicked cell after this event, so the defaults
      // go on the controls a frame later (each DropDownList also has a hidden select element with the same
      // data-name, hence .e-control). A day double-clicked in Month view arrives as midnight to midnight:
      // the visit starts at 9:00 for three hours, Medium priority, no repair cost yet.
      requestAnimationFrame(() => {
        const control = <T,>(name: string) => (args.element?.querySelector(`.e-control[data-name="${name}"]`) as
          (Element & { ej2_instances?: { value: T; dataBind?: () => void }[] }) | null)?.ej2_instances?.[0];
        const set = <T,>(name: string, value: T) => { const c = control<T>(name); if (c) { c.value = value; c.dataBind?.(); } };
        const start = control<Date>('StartTime')?.value; const end = control<Date>('EndTime')?.value;
        const span = start && end ? end.getTime() - start.getTime() : -1;
        if (start && start.getHours() === 0 && start.getMinutes() === 0 && (span <= 0 || span >= 86_400_000)) {
          const at9 = new Date(start); at9.setHours(9, 0, 0, 0);
          set('StartTime', at9); set('EndTime', new Date(at9.getTime() + 3 * 3_600_000));
        }
        if (!control<string>('priority')?.value) set('priority', 'Medium');
        if (control<number>('estimatedRepairCost')?.value == null) set('estimatedRepairCost', 0);
      });
    }
    if (args.type === 'Editor') {
      const title = args.element?.querySelector('.e-title-text');
      if (title) title.textContent = data?.Id ? 'Edit site visit' : 'New site visit';
      const validator = formValidator(args.element?.querySelector('.e-schedule-form') ?? null);
      if (validator) validator.customPlacement = placeErrorUnderField;
      for (const name of ['propertyId', 'type', 'inspectorName']) validator?.addRules(name, { required: [true, 'Required'] });
      validator?.addRules('EndTime', {
        required: [true, 'Required'],
        endAfterStart: [() => {
          const value = (field: string) => (args.element?.querySelector(`.e-control[data-name="${field}"]`) as
            (Element & { ej2_instances?: { value?: Date }[] }) | null)?.ej2_instances?.[0]?.value;
          const start = value('StartTime'); const end = value('EndTime');
          return !start || !end || end > start;
        }, 'End must be after Start']
      });
    }
  };

  // Every calendar change goes to the store, which re-renders the calendar, board, Dashboard and Properties
  // page from one list; the Scheduler's own copy of the change is cancelled.
  const onActionBegin = (args: ActionEventArgs) => {
    const records = (list?: unknown) => (Array.isArray(list) ? list : list ? [list] : []) as VisitEvent[];
    if (args.requestType === 'eventCreate') {
      args.cancel = true;
      for (const e of records(args.addedRecords ?? args.data)) {
        sessionStore.addSiteVisit({
          propertyId: '', propertyName: '', type: 'Annual PCA', inspectorName: '', inspectorEmail: '', priority: 'Medium',
          findingsSummary: '', estimatedRepairCost: 0, ...toVisitFields(e),
          scheduledStart: new Date(e.StartTime).toISOString(), scheduledEnd: new Date(e.EndTime).toISOString()
        });
      }
    } else if (args.requestType === 'eventChange') {
      args.cancel = true;
      for (const e of records(args.changedRecords ?? args.data)) {
        if (!e.Id) continue;
        sessionStore.updateSiteVisit(e.Id, {
          ...toVisitFields(e),
          scheduledStart: new Date(e.StartTime).toISOString(), scheduledEnd: new Date(e.EndTime).toISOString()
        });
      }
    } else if (args.requestType === 'eventRemove') {
      args.cancel = true;
      for (const e of records(args.deletedRecords ?? args.data)) if (e.Id) sessionStore.deleteSiteVisit(e.Id);
    }
  };

  // The event pop-up: the visit's own fields instead of one line of free text.
  const quickInfoContent = (props: VisitEvent) => props.Id ? (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs p-1">
      <dt className="text-[var(--color-sf-fg-secondary)]">Property</dt><dd>{props.propertyName}</dd>
      <dt className="text-[var(--color-sf-fg-secondary)]">Inspection</dt><dd>{props.type}</dd>
      <dt className="text-[var(--color-sf-fg-secondary)]">Inspector</dt><dd>{props.inspectorName}</dd>
      <dt className="text-[var(--color-sf-fg-secondary)]">Priority</dt><dd>{props.priority}</dd>
      <dt className="text-[var(--color-sf-fg-secondary)]">Status</dt><dd>{props.status ? VISIT_STATUS_TEXT[props.status] : ''}</dd>
      <dt className="text-[var(--color-sf-fg-secondary)]">Findings</dt><dd>{props.findingsSummary || 'Not recorded yet'}</dd>
    </dl>
  ) : <div />;

  // The board's card dialog: the same fields, without times (set on the calendar) or status (moves on the
  // board); Delete hidden.
  const visitDialog = useCallback((props: SiteVisit) => (
    <VisitFields idPrefix="visit-card" data={props} properties={propertyOptions} inspectors={inspectors} />
  ), [propertyOptions, inspectors]);
  const onDialogOpen = (args: { element?: HTMLElement; cancel?: boolean }) => {
    args.element?.querySelectorAll<HTMLElement>('.e-dialog-delete').forEach((b) => { b.style.display = 'none'; });
    const title = args.element?.querySelector('.e-dlg-header');
    if (title) title.textContent = 'Edit site visit';
    const validator = formValidator(args.element?.querySelector('.e-kanban-form') ?? null);
    if (validator) validator.customPlacement = placeErrorUnderField;
    for (const name of ['propertyId', 'type', 'inspectorName']) validator?.addRules(name, { required: [true, 'Required'] });
  };

  // Kanban card action: update status
  const handleKanbanActionComplete = (args: {
    requestType?: string;
    changedRecords?: Array<{ id?: string; status?: string }>;
  }) => {
    if (args.requestType === 'cardChanged' && args.changedRecords && args.changedRecords.length > 0) {
      const record = args.changedRecords[0];
      const current = state.siteVisits.find((v) => v.id === record.id);
      if (record.id && current) {
        // A drag changes the status; the card dialog changes the visit's fields.
        if (record.status && record.status !== current.status) {
          sessionStore.updateSiteVisitStatus(record.id, record.status as SiteVisitStatus);
        }
        sessionStore.updateSiteVisit(record.id, toVisitFields(record as VisitFormData));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-sf-fg-primary)]">
            Site Visits & Inspections
          </h1>
          <p className="text-sm text-[var(--color-sf-fg-secondary)] mt-1">
            Dispatch, track, and complete physical property audits, HVAC inspections, and appraisal walk-throughs.
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-sf-bg-surface-muted)] p-1 rounded-lg border border-[var(--color-sf-border-primary)] self-start">
          <button
            type="button"
            // A view toggle: the active view is announced as pressed (and is a state, not a hover target).
            aria-pressed={viewMode === 'calendar'}
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-[var(--app-card-bg)] text-[var(--color-sf-fg-primary)] shadow-xs font-semibold'
                : 'text-[var(--color-sf-fg-secondary)] hover:text-[var(--color-sf-fg-primary)]'
            }`}
          >
            <Calendar size={14} aria-hidden="true" />
            Schedule View
          </button>
          <button
            type="button"
            // A view toggle: the active view is announced as pressed (and is a state, not a hover target).
            aria-pressed={viewMode === 'kanban'}
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-[var(--app-card-bg)] text-[var(--color-sf-fg-primary)] shadow-xs font-semibold'
                : 'text-[var(--color-sf-fg-secondary)] hover:text-[var(--color-sf-fg-primary)]'
            }`}
          >
            <Kanban size={14} aria-hidden="true" />
            Workflow Board
          </button>
        </div>
      </div>

      {/* Main Content Area: a Syncfusion Card panel. */}
      <PanelCard
        title={`${viewMode === 'calendar' ? 'Field Inspection Calendar' : 'Dispatch Workflow Board'} (${state.siteVisits.length} Visits Logged)`}
        icon={<CalendarClock size={18} />}
        aside={viewMode === 'calendar' ? 'Month / Week / Agenda views' : 'Drag a card to the next step, or one step back; cleared visits are closed'}>
          {viewMode === 'calendar' ? (
            <div className="min-h-[620px]">
              {/* Mounted once the Syncfusion theme bundle has loaded: laid out unstyled (behind the startup
                  screen on a cold load), Month view drew 0 of its appointments in about 1 load in 3 and never
                  redrew them (35.1.37; refreshEvents() brought them back). */}
              {themeReady ? (
              <ScheduleComponent
                id="site-visits-schedule"
                // The demo's "today"; the visits sit around it.
                selectedDate={new Date('2026-10-15')}
                eventSettings={{
                  dataSource: scheduleEvents
                }}
                currentView="Month"
                editorTemplate={editorTemplate}
                quickInfoTemplates={{ content: quickInfoContent }}
                popupOpen={onPopupOpen}
                actionBegin={onActionBegin}
              >
                <ViewsDirective>
                  <ViewDirective option="Month" />
                  <ViewDirective option="Week" />
                  <ViewDirective option="Agenda" />
                </ViewsDirective>
                <Inject services={[Day, Week, Month, Agenda, DragAndDrop, Resize]} />
              </ScheduleComponent>
              ) : <LoadingState label="Loading calendar…" />}
            </div>
          ) : (
            <div className="min-h-[620px]">
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Inspection workflow board (scrolls sideways on narrow screens)">
            {/* About 220px per column: on a phone the board scrolls instead of squeezing cards to one letter per line. */}
            <div className="min-w-[880px]">
            <KanbanComponent
                id="site-visits-kanban"
                keyField="status"
                dataSource={state.siteVisits}
                cardSettings={{
                  headerField: 'id',
                  template: visitCard
                }}
                dialogSettings={{ template: visitDialog, model: { width: 'min(560px, calc(100vw - 32px))' } }}
                dialogOpen={onDialogOpen}
                actionComplete={handleKanbanActionComplete}
              >
                <ColumnsDirective>
                  <ColumnDirective headerText="Scheduled" keyField="scheduled" transitionColumns={VISIT_MOVES.scheduled} />
                  <ColumnDirective headerText="In Progress" keyField="in-progress" transitionColumns={VISIT_MOVES['in-progress']} />
                  <ColumnDirective headerText="Pending Report" keyField="pending-report" transitionColumns={VISIT_MOVES['pending-report']} />
                  <ColumnDirective headerText="Cleared" keyField="cleared" transitionColumns={VISIT_MOVES.cleared} />
                </ColumnsDirective>
              </KanbanComponent>
            </div>
          </div>
            </div>
          )}
      </PanelCard>
    </div>
  );
};
