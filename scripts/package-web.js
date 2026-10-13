#!/usr/bin/env node
/* Builds dist/Overture-web-<version>.zip: the offline app + classroom server, runnable by
 * double-clicking index.html (Chrome/Edge) or with the included start scripts. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;
const stage = path.join(root, 'dist', 'Overture');
fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
for (const item of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'icons', 'server', 'serve.js', 'package.json', 'README.md']) {
  fs.cpSync(path.join(root, item), path.join(stage, item), { recursive: true });
}
fs.writeFileSync(path.join(stage, 'Start Overture (Windows).bat'), '@echo off\r\ncd /d "%~dp0"\r\nwhere node >nul 2>nul && (start "" http://localhost:5173 & node serve.js) || start "" "%~dp0index.html"\r\n');
fs.writeFileSync(path.join(stage, 'Start Overture (Mac).command'), '#!/bin/bash\ncd "$(dirname "$0")"\nif command -v node >/dev/null; then (sleep 1; open http://localhost:5173) & node serve.js; else open index.html; fi\n', { mode: 0o755 });
fs.writeFileSync(path.join(stage, 'start-cadenza-linux.sh'), '#!/bin/sh\ncd "$(dirname "$0")"\nif command -v node >/dev/null; then (sleep 1; xdg-open http://localhost:5173) & node serve.js; else xdg-open index.html; fi\n', { mode: 0o755 });
fs.writeFileSync(path.join(stage, 'Start Classroom Server (Windows).bat'), '@echo off\r\ncd /d "%~dp0"\r\nnode server\\server.js\r\npause\r\n');
fs.writeFileSync(path.join(stage, 'start-classroom-server.sh'), '#!/bin/sh\ncd "$(dirname "$0")"\nnode server/server.js\n', { mode: 0o755 });
fs.writeFileSync(path.join(stage, 'HOW-TO-START.txt'), [
  'CADENZA — offline AI practice coach',
  '',
  'Quick start (no install): open index.html in Google Chrome or Microsoft Edge.',
  'Best experience: install Node.js (nodejs.org), then double-click the "Start Overture" script for your system',
  'and click "Install app" in the browser address bar — Overture then runs like a normal program, fully offline.',
  '',
  'Teachers: run "Start Classroom Server" (needs Node.js). Open the address it prints, go to Classroom and',
  'create the master teacher account. Students enter that address in Classroom to sign in.',
  'Or use the Overture desktop installer, which includes a one-click "Host classroom" button.',
].join('\r\n'));
const zip = path.join(root, 'dist', `Overture-web-${version}.zip`);
fs.rmSync(zip, { force: true });
execSync(`cd "${path.join(root, 'dist')}" && zip -qr "${zip}" Overture`);
console.log('Wrote', zip);
