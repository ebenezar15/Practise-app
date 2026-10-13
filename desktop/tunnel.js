/* Overture desktop — put the classroom server online for free with Cloudflare Tunnel.
 * Downloads Cloudflare's `cloudflared` program on first use (into the app's data folder),
 * then runs either a quick tunnel (random https://….trycloudflare.com address, no account)
 * or a named tunnel from a token (your own permanent address, free Cloudflare account).
 * Plain Node so it can be tested outside Electron. */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn, execFile } = require('child_process');

const BASE = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';

function assetFor(platform, arch) {
  if (platform === 'win32') return { file: 'cloudflared-windows-amd64.exe', bin: 'cloudflared.exe' }; // runs on ARM Windows too
  if (platform === 'darwin') return { file: `cloudflared-darwin-${arch === 'arm64' ? 'arm64' : 'amd64'}.tgz`, bin: 'cloudflared', tgz: true };
  if (platform === 'linux') return { file: `cloudflared-linux-${arch === 'arm64' ? 'arm64' : arch === 'arm' ? 'arm' : 'amd64'}`, bin: 'cloudflared' };
  throw new Error('Cloudflare Tunnel is not available for ' + platform);
}

function download(url, dest, onProgress, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Overture-desktop' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirects > 8) return reject(new Error('Too many redirects'));
        return resolve(download(new URL(res.headers.location, url).toString(), dest, onProgress, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('Download failed (HTTP ' + res.statusCode + ')')); }
      const total = +res.headers['content-length'] || 0;
      let got = 0;
      const tmp = dest + '.part';
      const out = fs.createWriteStream(tmp);
      let shown = -1;
      res.on('data', (c) => { got += c.length; const pct = total ? Math.floor((got / total) * 100) : 0; if (onProgress && pct !== shown) { shown = pct; onProgress(pct / 100); } });
      res.pipe(out);
      out.on('finish', () => out.close(() => { fs.renameSync(tmp, dest); resolve(dest); }));
      out.on('error', reject);
      res.on('error', reject);
    });
    req.setTimeout(60000, () => req.destroy(new Error('Download timed out')));
    req.on('error', reject);
  });
}

/** Path to a working cloudflared (system-wide install, or downloaded into binDir). */
async function ensureCloudflared(binDir, onStatus, opts) {
  opts = opts || {};
  const platform = opts.platform || process.platform, arch = opts.arch || process.arch;
  const a = assetFor(platform, arch);
  const bin = path.join(binDir, a.bin);
  if (fs.existsSync(bin)) return bin;
  fs.mkdirSync(binDir, { recursive: true });
  onStatus && onStatus({ state: 'downloading', progress: 0, message: 'Downloading Cloudflare Tunnel (one time, about 20–40 MB)…' });
  const dl = path.join(binDir, a.file);
  await download(BASE + a.file, dl, (p) => onStatus && onStatus({ state: 'downloading', progress: p, message: `Downloading Cloudflare Tunnel… ${Math.round(p * 100)}%` }));
  if (a.tgz) {
    await new Promise((resolve, reject) => execFile('tar', ['-xzf', dl, '-C', binDir], (err) => (err ? reject(err) : resolve())));
    fs.unlinkSync(dl);
  } else if (dl !== bin) fs.renameSync(dl, bin);
  if (platform !== 'win32') fs.chmodSync(bin, 0o755);
  if (platform === 'darwin') await new Promise((r) => execFile('xattr', ['-d', 'com.apple.quarantine', bin], () => r()));
  return bin;
}

/** The most useful error line from cloudflared's output. */
function lastError(log) {
  const lines = log.split('\n').filter((l) => /\b(ERR|failed|error)\b/i.test(l));
  const l = lines.length ? lines[lines.length - 1] : '';
  return l.replace(/^\S+Z\s+(ERR|INF|WRN)\s+/, '').slice(0, 240) + (/no such host|dial tcp|i\/o timeout/i.test(l) ? ' — check this computer\'s internet connection or firewall.' : '');
}

const URL_RE = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/i;

/**
 * Start a tunnel to http://localhost:port.
 * opts: {binDir, port, token, hostname, onStatus}
 * Resolves to a controller {stop(), status}; status.url is the public https address.
 */
async function startTunnel(opts) {
  const onStatus = opts.onStatus || (() => {});
  const bin = await ensureCloudflared(opts.binDir, onStatus);
  const args = opts.token
    ? ['tunnel', '--no-autoupdate', 'run', '--token', opts.token]
    : ['tunnel', '--no-autoupdate', '--url', `http://localhost:${opts.port}`];
  const ctl = { status: { state: 'starting', mode: opts.token ? 'named' : 'quick', url: opts.token && opts.hostname ? 'https://' + String(opts.hostname).replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null, message: 'Connecting to Cloudflare…' } };
  const set = (patch) => { Object.assign(ctl.status, patch); onStatus(Object.assign({}, ctl.status)); };
  set({});
  const child = spawn(bin, args, { windowsHide: true, env: Object.assign({}, process.env, { NO_COLOR: '1' }) });
  ctl.child = child;
  let log = '';
  const onData = (buf) => {
    const s = buf.toString();
    log = (log + s).slice(-6000);
    const m = URL_RE.exec(s);
    if (m && ctl.status.mode === 'quick' && ctl.status.url !== m[0]) set({ url: m[0], message: 'Waiting for the address to come online…' });
    if (/Registered tunnel connection|Connection [a-f0-9-]+ registered/i.test(s)) set({ state: 'online', message: 'Online' });
    if (/Unauthorized|invalid token|Provided Tunnel token is not valid/i.test(s)) set({ state: 'error', message: 'Cloudflare rejected the tunnel token — copy it again from the Cloudflare dashboard.' });
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('error', (e) => set({ state: 'error', message: 'Could not start cloudflared: ' + e.message }));
  child.on('exit', (code) => { if (ctl.status.state !== 'stopped') set({ state: code === 0 ? 'stopped' : 'error', message: code === 0 ? 'Stopped' : `Tunnel stopped (code ${code}). ${lastError(log)}` }); });
  ctl.stop = () => { ctl.status.state = 'stopped'; try { child.kill(); } catch (e) { /* ignore */ } onStatus(Object.assign({}, ctl.status, { message: 'Stopped' })); };
  ctl.log = () => log;
  return ctl;
}

module.exports = { startTunnel, ensureCloudflared, assetFor, URL_RE, lastError };
