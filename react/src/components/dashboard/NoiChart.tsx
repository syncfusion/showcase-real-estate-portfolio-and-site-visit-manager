import React from 'react';
import {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  Inject,
  ColumnSeries,
  LineSeries,
  Legend,
  Category,
  Tooltip,
  DataLabel
} from '@syncfusion/ej2-react-charts';
import { useTheme } from '@/context/ThemeContext';
import { chartTheme, palette } from '@/styles/palette';

// Each month's share of the year, and budget as a ratio of actual: the shape of the trailing twelve months to
// the last full month before the demo's "today" (2026-10-15). The amounts come from the portfolio total, so
// the twelve Actual months add up to the Dashboard's annual NOI; the
// hard-coded series summed to $131M against a $353.4M headline.
const SHAPE = [
  { month: 'Oct 25', actual: 9.8, budget: 9.5 },
  { month: 'Nov 25', actual: 10.1, budget: 9.6 },
  { month: 'Dec 25', actual: 10.4, budget: 10.0 },
  { month: 'Jan 26', actual: 10.2, budget: 10.1 },
  { month: 'Feb 26', actual: 10.6, budget: 10.2 },
  { month: 'Mar 26', actual: 10.9, budget: 10.4 },
  { month: 'Apr 26', actual: 11.2, budget: 10.8 },
  { month: 'May 26', actual: 11.0, budget: 10.7 },
  { month: 'Jun 26', actual: 11.5, budget: 11.0 },
  { month: 'Jul 26', actual: 11.8, budget: 11.2 },
  { month: 'Aug 26', actual: 11.4, budget: 11.3 },
  { month: 'Sep 26', actual: 12.1, budget: 11.5 }
];
const SHAPE_TOTAL = SHAPE.reduce((sum, m) => sum + m.actual, 0);

export const NoiChart: React.FC<{ annualNoi: number }> = ({ annualNoi }) => {
  const { theme } = useTheme();

  // $M per month, two decimals: the twelve Actual months sum to annualNoi within rounding.
  const data = SHAPE.map((m) => {
    const actual = (annualNoi / 1_000_000) * (m.actual / SHAPE_TOTAL);
    return { month: m.month, actual: Math.round(actual * 100) / 100, budget: Math.round(actual * (m.budget / m.actual) * 100) / 100 };
  });

  // NOI judged against budget: a month at or above budget is
  // green, below it red; the budget is a neutral dashed reference, not a warning colour.
  const tones = palette(theme);
  const points = data.map((d) => ({ ...d, fill: d.actual >= d.budget ? tones.success : tones.danger }));

  return (
    <div className="w-full h-[320px]">
      <ChartComponent
        // Re-created on a theme switch: Syncfusion 35.1.37 keeps the first theme's axis, legend and title
        // text colours when `theme` changes on a live chart (white labels on a white card after dark -> light).
        key={theme}
        theme={chartTheme(theme)}
        id="noi-performance-chart"
        primaryXAxis={{
          valueType: 'Category',
          majorGridLines: { width: 0 },
          labelStyle: { fontFamily: 'Inter, sans-serif' }
        }}
        primaryYAxis={{
          title: 'NOI in Millions ($)',
          titleStyle: { fontFamily: 'Inter, sans-serif' },
          labelFormat: '${value}M',
          majorGridLines: { width: 1 },
          lineStyle: { width: 0 },
          labelStyle: { fontFamily: 'Inter, sans-serif' }
        }}
        chartArea={{ border: { width: 0 } }}
        tooltip={{ enable: true, shared: true, format: '${series.name}: $${point.y}M' }}
        legendSettings={{ visible: false }}
        background="transparent"
      >
        <Inject services={[ColumnSeries, LineSeries, Legend, Category, Tooltip, DataLabel]} />
        <SeriesCollectionDirective>
          <SeriesDirective
            dataSource={points}
            xName="month"
            yName="actual"
            name="Actual NOI"
            type="Column"
            pointColorMapping="fill"
            cornerRadius={{ topLeft: 4, topRight: 4 }}
          />
          <SeriesDirective
            dataSource={data}
            xName="month"
            yName="budget"
            name="Budget"
            type="Line"
            width={2}
            dashArray="6,4"
            fill={tones.reference}
            marker={{ visible: true, width: 6, height: 6, fill: tones.reference }}
          />
        </SeriesCollectionDirective>
      </ChartComponent>
    </div>
  );
};
