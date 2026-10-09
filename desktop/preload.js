/* Exposes a tiny, safe API to the web app (no Node access in the page). */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cadenzaDesktop', {
  isDesktop: true,
  platform: process.platform,
  startServer: (opts) => ipcRenderer.invoke('classroom:start', opts),
  stopServer: () => ipcRenderer.invoke('classroom:stop'),
  serverStatus: () => ipcRenderer.invoke('classroom:status'),
});
