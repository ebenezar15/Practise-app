#!/usr/bin/env node
/* Zero-dependency static server: `node serve.js [port]` then open http://localhost:5173
 * Serving over localhost enables the offline service worker & "Install app". */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = +process.argv[2] || +process.env.PORT || 5173;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.wav': 'audio/wav', '.mid': 'audio/midi' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, () => console.log(`Cadenza running at http://localhost:${port}`));
