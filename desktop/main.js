/* Cadenza desktop shell (Electron): runs the offline app from local files, grants microphone
 * & MIDI access, and can host the Cadenza Classroom Server for a teacher's LAN — and put it online for free
 * with Cloudflare Tunnel. */
'use strict';
const { app, BrowserWindow, ipcMain, session, shell, systemPreferences, Menu } = require('electron');
const path = require('path');

let win = null;
let classroom = null; // { server, port }
let tunnel = null; // Cloudflare Tunnel controller
const tunnelSettingsFile = () => path.join(app.getPath('userData'), 'tunnel.json');
const readTunnelSettings = () => { try { return JSON.parse(require('fs').readFileSync(tunnelSettingsFile(), 'utf8')); } catch (e) { return {}; } };
const sendTunnel = (st) => { if (win && !win.isDestroyed()) win.webContents.send('tunnel:update', st); };

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
  const server = createServer({ dataDir, appDir: path.join(__dirname, 'app'), trustProxy: true }); // works behind Cloudflare Tunnel too
  const port = (opts && opts.port) || 8787;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', resolve); });
  classroom = { server, port, dataDir };
  return serverStatus();
});
ipcMain.handle('classroom:stop', async () => {
  if (tunnel) { tunnel.stop(); tunnel = null; }
  if (classroom) { await new Promise((r) => classroom.server.close(r)); classroom = null; }
  return serverStatus();
});
ipcMain.handle('classroom:status', async () => serverStatus());

// ---- free online access: Cloudflare Tunnel (quick random address, or your own with a token)
ipcMain.handle('tunnel:start', async (_e, opts) => {
  if (!classroom) throw new Error('Start the classroom server first');
  if (tunnel) tunnel.stop();
  opts = opts || {};
  const saved = readTunnelSettings();
  const token = opts.mode === 'named' ? (opts.token || saved.token || '').trim() : '';
  if (opts.mode === 'named' && !token) throw new Error('Paste your Cloudflare tunnel token first');
  if (opts.mode === 'named') require('fs').writeFileSync(tunnelSettingsFile(), JSON.stringify({ token, hostname: opts.hostname || saved.hostname || '' }));
  tunnel = await require('./tunnel.js').startTunnel({ binDir: path.join(app.getPath('userData'), 'bin'), port: classroom.port, token, hostname: opts.hostname || saved.hostname, onStatus: sendTunnel });
  return tunnel.status;
});
ipcMain.handle('tunnel:stop', async () => { if (tunnel) { tunnel.stop(); tunnel = null; } return { state: 'stopped' }; });
ipcMain.handle('tunnel:status', async () => {
  const saved = readTunnelSettings();
  return Object.assign({ state: 'stopped', hasToken: !!saved.token, hostname: saved.hostname || '' }, tunnel ? tunnel.status : {});
});

app.whenReady().then(async () => {
  // microphone, audio interfaces and MIDI keyboards
  const allowed = new Set(['media', 'midi', 'midiSysex', 'audioCapture', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(allowed.has(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  createWindow();
  // ask for the microphone after the window is visible (never block start-up on the prompt)
  if (process.platform === 'darwin' && systemPreferences.askForMediaAccess) {
    systemPreferences.askForMediaAccess('microphone').catch(() => { /* user can enable later */ });
  }
  if (process.env.CADENZA_SMOKE_TEST) smokeTest();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

/** CI check: the packaged app must start, render the UI and run its audio engine. */
function smokeTest() {
  const fail = (why) => { console.error('SMOKE_FAIL ' + why); app.exit(1); };
  const timer = setTimeout(() => fail('timeout'), 45000);
  win.webContents.once('did-fail-load', (_e, code, desc) => fail('load ' + code + ' ' + desc));
  win.webContents.on('render-process-gone', (_e, d) => fail('renderer ' + d.reason));
  win.webContents.once('did-finish-load', async () => {
    try {
      const r = await win.webContents.executeJavaScript(`(async () => {
        await new Promise((res) => setTimeout(res, 1500));
        const ok = !!document.querySelector('.brand-name') && typeof PM === 'object' && !!PM.App && !!PM.Analyzer;
        const n = PM.Midi.renderNotes([{ midi: 60, start: 0, end: 0.5 }], { sampleRate: 8000 });
        return { ok, title: document.title, samples: n.data.length, desktop: !!window.cadenzaDesktop };
      })()`);
      const st = await require('./app/server/server.js');
      clearTimeout(timer);
      if (!r.ok || !r.samples || !r.desktop || !st.createServer) return fail(JSON.stringify(r));
      console.log('SMOKE_OK ' + JSON.stringify(r));
      app.exit(0);
    } catch (e) { fail(e.message); }
  });
}

app.on('window-all-closed', () => {
  if (tunnel) tunnel.stop();
  if (classroom) classroom.server.close();
  if (process.platform !== 'darwin') app.quit();
});
