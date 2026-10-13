/* Cadenza — UI building blocks (vanilla JS + SVG/canvas, no dependencies). */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { Theory, DSP } = PM;

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    studio: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
    insights: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
    metronome: '<path d="M8 3h8l4 18H4z"/><path d="m12 15 5-9"/><path d="M7 15h10"/>',
    tuner: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="m12 13 4-6"/><circle cx="12" cy="13" r="1.5"/>',
    games: '<rect x="2" y="7" width="20" height="12" rx="6"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14.5" r="1"/>',
    progress: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
    back: '<path d="M11 17 6 12l5-5M18 17l-5-5 5-5"/>',
    loop: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    guitar: '<path d="m14 10 6-6M18 2l4 4"/><path d="M11.5 9.5a4 4 0 0 0-5.7 0c-.9.9-.6 2.3-1.7 3.4C2.6 14.4 2 16.4 3.8 18.2s3.8 1.2 5.3-.3c1.1-1.1 2.5-.8 3.4-1.7a4 4 0 0 0 0-5.7z"/><circle cx="8.5" cy="15.5" r="1.3"/>',
    electric: '<path d="m14 10 6-6M18 2l4 4"/><path d="M12 8 8.5 5.5 6 9l1.5 1.5L4 14c-1.5 1.5-1.5 4 0 5.5S8 21 9.5 19.5L13 16l1.5 1.5L18 15l-2.5-3.5z"/><path d="M7 15l2 2"/>',
    bass: '<path d="m15 9 6-6M19 1l4 4"/><path d="M12.5 8.5a3.5 3.5 0 0 0-5 0c-.8.8-.5 2-1.5 3S3 13 3 16s2 5 5 5 4-2 5-3 2.2-.7 3-1.5a3.5 3.5 0 0 0 0-5z"/><path d="M8 13l3 3"/>',
    trumpet: '<path d="M2 10h12l6-4v12l-6-4H2z"/><path d="M6 10V7M9 10V7M12 10V7"/><path d="M5 14v2a2 2 0 0 0 2 2h3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    improv: '<path d="M3 17c3-6 5 4 8-2s5 4 8-2"/><circle cx="19" cy="11" r="2"/>',
    piano: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v10M12 4v10M17 4v10M7 14v6M12 14v6M17 14v6"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    key: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    wave: '<path d="M2 12h2l2-6 3 12 3-15 3 18 3-12 2 3h2"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-9 0 4-4 6-4 12 0 4 3 8 7 8z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><rect x="2" y="15" width="5" height="7" rx="2"/><rect x="17" y="15" width="5" height="7" rx="2"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    library: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 4 1-3 14-4-1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    midi: '<rect x="3" y="3" width="18" height="18" rx="9"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="9.5" cy="15.5" r="1"/><circle cx="14.5" cy="15.5" r="1"/>',
    hand: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 4 16l-1.5-3.5a1.5 1.5 0 0 1 2.6-1.4L8 14"/>',
  };
  function icon(name, cls) {
    return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  const $ = (sel, rootEl) => (rootEl || document).querySelector(sel);
  const $$ = (sel, rootEl) => Array.from((rootEl || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtTime = (t) => { t = Math.max(0, t || 0); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); };

  function toast(text, opts) {
    opts = opts || {};
    const host = $('#toasts');
    if (!host) return;
    const t = el(`<div class="toast ${opts.kind || ''}"><span class="t-ic">${opts.icon || '🎵'}</span><span>${esc(text)}</span></div>`);
    host.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, opts.duration || 3200);
  }

  const openModals = new Set();
  function modal(html, opts) {
    opts = opts || {};
    const back = el(`<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`);
    let closed = false;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const close = () => {
      if (closed) return;
      closed = true;
      openModals.delete(api);
      document.removeEventListener('keydown', onKey);
      back.classList.add('closing');
      const done = () => { back.remove(); };
      if (PM.Theme && PM.Theme.calm()) done(); else setTimeout(done, 160);
      opts.onClose && opts.onClose();
    };
    const api = { el: back, close };
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    openModals.add(api);
    return api;
  }
  /** Close every open dialog (used when the page changes — e.g. the Back button). */
  function closeAllModals() { [...openModals].forEach((m) => m.close()); document.querySelectorAll('.modal-back').forEach((m) => m.remove()); }
  /** Replay a one-shot CSS animation class on an element. */
  function bump(elm, cls) { if (!elm) return; cls = cls || 'pop-in'; elm.classList.remove(cls); void elm.offsetWidth; elm.classList.add(cls); }

  function confetti() {
    if (PM.Theme && PM.Theme.calm()) return; // calm mode: no flashing celebration
    const c = document.createElement('canvas');
    c.id = 'confetti';
    document.body.appendChild(c);
    const dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const colors = ['#7c3aed', '#a855f7', '#d946ef', '#f0abfc', '#ffffff', '#c4b5fd', '#fde68a'];
    const parts = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
      s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0],
    }));
    let frames = 0;
    (function step() {
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
      }
      if (++frames < 150) requestAnimationFrame(step); else c.remove();
    })();
  }

  function ringSvg(pct, size, stroke, colorA, colorB, track) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const id = 'rg' + Math.random().toString(36).slice(2, 8);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colorA || '#a78bfa'}"/><stop offset="1" stop-color="${colorB || '#f0abfc'}"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track || 'rgba(255,255,255,0.12)'}" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, pct)))}" style="transition: stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)"/>
    </svg>`;
  }

  function setupCanvas(canvas) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 150;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w, h };
  }

  // ---------- Piano keyboard ----------
  class PianoKeyboard {
    constructor(container, lo, hi) {
      this.lo = lo || 36; this.hi = hi || 96;
      const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
      const whites = [];
      for (let m = this.lo; m <= this.hi; m++) if (!isBlack(m)) whites.push(m);
      const W = 24, H = 120, BW = 15, BH = 76;
      let svg = `<svg class="keyboard" viewBox="0 0 ${whites.length * W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="gPlayed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#d946ef"/></linearGradient>
        <linearGradient id="gHit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs>`;
      const xOf = {};
      whites.forEach((m, i) => {
        xOf[m] = i * W;
        svg += `<rect class="key-w" data-m="${m}" x="${i * W + 0.5}" y="0.5" width="${W - 1}" height="${H - 1}" rx="4"/>`;
        if (m % 12 === 0) svg += `<text class="key-label" x="${i * W + W / 2}" y="${H - 8}" text-anchor="middle">C${m / 12 - 1}</text>`;
      });
      for (let m = this.lo; m <= this.hi; m++) {
        if (!isBlack(m)) continue;
        const x = xOf[m - 1] + W - BW / 2;
        svg += `<rect class="key-b" data-m="${m}" x="${x}" y="0" width="${BW}" height="${BH}" rx="3"/>`;
      }
      svg += '</svg>';
      container.innerHTML = svg;
      this.keys = {};
      container.querySelectorAll('[data-m]').forEach((k) => (this.keys[k.dataset.m] = k));
      this.prev = { expect: new Set(), played: new Set() };
    }
    /** Improvisation map: chord tones & scale tones across the keyboard. */
    setMap(chordPcs, scalePcs, played) {
      const cs = new Set(chordPcs || []), ss = new Set(scalePcs || []);
      for (const m in this.keys) {
        const pc = m % 12;
        this.keys[m].classList.toggle('chordtone', cs.has(pc));
        this.keys[m].classList.toggle('scaletone', !cs.has(pc) && ss.has(pc));
      }
      this.set([], played);
    }
    set(expected, played) {
      const apply = (cls, set, prev) => {
        for (const m of prev) if (!set.has(m) && this.keys[m]) this.keys[m].classList.remove(cls);
        for (const m of set) if (this.keys[m]) this.keys[m].classList.add(cls);
      };
      const e = new Set(expected || []), p = new Set(played || []);
      apply('expect', e, this.prev.expect);
      apply('played', p, this.prev.played);
      this.prev = { expect: e, played: p };
    }
  }

  // ---------- Guitar fretboard ----------
  class Fretboard {
    /** opts: {strings: open-string midis low→high, names, frets} */
    constructor(container, opts) {
      if (typeof opts === 'number' || !opts) opts = { frets: opts || 15 };
      this.tuning = opts.strings || Theory.STANDARD_TUNING;
      this.names = opts.names || ['E', 'A', 'D', 'G', 'B', 'e'];
      this.frets = opts.frets || 15;
      const ns = this.tuning.length;
      const W = 920, H = ns === 4 ? 140 : 170, left = 58, top = 18, sh = (H - top * 2) / (ns - 1);
      this.geo = { W, H, left, top, sh, ns };
      const fx = (f) => left + (W - left - 10) * (1 - Math.pow(2, -f / 12)) / (1 - Math.pow(2, -this.frets / 12));
      this.fx = fx;
      const mid = top + sh * (ns - 1) / 2;
      let svg = `<svg class="fretboard" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="fbWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1052"/><stop offset="1" stop-color="#1a0838"/></linearGradient></defs>`;
      svg += `<rect x="${left}" y="${top - 8}" width="${W - left - 10}" height="${sh * (ns - 1) + 16}" rx="8" fill="url(#fbWood)"/>`;
      for (const f of [3, 5, 7, 9, 15, 17]) if (f <= this.frets) svg += `<circle cx="${(fx(f - 1) + fx(f)) / 2}" cy="${mid}" r="6" fill="rgba(196,181,253,0.25)"/>`;
      if (this.frets >= 12) { const x = (fx(11) + fx(12)) / 2; svg += `<circle cx="${x}" cy="${mid - sh}" r="6" fill="rgba(196,181,253,0.25)"/><circle cx="${x}" cy="${mid + sh}" r="6" fill="rgba(196,181,253,0.25)"/>`; }
      for (let f = 0; f <= this.frets; f++) svg += `<line x1="${fx(f)}" y1="${top - 8}" x2="${fx(f)}" y2="${top + sh * (ns - 1) + 8}" stroke="${f === 0 ? '#ede9fe' : 'rgba(196,181,253,0.45)'}" stroke-width="${f === 0 ? 5 : 2}"/>`;
      for (let f = 1; f <= this.frets; f++) svg += `<text x="${(fx(f - 1) + fx(f)) / 2}" y="${H - 1}" text-anchor="middle" font-size="10" fill="#8a7fa8" font-weight="700">${f}</text>`;
      for (let s = 0; s < ns; s++) {
        const y = this.yOf(s);
        const thick = ns === 4 ? 3.4 - s * 0.45 : 2.6 - s * 0.32;
        svg += `<line x1="${left}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="rgba(237,233,254,${0.45 + s * 0.06})" stroke-width="${thick}"/>`;
        svg += `<text x="${left - 44}" y="${y + 4}" text-anchor="middle" font-size="12" font-weight="800" fill="#a78bfa">${this.names[s]}</text>`;
      }
      svg += '<g class="dots"></g></svg>';
      container.innerHTML = svg;
      this.dotLayer = container.querySelector('.dots');
      this.key = '';
    }
    yOf(s) { return this.geo.top + this.geo.sh * (this.geo.ns - 1 - s); }
    xOf(f) { return f === 0 ? this.fx(0) - 14 : (this.fx(f - 1) + this.fx(f)) / 2; }
    ring(midi) {
      for (let s = this.geo.ns - 1; s >= 0; s--) {
        const f = midi - this.tuning[s];
        if (f >= 0 && f <= this.frets) return `<circle cx="${this.xOf(f)}" cy="${this.yOf(s)}" r="13" fill="none" stroke="#f0abfc" stroke-width="3" style="filter:drop-shadow(0 0 10px #d946ef)"/>`;
      }
      return '';
    }
    /** shape: {frets[]} expected chord shape; livePcs: Set of heard pitch classes; livePitchMidi: single note */
    set(shape, livePcs, livePitchMidi) {
      const k = JSON.stringify(['shape', shape && shape.frets, [...(livePcs || [])].sort(), livePitchMidi]);
      if (k === this.key) return;
      this.key = k;
      let html = '';
      if (shape && shape.frets.length === this.geo.ns) {
        shape.frets.forEach((f, s) => {
          const y = this.yOf(s);
          if (f < 0) { html += `<text x="${this.fx(0) - 14}" y="${y + 4}" text-anchor="middle" font-size="13" fill="#f43f5e" font-weight="800">×</text>`; return; }
          const midi = this.tuning[s] + f;
          const ok = livePcs && livePcs.has(midi % 12);
          const x = this.xOf(f);
          const fill = livePcs && livePcs.size ? (ok ? '#10b981' : '#f43f5e') : '#a855f7';
          html += `<circle cx="${x}" cy="${y}" r="${f === 0 ? 7 : 11}" fill="${f === 0 ? 'none' : fill}" stroke="${fill}" stroke-width="${f === 0 ? 3 : 0}" style="filter:drop-shadow(0 0 8px ${fill})"/>`;
          if (f > 0) html += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${Theory.spell(midi % 12)}</text>`;
        });
      }
      if (livePitchMidi != null) html += this.ring(livePitchMidi);
      this.dotLayer.innerHTML = html;
    }
    /** Map of the neck: chord tones (filled), scale tones (outlined), a target note and the live note. */
    setMap(chordPcs, scalePcs, livePitchMidi, targetMidi) {
      const k = JSON.stringify(['map', chordPcs, scalePcs, livePitchMidi, targetMidi]);
      if (k === this.key) return;
      this.key = k;
      const cs = new Set(chordPcs || []), ss = new Set(scalePcs || []);
      let html = '';
      for (let s = 0; s < this.geo.ns; s++) {
        for (let f = 0; f <= this.frets; f++) {
          const m = this.tuning[s] + f, pc = m % 12, x = this.xOf(f), y = this.yOf(s);
          if (m === targetMidi) {
            html += `<circle cx="${x}" cy="${y}" r="12" fill="#10b981" style="filter:drop-shadow(0 0 8px #10b981)"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#fff">${Theory.spell(pc)}</text>`;
          } else if (cs.has(pc)) {
            html += `<circle cx="${x}" cy="${y}" r="10" fill="#a855f7"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff">${Theory.spell(pc)}</text>`;
          } else if (ss.has(pc)) {
            html += `<circle cx="${x}" cy="${y}" r="7" fill="rgba(196,181,253,0.18)" stroke="#c4b5fd" stroke-width="1.5"/>`;
          }
        }
      }
      if (livePitchMidi != null) html += this.ring(livePitchMidi);
      this.dotLayer.innerHTML = html;
    }
  }

  /** Trumpet valve indicator: target written note & valves, live note. */
  function valvesHtml() {
    return `<div class="valves">
      <div class="valve-note"><span class="now-label">Target (written)</span><b class="vn-target">—</b><small class="vn-concert"></small></div>
      <div class="valve-row">${[1, 2, 3].map((v) => `<div class="valve" data-v="${v}"><i></i><span>${v}</span></div>`).join('')}</div>
      <div class="valve-note"><span class="now-label">You (written)</span><b class="vn-live">—</b><small class="vn-live-c"></small></div>
    </div>`;
  }
  function setValves(rootEl, targetMidi, liveMidi) {
    const I = PM.Instruments;
    const t = targetMidi != null ? I.trumpetInfo(targetMidi) : null;
    const l = liveMidi != null ? I.trumpetInfo(liveMidi) : null;
    rootEl.querySelector('.vn-target').textContent = t ? DSP.midiName(t.written) : '—';
    rootEl.querySelector('.vn-concert').textContent = t ? `concert ${DSP.midiName(targetMidi)} · ${t.valves ? (t.valves === '0' ? 'open' : 'valves ' + t.valves) : 'out of range'}` : '';
    rootEl.querySelector('.vn-live').textContent = l ? DSP.midiName(l.written) : '—';
    rootEl.querySelector('.vn-live-c').textContent = l ? `concert ${DSP.midiName(liveMidi)}${l.valves ? ' · ' + (l.valves === '0' ? 'open' : l.valves) : ''}` : '';
    const down = t && t.valves && t.valves !== '0' ? t.valves.split(' ').map(Number) : [];
    rootEl.querySelectorAll('.valve').forEach((v) => {
      v.classList.toggle('down', down.includes(+v.dataset.v));
      v.classList.toggle('ok', !!(t && l && t.written === l.written));
    });
  }

  function chordDiagram(name) {
    const p = Theory.parseChordName(name);
    if (!p) return '';
    const shape = Theory.guitarShape(p.root, p.type);
    if (!shape) return `<div class="diagram"><b>${esc(name)}</b><div class="muted small">${Theory.chordPcs(p.root, p.type).map((x) => Theory.spell(x)).join(' ')}</div></div>`;
    const fretted = shape.frets.filter((f) => f > 0);
    const minF = fretted.length ? Math.min(...fretted) : 1;
    const base = Math.max(...shape.frets) <= 4 ? 1 : minF;
    const W = 92, H = 112, l = 16, t = 22, sw = (W - l * 2) / 5, fh = 18;
    let s = `<svg class="chord-diagram" viewBox="0 0 ${W} ${H}">`;
    if (base === 1) s += `<rect x="${l}" y="${t - 3}" width="${sw * 5}" height="4" fill="#3b1479" rx="1"/>`;
    else s += `<text x="${l - 10}" y="${t + fh / 2 + 4}" font-size="10" fill="#7c3aed" font-weight="800" text-anchor="middle">${base}</text>`;
    for (let f = 0; f <= 4; f++) s += `<line x1="${l}" y1="${t + f * fh}" x2="${l + sw * 5}" y2="${t + f * fh}" stroke="#cfc6ef" stroke-width="1.4"/>`;
    for (let i = 0; i < 6; i++) s += `<line x1="${l + i * sw}" y1="${t}" x2="${l + i * sw}" y2="${t + 4 * fh}" stroke="#8a7fa8" stroke-width="1.2"/>`;
    if (shape.barre && base > 1) {
      const strs = shape.frets.map((f, i) => (f === shape.barre ? i : -1)).filter((i) => i >= 0);
      if (strs.length >= 2) s += `<rect x="${l + Math.min(...strs) * sw - 6}" y="${t + (shape.barre - base) * fh + fh / 2 - 6}" width="${(Math.max(...strs) - Math.min(...strs)) * sw + 12}" height="12" rx="6" fill="#7c3aed"/>`;
    }
    shape.frets.forEach((f, i) => {
      const x = l + i * sw;
      if (f < 0) s += `<text x="${x}" y="${t - 8}" font-size="10" text-anchor="middle" fill="#f43f5e" font-weight="800">×</text>`;
      else if (f === 0) s += `<circle cx="${x}" cy="${t - 11}" r="3.6" fill="none" stroke="#7c3aed" stroke-width="1.6"/>`;
      else s += `<circle cx="${x}" cy="${t + (f - base) * fh + fh / 2}" r="6" fill="url(#cdg)"/>`;
    });
    s += `<defs><linearGradient id="cdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#d946ef"/></linearGradient></defs></svg>`;
    return `<div class="diagram"><b>${esc(name)}</b>${s}</div>`;
  }

  // ---------- Timeline (waveform + chords + beats + playhead + loop) ----------
  class Timeline {
    constructor(canvas, analysis, opts) {
      this.c = canvas; this.a = analysis; this.opts = opts || {};
      this.time = 0; this.loop = null;
      // ~28 px per second keeps chord labels readable on any screen width
      this.view = { start: 0, len: Math.min(analysis.duration, Math.max(8, Math.min(40, (canvas.clientWidth || 900) / 28))) };
      canvas.addEventListener('pointerdown', (e) => this.onDown(e));
      this.dragging = null;
    }
    tAt(x) { return this.view.start + (x / this.c.clientWidth) * this.view.len; }
    onDown(e) {
      const rect = this.c.getBoundingClientRect();
      const t0 = this.tAt(e.clientX - rect.left);
      if (e.shiftKey || this.opts.loopMode) {
        this.dragging = { t0 };
        const move = (ev) => { const t1 = this.tAt(ev.clientX - rect.left); this.loop = { a: Math.min(t0, t1), b: Math.max(t0, t1) }; this.draw(); };
        const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); if (this.loop && this.loop.b - this.loop.a > 0.3) this.opts.onLoop && this.opts.onLoop(this.loop); else { this.loop = null; this.opts.onLoop && this.opts.onLoop(null); } };
        addEventListener('pointermove', move); addEventListener('pointerup', up);
      } else this.opts.onSeek && this.opts.onSeek(t0);
    }
    setTime(t) {
      this.time = t;
      const v = this.view, d = this.a.duration;
      if (t < v.start || t > v.start + v.len * 0.8) v.start = Math.max(0, Math.min(d - v.len, t - v.len * 0.2));
      this.draw();
    }
    draw() {
      const { g, w, h } = setupCanvas(this.c);
      const a = this.a, v = this.view;
      const X = (t) => ((t - v.start) / v.len) * w;
      g.clearRect(0, 0, w, h);
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#22094a'); bg.addColorStop(1, '#14072b');
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const laneH = 34, waveTop = laneH + 6, waveH = h - waveTop - 18;
      // loop region
      if (this.loop) { g.fillStyle = 'rgba(240,171,252,0.14)'; g.fillRect(X(this.loop.a), 0, X(this.loop.b) - X(this.loop.a), h); }
      // bars & beats
      const downs = new Set(a.downbeats.map((x) => x.toFixed(3)));
      for (const b of a.beats) {
        if (b < v.start - 1 || b > v.start + v.len) continue;
        const isDown = downs.has(b.toFixed(3));
        g.fillStyle = isDown ? 'rgba(196,181,253,0.35)' : 'rgba(196,181,253,0.1)';
        g.fillRect(X(b), waveTop, isDown ? 1.5 : 1, waveH);
      }
      // waveform
      const wf = a.waveform, n = wf.length / 2;
      const mid = waveTop + waveH / 2;
      const grad = g.createLinearGradient(0, waveTop, 0, waveTop + waveH);
      grad.addColorStop(0, '#d946ef'); grad.addColorStop(0.5, '#a78bfa'); grad.addColorStop(1, '#7c3aed');
      for (let px = 0; px < w; px += 2) {
        const t = v.start + (px / w) * v.len;
        const i = Math.floor((t / a.duration) * n);
        if (i < 0 || i >= n) continue;
        const mn = wf[i * 2], mx = wf[i * 2 + 1];
        g.fillStyle = t <= this.time ? grad : 'rgba(196,181,253,0.35)';
        g.fillRect(px, mid - mx * waveH * 0.5, 1.4, Math.max(1, (mx - mn) * waveH * 0.5));
      }
      // chord lane
      g.font = '700 13px ' + getComputedStyle(document.body).fontFamily;
      g.textBaseline = 'middle';
      for (const c of a.chords) {
        if (c.end < v.start || c.start > v.start + v.len || c.name === 'N') continue;
        const x0 = Math.max(0, X(c.start)), x1 = Math.min(w, X(c.end));
        const active = this.time >= c.start && this.time < c.end;
        g.fillStyle = active ? 'rgba(217,70,239,0.85)' : 'rgba(255,255,255,0.08)';
        roundRect(g, x0 + 1, 4, Math.max(2, x1 - x0 - 2), laneH - 6, 8); g.fill();
        if (x1 - x0 > 26) { g.fillStyle = '#fff'; g.fillText(c.name, x0 + 8, 4 + (laneH - 6) / 2); }
      }
      // time ticks
      g.fillStyle = 'rgba(196,181,253,0.5)'; g.font = '600 10px ' + getComputedStyle(document.body).fontFamily;
      const step = v.len > 60 ? 15 : v.len > 20 ? 5 : 2;
      for (let t = Math.ceil(v.start / step) * step; t < v.start + v.len; t += step) g.fillText(fmtTime(t), X(t) + 3, h - 8);
      // playhead
      const px = X(this.time);
      g.fillStyle = '#fff'; g.fillRect(px - 1, 0, 2, h);
      g.shadowColor = '#f0abfc'; g.shadowBlur = 14; g.beginPath(); g.arc(px, waveTop - 2, 5, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    }
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ---------- Chroma ring visualiser ----------
  class ChromaRing {
    constructor(canvas) { this.c = canvas; this.vals = new Float32Array(12); this.expected = []; this.label = ''; this.sub = ''; }
    draw(chroma, expectedPcs, label, sub, level) {
      const { g, w, h } = setupCanvas(this.c);
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 14;
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) this.vals[i] += ((chroma ? chroma[i] : 0) - this.vals[i]) * 0.35;
      const exp = new Set(expectedPcs || []);
      // circle of fifths order for musical layout
      const order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      glow.addColorStop(0, `rgba(217,70,239,${0.12 + (level || 0) * 0.25})`); glow.addColorStop(1, 'rgba(20,7,43,0)');
      g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
      order.forEach((pc, k) => {
        const a0 = (k / 12) * Math.PI * 2 - Math.PI / 2 - Math.PI / 12 + 0.03, a1 = a0 + Math.PI / 6 - 0.06;
        const v = Math.max(0, Math.min(1, this.vals[pc]));
        const inner = R * 0.48, outer = inner + (R - inner) * (0.18 + 0.82 * v);
        g.beginPath(); g.arc(cx, cy, outer, a0, a1); g.arc(cx, cy, inner, a1, a0, true); g.closePath();
        const isExp = exp.has(pc);
        const gr = g.createRadialGradient(cx, cy, inner, cx, cy, R);
        if (isExp && v > 0.45) { gr.addColorStop(0, 'rgba(16,185,129,0.5)'); gr.addColorStop(1, 'rgba(52,211,153,0.95)'); }
        else { gr.addColorStop(0, `rgba(124,58,237,${0.25 + v * 0.4})`); gr.addColorStop(1, `rgba(217,70,239,${0.2 + v * 0.8})`); }
        g.fillStyle = gr; g.fill();
        if (isExp) { g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.stroke(); }
        const am = (a0 + a1) / 2, lr = R * 0.38;
        g.fillStyle = isExp ? '#fff' : 'rgba(237,233,254,0.55)';
        g.font = `${isExp ? 800 : 600} 11px ` + getComputedStyle(document.body).fontFamily;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(Theory.spell(pc), cx + Math.cos(am) * lr, cy + Math.sin(am) * lr);
      });
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '850 30px ' + getComputedStyle(document.body).fontFamily;
      g.fillText(label || '—', cx, cy - 4);
      g.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
      g.fillStyle = 'rgba(196,181,253,0.8)';
      g.fillText(sub || '', cx, cy + 20);
    }
  }

  function gaugeHtml(ticks) {
    return `<div class="gauge"><div class="scale"></div><div class="center"></div><div class="needle"></div><div class="ticks">${ticks.map((t) => `<span>${t}</span>`).join('')}</div></div>`;
  }
  function setGauge(gaugeEl, value, range) {
    const n = gaugeEl.querySelector('.needle');
    const pct = 50 + Math.max(-1, Math.min(1, value / range)) * 50;
    n.style.left = pct + '%';
  }

  function strumLaneHtml(strum) {
    if (!strum) return '<div class="muted small">No strumming pattern available.</div>';
    const arrow = (d) => (d === 'D' ? '↓' : d === 'U' ? '↑' : d === 'X' ? '✕' : '·');
    return `<div class="strum-lane">${strum.pattern.map((d, i) => `<div class="strum-slot ${strum.accentSlots[i] ? 'accent' : ''}" data-i="${i}"><div class="arrow ${d === '-' ? 'rest' : d}">${arrow(d)}</div><div class="count">${strum.countLabels[i]}</div></div>`).join('')}</div>`;
  }

  function barChart(canvas, data, opts) {
    opts = opts || {};
    const { g, w, h } = setupCanvas(canvas);
    g.clearRect(0, 0, w, h);
    const max = Math.max(opts.goal || 0, ...data.map((d) => d.value), 1);
    const bw = (w - 20) / data.length;
    const font = getComputedStyle(document.body).fontFamily;
    if (opts.goal) {
      const y = h - 26 - (opts.goal / max) * (h - 46);
      g.setLineDash([5, 5]); g.strokeStyle = '#d946ef'; g.beginPath(); g.moveTo(10, y); g.lineTo(w - 10, y); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#d946ef'; g.font = '700 10px ' + font; g.fillText('goal', w - 34, y - 5);
    }
    data.forEach((d, i) => {
      const bh = (d.value / max) * (h - 46);
      const x = 10 + i * bw + bw * 0.18, y = h - 26 - bh;
      const gr = g.createLinearGradient(0, y, 0, h - 26);
      gr.addColorStop(0, '#d946ef'); gr.addColorStop(1, '#7c3aed');
      g.fillStyle = d.value ? gr : '#ede9fe';
      roundRect(g, x, d.value ? y : h - 30, bw * 0.64, d.value ? Math.max(4, bh) : 4, 6); g.fill();
      g.fillStyle = '#8a7fa8'; g.font = '600 10.5px ' + font; g.textAlign = 'center';
      g.fillText(d.label, x + bw * 0.32, h - 9);
      if (d.value) { g.fillStyle = '#4b3f6b'; g.font = '700 10.5px ' + font; g.fillText(opts.fmt ? opts.fmt(d.value) : d.value, x + bw * 0.32, y - 6); }
    });
  }

  function dynamicsChart(canvas, dyn, duration) {
    const { g, w, h } = setupCanvas(canvas);
    g.clearRect(0, 0, w, h);
    const font = getComputedStyle(document.body).fontFamily;
    const top = 24, bot = h - 20;
    const Y = (rel) => bot - Math.max(0, Math.min(1, (rel + 30) / 30)) * (bot - top);
    const X = (t) => (t / duration) * w;
    const marks = [['ff', -2], ['f', -6], ['mf', -10], ['mp', -15], ['p', -20], ['pp', -27]];
    g.font = '700 10px ' + font; g.fillStyle = '#c4b5fd';
    for (const [m, r] of marks) { g.fillStyle = 'rgba(196,181,253,0.18)'; g.fillRect(0, Y(r), w, 1); g.fillStyle = '#a78bfa'; g.fillText(m, 4, Y(r) - 3); }
    const grad = g.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, 'rgba(217,70,239,0.55)'); grad.addColorStop(1, 'rgba(124,58,237,0.03)');
    g.beginPath(); g.moveTo(0, bot);
    for (const p of dyn.curve) g.lineTo(X(p.t), Y(p.rel));
    g.lineTo(w, bot); g.closePath(); g.fillStyle = grad; g.fill();
    g.beginPath();
    dyn.curve.forEach((p, i) => (i ? g.lineTo(X(p.t), Y(p.rel)) : g.moveTo(X(p.t), Y(p.rel))));
    g.strokeStyle = '#7c3aed'; g.lineWidth = 2; g.stroke();
    for (const e of dyn.events.slice(0, 12)) {
      g.fillStyle = e.type === 'crescendo' ? '#10b981' : '#f43f5e';
      g.font = '800 11px ' + font;
      g.fillText(e.type === 'crescendo' ? '<' : '>', X(e.start), 14);
    }
  }

  PM.UI = { icon, el, $, $$, esc, fmtTime, toast, modal, closeAllModals, bump, confetti, ringSvg, setupCanvas, PianoKeyboard, Fretboard, valvesHtml, setValves, chordDiagram, Timeline, ChromaRing, gaugeHtml, setGauge, strumLaneHtml, barChart, dynamicsChart, roundRect };
})(typeof self !== 'undefined' ? self : globalThis);
