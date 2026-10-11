/* Exposes a tiny, safe API to the web app (no Node access in the page). */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cadenzaDesktop', {
  isDesktop: true,
  platform: process.platform,
  startServer: (opts) => ipcRenderer.invoke('classroom:start', opts),
  stopServer: () => ipcRenderer.invoke('classroom:stop'),
  serverStatus: () => ipcRenderer.invoke('classroom:status'),
  startTunnel: (opts) => ipcRenderer.invoke('tunnel:start', opts),
  stopTunnel: () => ipcRenderer.invoke('tunnel:stop'),
  tunnelStatus: () => ipcRenderer.invoke('tunnel:status'),
  onTunnel: (cb) => { const h = (_e, st) => cb(st); ipcRenderer.on('tunnel:update', h); return () => ipcRenderer.removeListener('tunnel:update', h); },
});
