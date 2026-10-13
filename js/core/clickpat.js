/* Cadenza — Click patterns: a step-sequencer model for custom metronome loops.
 * A pattern is a grid of steps (beats × steps-per-beat × bars). Each step has a level:
 * 0 rest · 1 soft · 2 click · 3 accent. Pure model + presets here; ClickLoop plays it
 * sample-accurately with a look-ahead scheduler (browser only). */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const LEVELS = [
    { id: 0, name: 'Rest', short: '·' },
    { id: 1, name: 'Soft', short: 's' },
    { id: 2, name: 'Click', short: 'x' },
    { id: 3, name: 'Accent', short: 'X' },
  ];
  const CH = '.sxX';

  /** New empty pattern; beat starts get a click and bar 1 beat 1 an accent unless blank. */
  function make(beats, sub, bars, blank) {
    beats = clamp(beats || 4, 1, 12); sub = clamp(sub || 1, 1, 6); bars = clamp(bars || 1, 1, 8);
    const steps = [];
    for (let b = 0; b < bars; b++) for (let i = 0; i < beats * sub; i++) steps.push(blank ? 0 : i === 0 ? 3 : i % sub === 0 ? 2 : 0);
    return { name: 'My pattern', beats, sub, bars, swing: 0, steps };
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, Math.round(+x || 0)));

  /** Parse a compact string: bars separated by "|", one char per step (". s x X"). */
  function parse(str, opts) {
    const bars = String(str).split('|').map((s) => s.replace(/\s+/g, ''));
    const sub = (opts && opts.sub) || 1;
    const len = bars[0].length;
    const steps = [];
    bars.forEach((b) => { for (let i = 0; i < len; i++) steps.push(Math.max(0, CH.indexOf(b[i] || '.'))); });
    return Object.assign({ name: 'Pattern', beats: len / sub, sub, bars: bars.length, swing: 0, steps }, opts);
  }
  /** Inverse of parse. */
  function encode(p) {
    const per = p.beats * p.sub, out = [];
    for (let b = 0; b < p.bars; b++) out.push(p.steps.slice(b * per, (b + 1) * per).map((v) => CH[v] || '.').join(''));
    return out.join('|');
  }

  /** Resize a pattern keeping whatever overlaps. */
  function resize(p, beats, sub, bars) {
    const n = make(beats, sub, bars, true);
    n.name = p.name; n.swing = p.swing || 0;
    const oldPer = p.beats * p.sub, newPer = n.beats * n.sub;
    for (let b = 0; b < n.bars; b++) {
      for (let i = 0; i < newPer; i++) {
        // map by musical position (beat + fraction) so changing subdivision keeps the beats
        const beat = Math.floor(i / n.sub), frac = (i % n.sub) / n.sub;
        const oi = beat * p.sub + frac * p.sub;
        if (b < p.bars && beat < p.beats && Number.isInteger(oi)) n.steps[b * newPer + i] = p.steps[b * oldPer + oi] || 0;
      }
    }
    return n;
  }

  /** Next level when a step is tapped: rest → click → accent → soft → rest. */
  const cycle = (v) => [2, 0, 3, 1][v] ?? 2;
  // (index = current level: 0→2, 1→0, 2→3, 3→1)

  /** Step start times (seconds from loop start) for one loop, with swing on even/odd sub-steps. */
  function stepTimes(p, bpm) {
    const per = p.beats * p.sub, stepDur = 60 / bpm / p.sub, total = per * p.bars;
    const sw = p.sub % 2 === 0 ? (p.swing || 0) : 0; // swing only makes sense for even subdivisions
    const out = [];
    for (let k = 0; k < total; k++) {
      const off = k % 2 === 1 ? sw * stepDur * 0.66 : 0;
      out.push({ k, t: k * stepDur + off, level: p.steps[k] || 0, bar: Math.floor(k / per), beat: Math.floor((k % per) / p.sub), sub: k % p.sub });
    }
    return { steps: out, loop: total * stepDur };
  }

  /** How dense/hard a pattern is (0–1): off-beat hits and rests on beats raise it. */
  function difficulty(p) {
    let off = 0, beatRests = 0, hits = 0;
    p.steps.forEach((v, k) => { const onBeat = k % p.sub === 0; if (v) { hits++; if (!onBeat) off++; } else if (onBeat) beatRests++; });
    const n = p.steps.length || 1;
    return Math.min(1, (off / n) * 1.6 + (beatRests / (n / p.sub)) * 0.6 + (p.sub >= 3 ? 0.1 : 0));
  }

  /** Make a fresh random practice pattern of a given difficulty (0 easy … 2 hard). */
  function random(level, rnd) {
    rnd = rnd || Math.random;
    const sub = level === 0 ? 2 : level === 1 ? (rnd() < 0.5 ? 2 : 4) : (rnd() < 0.5 ? 3 : 4);
    const p = make(4, sub, level === 2 ? 2 : 1, true);
    const per = p.beats * sub;
    for (let k = 0; k < p.steps.length; k++) {
      const i = k % per, onBeat = i % sub === 0;
      const chance = onBeat ? (level === 2 ? 0.7 : 0.9) : level === 0 ? 0.35 : level === 1 ? 0.45 : 0.5;
      if (rnd() < chance) p.steps[k] = onBeat ? 2 : rnd() < 0.3 ? 1 : 2;
    }
    for (let b = 0; b < p.bars; b++) p.steps[b * per] = 3;
    p.name = ['Easy', 'Medium', 'Hard'][level] + ' random';
    return p;
  }

  // Presets: string form, one char per step. sub = steps per beat.
  const PRESETS = [
    { id: 'four', group: 'Basics', name: 'Four on the floor', sub: 1, str: 'Xxxx', tip: 'The plain beat — lock in with it first.' },
    { id: 'backbeat', group: 'Basics', name: 'Backbeat 2 & 4', sub: 1, str: '.X.X', tip: 'Click only on 2 and 4 — the pop/gospel backbeat. Feel 1 and 3 yourself.' },
    { id: 'one-only', group: 'Basics', name: 'Only beat 1', sub: 1, str: 'X...', tip: 'Fill in beats 2–4 in your head. Builds your inner clock.' },
    { id: 'eighths', group: 'Basics', name: 'Steady 8ths', sub: 2, str: 'Xsxsxsxs', tip: 'Down-up 8th notes with a strong 1.' },
    { id: 'offbeats', group: 'Basics', name: 'Off-beats only (the "&")', sub: 2, str: '.x.x.x.x', tip: 'Every click is an "and". Count 1-&-2-& and play on the beat between clicks.' },
    { id: 'waltz', group: 'Time signatures', name: 'Waltz 3/4', sub: 1, str: 'Xss', tip: 'ONE-two-three. Hymns like "Amazing Grace" use this.' },
    { id: 'six8', group: 'Time signatures', name: 'Compound 6/8', sub: 3, str: 'XssXss', beats: 2, tip: 'Two big beats, each split in three. Felt as ONE-and-a TWO-and-a.' },
    { id: 'five4', group: 'Time signatures', name: '5/4 (3+2)', sub: 1, str: 'XxxXx', tip: 'Group 5 as 3+2. Count 1-2-3-1-2.' },
    { id: 'seven8', group: 'Time signatures', name: '7/8 (2+2+3)', sub: 1, str: 'XsXsXss', tip: 'Short-short-long: 1-2 1-2 1-2-3.' },
    { id: 'clave32', group: 'World', name: 'Son clave 3-2', sub: 4, str: 'X..x..x...x.x...', tip: 'The heartbeat of salsa. Three hits, then two.' },
    { id: 'clave23', group: 'World', name: 'Son clave 2-3', sub: 4, str: '..x.x...X..x..x.', tip: 'Same clave, starting from the "two" side.' },
    { id: 'tresillo', group: 'World', name: 'Tresillo (3-3-2)', sub: 4, str: 'X..x..x.X..x..x.', tip: 'Found in pop, reggaeton, Afrobeats and Tamil folk grooves.' },
    { id: 'bossa', group: 'World', name: 'Bossa nova clave', sub: 4, str: 'X..x..x...x..x..', tip: 'A gentle Brazilian 2-bar clave.' },
    { id: 'thappu', group: 'World', name: 'Thappu-style 6 (3+3)', sub: 2, str: 'Xs.xs.Xs.xs.', beats: 6, tip: 'A driving folk feel in 6 — accents every 3 half-beats.' },
    { id: 'swing8', group: 'Feel', name: 'Swing 8ths', sub: 2, str: 'XsxsXsxs', swing: 0.5, tip: 'Long-short 8ths: the jazz/blues "doo-ba doo-ba".' },
    { id: 'shuffle', group: 'Feel', name: 'Shuffle (triplets)', sub: 3, str: 'X.xx.xx.xx.x', tip: 'Triplets with the middle note left out.' },
    { id: 'sixteenths', group: 'Feel', name: 'Funky 16ths', sub: 4, str: 'X.sxs.x.s.xsx.s.', tip: 'Syncopated 16ths — great for strumming hand and slap bass.' },
    { id: 'gap', group: 'Trainers', name: 'Gap trainer (1 on, 1 off)', sub: 1, str: 'Xxxx|....', tip: 'One bar click, one bar silent — keep going through the gap.' },
    { id: 'gap3', group: 'Trainers', name: 'Disappearing click', sub: 1, str: 'Xxxx|X...|X...|....', tip: 'The click fades away over 4 bars. Can you land the next ONE?' },
    { id: 'triplet-switch', group: 'Trainers', name: '8ths ↔ triplets', sub: 6, str: 'X..x..x..x..x..x..x..x..|X.x.x.x.x.x.x.x.x.x.x.x.', tip: 'Bar 1 is 8ths, bar 2 is triplets — switch smoothly.' },
    { id: 'push', group: 'Trainers', name: 'Anticipation (push)', sub: 2, str: 'X.x.x.xX', tip: 'Accent on the "and of 4" — the push used in worship songs.' },
  ];

  function preset(id) {
    const P = PRESETS.find((p) => p.id === id);
    if (!P) return null;
    const bars = P.str.replace(/\|$/, '').split('|');
    const beats = P.beats || bars[0].length / P.sub;
    const p = parse(bars.join('|'), { sub: P.sub });
    return Object.assign(p, { name: P.name, beats, swing: P.swing || 0, preset: P.id, tip: P.tip });
  }

  /** Browser player. */
  class ClickLoop {
    constructor() { this.pattern = make(4, 1, 1); this.bpm = 90; this.volume = 0.8; this.sound = 'click'; this.running = false; this.listeners = new Set(); this.queue = []; this.muteEvery = 0; }
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(e) { this.listeners.forEach((fn) => fn(e)); }
    setPattern(p) { this.pattern = p; this.replan(); }
    setBpm(b) { this.bpm = Math.max(20, Math.min(300, Math.round(b))); this.replan(); }
    /** Recompute step times; while playing, keep the next unscheduled step where it was. */
    replan() {
      const old = this.plan;
      this.plan = stepTimes(this.pattern, this.bpm);
      if (!this.running || !old) return;
      const n = this.plan.steps.length;
      if (old.steps.length !== n) this.k = Math.min(n, Math.round((this.k / old.steps.length) * n));
      const ot = this.k < old.steps.length ? old.steps[this.k].t : old.loop;
      const nt = this.k < n ? this.plan.steps[this.k].t : this.plan.loop;
      this.loopStart += ot - nt;
    }
    setVolume(v) { this.volume = v; if (this.out) this.out.gain.value = v; }
    start() {
      if (this.running) return;
      const ctx = PM.Audio.getCtx();
      this.running = true; this.k = 0; this.loopN = 0; this.plan = stepTimes(this.pattern, this.bpm);
      this.loopStart = ctx.currentTime + 0.08;
      this.out = ctx.createGain(); this.out.gain.value = this.volume; this.out.connect(ctx.destination);
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
      this.emit({ type: 'start' });
    }
    stop() {
      if (!this.running) return;
      this.running = false; clearInterval(this.timer); this.queue = [];
      try { this.out.disconnect(); } catch (e) { /* ignore */ }
      this.emit({ type: 'stop' });
    }
    schedule() {
      const ctx = PM.Audio.getCtx();
      if (!this.plan) this.plan = stepTimes(this.pattern, this.bpm);
      for (let guard = 0; guard < 512; guard++) {
        const { steps, loop } = this.plan;
        if (!steps.length) return;
        if (this.k >= steps.length) { this.k = 0; this.loopN++; this.loopStart += loop; this.emit({ type: 'loop', n: this.loopN }); continue; }
        const s = steps[this.k], t = this.loopStart + s.t;
        if (t > ctx.currentTime + 0.12) break;
        const muted = this.muteEvery > 0 && Math.floor(this.loopN / this.muteEvery) % 2 === 1;
        if (s.level && !muted && t >= ctx.currentTime - 0.01) this.click(t, s.level);
        this.queue.push({ time: t, k: s.k, level: s.level, muted, loop: this.loopN });
        if (this.queue.length > 96) this.queue.shift();
        this.k++;
      }
    }
    click(time, level) {
      if ((this.sound === 'wood' || this.sound === 'cow' || this.sound === 'sticks' || this.sound === 'kit') && PM.Sound) {
        const id = this.sound === 'wood' ? (level === 3 ? 'woodhi' : 'wood') : this.sound === 'cow' ? 'cowbell' : this.sound === 'sticks' ? 'rim' : (level === 3 ? 'kick' : level === 2 ? 'snare' : 'hhc');
        PM.Sound.drum(id, time, [0, 0.35, 0.7, 1][level], this.out);
        return;
      }
      const ctx = PM.Audio.getCtx();
      const o = ctx.createOscillator(), g = ctx.createGain();
      const F = { click: [0, 700, 1000, 1600], wood: [0, 520, 800, 1250], beep: [0, 660, 880, 1320], cow: [0, 540, 560, 800] }[this.sound] || [0, 700, 1000, 1600];
      o.frequency.value = F[level];
      o.type = this.sound === 'beep' ? 'sine' : this.sound === 'wood' ? 'triangle' : 'square';
      const peak = [0, 0.18, 0.45, 0.7][level], dur = this.sound === 'beep' ? 0.08 : this.sound === 'cow' ? 0.12 : 0.035;
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(peak, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
      o.connect(g).connect(this.out);
      o.start(time); o.stop(time + dur + 0.01);
    }
    current() {
      if (!this.running) return null;
      const now = PM.Audio.getCtx().currentTime;
      let cur = null;
      for (const q of this.queue) if (q.time <= now) cur = q;
      return cur;
    }
  }

  PM.ClickPat = { LEVELS, PRESETS, make, parse, encode, resize, cycle, stepTimes, difficulty, random, preset, ClickLoop };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.ClickPat;
})(typeof self !== 'undefined' ? self : globalThis);
