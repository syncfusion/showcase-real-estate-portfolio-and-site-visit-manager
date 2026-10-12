import React, { useMemo, useRef } from 'react';
import {
  MapsComponent,
  LayersDirective,
  LayerDirective,
  Inject,
  Marker,
  MarkersDirective,
  MarkerDirective,
  MapsTooltip,
  Zoom,
  type ILoadedEventArgs
} from '@syncfusion/ej2-react-maps';
import { Property } from '@/domain/types';
import { BAND_LABEL, BAND_TONE, MARKER_OUTLINE, markerTones, occupancyBand, type OccupancyBand as Band } from '@/styles/palette';

interface PortfolioMapProps {
  properties: Property[];
}

// Markers show occupancy against the 95% target: colour and
// shape together, because red and green look alike to many colour-blind viewers. The tiles stay light
// in dark mode, so markers keep the light-theme tones in both themes.
const MARKER_TONES = markerTones;
const BAND_SHAPE: Record<Band, 'Circle' | 'Diamond' | 'Triangle'> = { good: 'Circle', watch: 'Diamond', risk: 'Triangle' };
const BAND_ORDER: Record<Band, number> = { good: 0, watch: 1, risk: 2 };
const BANDS: Band[] = ['good', 'watch', 'risk'];

const bandColor = (band: Band) => MARKER_TONES[BAND_TONE[band]];

// The legend draws the same shape, colour and white outline as the markers.
const LegendShape: React.FC<{ band: Band }> = ({ band }) => {
  const shape = BAND_SHAPE[band];
  const common = { fill: bandColor(band), stroke: MARKER_OUTLINE, strokeWidth: 1.5 };
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      {shape === 'Circle' && <circle cx="7" cy="7" r="5.5" {...common} />}
      {shape === 'Diamond' && <polygon points="7,1 13,7 7,13 1,7" {...common} />}
      {shape === 'Triangle' && <polygon points="7,1.5 13,12.5 1,12.5" {...common} />}
    </svg>
  );
};

export const PortfolioMap: React.FC<PortfolioMapProps> = ({ properties }) => {
  // The map opens framed to the properties (shouldZoomInitially) and cannot zoom out past that view, so
  // the US data never sits in a world map. The framing level depends on the card's width, so it is read
  // once the map has drawn (and again after a resize) rather than fixed.
  const framed = useRef(false);
  const lockZoomOut = (args: ILoadedEventArgs) => {
    const maps = args.maps;
    if (!maps || (framed.current && !args.isResized)) return;
    framed.current = true;
    if (maps.zoomSettings.minZoom !== maps.tileZoomLevel) maps.zoomSettings.minZoom = maps.tileZoomLevel;
  };
  const markerData = useMemo(
    () =>
      properties
        .map((p) => {
          const band = occupancyBand(p.occupancyRate);
          return {
            latitude: p.coordinates.latitude,
            longitude: p.coordinates.longitude,
            name: p.name,
            city: p.city,
            assetClass: p.assetClass,
            valuation: `$${(p.marketValuation / 1_000_000).toFixed(0)}M`,
            occupancy: `${p.occupancyRate}%`,
            band: BAND_LABEL[band],
            order: BAND_ORDER[band],
            fill: bandColor(band),
            shape: BAND_SHAPE[band],
            size: Math.max(10, Math.min(22, p.grossSquareFeet / 90000))
          };
        })
        // Draw the at-risk markers last, so they stay on top where markers overlap.
        .sort((a, b) => a.order - b.order),
    [properties]
  );
  const counts = useMemo(() => {
    const result: Record<Band, number> = { good: 0, watch: 0, risk: 0 };
    for (const p of properties) result[occupancyBand(p.occupancyRate)]++;
    return result;
  }, [properties]);

  return (
    <div className="w-full h-full flex flex-col gap-3">
    <div className="relative w-full flex-1 min-h-[330px]">
      <MapsComponent
        id="portfolio-distribution-map"
        loaded={lockZoomOut}
        zoomSettings={{
          enable: true,
          shouldZoomInitially: true,
          minZoom: 1,
          maxZoom: 14
        }}
        background="transparent"
      >
        <Inject services={[Marker, MapsTooltip, Zoom]} />
        <LayersDirective>
          <LayerDirective
            // Syncfusion placeholders (level/tileX/tileY), not Leaflet's {z}/{x}/{y}; single host per
            // OpenStreetMap's tile policy.
            urlTemplate="https://tile.openstreetmap.org/level/tileX/tileY.png"
          >
            <MarkersDirective>
              {/* Native SVG markers, not a React `template`: Maps redraws markers on every zoom and pan
                  (wheel or trackpad over the map), and React template content is lost on that redraw,
                  leaving empty wrappers. Colour, size and border are data-driven here instead. */}
              <MarkerDirective
                visible={true}
                dataSource={markerData}
                shape="Circle"
                shapeValuePath="shape"
                fill={MARKER_TONES.success}
                colorValuePath="fill"
                widthValuePath="size"
                heightValuePath="size"
                border={{ color: MARKER_OUTLINE, width: 2 }}
                animationDuration={0}
                clusterSettings={{
                  allowClustering: true,
                  allowClusterExpand: true,
                  shape: 'Circle',
                  fill: MARKER_TONES.neutral,
                  border: { color: MARKER_OUTLINE, width: 2 },
                  width: 26,
                  height: 26,
                  labelStyle: { color: MARKER_OUTLINE, size: '11px', fontWeight: '600' }
                }}
                tooltipSettings={{
                  visible: true,
                  valuePath: 'name',
                  format: '<b>${name}</b><br/>${city} · ${assetClass}<br/>${valuation} · ${occupancy} occupied<br/>${band}'
                }}
              />
            </MarkersDirective>
          </LayerDirective>
        </LayersDirective>
      </MapsComponent>
      <p className="absolute top-2 left-2 z-[1] m-0 px-1.5 py-0.5 rounded text-[10px] leading-tight bg-[var(--color-sf-bg-surface)] text-[var(--color-sf-fg-secondary)] opacity-90">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </div>
      <ul className="m-0 p-0 list-none flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-sf-fg-secondary)]" aria-label="Occupancy against the 95% target">
        {BANDS.map((band) => (
          <li key={band} className="flex items-center gap-1.5">
            <LegendShape band={band} />
            <span>
              {BAND_LABEL[band]} <span className="text-[var(--color-sf-fg-primary)] font-medium">{counts[band]}</span>
            </span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
            <circle cx="8" cy="8" r="7" fill={MARKER_TONES.neutral} stroke={MARKER_OUTLINE} strokeWidth="1.5" />
            <text x="8" y="11" textAnchor="middle" fontSize="8" fontWeight="600" fill={MARKER_OUTLINE}>5</text>
          </svg>
          <span>Numbers group nearby properties; zoom in or click to see each</span>
        </li>
        <li className="text-[var(--color-sf-fg-secondary)]">Marker size: gross square feet</li>
      </ul>
    </div>
  );
};
