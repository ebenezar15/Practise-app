/* Cadenza — shared AudioContext, file decoding, reference-track player, IndexedDB library. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      ctx = new AC({ latencyHint: 'interactive' });
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** iOS/iPadOS audio session: 'playback' ignores the silent switch; 'play-and-record' while listening. */
  function setSessionType(type) {
    try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) { /* older Safari */ }
  }

  /** Safari only starts audio from a user gesture: unlock the AudioContext on the first tap. */
  let unlocked = false;
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    setSessionType('playback');
    try {
      const c = getCtx();
      const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) { unlocked = false; }
  }
  if (root.addEventListener) for (const ev of ['pointerdown', 'touchend', 'keydown']) root.addEventListener(ev, unlockAudio, { capture: true, passive: true });

  const isMidiFile = (file) => /\.(mid|midi|smf|kar)$/i.test(file.name) || /midi/.test(file.type);

  async function decodeAudioFile(file) {
    const buf = await file.arrayBuffer();
    const audio = await getCtx().decodeAudioData(buf.slice(0));
    const channels = [];
    for (let c = 0; c < Math.min(2, audio.numberOfChannels); c++) channels.push(audio.getChannelData(c));
    return { channels, sampleRate: audio.sampleRate, duration: audio.duration };
  }

  /** Reference track player. Uses an <audio> element so slow-down keeps pitch. */
  class Player {
    constructor() {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.preservesPitch = true;
      this.el.mozPreservesPitch = true;
      this.el.webkitPreservesPitch = true;
      this.loop = null; // {a, b}
      this.url = null;
      this.listeners = new Set();
      this.el.addEventListener('ended', () => this.emit('ended'));
      // WebKit can fail a blob source that was swapped mid-load ("src not supported"): rebuild it once
      this.el.addEventListener('error', () => {
        if (!this.blob || this.healed === this.blob) return;
        this.healed = this.blob;
        const t = this.el.currentTime || 0, want = this.wantPlay;
        this.url = URL.createObjectURL(this.blob);
        this.el.src = this.url; this.el.load();
        this.el.addEventListener('loadedmetadata', () => { try { this.el.currentTime = t; } catch (e) { /* ignore */ } if (want) this.el.play().catch(() => {}); }, { once: true });
      });
      this.el.addEventListener('play', () => this.emit('play'));
      this.el.addEventListener('pause', () => this.emit('pause'));
      this.el.addEventListener('timeupdate', () => {
        if (this.loop && this.el.currentTime >= this.loop.b) this.el.currentTime = this.loop.a;
      });
      this.gainNode = null;
      this.volume = 0.9;
    }
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(t) { this.listeners.forEach((fn) => fn(t)); }
    connect() {
      if (this.gainNode) return;
      const c = getCtx();
      try {
        const src = c.createMediaElementSource(this.el);
        this.gainNode = c.createGain();
        this.gainNode.gain.value = this.volume;
        src.connect(this.gainNode).connect(c.destination);
      } catch (e) { /* already connected */ }
    }
    load(blob) {
      // revoke the old URL later: WebKit may still be reading it while the new source loads
      if (this.url) { const old = this.url; setTimeout(() => URL.revokeObjectURL(old), 30000); }
      this.blob = blob; this.healed = null;
      this.url = URL.createObjectURL(blob);
      this.el.src = this.url;
      this.loop = null;
      this.el.load();
    }
    unload() { this.pause(); if (this.url) { const old = this.url; setTimeout(() => URL.revokeObjectURL(old), 30000); } this.url = null; this.blob = null; this.el.removeAttribute('src'); }
    get loaded() { return !!this.url; }
    async play() {
      this.wantPlay = true;
      this.connect(); getCtx();
      try { await this.el.play(); } catch (e) {
        // WebKit can reject a blob URL it has dropped ("NotSupportedError"): reload the source once and retry
        if (e && e.name === 'NotSupportedError' && this.blob) {
          const t = this.el.currentTime || 0;
          if (this.url) { const old = this.url; setTimeout(() => URL.revokeObjectURL(old), 30000); }
          this.url = URL.createObjectURL(this.blob);
          this.el.src = this.url; this.el.load();
          try { this.el.currentTime = t; } catch (e2) { /* not seekable yet */ }
          try { await this.el.play(); return; } catch (e3) { console.warn(e3); return; }
        }
        console.warn(e);
      }
    }
    /** Call synchronously inside a tap: lets a later, delayed play() work on iOS (e.g. after a count-in). */
    prime() {
      if (!this.url) return;
      this.connect();
      const t = this.el.currentTime, el = this.el;
      el.muted = true;
      const p = el.play();
      const done = () => { el.pause(); el.currentTime = t; el.muted = false; };
      if (p && p.then) p.then(done, () => { el.muted = false; }); else done();
    }
    pause() { this.wantPlay = false; this.el.pause(); }
    get playing() { return !this.el.paused && !this.el.ended; }
    get time() { return this.el.currentTime || 0; }
    set time(t) { this.el.currentTime = Math.max(0, t); }
    get duration() { return this.el.duration || 0; }
    set rate(r) { this.el.playbackRate = r; }
    get rate() { return this.el.playbackRate; }
    setVolume(v) { this.volume = v; if (this.gainNode) this.gainNode.gain.value = v; else this.el.volume = v; }
    setLoop(a, b) { this.loop = a != null && b > a ? { a, b } : null; }
  }

  // ---------- IndexedDB library (works offline) ----------
  const DB_NAME = 'cadenza', STORE = 'songs';
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!root.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function tx(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const r = fn(store);
      t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : r);
      t.onerror = () => reject(t.error || new Error('IndexedDB transaction failed'));
      t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted'));
    });
  }
  const Library = {
    async save(entry) {
      // keep only what is needed to re-open offline (stems & decoded audio are rebuilt on demand).
      // Audio is stored as raw bytes, not a Blob: some WebKit builds can't put Blobs in IndexedDB.
      const b = entry.blob;
      const bytes = b && b.arrayBuffer ? await b.arrayBuffer() : null;
      const analysis = Object.assign({}, entry.analysis, { rendered: undefined, part: undefined });
      const clean = { id: entry.id, name: entry.name, kind: entry.kind, instrument: entry.instrument, bytes, type: (b && b.type) || '', createdAt: entry.createdAt, backing: !!entry.backing, assignmentId: entry.assignmentId || null, analysis };
      return tx('readwrite', (s) => s.put(clean));
    },
    async list() {
      try {
        const all = await tx('readonly', (s) => s.getAll());
        return (all || []).map(revive).sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) { return []; }
    },
    async remove(id) { return tx('readwrite', (s) => s.delete(id)); },
    async get(id) { try { const r = await tx('readonly', (s) => s.get(id)); return r && r.id ? revive(r) : null; } catch (e) { return null; } },
  };
  /** Rebuild the Blob from stored bytes (older entries kept the Blob itself). */
  function revive(r) { if (r && !r.blob && r.bytes) r.blob = new Blob([r.bytes], { type: r.type || 'audio/wav' }); return r; }

  PM.Audio = { getCtx, setSessionType, unlockAudio, decodeAudioFile, isMidiFile, Player, Library };
})(typeof self !== 'undefined' ? self : globalThis);
