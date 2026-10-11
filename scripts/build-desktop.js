#!/usr/bin/env node
/* Copies the web app + classroom server into desktop/app for packaging. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'desktop', 'app');
fs.rmSync(out, { recursive: true, force: true });
for (const item of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'icons', 'server']) {
  fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
const icon = path.join(root, 'icons', 'icon.png');
if (fs.existsSync(icon)) fs.copyFileSync(icon, path.join(root, 'desktop', 'build', 'icon.png'));
console.log('Prepared desktop/app');
