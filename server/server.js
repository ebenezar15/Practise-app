#!/usr/bin/env node
/* Cadenza Classroom Server — zero-dependency Node.js server that
 *   • hosts the Cadenza web app (so students can open/install it from the teacher's machine)
 *   • stores user accounts (master/admin, teachers, students), invite codes,
 *     assignments with attached songs, submissions and synced practice progress.
 *
 * Run:  node server/server.js            (PORT=8787, DATA_DIR=./server-data)
 * HTTPS: set TLS_CERT and TLS_KEY to PEM file paths (needed for microphone access when
 *        students open the app from another computer's address in a browser).
 */
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { mergeProgress } = require('../js/core/syncmerge.js');

const VERSION = '2.0.0';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.wav': 'audio/wav', '.mid': 'audio/midi', '.mp3': 'audio/mpeg' };

// ---------------- storage ----------------
function createStore(dir) {
  fs.mkdirSync(path.join(dir, 'files'), { recursive: true });
  const file = path.join(dir, 'db.json');
  let db = { users: [], tokens: [], invites: [], assignments: [], submissions: [], progress: {}, settings: { schoolName: 'Cadenza Studio' } };
  if (fs.existsSync(file)) db = Object.assign(db, JSON.parse(fs.readFileSync(file, 'utf8')));
  let timer = null;
  const flush = () => {
    timer = null;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file);
  };
  return {
    db,
    save() { if (!timer) timer = setTimeout(flush, 50); },
    flushNow() { if (timer) { clearTimeout(timer); flush(); } },
    filePath: (id) => path.join(dir, 'files', id.replace(/[^a-z0-9]/gi, '')),
  };
}

