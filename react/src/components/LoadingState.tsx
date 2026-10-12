import React from 'react';

// The one loading indicator: a spinner ring and visible text in a
// role="status" region. Its styles are in index.html, so the startup screen looks the same before the
// app's CSS has loaded. `screen` fills the window, `overlay` covers its positioned parent (a control
// loading a document), and the default sits in the page's content area.
export const LoadingState: React.FC<{ label: string; variant?: 'screen' | 'overlay' | 'page' }> = ({ label, variant = 'page' }) => (
  <div className={`app-loading${variant === 'page' ? '' : ` app-loading--${variant}`}`} role="status" aria-live="polite">
    <div className="app-loading__ring" aria-hidden="true" />
    <div>{label}</div>
  </div>
);
