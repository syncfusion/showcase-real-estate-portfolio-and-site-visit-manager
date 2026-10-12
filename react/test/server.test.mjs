import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const PORT = 8099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}${pathname}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
  });
}

// Raw bytes, no automatic decoding: what the server actually sent.
function request(pathname, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${pathname}`, { method, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('server.mjs static host (Azure App Service Linux target)', async (t) => {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: appRoot,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Wait for the server to announce it is listening.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('server.mjs did not start in time')), 8000);
    child.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('listening on port')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on('error', reject);
  });

  try {
    await t.test('GET /healthz returns ok with real checkable fields when dist/ exists', async () => {
      const res = await get('/healthz');
      assert.equal(res.statusCode, 200);
      const payload = JSON.parse(res.body);
      assert.equal(payload.status, 'ok');
      assert.equal(payload.service, 'real-estate-portfolio');
      assert.ok(payload.version);
      assert.ok(typeof payload.uptimeSeconds === 'number');
      assert.ok(payload.node.startsWith('v'));
      assert.ok(new Date(payload.timestamp).getTime() > 0);
    });

    await t.test('GET /real-estate-portfolio/react/ (prefixed root) strips mount path and serves index.html', async () => {
      const res = await get('/real-estate-portfolio/react/');
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'], /text\/html/);
      assert.match(res.body, /<div id="root">|<html/i);
    });

    await t.test('GET /real-estate-portfolio/react/pipeline (prefixed SPA route) falls back to index.html', async () => {
      const res = await get('/real-estate-portfolio/react/pipeline');
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'], /text\/html/);
    });

    await t.test('GET / (unprefixed root) also serves index.html directly', async () => {
      const res = await get('/');
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'], /text\/html/);
    });

    await t.test('prefixed hashed asset resolves with immutable cache-control, not the SPA fallback', async () => {
      // Discover a real hashed asset path from the served index.html.
      const indexRes = await get('/real-estate-portfolio/react/');
      const match = indexRes.body.match(/\/real-estate-portfolio\/react\/assets\/[^"']+\.js/);
      assert.ok(match, 'expected to find a hashed JS asset reference in index.html');
      const assetRes = await get(match[0]);
      assert.equal(assetRes.statusCode, 200);
      assert.match(assetRes.headers['content-type'], /javascript/);
      assert.match(assetRes.headers['cache-control'], /immutable/);
    });

    // Loading states: precompressed copies by Accept-Encoding.
    await t.test('the theme bundle is sent as br, gzip or identity by Accept-Encoding, each decoding to the built file', async () => {
      const assets = path.join(appRoot, 'dist', 'assets');
      const file = fs.readdirSync(assets).find((name) => /^tailwind3-[^.]+\.css$/.test(name));
      assert.ok(file, 'expected the built theme bundle');
      const original = fs.readFileSync(path.join(assets, file));
      const url = `/real-estate-portfolio/react/assets/${file}`;
      const br = await request(url, { 'Accept-Encoding': 'gzip, deflate, br' });
      assert.equal(br.headers['content-encoding'], 'br');
      assert.equal(br.headers.vary, 'Accept-Encoding');
      assert.ok(br.body.length < original.length / 5, `br ${br.body.length} bytes`);
      assert.ok(brotliDecompressSync(br.body).equals(original));
      const gz = await request(url, { 'Accept-Encoding': 'gzip' });
      assert.equal(gz.headers['content-encoding'], 'gzip');
      assert.ok(gunzipSync(gz.body).equals(original));
      const plain = await request(url);
      assert.equal(plain.headers['content-encoding'], undefined);
      assert.ok(plain.body.equals(original));
      const refused = await request(url, { 'Accept-Encoding': 'br;q=0, gzip;q=0' });
      assert.equal(refused.headers['content-encoding'], undefined);
      assert.match(br.headers['cache-control'], /immutable/);
    });

    await t.test('HEAD answers with the encoded length and no body', async () => {
      const indexRes = await get('/real-estate-portfolio/react/');
      const asset = indexRes.body.match(/\/real-estate-portfolio\/react\/assets\/[^"']+\.js/)[0];
      const head = await request(asset, { 'Accept-Encoding': 'br' }, 'HEAD');
      assert.equal(head.statusCode, 200);
      assert.equal(head.headers['content-encoding'], 'br');
      assert.ok(Number(head.headers['content-length']) > 0);
      assert.equal(head.body.length, 0);
    });

    await t.test('index.html draws the app frame with a loading indicator before the app runs', async () => {
      const res = await get('/real-estate-portfolio/react/');
      // Frame first: the sidebar, header and a
      // loading indicator from the HTML alone, next to an empty #root that React fills underneath.
      assert.match(res.body, /<div id="app-boot"[^>]*>[\s\S]*<ul class="boot-links">[\s\S]*Due Diligence Vault/);
      assert.match(res.body, /class="app-loading" role="status"/);
      assert.match(res.body, /<div id="root"><\/div>/);
      assert.doesNotMatch(res.body, /app-loading--screen" role/);
    });
  } finally {
    child.kill();
  }
});
