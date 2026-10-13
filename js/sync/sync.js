/* Overture — classroom account & cloud sync client.
 * Offline-first: practice data lives on the device; when a server is configured and reachable,
 * progress is merged both ways, assignment results are uploaded from an outbox, and assignments
 * (with their songs) are cached for offline practice. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const ACC_KEY = 'cadenza.account.v1', OUT_KEY = 'cadenza.outbox.v1', ASG_KEY = 'cadenza.assignments.v1', SONG_KEY = 'cadenza.songs.v1', MINE_KEY = 'cadenza.mysubs.v1';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* quota */ } };

  // Recordings waiting to upload and downloaded attachments (PDFs, audio) live in IndexedDB.
  const Blobs = {
    open() {
      if (this.db) return this.db;
      this.db = new Promise((resolve, reject) => {
        if (!root.indexedDB) return reject(new Error('IndexedDB unavailable'));
        const req = indexedDB.open('cadenza-files', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('blobs', { keyPath: 'id' });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      this.db.catch(() => { this.db = null; });
      return this.db;
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const t = db.transaction('blobs', mode);
        const r = fn(t.objectStore('blobs'));
        t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error('Storage full'));
      });
    },
    put(id, blob, meta) { return this.run('readwrite', (s) => s.put(Object.assign({ id, blob, savedAt: Date.now() }, meta || {}))); },
    async get(id) { try { const r = await this.run('readonly', (s) => s.get(id)); return r || null; } catch (e) { return null; } },
    del(id) { return this.run('readwrite', (s) => s.delete(id)).catch(() => {}); },
  };

  const Sync = {
    account: load(ACC_KEY, null), // {server, token, user, schoolName}
    outbox: load(OUT_KEY, []),
    assignments: load(ASG_KEY, []),
    songs: load(SONG_KEY, []),
    mySubmissions: load(MINE_KEY, []),
    Blobs,
    status: 'local', // local | online | offline | pending | error
    lastSync: 0,
    listeners: new Set(),
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
    emit(type) { [...this.listeners].forEach((fn) => { try { fn(type); } catch (e) { console.error(e); } }); },

    get connected() { return !!(this.account && this.account.token); },
    get isStaff() { return this.connected && ['admin', 'teacher'].includes(this.account.user.role); },
    normalizeServer(u) {
      u = String(u || '').trim();
      if (!u) return '';
      if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
      return u.replace(/\/+$/, '');
    },

    async request(method, path, body, opts) {
      opts = opts || {};
      const server = opts.server || (this.account && this.account.server);
      if (!server) throw new Error('No classroom server configured');
      const headers = {};
      const token = opts.token !== undefined ? opts.token : this.account && this.account.token;
      if (token) headers.Authorization = 'Bearer ' + token;
      let payload;
      if (body instanceof Blob || body instanceof ArrayBuffer) { payload = body; headers['Content-Type'] = opts.type || 'application/octet-stream'; if (opts.fileName) headers['X-File-Name'] = encodeURIComponent(opts.fileName); }
      else if (body != null) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeout || 15000);
      let res;
      try { res = await fetch(server + '/api' + path, { method, headers, body: payload, signal: ctrl.signal }); }
      catch (e) { const err = new Error(e.name === 'AbortError' ? 'The server did not answer in time' : 'Cannot reach the classroom server'); err.offline = true; throw err; }
      finally { clearTimeout(timer); }
      if (opts.raw) { if (!res.ok) throw new Error('Download failed (' + res.status + ')'); return res; }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && token && path !== '/login') { this.signOut(true); }
      if (!res.ok) { const err = new Error(data.error || 'Request failed (' + res.status + ')'); err.status = res.status; throw err; }
      return data;
    },

    async probe(server) { return this.request('GET', '/health', null, { server: this.normalizeServer(server), token: null, timeout: 6000 }); },

    async signIn(server, username, password) {
      server = this.normalizeServer(server);
      const d = await this.request('POST', '/login', { username, password }, { server, token: null });
      this.setAccount({ server, token: d.token, user: d.user, schoolName: d.schoolName });
      await this.syncNow();
      return d.user;
    },
    async register(server, code, username, password, name, instrument) {
      server = this.normalizeServer(server);
      const d = await this.request('POST', '/register', { code, username, password, name, instrument }, { server, token: null });
      this.setAccount({ server, token: d.token, user: d.user, schoolName: d.schoolName });
      await this.syncNow();
      return d.user;
    },
    async setup(server, fields) {
      server = this.normalizeServer(server);
      const d = await this.request('POST', '/setup', fields, { server, token: null });
      this.setAccount({ server, token: d.token, user: d.user, schoolName: fields.schoolName });
      await this.syncNow();
      return d.user;
    },
    setAccount(acc) {
      this.account = acc;
      store(ACC_KEY, acc);
      if (acc && acc.user && acc.user.instrument && PM.Instruments.INSTRUMENTS[acc.user.instrument] && PM.App.instrument !== acc.user.instrument) PM.App.setInstrument(acc.user.instrument);
      this.setStatus(acc ? 'online' : 'local');
    },
    signOut(expired) {
      if (this.account && this.account.token && !expired) this.request('POST', '/logout').catch(() => {});
      this.account = null;
      store(ACC_KEY, null);
      this.assignments = [];
      store(ASG_KEY, []);
      this.songs = []; store(SONG_KEY, []);
      this.mySubmissions = []; store(MINE_KEY, []);
      this.setStatus('local');
      if (expired) PM.UI.toast('Your classroom session expired — please sign in again.', { icon: '🔑' });
    },
    setStatus(s) { this.status = s; this.emit('status'); },

    queue(item) {
      this.outbox.push(item);
      store(OUT_KEY, this.outbox);
      this.setStatus('pending');
      this.flushSoon();
    },
    flushSoon() { clearTimeout(this.flushTimer); this.flushTimer = setTimeout(() => this.syncNow().catch(() => {}), 1500); },

    async flushOutbox() {
      while (this.outbox.length) {
        const item = this.outbox[0];
        try {
          if (item.type === 'submission') await this.request('POST', '/submissions', item.body);
          else if (item.type === 'recording') await this.uploadRecording(item);
        } catch (e) {
          if (e.offline) throw e;
          console.warn('Dropping rejected outbox item', item, e.message); // 4xx: will never succeed
        }
        this.outbox.shift();
        store(OUT_KEY, this.outbox);
        if (item.type === 'recording') { Blobs.del(item.blobId); this.emit('outbox'); }
      }
    },

    async uploadRecording(item) {
      if (!item.file) {
        const rec = await Blobs.get(item.blobId);
        if (!rec || !rec.blob) { console.warn('Recording missing on this device', item); return; }
        this.emit('upload', { item, phase: 'file' });
        item.file = (await this.request('POST', '/files', rec.blob, { type: item.mime || rec.blob.type || 'application/octet-stream', fileName: item.fileName, timeout: 600000 })).file;
        store(OUT_KEY, this.outbox); // don't upload the audio twice if the next step fails
      }
      await this.request('POST', '/submissions', Object.assign({}, item.body, { recording: item.file }));
    },

    /** Queue a recording for the teacher (works offline; uploads when the server is reachable). */
    async sendRecording(rec, info) {
      const blobId = 'rec-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await Blobs.put(blobId, rec.blob, { kind: 'recording' });
      const safe = String(info.title || 'Recording').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'Recording';
      const fileName = `${safe} - ${(this.account && this.account.user.name) || 'student'}.${rec.ext || 'webm'}`;
      this.queue({
        type: 'recording', blobId, mime: rec.mime, fileName,
        body: { assignmentId: info.assignmentId || undefined, songId: info.songId || undefined, title: info.title || 'Recording', note: info.note || '', clientId: blobId, date: new Date().toISOString(), seconds: Math.round(rec.seconds || 0), mode: info.mode || 'recording', instrument: PM.App.instrument, accuracy: info.accuracy, stars: info.stars || 0, insights: info.insights || [] },
      });
      this.emit('outbox');
      return blobId;
    },
    get pendingRecordings() { return this.outbox.filter((o) => o.type === 'recording'); },

    async fetchSongs() {
      try { const d = await this.request('GET', '/songs'); this.songs = d.songs || []; store(SONG_KEY, this.songs); this.emit('songs'); }
      catch (e) { if (e.offline) throw e; } // older servers have no song library
      return this.songs;
    },
    async fetchMySubmissions() {
      if (this.isStaff) return [];
      try { const d = await this.request('GET', '/submissions'); this.mySubmissions = (d.submissions || []).slice(0, 200); store(MINE_KEY, this.mySubmissions); this.emit('mine'); }
      catch (e) { if (e.offline) throw e; }
      return this.mySubmissions;
    },

    /** Any classroom file (PDF, image, audio, recording) as a Blob; cached for offline use. */
    async fileBlob(f, opts) {
      opts = opts || {};
      const key = (f.local ? 'local-' : 'file-') + f.id;
      const hit = await Blobs.get(key);
      if (hit && hit.blob) return hit.blob;
      if (f.local) throw new Error('This file is not on this device');
      const res = await this.request('GET', '/files/' + f.id, null, { raw: true, timeout: 300000 });
      const blob = await res.blob();
      const typed = blob.type || !f.type ? blob : new Blob([blob], { type: f.type });
      if (opts.cache !== false && typed.size < 40 * 1024 * 1024) Blobs.put(key, typed, { name: f.name }).catch(() => {});
      return typed;
    },
    /** Store a file on this device only (songs made without a classroom). */
    async saveLocalFile(file) {
      const id = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await Blobs.put('local-' + id, file, { name: file.name });
      return { id, name: file.name, type: file.type || 'application/octet-stream', size: file.size, local: true };
    },
    async uploadFile(file, onMsg) {
      if (!this.connected) return this.saveLocalFile(file);
      onMsg && onMsg('Uploading ' + file.name + '…');
      return (await this.request('POST', '/files', file, { type: file.type || 'application/octet-stream', fileName: file.name, timeout: 600000 })).file;
    },

    async syncProgress() {
      const res = await this.request('PUT', '/progress', { state: PM.App.game.state });
      if (res && res.state) {
        this.applying = true;
        PM.App.game.replaceState(res.state);
        this.applying = false;
      }
    },

    async fetchAssignments() {
      const d = await this.request('GET', '/assignments');
      this.assignments = d.assignments || [];
      store(ASG_KEY, this.assignments);
      this.emit('assignments');
      return this.assignments;
    },

    async syncNow() {
      if (!this.connected) return;
      if (this.syncing) return this.syncing;
      this.syncing = (async () => {
        try {
          await this.flushOutbox();
          await this.syncProgress();
          await this.fetchAssignments();
          await this.fetchSongs();
          await this.fetchMySubmissions();
          this.lastSync = Date.now();
          this.setStatus('online');
        } catch (e) {
          this.setStatus(e.offline ? (this.outbox.length ? 'pending' : 'offline') : 'error');
          throw e;
        } finally { this.syncing = null; }
      })();
      return this.syncing;
    },

    /** Get an assignment's song (cached in IndexedDB for offline use). */
    async assignmentFile(a) {
      const cacheId = 'asg-' + a.file.id;
      const cached = await PM.Audio.Library.get(cacheId);
      if (cached && cached.blob) return { file: new File([cached.blob], a.file.name, { type: a.file.type }), cached };
      const res = await this.request('GET', '/files/' + a.file.id, null, { raw: true, timeout: 120000 });
      const blob = await res.blob();
      return { file: new File([blob], a.file.name, { type: a.file.type }), cached: null };
    },

    start() {
      PM.App.game.on((ev) => {
        if (!this.connected) return;
        if (ev.type === 'session' && ev.session.assignmentId) {
          const s = ev.summary || {};
          this.queue({ type: 'submission', body: { assignmentId: ev.session.assignmentId, clientId: ev.id, date: ev.date, seconds: ev.session.seconds, accuracy: s.accuracy, score: s.score || ev.session.score || 0, stars: s.stars || 0, maxCombo: s.maxCombo || 0, mode: ev.session.mode, instrument: ev.session.instrument, insights: s.insights || [], focus: s.focus || '' } });
        } else if (ev.type === 'change' && !this.applying) this.flushSoon();
      });
      addEventListener('online', () => this.syncNow().catch(() => {}));
      setInterval(() => { if (this.connected) this.syncNow().catch(() => {}); }, 60000);
      if (this.connected) this.syncNow().catch(() => {});
    },
  };

  PM.Sync = Sync;
})(typeof self !== 'undefined' ? self : globalThis);
