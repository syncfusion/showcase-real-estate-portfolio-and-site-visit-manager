import React, { useMemo } from 'react';
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  ColumnSeries,
  Category,
  Legend,
  Tooltip,
  DataLabel
} from '@syncfusion/ej2-react-charts';
import { PipelineDeal, PipelineStage } from '@/domain/types';
import { useTheme } from '@/context/ThemeContext';
import { chartTheme, palette } from '@/styles/palette';

// Pipeline charts. Stages and cap-rate
// bands are categories, so the columns use the categorical chart series, never green, amber or red; the
// chart theme draws the frame; tooltips name the stage or band and give money as text.
const STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'sourcing', label: 'Sourcing' },
  { key: 'loi', label: 'LOI' },
  { key: 'due-diligence', label: 'Due Diligence' },
  { key: 'underwriting', label: 'Underwriting' },
  { key: 'closing', label: 'Closing' }
];
const millions = (value: number) => `$${Math.round(value / 1_000_000).toLocaleString('en-US')}M`;
const font = { fontFamily: 'Inter, sans-serif' };

export const DealValueChart: React.FC<{ deals: PipelineDeal[] }> = ({ deals }) => {
  const { theme } = useTheme();
  const tones = palette(theme);
  // Workflow order, not sorted by value: the stages are a sequence.
  const data = useMemo(() => STAGES.map(({ key, label }) => {
    const inStage = deals.filter((deal) => deal.stage === key);
    const total = inStage.reduce((sum, deal) => sum + deal.estimatedValuation, 0);
    const weighted = inStage.reduce((sum, deal) => sum + (deal.estimatedValuation * deal.probability) / 100, 0);
    const count = `${inStage.length} deal${inStage.length === 1 ? '' : 's'}`;
    return {
      stage: label,
      total: total / 1_000_000,
      weighted: weighted / 1_000_000,
      totalText: `${millions(total)} total · ${count}`,
      weightedText: `${millions(weighted)} probability-weighted · ${count}`
    };
  }), [deals]);

  return (
    <div className="w-full h-[300px] min-w-0">
      <ChartComponent
        // Re-created on a theme switch: Syncfusion 35.1.37 keeps the first theme's axis, legend and title
        // text colours when `theme` changes on a live chart (white labels on a white card after dark -> light).
        key={theme}
        id="pipeline-value-chart"
        theme={chartTheme(theme)}
        width="100%"
        height="100%"
        primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 }, labelStyle: font, labelIntersectAction: 'Rotate45' }}
        primaryYAxis={{ title: 'Valuation ($M)', titleStyle: font, labelFormat: '${value}M', lineStyle: { width: 0 }, labelStyle: font }}
        chartArea={{ border: { width: 0 } }}
        // Padding 16 (default 8) gives the legend box room: sized to Syncfusion's own text measure it shaved 2-3 px
        // off "Probability weighted" at 1023 and 390 px. A fixed width: '100%' fixed that but laid the items out from
        // the left. The label has a space so it can wrap where the width runs out.
        legendSettings={{ visible: true, position: 'Bottom', padding: 16, textStyle: font, textWrap: 'Wrap' }}
        // The header names the series (Total valuation / Probability weighted); the body the stage and value.
        tooltip={{ enable: true, format: '${point.x}: <b>${point.tooltip}</b>' }}
        background="transparent"
      >
        <Inject services={[ColumnSeries, Category, Legend, Tooltip]} />
        <SeriesCollectionDirective>
          <SeriesDirective dataSource={data} xName="stage" yName="total" name="Total valuation" type="Column"
            fill={tones.series[0]} tooltipMappingName="totalText" columnSpacing={0.15} cornerRadius={{ topLeft: 3, topRight: 3 }} />
          <SeriesDirective dataSource={data} xName="stage" yName="weighted" name="Probability weighted" type="Column"
            fill={tones.series[1]} tooltipMappingName="weightedText" columnSpacing={0.15} cornerRadius={{ topLeft: 3, topRight: 3 }} />
        </SeriesCollectionDirective>
      </ChartComponent>
    </div>
  );
};

export const CapRateChart: React.FC<{ deals: PipelineDeal[] }> = ({ deals }) => {
  const { theme } = useTheme();
  const tones = palette(theme);
  // Half-point bands across the deals' range, e.g. 6.5–7.0%; every band in the range is shown, empty or not.
  const data = useMemo(() => {
    if (!deals.length) return [];
    const band = (rate: number) => Math.floor(rate * 2) / 2;
    const low = band(Math.min(...deals.map((deal) => deal.projectedCapRate)));
    const high = band(Math.max(...deals.map((deal) => deal.projectedCapRate)));
    const rows = [];
    for (let from = low; from <= high + 1e-9; from += 0.5) {
      const count = deals.filter((deal) => band(deal.projectedCapRate) === from).length;
      rows.push({ band: `${from.toFixed(1)}–${(from + 0.5).toFixed(1)}%`, count, countText: `${count} deal${count === 1 ? '' : 's'}` });
    }
    return rows;
  }, [deals]);

  return (
    <div className="w-full h-[300px] min-w-0">
      <ChartComponent
        // Re-created on a theme switch: Syncfusion 35.1.37 keeps the first theme's axis, legend and title
        // text colours when `theme` changes on a live chart (white labels on a white card after dark -> light).
        key={theme}
        id="pipeline-cap-rate-chart"
        theme={chartTheme(theme)}
        width="100%"
        height="100%"
        primaryXAxis={{ valueType: 'Category', title: 'Projected cap rate', titleStyle: font, majorGridLines: { width: 0 }, labelStyle: font }}
        primaryYAxis={{ title: 'Deals', titleStyle: font, interval: 2, minimum: 0, lineStyle: { width: 0 }, labelStyle: font }}
        chartArea={{ border: { width: 0 } }}
        legendSettings={{ visible: false }}
        tooltip={{ enable: true, header: '', format: '${point.x}: <b>${point.tooltip}</b>' }}
        background="transparent"
      >
        <Inject services={[ColumnSeries, Category, Tooltip, DataLabel]} />
        <SeriesCollectionDirective>
          <SeriesDirective dataSource={data} xName="band" yName="count" name="Deals" type="Column"
            fill={tones.series[4]} tooltipMappingName="countText" columnWidth={0.6} cornerRadius={{ topLeft: 3, topRight: 3 }}
            marker={{ dataLabel: { visible: true, position: 'Outer', font: { ...font, fontWeight: '600' } } }} />
        </SeriesCollectionDirective>
      </ChartComponent>
    </div>
  );
};
