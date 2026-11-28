#!/usr/bin/env node
/**
 * r370 — what the unconditional raw-body capture cost.
 *
 * Found (app.ts): `express.json({ verify })` copied EVERY request body into
 * `req.rawBody` — but only `POST /api/v1/webhooks/resend` ever reads those
 * bytes (the HMAC is computed over the exact body). Every other request paid
 * a full Buffer copy and pinned a second copy for its lifetime.
 *
 * This measures the same JSON parser with and without the copy, on 1 MB
 * bodies (the app's own `limit: '1mb'`), over one keep-alive connection.
 *
 *   node scripts/measure-rawbody.mjs [requests] [bytes]
 */
import http from 'node:http';
import express from 'express';

const REQUESTS = Number(process.argv[2] ?? 400);
const BODY_BYTES = Number(process.argv[3] ?? 1024 * 1024);

const payload = JSON.stringify({ note: 'x'.repeat(BODY_BYTES) });

function build(capture) {
  const app = express();
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        if (capture) req.rawBody = Buffer.from(buf);
      },
    }),
  );
  app.post('/echo', (req, res) => {
    res.json({ ok: true, size: JSON.stringify(req.body).length });
  });
  const server = app.listen(0);
  return { server, port: server.address().port };
}

function run({ port }, n) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  const body = Buffer.from(payload, 'utf8');
  const one = () =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          port,
          method: 'POST',
          path: '/echo',
          agent,
          headers: { 'content-type': 'application/json', 'content-length': body.length },
        },
        (res) => {
          res.resume();
          res.on('end', resolve);
        },
      );
      req.on('error', reject);
      req.end(body);
    });
  return (async () => {
    const t0 = performance.now();
    for (let i = 0; i < n; i += 1) await one();
    const ms = performance.now() - t0;
    agent.destroy();
    return ms;
  })();
}

const a = build(true);
const b = build(false);
try {
  // warm-up so JIT/connection setup is not part of the comparison
  await run(a, 20);
  await run(b, 20);

  const msCopied = await run(a, REQUESTS);
  const msGated = await run(b, REQUESTS);

  const perReq = (ms) => (ms / REQUESTS).toFixed(3);
  console.log(`requests=${REQUESTS} body=${(BODY_BYTES / 1024 / 1024).toFixed(2)} MiB`);
  console.log(`capture every body   ${msCopied.toFixed(0)} ms  (${perReq(msCopied)} ms/req)  copied ${((REQUESTS * BODY_BYTES) / 1024 / 1024).toFixed(0)} MiB`);
  console.log(`capture webhooks only ${msGated.toFixed(0)} ms  (${perReq(msGated)} ms/req)  copied 0 MiB`);
  console.log(`delta ${(msCopied - msGated).toFixed(0)} ms over ${REQUESTS} requests (${(((msCopied - msGated) / msCopied) * 100).toFixed(0)}% of the parse path)`);
} finally {
  a.server.close();
  b.server.close();
}
