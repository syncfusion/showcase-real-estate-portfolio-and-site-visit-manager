import React, { createContext, useContext, useEffect, useState } from 'react';
import lightBundle from '@syncfusion/ej2-tailwind3-theme/styles/tailwind3.css?url';
import darkBundle from '@syncfusion/ej2-tailwind3-dark-theme/styles/tailwind3-dark.css?url';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  /** The Syncfusion theme bundle has loaded (or failed): the shell can lay out. Until then the startup
   *  screen shows; the unstyled Sidebar would push the page below the window. */
  ready: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'rep_theme_preference_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
      // Fallback to light
    }
    return 'light';
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 1. Update data-theme on documentElement
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage quota or privacy mode error
    }

    // 2. The Syncfusion Tailwind 3 bundle only, imported from the npm theme package (never copied
    // into public/). It imports every control, Sidebar, Grid pager and AI AssistView included; a
    // control's own index.css on top re-imports base styles that override it (Grid text 14px -> 12px).
    void swapStylesheets(THEME_SHEETS[theme]).then(() => setReady(true));
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, ready, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const THEME_SHEETS: Record<Theme, Record<string, string>> = {
  light: { 'sf-theme-bundle': lightBundle },
  dark: { 'sf-theme-bundle': darkBundle },
};

// Load every new sheet off-screen first, then swap them all in one pass, so no control
// renders unstyled while the theme changes.
async function swapStylesheets(sheets: Record<string, string>) {
  const pending = Object.entries(sheets)
    .filter(([id, href]) => document.getElementById(id)?.getAttribute('href') !== href)
    .map(([id, href]) => new Promise<[string, HTMLLinkElement]>((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = link.onerror = () => resolve([id, link]);
      document.head.appendChild(link);
    }));
  for (const [id, link] of await Promise.all(pending)) {
    document.getElementById(id)?.remove();
    link.id = id;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
