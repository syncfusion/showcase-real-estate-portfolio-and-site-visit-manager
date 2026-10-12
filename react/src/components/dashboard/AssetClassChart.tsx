import React, { useMemo } from 'react';
import {
  AccumulationChartComponent,
  AccumulationSeriesCollectionDirective,
  AccumulationSeriesDirective,
  Inject,
  AccumulationLegend,
  PieSeries,
  AccumulationTooltip,
  AccumulationDataLabel,
  IAccTextRenderEventArgs
} from '@syncfusion/ej2-react-charts';
import { Property } from '@/domain/types';
import { useTheme } from '@/context/ThemeContext';
import { chartTheme, inkOn, palette } from '@/styles/palette';

interface AssetClassChartProps {
  properties: Property[];
}

// Asset classes are categories, not good or bad, so they use the categorical chart series and never
// green, amber or red.
const ASSET_ORDER = ['Office', 'Industrial', 'Retail', 'Multi-Family'];

export const AssetClassChart: React.FC<AssetClassChartProps> = ({ properties }) => {
  // The chart theme colours the labels and legend for light and dark; the app only sets the font, or the
  // labels fall back to a serif face.
  const { theme } = useTheme();
  const tones = palette(theme);
  const textStyle = { fontFamily: 'Inter, sans-serif' };
  const data = useMemo(() => {
    const grouped: Record<string, number> = {};
    for (const p of properties) {
      grouped[p.assetClass] = (grouped[p.assetClass] || 0) + p.marketValuation;
    }
    const total = Object.values(grouped).reduce((sum, v) => sum + v, 0);
    return Object.entries(grouped).map(([assetClass, valuation]) => ({
      assetClass,
      valuation,
      // Shown in the tooltip; the share comes from the chart's own point.percentage.
      // Rounded on whole $10M steps first: toFixed alone turns 2.295 into 2.29 (binary floating point).
      valuationText: `$${(Math.round(valuation / 10_000_000) / 100).toFixed(2)}B`,
      // The slice label: the class's share of portfolio value, whole percent (one decimal is trimmed
      // inside the ring; the tooltip gives two).
      shareText: `${Math.round((valuation / total) * 100)}%`,
      fill: tones.series[Math.max(0, ASSET_ORDER.indexOf(assetClass)) % tones.series.length]
    }))
      // Largest first, clockwise from 12 o'clock, and the legend in the same order. The colour stays
      // with the class (ASSET_ORDER), so a class keeps its colour when session edits reorder the slices.
      .sort((a, b) => b.valuation - a.valuation);
  }, [properties, tones]);

  return (
    // A block wrapper and width/height 100%: inside a centering flexbox the chart cannot take
    // its width from the card and falls back to a fixed 600px, which clips it and stops it
    // re-measuring when the sidebar docks.
    <div className="w-full h-[320px] min-w-0">
      <AccumulationChartComponent
        // Re-created on a theme switch: Syncfusion 35.1.37 keeps the first theme's axis, legend and title
        // text colours when `theme` changes on a live chart (white labels on a white card after dark -> light).
        key={theme}
        theme={chartTheme(theme)}
        id="asset-class-donut-chart"
        width="100%"
        height="100%"
        legendSettings={{ visible: true, position: 'Bottom', textStyle }}
        // Slices are sized by valuation; the tooltip names the class, its valuation and its share of the
        // portfolio (it printed the raw valuation with a % sign before: "Office: 2295000000%").
        tooltip={{ enable: true, format: '${point.x}: <b>${point.tooltip}</b> · ${point.percentage}% of portfolio value' }}
        background="transparent"
        center={{ x: '50%', y: '48%' }}
        // Each slice label in the ink that reads best on its slice (inkOn, palette.ts).
        textRender={(args: IAccTextRenderEventArgs) => { args.font.color = inkOn(args.point.color); }}
      >
        <Inject services={[AccumulationLegend, PieSeries, AccumulationTooltip, AccumulationDataLabel]} />
        <AccumulationSeriesCollectionDirective>
          <AccumulationSeriesDirective
            dataSource={data}
            xName="assetClass"
            yName="valuation"
            pointColorMapping="fill"
            tooltipMappingName="valuationText"
            innerRadius="40%"
            // Each slice shows its share inside the ring. Outside labels with the class name did not fit
            // this card ("Multi..." at 1440 and 390 px, clipped at 1024 px); the legend names the classes,
            // largest first, and the tooltip gives each class's valuation and share.
            // maxWidth: without it the chart trims the two largest slices' labels to "4..." in the
            // 195 px card at 1024 px, though they fit; "40%" is about 25 px wide at 11px.
            dataLabel={{ visible: true, name: 'shareText', position: 'Inside', maxWidth: 40, font: { fontFamily: 'Inter, sans-serif', fontWeight: '600', size: '11px' } }}
          />
        </AccumulationSeriesCollectionDirective>
      </AccumulationChartComponent>
    </div>
  );
};
