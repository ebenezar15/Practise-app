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
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = URL.createObjectURL(blob);
      this.el.src = this.url;
      this.loop = null;
      this.el.load();
    }
    unload() { this.pause(); if (this.url) URL.revokeObjectURL(this.url); this.url = null; this.el.removeAttribute('src'); }
    get loaded() { return !!this.url; }
    async play() { this.connect(); getCtx(); try { await this.el.play(); } catch (e) { console.warn(e); } }
    pause() { this.el.pause(); }
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
      t.onerror = () => reject(t.error);
    });
  }
  const Library = {
    async save(entry) {
      const clean = Object.assign({}, entry, { analysis: Object.assign({}, entry.analysis, { rendered: undefined }) });
      return tx('readwrite', (s) => s.put(clean));
    },
    async list() {
      try {
        const all = await tx('readonly', (s) => s.getAll());
        return (all || []).sort((a, b) => b.createdAt - a.createdAt);
      } catch (e) { return []; }
    },
    async remove(id) { return tx('readwrite', (s) => s.delete(id)); },
  };

  PM.Audio = { getCtx, decodeAudioFile, isMidiFile, Player, Library };
})(typeof self !== 'undefined' ? self : globalThis);
