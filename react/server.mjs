// Dependency-free static host for Azure App Service (Linux).
//
// Serves the Vite build in ./dist with SPA fallback, strips the published
// mount prefix (/real-estate-portfolio/react) before resolving files against
// dist/ so the same build works both behind the showcase gallery's
// load-balancer prefix and when served directly from the App Service root,
// and answers GET /healthz at the service's own root with real, checkable
// fields (not a hardcoded status string).
//
// Sends the Brotli or gzip copy that scripts/precompress.mjs wrote beside each text asset when the
// request accepts it (Content-Encoding, Vary: Accept-Encoding); the original otherwise.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

const MOUNT_PATH = '/real-estate-portfolio/react';
const PORT = process.env.PORT || 8080;
const startedAt = Date.now();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm'
};

// Brotli first: about 10% smaller than gzip on these files.
const ENCODINGS = [['br', '.br'], ['gzip', '.gz']];

function pickEncoding(acceptEncoding, filePath) {
  const accepted = String(acceptEncoding || '').toLowerCase().split(',')
    .map(part => part.trim().split(';'))
    .filter(([, q]) => !q || parseFloat(q.split('=')[1]) > 0)
    .map(([name]) => name.trim());
  for (const [name, ext] of ENCODINGS) {
    if ((accepted.includes(name) || accepted.includes('*')) && fs.existsSync(filePath + ext)) return { name, path: filePath + ext };
  }
  return null;
}

function stripMountPath(pathname) {
  if (pathname === MOUNT_PATH || pathname.startsWith(`${MOUNT_PATH}/`)) {
    const stripped = pathname.slice(MOUNT_PATH.length);
    return stripped === '' ? '/' : stripped;
  }
  return pathname;
}

function healthPayload() {
  const indexExists = fs.existsSync(path.join(distDir, 'index.html'));
  return {
    status: indexExists ? 'ok' : 'missing-build',
    service: pkg.name,
    version: pkg.version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    node: process.version,
    timestamp: new Date().toISOString()
  };
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  // Health probe sits at the service's own root, never behind the mount prefix
  // (Azure App Service health-check settings target the origin directly).
  if (url.pathname === '/healthz') {
    const payload = healthPayload();
    sendJson(res, payload.status === 'ok' ? 200 : 503, payload);
    return;
  }

  const rawPathname = decodeURIComponent(url.pathname);
  const strippedPathname = stripMountPath(rawPathname);
  const normalized = path.posix.normalize(strippedPathname).replace(/^(\.\.[/\\])+/, '');

  let filePath = path.join(distDir, normalized);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  let isSpaFallback = false;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(distDir, 'index.html');
    isSpaFallback = true;
  }

  if (!fs.existsSync(filePath)) {
    sendJson(res, 503, { status: 'missing-build', service: pkg.name, version: pkg.version });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isHashedAsset = !isSpaFallback && normalized.includes('/assets/') && ext !== '.html';

  const encoding = pickEncoding(req.headers['accept-encoding'], filePath);
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache'
  };
  if (fs.existsSync(filePath + '.br') || fs.existsSync(filePath + '.gz')) headers.Vary = 'Accept-Encoding';
  if (encoding) headers['Content-Encoding'] = encoding.name;
  const sendPath = encoding ? encoding.path : filePath;
  headers['Content-Length'] = fs.statSync(sendPath).size;
  res.writeHead(200, headers);

  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(sendPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`[${pkg.name}] static host listening on port ${PORT}, mountPath=${MOUNT_PATH}`);
});
