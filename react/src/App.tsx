import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { LoadingState } from '@/components/LoadingState';
import { sessionStore } from '@/services/sessionStore';
import { getRouterBasename } from '@/basePath';
import { AppShell } from '@/components/shell/AppShell';
import { ROUTES } from '@/components/shell/routes';

// Each page loads on demand, so the first page does not download every Syncfusion control.
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const PropertiesPage = lazy(() => import('@/pages/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const SiteVisitsPage = lazy(() => import('@/pages/SiteVisitsPage').then(m => ({ default: m.SiteVisitsPage })));
const DueDiligencePage = lazy(() => import('@/pages/DueDiligencePage').then(m => ({ default: m.DueDiligencePage })));
const PipelinePage = lazy(() => import('@/pages/PipelinePage').then(m => ({ default: m.PipelinePage })));
const HealthzPage = lazy(() => import('@/pages/HealthzPage').then(m => ({ default: m.HealthzPage })));

// While a page's code downloads: its name, so the visitor knows what is coming (a grey skeleton alone
// read as an empty page on the published site).
const PageLoading: React.FC = () => {
  const id = useLocation().pathname.replace(/^\//, '').split('/')[0] || 'portfolio';
  const label = ROUTES.find(route => route.id === id)?.label ?? 'page';
  return <LoadingState label={`Loading ${label}…`} />;
};

// Until the Syncfusion theme bundle has loaded the shell has no layout (the unstyled Sidebar pushes the
// page below the window), so index.html's static app frame (#app-boot, the same size and colours as the
// shell) stays over it. The shell mounts underneath, so the page's code downloads at the same time as the
// theme; once the theme is ready the frame is removed and the page's own loading indicator, inside the
// real shell, takes over.
const StartupFrame: React.FC = () => {
  const { ready } = useTheme();
  const standalone = useLocation().pathname === '/healthz';
  useEffect(() => { if (ready || standalone) document.getElementById('app-boot')?.remove(); }, [ready, standalone]);
  return null;
};

const AppRoutes: React.FC = () => {
  const pageKey = useLocation().pathname.split('/')[1] || 'portfolio';
  const handleResetDemo = () => {
    if (window.confirm('Reset all session data to the original demo dataset? Any changes you made will be lost.')) {
      sessionStore.resetToDemoData();
    }
  };

  return (
    <Routes>
      <Route path="/healthz" element={<Suspense fallback={null}><HealthzPage /></Suspense>} />
      <Route
        path="/*"
        element={
          <AppShell onResetDemo={handleResetDemo}>
            {/* Keyed by the page: React Router runs a page change as a transition, and React then keeps the
                previous page on screen, without an indicator, while the next page's code downloads. A new
                boundary per page shows "Loading <page>…" instead. */}
            <Suspense key={pageKey} fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/portfolio" replace />} />
              <Route path="/portfolio" element={<DashboardPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/site-visits" element={<SiteVisitsPage />} />
              <Route path="/due-diligence" element={<DueDiligencePage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="*" element={<Navigate to="/portfolio" replace />} />
            </Routes>
            </Suspense>
          </AppShell>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter basename={getRouterBasename()}>
        <AppRoutes />
        <StartupFrame />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