// ---------------- helpers ----------------
const id = (p) => p + crypto.randomBytes(8).toString('hex');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
function hashPassword(pw, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 32).toString('hex') };
}
function checkPassword(pw, user) {
  const h = crypto.scryptSync(pw, user.salt, 32);
  return crypto.timingSafeEqual(h, Buffer.from(user.hash, 'hex'));
}
const tempPassword = () => {
  const words = ['piano', 'tempo', 'chord', 'swing', 'forte', 'groove', 'scale', 'brass', 'bass', 'tune', 'jazz', 'blues', 'riff', 'beat'];
  return words[crypto.randomInt(words.length)] + '-' + words[crypto.randomInt(words.length)] + '-' + crypto.randomInt(10, 99);
};
const inviteCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[crypto.randomInt(32)]).join('');
const publicUser = (u) => u && ({ id: u.id, username: u.username, name: u.name, role: u.role, instrument: u.instrument, active: u.active !== false, createdAt: u.createdAt, mustChangePassword: !!u.mustChangePassword });
const isStaff = (u) => u && (u.role === 'admin' || u.role === 'teacher');
const validUsername = (s) => typeof s === 'string' && /^[a-z0-9._-]{3,32}$/i.test(s);

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---------------- server ----------------
function createServer(opts) {
  opts = opts || {};
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(process.cwd(), 'server-data');
  const appDir = opts.appDir || path.join(__dirname, '..');
  const store = createStore(dataDir);
  const db = store.db;
  const failures = new Map(); // ip → [timestamps]

  function auth(req) {
    const h = req.headers.authorization || '';
    const m = /^Bearer (.+)$/.exec(h);
    if (!m) return null;
    const t = db.tokens.find((x) => x.hash === sha(m[1]));
    if (!t) return null;
    const u = db.users.find((x) => x.id === t.userId);
    if (!u || u.active === false) return null;
    t.lastSeen = Date.now();
    u.lastSeen = t.lastSeen;
    return u;
  }
  function issueToken(u) {
    const token = crypto.randomBytes(32).toString('hex');
    db.tokens.push({ hash: sha(token), userId: u.id, createdAt: Date.now(), lastSeen: Date.now() });
    if (db.tokens.length > 5000) db.tokens.splice(0, db.tokens.length - 5000);
    store.save();
    return token;
  }
  function rateLimit(ip) {
    const now = Date.now();
    const arr = (failures.get(ip) || []).filter((t) => now - t < 60000);
    failures.set(ip, arr);
    if (arr.length >= 8) throw new HttpError(429, 'Too many attempts — wait a minute and try again.');
  }
  const fail = (ip) => failures.set(ip, [...(failures.get(ip) || []), Date.now()]);

  const visibleAssignments = (u) => db.assignments.filter((a) => isStaff(u) || a.assignees === 'all' || (Array.isArray(a.assignees) && a.assignees.includes(u.id)));

  function studentOverview(u) {
    const p = (db.progress[u.id] || {}).state || {};
    const subs = db.submissions.filter((s) => s.userId === u.id);
    const weekAgo = Date.now() - 7 * 86400000;
    const weekSeconds = Object.entries(p.days || {}).filter(([d]) => new Date(d).getTime() >= weekAgo).reduce((a, [, v]) => a + v, 0);
    const mine = visibleAssignments(u);
    const done = mine.filter((a) => subs.some((s) => s.assignmentId === a.id && meetsTarget(a, s))).length;
    return Object.assign(publicUser(u), {
      level: p.level || 1, xp: p.xp || 0, streak: p.streak || 0, totalSeconds: p.totalSeconds || 0, weekSeconds,
      lastActive: Math.max(u.lastSeen || 0, (db.progress[u.id] || {}).updatedAt || 0) || null,
      assignmentsTotal: mine.length, assignmentsDone: done, submissions: subs.length,
      badges: Object.keys(p.badges || {}).length,
    });
  }
  function meetsTarget(a, s) {
    const t = a.targets || {};
    if (t.accuracy && (s.accuracy == null || s.accuracy * 100 < t.accuracy)) return false;
    if (t.minutes && (s.seconds || 0) < t.minutes * 60) return false;
    if (t.stars && (s.stars || 0) < t.stars) return false;
    return true;
  }

  async function api(req, res, url) {
    const method = req.method;
    const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const ip = req.socket.remoteAddress || '';
    const json = async () => {
      const buf = await readBody(req, 2 * 1024 * 1024);
      if (!buf.length) return {};
      try { return JSON.parse(buf.toString('utf8')); } catch (e) { throw new HttpError(400, 'Invalid JSON'); }
    };
    const me = auth(req);
    const need = (cond, status, msg) => { if (!cond) throw new HttpError(status, msg); };
    const requireUser = () => need(me, 401, 'Please sign in');
    const requireStaff = () => { requireUser(); need(isStaff(me), 403, 'Teachers only'); };
    const [r0, r1] = parts;

    if (r0 === 'health' && method === 'GET') return { ok: true, name: 'cadenza-classroom', version: VERSION, needsSetup: db.users.length === 0, schoolName: db.settings.schoolName };

    if (r0 === 'setup' && method === 'POST') {
      need(db.users.length === 0, 409, 'This server is already set up');
      const b = await json();
      need(validUsername(b.username), 400, 'Username: 3–32 letters, numbers, dots, dashes');
      need(typeof b.password === 'string' && b.password.length >= 8, 400, 'Password must be at least 8 characters');
      const pw = hashPassword(b.password);
      const u = { id: id('u'), username: b.username.toLowerCase(), name: (b.name || b.username).slice(0, 80), role: 'admin', instrument: b.instrument || 'piano', salt: pw.salt, hash: pw.hash, createdAt: Date.now(), active: true };
      db.users.push(u);
      if (b.schoolName) db.settings.schoolName = String(b.schoolName).slice(0, 80);
      store.save();
      return { token: issueToken(u), user: publicUser(u) };
    }

    if (r0 === 'login' && method === 'POST') {
      rateLimit(ip);
      const b = await json();
      const u = db.users.find((x) => x.username === String(b.username || '').toLowerCase());
      if (!u || u.active === false || !checkPassword(String(b.password || ''), u)) { fail(ip); throw new HttpError(401, 'Wrong username or password'); }
      return { token: issueToken(u), user: publicUser(u), schoolName: db.settings.schoolName };
    }

    if (r0 === 'register' && method === 'POST') {
      rateLimit(ip);
      const b = await json();
      const inv = db.invites.find((x) => x.code === String(b.code || '').toUpperCase().trim() && !x.usedBy);
      if (!inv || (inv.expiresAt && inv.expiresAt < Date.now())) { fail(ip); throw new HttpError(400, 'That invite code is not valid'); }
      need(validUsername(b.username), 400, 'Username: 3–32 letters, numbers, dots, dashes');
      need(!db.users.some((x) => x.username === b.username.toLowerCase()), 409, 'That username is taken');
      need(typeof b.password === 'string' && b.password.length >= 6, 400, 'Password must be at least 6 characters');
      const pw = hashPassword(b.password);
      const u = { id: id('u'), username: b.username.toLowerCase(), name: (b.name || inv.name || b.username).slice(0, 80), role: inv.role || 'student', instrument: b.instrument || inv.instrument || 'guitar', salt: pw.salt, hash: pw.hash, createdAt: Date.now(), active: true, createdBy: inv.createdBy };
      db.users.push(u);
      inv.usedBy = u.id; inv.usedAt = Date.now();
      store.save();
      return { token: issueToken(u), user: publicUser(u), schoolName: db.settings.schoolName };
    }

    requireUser();

    if (r0 === 'logout' && method === 'POST') {
      const t = sha((req.headers.authorization || '').slice(7));
      db.tokens = db.tokens.filter((x) => x.hash !== t);
      store.save();
      return { ok: true };
    }
    if (r0 === 'me' && !r1 && method === 'GET') return { user: publicUser(me), schoolName: db.settings.schoolName };
    if (r0 === 'me' && !r1 && method === 'PATCH') {
      const b = await json();
      if (b.name) me.name = String(b.name).slice(0, 80);
      if (b.instrument) me.instrument = String(b.instrument).slice(0, 20);
      store.save();
      return { user: publicUser(me) };
    }
    if (r0 === 'me' && r1 === 'password' && method === 'POST') {
      const b = await json();
      need(me.mustChangePassword || checkPassword(String(b.oldPassword || ''), me), 400, 'Current password is wrong');
      need(typeof b.newPassword === 'string' && b.newPassword.length >= 6, 400, 'New password must be at least 6 characters');
      Object.assign(me, hashPassword(b.newPassword));
      me.mustChangePassword = false;
      store.save();
      return { ok: true };
    }

    // ---- progress sync
    if (r0 === 'progress') {
      if (method === 'GET') return (db.progress[me.id] || { state: null, updatedAt: 0 });
      if (method === 'PUT') {
        const b = await json();
        const cur = db.progress[me.id];
        const merged = mergeProgress(cur && cur.state, b.state || null);
        db.progress[me.id] = { state: merged, updatedAt: Date.now() };
        store.save();
        return db.progress[me.id];
      }
    }

    // ---- users (staff)
    if (r0 === 'users') {
      requireStaff();
      if (!r1 && method === 'GET') return { users: db.users.filter((u) => me.role === 'admin' || u.role === 'student').map(studentOverview) };
      if (!r1 && method === 'POST') {
        const b = await json();
        need(validUsername(b.username), 400, 'Username: 3–32 letters, numbers, dots, dashes');
        need(!db.users.some((x) => x.username === b.username.toLowerCase()), 409, 'That username is taken');
        const role = me.role === 'admin' && ['admin', 'teacher', 'student'].includes(b.role) ? b.role : 'student';
        const password = b.password && b.password.length >= 6 ? b.password : tempPassword();
        const pw = hashPassword(password);
        const u = { id: id('u'), username: b.username.toLowerCase(), name: String(b.name || b.username).slice(0, 80), role, instrument: b.instrument || 'guitar', salt: pw.salt, hash: pw.hash, createdAt: Date.now(), active: true, mustChangePassword: !b.password, createdBy: me.id };
        db.users.push(u);
        store.save();
        return { user: publicUser(u), password };
      }
      const u = db.users.find((x) => x.id === r1);
      need(u, 404, 'User not found');
      need(me.role === 'admin' || u.role === 'student', 403, 'Only the master teacher can manage staff');
      if (method === 'GET') return { user: studentOverview(u), progress: (db.progress[u.id] || {}).state || null, submissions: db.submissions.filter((s) => s.userId === u.id) };
      if (method === 'PATCH') {
        const b = await json();
        if (b.name) u.name = String(b.name).slice(0, 80);
        if (b.instrument) u.instrument = String(b.instrument);
        if (typeof b.active === 'boolean') { need(u.id !== me.id, 400, 'You cannot deactivate yourself'); u.active = b.active; if (!b.active) db.tokens = db.tokens.filter((t) => t.userId !== u.id); }
        if (b.role && me.role === 'admin' && u.id !== me.id) u.role = b.role;
        let password;
        if (b.resetPassword) { password = tempPassword(); Object.assign(u, hashPassword(password)); u.mustChangePassword = true; db.tokens = db.tokens.filter((t) => t.userId !== u.id); }
        store.save();
        return { user: publicUser(u), password };
      }
      if (method === 'DELETE') {
        need(u.id !== me.id, 400, 'You cannot delete yourself');
        db.users = db.users.filter((x) => x.id !== u.id);
        db.tokens = db.tokens.filter((t) => t.userId !== u.id);
        db.submissions = db.submissions.filter((s) => s.userId !== u.id);
        delete db.progress[u.id];
        for (const a of db.assignments) if (Array.isArray(a.assignees)) a.assignees = a.assignees.filter((x) => x !== u.id);
        store.save();
        return { ok: true };
      }
    }

    // ---- invites (staff)
    if (r0 === 'invites') {
      requireStaff();
      if (!r1 && method === 'GET') return { invites: db.invites.filter((i) => !i.usedBy).map((i) => ({ code: i.code, name: i.name, role: i.role, instrument: i.instrument, createdAt: i.createdAt, expiresAt: i.expiresAt })) };
      if (!r1 && method === 'POST') {
        const b = await json();
        const count = Math.max(1, Math.min(50, b.count || 1));
        const out = [];
        for (let i = 0; i < count; i++) {
          const inv = { code: inviteCode(), role: me.role === 'admin' && b.role === 'teacher' ? 'teacher' : 'student', name: b.name || '', instrument: b.instrument || '', createdBy: me.id, createdAt: Date.now(), expiresAt: Date.now() + (b.days || 30) * 86400000 };
          db.invites.push(inv);
          out.push(inv.code);
        }
        store.save();
        return { codes: out };
      }
      if (r1 && method === 'DELETE') { db.invites = db.invites.filter((i) => i.code !== r1); store.save(); return { ok: true }; }
    }

    // ---- files
    if (r0 === 'files') {
      if (!r1 && method === 'POST') {
        requireStaff();
        const buf = await readBody(req, 80 * 1024 * 1024);
        need(buf.length > 0, 400, 'Empty file');
        const fid = id('f');
        fs.writeFileSync(store.filePath(fid), buf);
        const name = decodeURIComponent(req.headers['x-file-name'] || 'song');
        return { file: { id: fid, name: name.slice(0, 160), type: req.headers['content-type'] || 'application/octet-stream', size: buf.length } };
      }
      if (r1 && method === 'GET') {
        const a = visibleAssignments(me).find((x) => x.file && x.file.id === r1);
        need(a, 404, 'File not found');
        const p = store.filePath(r1);
        need(fs.existsSync(p), 404, 'File missing on server');
        res.writeHead(200, { 'Content-Type': a.file.type, 'Content-Length': fs.statSync(p).size, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(p).pipe(res);
        return undefined;
      }
    }

    // ---- assignments
    if (r0 === 'assignments') {
      if (!r1 && method === 'GET') {
        const list = visibleAssignments(me).map((a) => {
          const subs = db.submissions.filter((s) => s.assignmentId === a.id && (isStaff(me) || s.userId === me.id));
          const mine = subs.filter((s) => s.userId === me.id);
          return Object.assign({}, a, {
            submissionCount: subs.length,
            completedBy: isStaff(me) ? [...new Set(subs.filter((s) => meetsTarget(a, s)).map((s) => s.userId))].length : undefined,
            myBest: mine.length ? mine.reduce((b, s) => ((s.accuracy || 0) > (b.accuracy || 0) ? s : b)) : null,
            myDone: mine.some((s) => meetsTarget(a, s)),
            feedback: mine.filter((s) => s.teacherComment).map((s) => ({ comment: s.teacherComment, date: s.reviewedAt })),
          });
        });
        return { assignments: list.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)) };
      }
      requireStaff();
      if (!r1 && method === 'POST') {
        const b = await json();
        need(b.title && String(b.title).trim(), 400, 'Give the assignment a title');
        const a = {
          id: id('a'), title: String(b.title).slice(0, 120), instructions: String(b.instructions || '').slice(0, 4000),
          instrument: b.instrument || 'any', mode: ['part', 'improv', 'challenge', 'free'].includes(b.mode) ? b.mode : 'part',
          mixPreset: ['full', 'backing', 'part', 'rhythm'].includes(b.mixPreset) ? b.mixPreset : 'full',
          challenge: b.challenge || null, speed: Math.max(0.5, Math.min(1.25, +b.speed || 1)),
          targets: { accuracy: +b.targets?.accuracy || 0, minutes: +b.targets?.minutes || 0, stars: +b.targets?.stars || 0 },
          dueDate: b.dueDate || null, assignees: b.assignees === 'all' || !Array.isArray(b.assignees) ? 'all' : b.assignees,
          file: b.file || null, backing: b.backing || null, createdBy: me.id, createdByName: me.name, createdAt: Date.now(),
        };
        db.assignments.push(a);
        store.save();
        return { assignment: a };
      }
      const a = db.assignments.find((x) => x.id === r1);
      need(a, 404, 'Assignment not found');
      if (method === 'PATCH') {
        const b = await json();
        for (const k of ['title', 'instructions', 'instrument', 'mode', 'mixPreset', 'challenge', 'speed', 'targets', 'dueDate', 'assignees']) if (b[k] !== undefined) a[k] = b[k];
        store.save();
        return { assignment: a };
      }
      if (method === 'DELETE') {
        db.assignments = db.assignments.filter((x) => x.id !== a.id);
        if (a.file && !db.assignments.some((x) => x.file && x.file.id === a.file.id)) { try { fs.unlinkSync(store.filePath(a.file.id)); } catch (e) { /* already gone */ } }
        store.save();
        return { ok: true };
      }
    }

    // ---- submissions
    if (r0 === 'submissions') {
      if (!r1 && method === 'POST') {
        const b = await json();
        const a = visibleAssignments(me).find((x) => x.id === b.assignmentId);
        need(a, 404, 'Assignment not found');
        const clientId = String(b.clientId || '');
        const existing = clientId && db.submissions.find((s) => s.clientId === clientId && s.userId === me.id);
        if (existing) return { submission: existing, duplicate: true };
        const s = {
          id: id('s'), clientId, assignmentId: a.id, userId: me.id, userName: me.name, date: b.date || new Date().toISOString(), createdAt: Date.now(),
          seconds: Math.max(0, +b.seconds || 0), accuracy: b.accuracy == null ? null : Math.max(0, Math.min(1, +b.accuracy)), score: +b.score || 0,
          stars: Math.max(0, Math.min(3, +b.stars || 0)), maxCombo: +b.maxCombo || 0, mode: String(b.mode || ''), instrument: String(b.instrument || ''),
          insights: Array.isArray(b.insights) ? b.insights.slice(0, 10).map(String) : [], focus: String(b.focus || '').slice(0, 300), status: 'submitted',
        };
        s.meetsTarget = meetsTarget(a, s);
        db.submissions.push(s);
        store.save();
        return { submission: s };
      }
      if (!r1 && method === 'GET') {
        let list = db.submissions.filter((s) => isStaff(me) || s.userId === me.id);
        const q = url.searchParams;
        if (q.get('assignmentId')) list = list.filter((s) => s.assignmentId === q.get('assignmentId'));
        if (q.get('userId')) list = list.filter((s) => s.userId === q.get('userId'));
        return { submissions: list.sort((x, y) => y.createdAt - x.createdAt).slice(0, 1000) };
      }
      if (r1 && method === 'PATCH') {
        requireStaff();
        const s = db.submissions.find((x) => x.id === r1);
        need(s, 404, 'Submission not found');
        const b = await json();
        if (b.teacherComment !== undefined) s.teacherComment = String(b.teacherComment).slice(0, 2000);
        s.status = 'reviewed'; s.reviewedAt = Date.now(); s.reviewedBy = me.name;
        store.save();
        return { submission: s };
      }
    }

    if (r0 === 'settings' && method === 'PATCH') {
      need(me.role === 'admin', 403, 'Master teacher only');
      const b = await json();
      if (b.schoolName) db.settings.schoolName = String(b.schoolName).slice(0, 80);
      store.save();
      return { settings: db.settings };
    }

    throw new HttpError(404, 'Unknown endpoint');
  }

  function serveStatic(req, res, url) {
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(appDir, p));
    const rel = path.relative(appDir, file);
    if (rel.startsWith('..') || /^(server|server-data|desktop|node_modules|\.git)(\/|\\|$)/.test(rel) || path.basename(file).startsWith('.')) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  }

  async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-File-Name');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      try {
        const out = await api(req, res, url);
        if (out === undefined) return; // streamed
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
      } catch (e) {
        const status = e.status || 500;
        if (status === 500) console.error(e);
        if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: status === 500 ? 'Server error' : e.message }));
      }
      return;
    }
    if (opts.serveApp === false) { res.writeHead(404); return res.end(); }
    serveStatic(req, res, url);
  }

  const tls = opts.tls || (process.env.TLS_CERT && process.env.TLS_KEY ? { cert: fs.readFileSync(process.env.TLS_CERT), key: fs.readFileSync(process.env.TLS_KEY) } : null);
  const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
  server.on('close', () => store.flushNow());
  server.store = store;
  server.secure = !!tls;
  return server;
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(require('os').networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out;
}

module.exports = { createServer, lanAddresses, VERSION };

if (require.main === module) {
  const port = +process.env.PORT || 8787;
  const host = process.env.HOST || '0.0.0.0';
  const server = createServer();
  server.listen(port, host, () => {
    const proto = server.secure ? 'https' : 'http';
    console.log(`\n🎵 Cadenza Classroom Server ${VERSION}`);
    console.log(`   This computer:  ${proto}://localhost:${port}`);
    for (const ip of lanAddresses()) console.log(`   Students (LAN): ${proto}://${ip}:${port}`);
    console.log(`   Data folder:    ${path.resolve(process.env.DATA_DIR || 'server-data')}\n`);
  });
  const shutdown = () => { server.store.flushNow(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
