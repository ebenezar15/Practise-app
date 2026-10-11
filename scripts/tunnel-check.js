#!/usr/bin/env node
/* CI check for the free "Option C" hosting: download cloudflared exactly as the desktop app
 * does, open a quick Cloudflare Tunnel to a local classroom server, and use the classroom
 * API (setup, upload a recording-sized file, download it with a byte range) over the
 * public https address.   node scripts/tunnel-check.js [binDir] */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startTunnel } = require('../desktop/tunnel.js');
const { createServer } = require('../server/server.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const binDir = process.argv[2] || path.join(os.tmpdir(), 'cadenza-cloudflared');
  const server = createServer({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cadenza-tun-')), trustProxy: true });
  await new Promise((r) => server.listen(8787, '127.0.0.1', r));
  let t, ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    t = await startTunnel({ binDir, port: 8787, onStatus: (s) => { if (!/Downloading/.test(s.message) || /100%/.test(s.message)) console.log(`[${s.state}] ${s.url || ''} ${s.message}`); } });
    const until = Date.now() + 90000;
    while (Date.now() < until && !(t.status.url && t.status.state === 'online') && t.status.state !== 'error') await sleep(1000);
    if (!t.status.url || t.status.state !== 'online') { console.log('tunnel did not come up:', t.log().slice(-800)); t.stop(); continue; }
    const base = t.status.url;
    for (let i = 0; i < 40; i++) { // DNS for the new address can take a little while
      try { const r = await fetch(base + '/api/health'); if (r.ok) { console.log('health via tunnel:', await r.text()); ok = true; break; } } catch (e) { /* not resolvable yet */ }
      await sleep(3000);
    }
    if (!ok) t.stop();
  }
  if (!ok) { console.error('FAILED: no working tunnel'); process.exit(1); }
  const base = t.status.url;
  const j = async (method, p, body, token) => {
    const r = await fetch(base + '/api' + p, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: body && JSON.stringify(body) });
    const d = await r.json(); if (!r.ok) throw new Error(p + ': ' + JSON.stringify(d)); return d;
  };
  const { token } = await j('POST', '/setup', { username: 'maestro', password: 'supersecret', schoolName: 'Tunnel test' });
  const audio = Buffer.alloc(2 * 1024 * 1024, 7);
  const up = await fetch(base + '/api/files', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'audio/webm', 'X-File-Name': 'take.webm' }, body: audio });
  const { file } = await up.json();
  const part = await fetch(base + '/api/files/' + file.id, { headers: { Authorization: 'Bearer ' + token, Range: 'bytes=0-99' } });
  if (part.status !== 206 || (await part.arrayBuffer()).byteLength !== 100) throw new Error('range request failed: ' + part.status);
  const app = await (await fetch(base + '/')).text();
  if (!/<title>Cadenza/.test(app)) throw new Error('app page not served');
  const pdfjs = await fetch(base + '/vendor/pdfjs/pdf.min.js');
  if (!pdfjs.ok) throw new Error('pdf viewer not served');
  console.log(`TUNNEL_OK ${base} — app, sign-up, 2 MB upload and ranged download work over https`);
  t.stop(); server.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
