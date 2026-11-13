/* eslint-disable @typescript-eslint/no-require-imports */
// Custom server: identical to `next start`, plus one thing — every request runs
// inside an AsyncLocalStorage scope that carries the request host. lib/db.ts
// uses that host to pick the panel database, so all code handling a request
// can only ever reach the database of the panel it was addressed to.
const http = require('http');
const { AsyncLocalStorage } = require('node:async_hooks');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME_BIND || '127.0.0.1';
const port = parseInt(process.env.PORT || '3000', 10);
// Only trust X-Forwarded-* when the request comes from our own reverse proxy.
const trustProxy = process.env.TRUST_PROXY !== 'false';

const g = globalThis;
g.__tcTenancy ??= {};
g.__tcTenancy.als ??= new AsyncLocalStorage();
const als = g.__tcTenancy.als;

function normalizeHost(raw) {
  if (!raw) return '';
  let host = String(raw).split(',')[0].trim().toLowerCase();
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 0 ? host.slice(0, end + 1) : host;
  }
  const colon = host.lastIndexOf(':');
  if (colon > -1) host = host.slice(0, colon);
  if (host.endsWith('.')) host = host.slice(0, -1);
  return host;
}

function isLoopback(address) {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

// `hostname` here is only what Next.js uses to build its internal request URLs
// (the proxy relies on it to recognise its own rewrites); the socket itself is
// bound to HOSTNAME_BIND below.
const app = next({ dev, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const fromProxy = trustProxy && isLoopback(req.socket.remoteAddress);
    if (!fromProxy) {
      // Never let a direct client spoof proxy headers.
      delete req.headers['x-forwarded-host'];
      delete req.headers['x-forwarded-proto'];
      delete req.headers['x-forwarded-for'];
      delete req.headers['x-real-ip'];
    }
    // Set by our own request proxy only; never accept it from a client.
    delete req.headers['x-client-ip'];
    // "Direct" = a process on this machine called us without going through the
    // reverse proxy (Caddy's certificate check, the cron runner). Only such
    // requests may use the internal endpoints, whatever Host they claim.
    delete req.headers['x-tc-direct'];
    if (isLoopback(req.socket.remoteAddress) && !req.headers['x-forwarded-for'] && !req.headers['x-forwarded-host']) {
      req.headers['x-tc-direct'] = '1';
    }
    const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const host = normalizeHost(rawHost);
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim() === 'https' ? 'https' : 'http';
    als.run({ host, proto, origin: rawHost ? `${proto}://${rawHost}` : '' }, () => handle(req, res));
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });

  server.listen(port, hostname, () => {
    console.log(`> TopupCraft ready on http://${hostname}:${port} (${dev ? 'development' : 'production'})`);
  });
});
