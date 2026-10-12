import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import startupPreload from './vite/startup-preload.mjs';

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, './package.json'), 'utf-8'));

// https://vite.dev/config/
export default defineConfig({
  base: '/real-estate-portfolio/react/',
  plugins: [react(), tailwindcss(), startupPreload({
    base: '/real-estate-portfolio/react/',
    defaultRoute: 'portfolio',
    routes: {
      portfolio: 'src/pages/DashboardPage.tsx',
      properties: 'src/pages/PropertiesPage.tsx',
      'site-visits': 'src/pages/SiteVisitsPage.tsx',
      'due-diligence': ['src/pages/DueDiligencePage.tsx', 'src/components/documents/DocumentViewer.tsx'],
      pipeline: 'src/pages/PipelinePage.tsx'
    },
    themes: { light: /assets\/tailwind3-(?!dark)[\w-]+\.css$/, dark: /assets\/tailwind3-dark-[\w-]+\.css$/ }
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString())
  },
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Syncfusion in shared chunks: pages share what they use, the
        // browser fetches them in parallel and caches them across pages. The shared foundation (base, data,
        // popups, buttons, inputs, lists, navigations) is one chunk; each control package its own.
        manualChunks(id) {
          const match = id.match(/node_modules\/@syncfusion\/ej2-(?:react-)?([a-z0-9-]+)\//);
          if (!match || match[1].endsWith('-theme')) return undefined; // theme stylesheets stay assets
          const core = ['base', 'data', 'popups', 'buttons', 'splitbuttons', 'inputs', 'lists', 'navigations', 'notifications'];
          return 'sf-' + (core.includes(match[1]) ? 'core' : match[1]);
        }
      }
    }
  }
});
