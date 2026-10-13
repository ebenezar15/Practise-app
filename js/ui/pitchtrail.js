/* Cadenza — pitch trail: a scrolling picture of the sung (or played) pitch against the
 * target melody. Notes to sing are bars, your voice is a line coloured by how close it is
 * (green ≤ 35¢, amber ≤ 80¢, red beyond). Octave-free: a tenor singing a soprano tune is
 * compared an octave down. `judge` is pure so it is unit-tested in Node. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  /** Cents between a sung pitch (fractional MIDI) and a target, ignoring octaves when octaveFree. */
  function judge(sung, target, octaveFree) {
    if (sung == null || target == null) return null;
    let d = (sung - target) * 100;
    if (octaveFree) d -= Math.round(d / 1200) * 1200;
    const a = Math.abs(d);
    return { cents: Math.round(d), grade: a <= 35 ? 'good' : a <= 80 ? 'close' : 'off' };
  }

  /** Target note at time t from a sorted list [{midi,start,end}] (binary search). */
  function targetAt(notes, t) {
    let lo = 0, hi = notes.length - 1, found = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (notes[mid].start <= t) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    if (found == null) return null;
    const n = notes[found];
    return t <= n.end + 0.05 ? n : null;
  }

  class PitchTrail {
    constructor(canvas, opts) {
      opts = opts || {};
      this.c = canvas;
      this.low = opts.low || 48; this.high = opts.high || 76;
      this.past = opts.past || 4; this.ahead = opts.ahead || 2.5;
      this.samples = []; // {t, m, grade}
      this.targets = [];
      this.oct = 0; // octave offset (in semitones) applied to targets to meet the singer
      this.hits = 0; this.total = 0;
    }
    setRange(low, high) { this.low = low; this.high = high; }
    setTargets(notes) {
      this.targets = (notes || []).filter((n) => n && n.midi != null).slice().sort((a, b) => a.start - b.start);
      this.hits = this.total = 0;
    }
    clear() { this.samples = []; this.hits = this.total = 0; }
    /** Add one pitch reading (fractional MIDI or null for silence) at time t. Returns the judgement. */
    push(t, m) {
      if (this.samples.length && t < this.samples[this.samples.length - 1].t - 0.5) this.samples = []; // seek backwards
      let res = null;
      const tg = this.targets.length ? targetAt(this.targets, t) : null;
      if (m != null && tg) {
        // follow the singer's octave slowly so one cracked note doesn't flip the view
        const want = Math.round((m - tg.midi) / 12) * 12;
        if (want !== this.oct) this.octVotes = (this.octVotes || 0) + 1; else this.octVotes = 0;
        if (this.octVotes > 8) { this.oct = want; this.octVotes = 0; }
        res = judge(m, tg.midi + this.oct, false);
        this.total++; if (res.grade === 'good') this.hits++;
      } else if (m != null) {
        res = judge(m, Math.round(m), false); // free singing: closeness to the nearest semitone
      }
      this.samples.push({ t, m, grade: res ? res.grade : null, target: tg });
      while (this.samples.length && this.samples[0].t < t - this.past - 1) this.samples.shift();
      return res && Object.assign(res, { target: tg ? tg.midi + this.oct : null });
    }
    accuracy() { return this.total > 10 ? this.hits / this.total : null; }

    draw(now) {
      const { g, w, h } = PM.UI.setupCanvas(this.c);
      g.clearRect(0, 0, w, h);
      // vertical range: voice range, widened to include what is on screen
      let lo = this.low, hi = this.high;
      const t0 = now - this.past, t1 = now + this.ahead;
      for (const n of this.targets) if (n.end >= t0 && n.start <= t1) { lo = Math.min(lo, n.midi + this.oct - 2); hi = Math.max(hi, n.midi + this.oct + 2); }
      for (const s of this.samples) if (s.m != null) { lo = Math.min(lo, Math.floor(s.m) - 1); hi = Math.max(hi, Math.ceil(s.m) + 1); }
      const labelW = 34;
      const X = (t) => labelW + ((t - t0) / (t1 - t0)) * (w - labelW);
      const Y = (m) => h - 6 - ((m - lo) / Math.max(1, hi - lo)) * (h - 12);
      const font = getComputedStyle(document.body).fontFamily;
      // semitone grid; C and the scale degrees darker
      g.font = '600 10px ' + font; g.textBaseline = 'middle'; g.textAlign = 'right';
      for (let m = Math.ceil(lo); m <= hi; m++) {
        const y = Y(m), pc = ((m % 12) + 12) % 12, black = [1, 3, 6, 8, 10].includes(pc);
        g.fillStyle = black ? 'rgba(124,58,237,0.05)' : 'rgba(124,58,237,0.09)';
        g.fillRect(labelW, y - (h - 12) / Math.max(1, hi - lo) / 2, w - labelW, (h - 12) / Math.max(1, hi - lo));
        if (!black && (hi - lo < 30 || pc === 0 || pc === 7)) { g.fillStyle = pc === 0 ? '#7c3aed' : 'rgba(91,33,182,0.65)'; g.fillText(NAMES[pc] + (pc === 0 ? Math.floor(m / 12) - 1 : ''), labelW - 6, y); }
      }
      // "now" line
      const xn = X(now);
      g.strokeStyle = 'rgba(217,70,239,0.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(xn, 0); g.lineTo(xn, h); g.stroke();
      // target bars
      const bh = Math.max(6, Math.min(16, (h - 12) / Math.max(1, hi - lo) * 0.8));
      for (const n of this.targets) {
        if (n.end < t0 || n.start > t1) continue;
        const x0 = Math.max(labelW, X(n.start)), x1 = Math.min(w, X(n.end)), y = Y(n.midi + this.oct);
        const active = n.start <= now && n.end >= now;
        g.fillStyle = active ? 'rgba(16,185,129,0.35)' : n.end < now ? 'rgba(148,163,184,0.25)' : 'rgba(124,58,237,0.28)';
        PM.UI.roundRect(g, x0, y - bh / 2, Math.max(3, x1 - x0), bh, bh / 2); g.fill();
        if (x1 - x0 > 26 && n.start >= now - 0.2) { g.fillStyle = 'rgba(76,29,149,0.85)'; g.textAlign = 'left'; g.fillText(NAMES[((n.midi % 12) + 12) % 12], x0 + 5, y); }
      }
      // sung line
      const COL = { good: '#10b981', close: '#f59e0b', off: '#f43f5e' };
      g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
      let prev = null;
      for (const s of this.samples) {
        if (s.t < t0 || s.m == null) { prev = null; continue; }
        if (prev && s.t - prev.t < 0.15) {
          g.strokeStyle = COL[s.grade] || '#d946ef';
          g.beginPath(); g.moveTo(X(prev.t), Y(prev.m)); g.lineTo(X(s.t), Y(s.m)); g.stroke();
        }
        prev = s;
      }
      const last = this.samples[this.samples.length - 1];
      if (last && last.m != null && now - last.t < 0.2) {
        g.fillStyle = COL[last.grade] || '#d946ef';
        g.beginPath(); g.arc(X(last.t), Y(last.m), 6, 0, Math.PI * 2); g.fill();
      }
      if (!this.targets.length && !this.samples.some((s) => s.m != null)) {
        g.fillStyle = 'rgba(91,33,182,0.6)'; g.textAlign = 'center'; g.font = '600 13px ' + font;
        g.fillText('Sing — your pitch draws here', labelW + (w - labelW) / 2, h / 2);
      }
    }
  }

  PM.PitchTrail = { PitchTrail, judge, targetAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.PitchTrail;
})(typeof self !== 'undefined' ? self : globalThis);
