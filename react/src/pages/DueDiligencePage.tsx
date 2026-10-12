import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { FolderLock, FileText, FileCheck2, CheckCircle2, TriangleAlert, DraftingCompass, Clock3 } from 'lucide-react';
import { LoadingState } from '@/components/LoadingState';
import { PanelCard } from '@/components/cards/PanelCard';
import { DropDownListComponent, ChangeEventArgs } from '@syncfusion/ej2-react-dropdowns';
import { useSessionStore } from '@/hooks/useSessionStore';
import { DueDiligenceFile, DueDiligenceCategory, DocumentReviewStatus } from '@/domain/types';

// The PDF Viewer loads after the page (its own chunk), so the list and filters do not wait for it; one
// "Loading document…" covers the panel until the first page is drawn.
const DocumentViewer = lazy(() => import('@/components/documents/DocumentViewer'));
import { getBasePath } from '@/basePath';
import { TONE_BADGE } from '@/styles/palette';

// Each record opens its document type's one-page sample (public/documents/, from
// scripts/make-sample-documents.mjs); a DWG drawing has no in-browser preview.
const documentUrl = (file: DueDiligenceFile) =>
  file.fileType === 'pdf' && file.url ? `${window.location.origin}${getBasePath()}${file.url}` : '';

// The readiness badge is the record's own review status.
const REVIEW: Record<DocumentReviewStatus, { text: string; tone: 'success' | 'warning'; Icon: typeof CheckCircle2 }> = {
  verified: { text: 'Verified', tone: 'success', Icon: CheckCircle2 },
  'in-review': { text: 'In review', tone: 'warning', Icon: Clock3 }
};
const ReviewBadge: React.FC<{ status: DocumentReviewStatus }> = ({ status }) => {
  const { text, tone, Icon } = REVIEW[status];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${TONE_BADGE[tone]}`}>
      <Icon size={12} aria-hidden="true" /> {text}
    </span>
  );
};

const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const CATEGORIES: DueDiligenceCategory[] = [
  'Leases',
  'Environmental',
  'Architectural',
  'Financial-Audits',
  'Legal-Title'
];

export const DueDiligencePage: React.FC = () => {
  const { state } = useSessionStore();
  const [selectedCategory, setSelectedCategory] = useState<DueDiligenceCategory | 'All'>('All');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('All');
  const [activeFile, setActiveFile] = useState<DueDiligenceFile>(
    state.dueDiligenceFiles[0]
  );
  // Document loading: the viewer area is covered until documentLoad
  // for the current file, on first load and on every switch; the viewer's engine (pdfium.wasm, 1.9 MB)
  // and the document download first. A failure shows a message, never an endless spinner.
  const [docResult, setDocResult] = useState<{ url: string; status: 'loaded' | 'failed' } | null>(null);
  // The viewer keeps its first handlers, so they read the current file from a ref.
  const currentUrl = useRef<string | undefined>(undefined);
  const activeUrl = activeFile ? documentUrl(activeFile) : '';
  useEffect(() => { currentUrl.current = activeUrl; }, [activeUrl]);
  const docStatus = activeUrl && docResult?.url === activeUrl ? docResult.status : 'loading';

  // Filter options: "All" first, then each property by name, and each category in plain words.
  const propertyOptions = useMemo(() => [
    { value: 'All', text: `All Properties (${state.properties.length})` },
    ...state.properties.map((p) => ({ value: p.id, text: p.name }))
  ], [state.properties]);
  const categoryOptions = useMemo(() => [
    { value: 'All', text: 'All Categories' },
    ...CATEGORIES.map((c) => ({ value: c, text: c.replace(/-/g, ' ') }))
  ], []);

  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of state.properties) map.set(p.id, p.name);
    return map;
  }, [state.properties]);

  const filteredFiles = useMemo(() => {
    return state.dueDiligenceFiles.filter((f) => {
      const matchCat = selectedCategory === 'All' || f.category === selectedCategory;
      const matchProp = selectedPropertyId === 'All' || f.propertyId === selectedPropertyId;
      return matchCat && matchProp;
    });
  }, [state.dueDiligenceFiles, selectedCategory, selectedPropertyId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-sf-fg-primary)]">
          Due Diligence Vault
        </h1>
        <p className="text-sm text-[var(--color-sf-fg-secondary)] mt-1">
          Secure digital audit room with integrated PDF inspection for Phase I ESAs, PCAs, and ALTA surveys.
        </p>
      </div>

      {/* Filter bar: a Syncfusion Card without a header. */}
      {/* Layout on an inner div: the theme's unlayered `.e-card > * { justify-content: center }` beats
          Tailwind's layered utilities on the e-card-content element itself. */}
      <section className="e-card rep-panel" aria-label="Document filters">
        <div className="e-card-content">
        <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Alt+Down opens a DropDownList, but 35.1.37 leaves the browser's default action, which scrolls the page;
            on a long phone layout the field leaves the window and the popup closes at once (targetExitViewport). */}
        <div className="flex flex-wrap items-center gap-3"
          onKeyDown={(event) => { if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) event.preventDefault(); }}>
          {/* Syncfusion DropDownList: follows the theme
              in both modes; the visible label names it for screen readers. */}
          <label id="dd-property-label" htmlFor="dd-property-filter" className="text-xs font-semibold text-[var(--color-sf-fg-secondary)] uppercase tracking-wider">
            Property:
          </label>
          <div className="w-64 max-w-full">
            <DropDownListComponent
              id="dd-property-filter"
              dataSource={propertyOptions}
              fields={{ text: 'text', value: 'value' }}
              value={selectedPropertyId}
              popupHeight="320px"
              htmlAttributes={{ 'aria-labelledby': 'dd-property-label' }}
              change={(args: ChangeEventArgs) => setSelectedPropertyId(String(args.value ?? 'All'))}
            />
          </div>

          <label id="dd-category-label" htmlFor="dd-category-filter" className="text-xs font-semibold text-[var(--color-sf-fg-secondary)] uppercase tracking-wider ml-2">
            Category:
          </label>
          <div className="w-52 max-w-full">
            <DropDownListComponent
              id="dd-category-filter"
              dataSource={categoryOptions}
              fields={{ text: 'text', value: 'value' }}
              value={selectedCategory}
              htmlAttributes={{ 'aria-labelledby': 'dd-category-label' }}
              change={(args: ChangeEventArgs) => setSelectedCategory(String(args.value ?? 'All') as DueDiligenceCategory | 'All')}
            />
          </div>
        </div>

        <div className="text-xs text-[var(--color-sf-fg-secondary)]">
          Showing <strong>{filteredFiles.length}</strong> audited artifacts
        </div>
        </div>
        </div>
      </section>

      {/* Vault Split Layout: File List (Left) + Syncfusion PDF Viewer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document List (5 cols) */}
        <PanelCard className="lg:col-span-5 h-[740px]" title="Document Repository" icon={<FolderLock size={18} />}
          aside="Click to view document" contentClassName="rep-panel-flush flex-1 min-h-0">
          {/* The scroll lives on an inner element: the theme's unlayered `.e-card .e-card-content` sets
              overflow: hidden and beats Tailwind's layered overflow-y-auto on the card content itself, so
              the list could not scroll and its last documents stayed out of reach. */}
          <div className="h-full overflow-y-auto divide-y divide-[var(--app-card-border)]">
            {filteredFiles.map((file) => {
              const isSelected = activeFile?.id === file.id;
              const FileIcon = file.fileType === 'dwg' ? DraftingCompass : FileText;
              return (
                <button
                  key={file.id}
                  type="button"
                  // The document shown in the viewer: announced as current, and a state, not a hover target.
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => setActiveFile(file)}
                  className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[var(--color-sf-bg-brand-subtle)] border-l-4 border-l-[var(--color-sf-fg-brand-primary)]'
                      : 'hover:bg-[var(--color-sf-bg-surface-hover)]'
                  }`}
                >
                  <FileIcon
                    size={20}
                    aria-hidden="true"
                    className={`shrink-0 mt-0.5 ${
                      isSelected
                        ? 'text-[var(--color-sf-fg-brand-primary)]'
                        : 'text-[var(--color-sf-fg-secondary)]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-sf-fg-primary)] truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-[var(--color-sf-fg-secondary)] mt-0.5 truncate">
                      {propertyNameById.get(file.propertyId) || 'Unknown Property'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] whitespace-nowrap text-[var(--color-sf-fg-secondary)]">
                      <span className="px-1.5 py-0.5 bg-[var(--color-sf-bg-surface-muted)] rounded border border-[var(--color-sf-border-primary)] font-medium">
                        {file.category.replace(/-/g, ' ')}
                      </span>
                      <span>{formatSize(file.fileSize)}</span>
                      <span>·</span>
                      <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                      <span className="ml-auto"><ReviewBadge status={file.reviewStatus} /></span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </PanelCard>

        {/* Syncfusion PDF Viewer (7 cols) */}
        <PanelCard className="lg:col-span-7 h-[740px]" icon={<FileCheck2 size={18} />}
          title={<span className="block truncate">{activeFile?.name || 'No document selected'}</span>}
          subtitle={activeFile ? propertyNameById.get(activeFile.propertyId) : undefined}
          aside={activeFile && <ReviewBadge status={activeFile.reviewStatus} />}
          contentClassName={`rep-panel-flush relative flex-1 bg-slate-100 dark:bg-slate-900${activeUrl && docStatus === 'loading' ? ' rep-doc-loading' : ''}`}>
            {activeFile && !activeUrl && (
              <div role="status" className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 p-6 text-center bg-[var(--color-sf-bg-surface)]">
                <DraftingCompass size={32} className="text-[var(--color-sf-fg-secondary)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[var(--color-sf-fg-primary)]">No in-browser preview for DWG drawings</p>
                <p className="text-xs text-[var(--color-sf-fg-secondary)] max-w-sm">
                  AutoCAD drawings open in CAD software. Drawing files are not included in this sample.
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-xs">
                  <dt className="text-[var(--color-sf-fg-secondary)]">File</dt>
                  <dd className="text-[var(--color-sf-fg-primary)] break-all">{activeFile.name}</dd>
                  <dt className="text-[var(--color-sf-fg-secondary)]">Property</dt>
                  <dd className="text-[var(--color-sf-fg-primary)]">{propertyNameById.get(activeFile.propertyId)}</dd>
                  <dt className="text-[var(--color-sf-fg-secondary)]">Size</dt>
                  <dd className="text-[var(--color-sf-fg-primary)]">{formatSize(activeFile.fileSize)}</dd>
                  <dt className="text-[var(--color-sf-fg-secondary)]">Modified</dt>
                  <dd className="text-[var(--color-sf-fg-primary)]">{new Date(activeFile.lastModified).toLocaleDateString()}</dd>
                </dl>
              </div>
            )}
            {activeUrl && docStatus === 'loading' && <LoadingState variant="overlay" label="Loading document…" />}
            {activeUrl && docStatus === 'failed' && (
              <div role="alert" className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 p-6 text-center bg-[var(--color-sf-bg-surface)]">
                <TriangleAlert size={28} className="text-[var(--color-sf-fg-danger-primary)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[var(--color-sf-fg-primary)]">This document could not be loaded</p>
                <p className="text-xs text-[var(--color-sf-fg-secondary)] break-all">{activeFile.name}</p>
                <button type="button" onClick={() => setDocResult(null)}
                  className="mt-2 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--app-card-border)] text-[var(--color-sf-fg-primary)] hover:bg-[var(--color-sf-bg-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
                  Try again
                </button>
              </div>
            )}
            {/* On failure the viewer is taken down: its own error dialog would cover the message. "Try
                again" clears the result, so the viewer mounts and loads the file afresh. One indicator per
                area: the "Loading document…" overlay above already covers the panel while the viewer's code
                downloads, so the viewer's Suspense fallback draws nothing of its own. */}
            {activeFile ? activeUrl && docStatus !== 'failed' && (
              <Suspense fallback={null}>
                <DocumentViewer url={activeUrl}
                  onLoaded={() => setDocResult({ url: currentUrl.current ?? '', status: 'loaded' })}
                  onFailed={() => setDocResult({ url: currentUrl.current ?? '', status: 'failed' })} />
              </Suspense>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[var(--color-sf-fg-secondary)]">
                Select a document from the repository to view
              </div>
            )}
        </PanelCard>
      </div>
    </div>
  );
};
