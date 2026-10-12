import React, { useState } from 'react';
import { CheckCircle2, Server, Clock, Tag } from 'lucide-react';

// __APP_VERSION__ / __BUILD_TIMESTAMP__ are injected at build time via Vite `define`
// (see vite.config.ts) and declared globally in src/vite-env.d.ts.

export const HealthzPage: React.FC = () => {
  const [pageLoadTime] = useState(() => new Date().toISOString());
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  const buildTimestamp =
    typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : 'unavailable (dev mode)';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-shell-bg)] p-6">
      <div className="w-full max-w-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <CheckCircle2 size={22} className="text-[var(--color-sf-fg-success-primary)]" aria-hidden="true" />
          <h1 className="text-lg font-bold text-[var(--color-sf-fg-primary)]">Frontend Bundle Status</h1>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[var(--app-card-border)]">
            <span className="flex items-center gap-2 text-[var(--color-sf-fg-secondary)]">
              <Server size={15} aria-hidden="true" /> Status
            </span>
            <span className="font-semibold text-[var(--color-sf-fg-success-primary)]">ok</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--app-card-border)]">
            <span className="flex items-center gap-2 text-[var(--color-sf-fg-secondary)]">
              <Tag size={15} aria-hidden="true" /> Service
            </span>
            <span className="font-medium text-[var(--color-sf-fg-primary)]">real-estate-portfolio</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--app-card-border)]">
            <span className="flex items-center gap-2 text-[var(--color-sf-fg-secondary)]">
              <Tag size={15} aria-hidden="true" /> Version
            </span>
            <span className="font-medium text-[var(--color-sf-fg-primary)]">{version}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--app-card-border)]">
            <span className="flex items-center gap-2 text-[var(--color-sf-fg-secondary)]">
              <Clock size={15} aria-hidden="true" /> Build Timestamp
            </span>
            <span className="font-medium text-[var(--color-sf-fg-primary)] text-xs">{buildTimestamp}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="flex items-center gap-2 text-[var(--color-sf-fg-secondary)]">
              <Clock size={15} aria-hidden="true" /> Page Load Time
            </span>
            <span className="font-medium text-[var(--color-sf-fg-primary)] text-xs">{pageLoadTime}</span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-sf-fg-secondary)] mt-5">
          This is a JSON-source, session-only application with no backend API — there is no live dependency
          check to run. The successful render of this page is direct evidence the static bundle is being
          served correctly.
        </p>
      </div>
    </div>
  );
};
