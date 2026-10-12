import React from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { AssetClass, PipelineDeal } from '@/domain/types';

// The deal's own fields for the Pipeline board's card dialog. Stage moves on the board, within the allowed moves; the id never shows. Each control has a
// visible label and the `e-field` class with `name` set to the deal field, which Kanban reads on Save.

const ASSET_CLASSES: AssetClass[] = ['Office', 'Industrial', 'Retail', 'Multi-Family'];

const Field: React.FC<{ id: string; label: string; wide?: boolean; children: React.ReactNode }> = ({ id, label, wide, children }) => (
  <div className={wide ? 'sm:col-span-2' : undefined} data-editor-field>
    <label htmlFor={id} className="block text-xs font-semibold text-[var(--color-sf-fg-secondary)] mb-1">{label}</label>
    {children}
  </div>
);

export const DealFields: React.FC<{ data: Partial<PipelineDeal>; brokers: string[] }> = ({ data, brokers }) => {
  const id = (name: string) => `deal-card-${name}`;
  return (
    <div className="rep-editor grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-1">
      <Field id={id('dealName')} label="Deal name" wide>
        <input id={id('dealName')} name="dealName" data-name="dealName" className="e-field e-input" defaultValue={data.dealName ?? ''} />
      </Field>
      <Field id={id('assetClass')} label="Asset class">
        <DropDownListComponent id={id('assetClass')} name="assetClass" data-name="assetClass" className="e-field"
          dataSource={ASSET_CLASSES} value={data.assetClass ?? null} />
      </Field>
      <Field id={id('targetCity')} label="Target city">
        <input id={id('targetCity')} name="targetCity" data-name="targetCity" className="e-field e-input" defaultValue={data.targetCity ?? ''} />
      </Field>
      <Field id={id('estimatedValuation')} label="Estimated valuation">
        <NumericTextBoxComponent id={id('estimatedValuation')} name="estimatedValuation" data-name="estimatedValuation" className="e-field"
          format="c0" min={0} step={1_000_000} value={data.estimatedValuation ?? 0} />
      </Field>
      <Field id={id('projectedCapRate')} label="Projected cap rate (%)">
        <NumericTextBoxComponent id={id('projectedCapRate')} name="projectedCapRate" data-name="projectedCapRate" className="e-field"
          format="n2" decimals={2} min={0} max={20} step={0.05} value={data.projectedCapRate ?? 0} />
      </Field>
      <Field id={id('leadBroker')} label="Lead broker">
        <DropDownListComponent id={id('leadBroker')} name="leadBroker" data-name="leadBroker" className="e-field"
          dataSource={brokers} value={data.leadBroker ?? null} popupHeight="240px" />
      </Field>
      <Field id={id('targetClosingDate')} label="Target closing date">
        <DatePickerComponent id={id('targetClosingDate')} name="targetClosingDate" data-name="targetClosingDate" className="e-field"
          format="MMM d, y" value={data.targetClosingDate ? new Date(`${data.targetClosingDate}T00:00:00`) : undefined} />
      </Field>
      <Field id={id('probability')} label="Probability (%)">
        <NumericTextBoxComponent id={id('probability')} name="probability" data-name="probability" className="e-field"
          format="n0" min={0} max={100} step={5} value={data.probability ?? 0} />
      </Field>
    </div>
  );
};
