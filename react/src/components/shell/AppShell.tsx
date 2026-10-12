import React, { lazy, Suspense, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, RotateCcw, Sparkles } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getRouterBasename } from '@/basePath';
import { AppShell as ReferenceShell, type NavItem } from './reference/AppShell';
import { ROUTES } from './routes';

// AI AssistView and the Markdown converter load with the drawer, the first time it opens, not with the shell.
const AiAdvisorDrawer = lazy(() => import('@/components/ai/AiAdvisorDrawer').then(m => ({ default: m.AiAdvisorDrawer })));

// The left-navigation shell in ./reference: 240px pushing the content and docking to a 64px icon strip at
// 1024px and wider, a slide-over drawer below. This file only supplies the app's routes, brand
// and header actions.

interface AppShellProps {
  children: React.ReactNode;
  onResetDemo: () => void;
}


export const AppShell: React.FC<AppShellProps> = ({ children, onResetDemo }) => {
  const [aiOpen, setAiOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const basename = getRouterBasename().replace(/\/$/, '');

  const items: NavItem[] = ROUTES.map(route => ({ ...route, href: `${basename}/${route.id}` }));
  const currentId = location.pathname.replace(/^\//, '').split('/')[0] || 'portfolio';
  const current = ROUTES.find(route => route.id === currentId);

  const onNavigate = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(`/${id}`);
  };

  const headerButton = 'app-shell-icon-button';
  return (
    <>
      <ReferenceShell
        appName="Real Estate Portfolio"
        appSubtitle="Site Visit Manager"
        logo={<span className="text-sm font-bold">RE</span>}
        items={items}
        currentId={currentId}
        onNavigate={onNavigate}
        storageKey="real-estate-portfolio-nav-collapsed"
        headerStart={<strong className="text-sm text-[var(--color-sf-fg-primary)] truncate">{current?.label}</strong>}
        headerEnd={<>
          {/* One button: the label hides on phones. (A second icon-only button using the shell's
              icon-button class would ignore Tailwind's sm:hidden, which sits in a lower CSS layer.) */}
          <button type="button" onClick={() => setAiOpen(true)} aria-label="Open the sample AI advisor"
            className="rep-ai-button inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-md text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
            <Sparkles size={16} aria-hidden="true" /> <span className="hidden sm:inline">Sample AI Advisor</span>
          </button>
          <button type="button" onClick={onResetDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--app-card-border)] text-[var(--color-sf-fg-secondary)] hover:bg-[var(--color-sf-bg-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]">
            <RotateCcw size={14} aria-hidden="true" /> Reset to Demo Data
          </button>
          <button type="button" onClick={toggleTheme} className={headerButton}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
            {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          </button>
        </>}
        footer={<span>Built with Syncfusion</span>}
      >
        {children}
      </ReferenceShell>
      {aiOpen && (
        <Suspense fallback={null}>
          <AiAdvisorDrawer isOpen onClose={() => setAiOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
