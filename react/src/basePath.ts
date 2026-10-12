/**
 * Resolves the application base path safely in both Vite dev server and
 * production hosting behind a path prefix (e.g. /real-estate-portfolio/react/).
 * The same build must also
 * serve correctly when mounted directly at a host's own root (e.g. local
 * `npm run preview`, or an App Service root without the load-balancer
 * prefix), so the resolution is based on the actual current URL rather than
 * only the compile-time Vite `base` value.
 */
const PUBLIC_BASE_PATH = '/real-estate-portfolio/react';

function isMountedAtPrefix(): boolean {
  if (typeof window === 'undefined') {
    // SSR/build-time fallback: trust the compiled Vite base.
    return (import.meta.env.BASE_URL || '/').startsWith(PUBLIC_BASE_PATH);
  }
  return window.location.pathname.startsWith(PUBLIC_BASE_PATH);
}

export function getBasePath(): string {
  return isMountedAtPrefix() ? `${PUBLIC_BASE_PATH}/` : '/';
}

export function getRouterBasename(): string {
  return isMountedAtPrefix() ? PUBLIC_BASE_PATH : '/';
}
