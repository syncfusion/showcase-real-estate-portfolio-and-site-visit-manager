// Colour values for what Syncfusion Charts and Maps draw in SVG, which takes values, not CSS variables.
// Built from this app's token values:
// it mirrors src/styles/tokens.css, so change both together. HTML elements use the CSS tokens directly.
//
// The rule: colour that judges uses the status tones; colour that
// only tells categories apart uses `series`, never green, amber or red. Charts take
// `theme={chartTheme(theme)}` for the frame and their data colours from here.

export type AppTheme = 'light' | 'dark';
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface Palette {
  success: string;
  warning: string;
  danger: string;
  info: string;
  neutral: string;
  /** A budget, target or last-year line: judges nothing; draw it dashed. */
  reference: string;
  /** Eight vivid category colours: blue, teal, fuchsia, slate, sky, cyan, purple, indigo. */
  series: [string, string, string, string, string, string, string, string];
}

const PALETTES: Record<AppTheme, Palette> = {
  light: {
    success: '#027a48', warning: '#b54708', danger: '#b42318', info: '#175cd3', neutral: '#667085', reference: '#667085',
    series: ['#3b82f6', '#0d9488', '#a21caf', '#334155', '#0369a1', '#0891b2', '#a855f7', '#4f46e5']
  },
  dark: {
    success: '#4ade80', warning: '#facc15', danger: '#f87171', info: '#60a5fa', neutral: '#94a3b8', reference: '#94a3b8',
    series: ['#3b82f6', '#2dd4bf', '#e879f9', '#64748b', '#0ea5e9', '#22d3ee', '#a855f7', '#6366f1']
  }
};

export const palette = (theme: AppTheme): Palette => PALETTES[theme];

/** Map tiles stay light in dark mode, so markers drawn on them keep the light-theme tones. */
export const markerTones: Palette = PALETTES.light;
/** The outline that keeps a marker readable on the tiles. */
export const MARKER_OUTLINE = '#ffffff';

/** The Syncfusion chart theme for the frame (axis labels, gridlines, tooltip, legend text). */
export const chartTheme = (theme: AppTheme): 'Tailwind3' | 'Tailwind3Dark' => (theme === 'dark' ? 'Tailwind3Dark' : 'Tailwind3');

/** The band a value falls in. Bands are checked in order; the last has no `min`. */
export interface Band { min?: number; tone: Tone; label?: string }
export function bandFor<T extends Band>(value: number, bands: T[]): T {
  return bands.find((band) => band.min === undefined || value >= band.min) ?? bands[bands.length - 1];
}

// Occupancy bands: the portfolio's 95% target and the advisor's 90%
// risk line. The same bands drive the map markers, the Properties grid and the occupancy KPI icon.
export type OccupancyBand = 'good' | 'watch' | 'risk';
const OCCUPANCY_BANDS: (Band & { key: OccupancyBand; label: string; tone: 'success' | 'warning' | 'danger' })[] = [
  { key: 'good', min: 95, tone: 'success', label: 'At or above target (95%+)' },
  { key: 'watch', min: 90, tone: 'warning', label: 'Watch (90% to under 95%)' },
  { key: 'risk', tone: 'danger', label: 'At risk (under 90%)' }
];

export const occupancyBand = (rate: number): OccupancyBand => bandFor(rate, OCCUPANCY_BANDS).key;
export const BAND_LABEL = Object.fromEntries(OCCUPANCY_BANDS.map((band) => [band.key, band.label])) as Record<OccupancyBand, string>;
export const BAND_TONE = Object.fromEntries(OCCUPANCY_BANDS.map((band) => [band.key, band.tone])) as Record<OccupancyBand, 'success' | 'warning' | 'danger'>;

/** Tone classes as whole literals, so Tailwind sees them. */
export const TONE_TEXT: Record<Tone, string> = {
  success: 'text-[var(--color-sf-fg-success-primary)]',
  warning: 'text-[var(--color-sf-fg-warning-primary)]',
  danger: 'text-[var(--color-sf-fg-danger-primary)]',
  info: 'text-[var(--color-sf-fg-info-primary)]',
  neutral: 'text-[var(--color-sf-fg-neutral-primary)]'
};

export const TONE_BADGE: Record<Tone, string> = {
  success: 'bg-[var(--color-sf-bg-success-primary)] text-[var(--color-sf-fg-success-primary)]',
  warning: 'bg-[var(--color-sf-bg-warning-primary)] text-[var(--color-sf-fg-warning-primary)]',
  danger: 'bg-[var(--color-sf-bg-danger-primary)] text-[var(--color-sf-fg-danger-primary)]',
  info: 'bg-[var(--color-sf-bg-info-primary)] text-[var(--color-sf-fg-info-primary)]',
  neutral: 'bg-[var(--color-sf-bg-neutral-primary)] text-[var(--color-sf-fg-neutral-primary)]'
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** White or near-black, whichever reads better on a filled shape (a label inside a slice or bar). The
 *  chart's own choice put white on #3b82f6 (3.7:1), under the 4.5:1 small text needs. */
export const inkOn = (fill: string): string => (contrast('#ffffff', fill) >= contrast('#111827', fill) ? '#ffffff' : '#111827');
