import React from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { DateTimePickerComponent } from '@syncfusion/ej2-react-calendars';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { SiteVisit } from '@/domain/types';
import { INSPECTION_TYPES, PRIORITIES, VISIT_STATUS_TEXT } from '@/domain/visitOptions';

// The visit's own fields for the calendar editor and the board's card dialog. Each input is a Syncfusion control with a visible
// label tied to it, and the `e-field` class with `name`/`data-name` set to the visit field, which the
// Scheduler and Kanban read when the editor is saved.

export type VisitFormData = Partial<SiteVisit> & { StartTime?: Date; EndTime?: Date };

interface Props {
  idPrefix: string;
  data: VisitFormData;
  properties: { id: string; name: string }[];
  inspectors: string[];
  withTimes?: boolean;
}

const Field: React.FC<{ id: string; label: string; wide?: boolean; children: React.ReactNode }> = ({ id, label, wide, children }) => (
  <div className={wide ? 'sm:col-span-2' : undefined} data-editor-field>
    <label htmlFor={id} className="block text-xs font-semibold text-[var(--color-sf-fg-secondary)] mb-1">{label}</label>
    {children}
  </div>
);

export const VisitFields: React.FC<Props> = ({ idPrefix, data, properties, inspectors, withTimes }) => {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="rep-editor grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-1">
      {data.status && (
        <p className="sm:col-span-2 text-xs text-[var(--color-sf-fg-secondary)]">
          Status: <strong className="text-[var(--color-sf-fg-primary)]">{VISIT_STATUS_TEXT[data.status]}</strong>
          {' '}(changed by moving the card on the Workflow Board)
        </p>
      )}
      <Field id={id('propertyId')} label="Property" wide>
        <DropDownListComponent id={id('propertyId')} name="propertyId" data-name="propertyId" className="e-field"
          dataSource={properties} fields={{ value: 'id', text: 'name' }} value={data.propertyId ?? null}
          placeholder="Choose a property" popupHeight="260px" />
      </Field>
      <Field id={id('type')} label="Inspection type">
        <DropDownListComponent id={id('type')} name="type" data-name="type" className="e-field"
          dataSource={INSPECTION_TYPES} value={data.type ?? null} placeholder="Choose a type" />
      </Field>
      <Field id={id('priority')} label="Priority">
        <DropDownListComponent id={id('priority')} name="priority" data-name="priority" className="e-field"
          dataSource={PRIORITIES} value={data.priority ?? 'Medium'} />
      </Field>
      <Field id={id('inspectorName')} label="Inspector" wide>
        <DropDownListComponent id={id('inspectorName')} name="inspectorName" data-name="inspectorName" className="e-field"
          dataSource={inspectors} value={data.inspectorName ?? null} placeholder="Choose an inspector" />
      </Field>
      {withTimes && (
        <>
          <Field id={id('StartTime')} label="Start">
            <DateTimePickerComponent id={id('StartTime')} name="StartTime" data-name="StartTime" className="e-field"
              value={data.StartTime} format="MMM d, y h:mm a" step={30} />
          </Field>
          <Field id={id('EndTime')} label="End">
            <DateTimePickerComponent id={id('EndTime')} name="EndTime" data-name="EndTime" className="e-field"
              value={data.EndTime} format="MMM d, y h:mm a" step={30} />
          </Field>
        </>
      )}
      <Field id={id('estimatedRepairCost')} label="Estimated repair cost">
        <NumericTextBoxComponent id={id('estimatedRepairCost')} name="estimatedRepairCost" data-name="estimatedRepairCost"
          className="e-field" format="c0" min={0} step={500} value={data.estimatedRepairCost ?? 0} />
      </Field>
      <Field id={id('findingsSummary')} label="Findings" wide>
        {/* A Syncfusion-styled text area: the multi-line TextBoxComponent does not pass data-name to its
            textarea, and the Scheduler's editor fails on an e-field without it (35.1.37). */}
        <textarea id={id('findingsSummary')} name="findingsSummary" data-name="findingsSummary" className="e-field e-input"
          rows={3} defaultValue={data.findingsSummary ?? ''} placeholder="Not recorded yet" style={{ resize: 'vertical' }} />
      </Field>
    </div>
  );
};
