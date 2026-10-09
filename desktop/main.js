/* Cadenza desktop shell (Electron): runs the offline app from local files, grants microphone
 * & MIDI access, and can host the Cadenza Classroom Server for a teacher's LAN. */
'use strict';
const { app, BrowserWindow, ipcMain, session, shell, systemPreferences, Menu } = require('electron');
const path = require('path');

let win = null;
let classroom = null; // { server, port }

function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 920, minWidth: 380, minHeight: 600,
    backgroundColor: '#f7f5ff', title: 'Cadenza', icon: path.join(__dirname, 'app', 'icons', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function serverStatus() {
  if (!classroom) return { running: false, urls: [] };
  const { lanAddresses } = require('./app/server/server.js');
  const proto = classroom.server.secure ? 'https' : 'http';
  const ips = lanAddresses();
  return { running: true, port: classroom.port, urls: (ips.length ? ips : ['localhost']).map((ip) => `${proto}://${ip}:${classroom.port}`), dataDir: classroom.dataDir };
}

ipcMain.handle('classroom:start', async (_e, opts) => {
  if (classroom) return serverStatus();
  const { createServer } = require('./app/server/server.js');
  const dataDir = path.join(app.getPath('userData'), 'classroom-data');
  const server = createServer({ dataDir, appDir: path.join(__dirname, 'app') });
  const port = (opts && opts.port) || 8787;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', resolve); });
  classroom = { server, port, dataDir };
  return serverStatus();
});
ipcMain.handle('classroom:stop', async () => {
  if (classroom) { await new Promise((r) => classroom.server.close(r)); classroom = null; }
  return serverStatus();
});
ipcMain.handle('classroom:status', async () => serverStatus());

app.whenReady().then(async () => {
  // microphone, audio interfaces and MIDI keyboards
  const allowed = new Set(['media', 'midi', 'midiSysex', 'audioCapture', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(allowed.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
  if (process.platform === 'darwin' && systemPreferences.askForMediaAccess) {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch (e) { /* user can enable later */ }
  }
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (classroom) classroom.server.close();
  if (process.platform !== 'darwin') app.quit();
});
