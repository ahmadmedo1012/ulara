#!/usr/bin/env node
/** r351 N0 — serves the expo web export (SPA fallback) for captures. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
const DIST = resolve(process.cwd(), 'dist');
const PORT = Number(process.argv[2] ?? 5390);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, `http://x:${PORT}`).pathname;
    let file = join(DIST, path === '/' ? 'index.html' : path);
    if (!existsSync(file)) file = join(DIST, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(PORT, () => console.log(`serving ${DIST} on ${PORT}`));
