/* Overture — real-time drum kit, step sequencer and auto-accompaniment (bass + chords).
 * All sounds are synthesized with Web Audio (works offline, no samples). The sequencer
 * uses the same look-ahead scheduling as the metronome, so it is sample-accurate. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const VOICES = [
    { id: 'kick', name: 'Kick', short: 'BD' }, { id: 'snare', name: 'Snare', short: 'SD' }, { id: 'rim', name: 'Rim / side stick', short: 'RS' },
    { id: 'clap', name: 'Clap', short: 'CP' }, { id: 'hhc', name: 'Hi-hat closed', short: 'HH' }, { id: 'hho', name: 'Hi-hat open', short: 'OH' },
    { id: 'hhp', name: 'Hi-hat pedal', short: 'PH' }, { id: 'ride', name: 'Ride', short: 'RD' }, { id: 'crash', name: 'Crash', short: 'CR' },
    { id: 'tomh', name: 'High tom', short: 'T1' }, { id: 'tomm', name: 'Mid tom', short: 'T2' }, { id: 'toml', name: 'Floor tom', short: 'T3' },
    { id: 'shaker', name: 'Shaker', short: 'SH' }, { id: 'tamb', name: 'Tambourine', short: 'TB' }, { id: 'cowbell', name: 'Cowbell', short: 'CB' },
    { id: 'congah', name: 'Conga high', short: 'CH' }, { id: 'congal', name: 'Conga low', short: 'CL' }, { id: 'clave', name: 'Clave', short: 'CV' },
  ];
  const VOICE_IDS = VOICES.map((v) => v.id);

  /** Velocity of a pattern character. */
  const velOf = (c) => (c === 'X' ? 1 : c === 'x' ? 0.72 : c === 'o' ? 0.38 : c === 'f' ? 0.55 : 0);

  class DrumKit {
    constructor(ctx, dest) {
      this.ctx = ctx;
      this.out = ctx.createGain();
      this.out.gain.value = 0.9;
      this.out.connect(dest || (PM.Sound ? PM.Sound.master(ctx) : ctx.destination));
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    env(g, t, peak, decay, attack) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + (attack || 0.002));
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    }
    tone(t, f0, f1, decay, peak, type, sweep) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + (sweep || decay * 0.6));
      this.env(g, t, peak, decay);
      o.connect(g).connect(this.out);
      o.start(t); o.stop(t + decay + 0.05);
    }
    hiss(t, decay, peak, ftype, freq, q) {
      const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noise;
      f.type = ftype; f.frequency.value = freq; f.Q.value = q || 0.8;
      this.env(g, t, peak, decay);
      s.connect(f).connect(g).connect(this.out);
      s.start(t, Math.random() * 0.5); s.stop(t + decay + 0.05);
    }
    play(id, t, v) {
      v = v == null ? 0.8 : v;
      if (PM.Sound && PM.Voices) { PM.Sound.drum(id, t, v, this.out); return; }
      this.legacy(id, t, v);
    }
    legacy(id, t, v) {
      switch (id) {
        case 'kick': this.tone(t, 150, 45, 0.42, 1.0 * v, 'sine', 0.12); this.hiss(t, 0.02, 0.25 * v, 'lowpass', 1800); break;
        case 'snare': this.tone(t, 220, 160, 0.12, 0.45 * v, 'triangle'); this.hiss(t, 0.2, 0.55 * v, 'highpass', 1600, 0.7); break;
        case 'hhc': this.hiss(t, 0.05, 0.32 * v, 'highpass', 7500, 1); break;
        case 'crash': this.hiss(t, 1.4, 0.38 * v, 'highpass', 4500, 0.6); break;
        default: this.hiss(t, 0.08, 0.3 * v, 'bandpass', 3000, 1);
      }
    }
    /** Bass & chord voices for the auto-accompaniment (realistic instrument voices). */
    bass(t, midi, dur, v) { PM.Sound.note('bass', midi, t, dur, { vel: Math.min(1, 0.5 + 0.45 * v), dest: this.out }); }
    chord(t, midis, dur, v, kind) {
      const voice = kind === 'organ' ? 'organ' : kind === 'guitar' ? 'guitar' : kind === 'pad' ? 'strings' : 'piano';
      const strum = voice === 'guitar' ? 0.012 : 0;
      const g = voice === 'strings' ? 0.55 : voice === 'organ' ? 0.6 : 0.8;
      midis.forEach((m, k) => PM.Sound.note(voice, m, t + k * strum, dur, { vel: Math.min(1, (0.42 + 0.35 * v)), gain: g, dest: this.out }));
    }
  }

  /**
   * Step sequencer. A pattern: {steps, stepsPerBeat, beatsPerBar, swing, tracks: {voice: 'X.x.o...'},
   * bass?: 'R..5R...', comp?: 'X...X...', compKind?}. A style: {variations: {A, B, fill, intro, ending}}.
   */
  class Sequencer {
    constructor() {
      this.bpm = 96;
      this.running = false;
      this.listeners = new Set();
      this.pattern = null;
      this.style = null;
      this.section = 'A';
      this.pendingSection = null;
      this.fillNext = false;
      this.autoFill = 4; // play a fill every N bars (0 = off)
      this.chords = []; // [{root, type}] one per bar for the accompaniment
      this.accomp = true;
      this.drums = true;
      this.mute = {};
      this.volume = 0.85;
      this.queue = [];
    }
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(e) { this.listeners.forEach((fn) => { try { fn(e); } catch (err) { console.error(err); } }); }
    current() { return this.style ? this.style.variations[this.playing || this.section] || this.style.variations.A : this.pattern; }
    setStyle(style) { this.style = style; this.pattern = null; this.section = 'A'; if (style.bpm && !this.running) this.bpm = style.bpm; }
    setPattern(p) { this.pattern = p; this.style = null; }
    start(atTime) {
      if (this.running) return;
      const ctx = PM.Audio.getCtx();
      this.out = ctx.createGain(); this.out.gain.value = this.volume; this.out.connect(ctx.destination);
      this.kit = new DrumKit(ctx, this.out);
      this.running = true;
      this.step = 0; this.bar = 0;
      this.playing = this.style && this.style.variations.intro && this.useIntro ? 'intro' : this.section;
      this.nextTime = Math.max(ctx.currentTime + 0.08, atTime || 0);
      this.anchor = { time: this.nextTime };
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
      this.emit({ type: 'start' });
    }
    stop() {
      if (!this.running) return;
      this.running = false;
      clearInterval(this.timer);
      const out = this.out;
      setTimeout(() => { try { out.disconnect(); } catch (e) { /* ignore */ } }, 400);
      this.queue = [];
      this.emit({ type: 'stop' });
    }
    setVolume(v) { this.volume = v; if (this.out) this.out.gain.value = v; }
    stepDur(p) { return 60 / this.bpm / p.stepsPerBeat; }
    schedule() {
      const ctx = PM.Audio.getCtx();
      while (this.nextTime < ctx.currentTime + 0.12) {
        const p = this.current();
        if (!p) return;
        const k = this.step;
        const dur = this.stepDur(p);
        // swing: delay every second subdivision
        const swingOff = p.swing && p.stepsPerBeat % 2 === 0 && k % 2 === 1 ? p.swing * dur : 0;
        const t = this.nextTime + swingOff;
        if (this.drums) for (const [voice, str] of Object.entries(p.tracks)) {
          if (this.mute[voice]) continue;
          const v = velOf(str[k]);
          if (v) this.kit.play(voice, t, v);
        }
        if (this.accomp && this.chords.length && (p.bass || p.comp)) this.accompany(p, k, t, dur);
        this.queue.push({ time: t, step: k, bar: this.bar, section: this.playing });
        if (this.queue.length > 96) this.queue.shift();
        this.nextTime += dur;
        this.step++;
        if (this.step >= p.steps) { this.step = 0; this.bar++; this.nextBar(); }
      }
    }
    accompany(p, k, t, dur) {
      const ch = this.chords[this.chordIndex() % this.chords.length];
      if (!ch || !PM.Theory) return;
      const T = PM.Theory.TYPE_BY_ID[ch.type] || PM.Theory.TYPE_BY_ID[''];
      const rootBass = 36 + ch.root - (ch.root > 7 ? 12 : 0);
      if (p.bass && p.bass[k] && p.bass[k] !== '.') {
        const c = p.bass[k];
        const third = T.iv[1] || 4, fifth = T.iv[2] || 7;
        const off = { R: 0, r: 0, '5': fifth, '3': third, '8': 12, '7': T.iv[3] || 10, '-': -1, 'b': -12 + fifth }[c];
        let len = 1;
        while (p.bass[k + len] === '_' ) len++;
        if (off != null) this.kit.bass(t, rootBass + off, dur * len * 0.92, c === 'r' ? 0.6 : 0.9);
      }
      if (p.comp && p.comp[k] && p.comp[k] !== '.' && p.comp[k] !== '_') {
        let r = 60 + ch.root; if (r > 66) r -= 12;
        let len = 1;
        while (p.comp[k + len] === '_') len++;
        const v = velOf(p.comp[k]) || 0.7;
        this.kit.chord(t, T.iv.map((iv) => r + iv), dur * len * 0.9, v, p.compKind || 'piano');
      }
    }
    chordIndex() { return Math.max(0, this.bar - (this.introBars || 0)); }
    nextBar() {
      const st = this.style;
      if (!st) { this.emit({ type: 'bar', bar: this.bar }); return; }
      const was = this.playing;
      if (was === 'ending') { this.stop(); return; }
      if (this.endRequested) { this.endRequested = false; this.playing = st.variations.ending ? 'ending' : null; if (!this.playing) { this.stop(); return; } }
      else if (was === 'intro' || was === 'fill') { this.playing = this.pendingSection || this.section; this.section = this.playing; this.pendingSection = null; if (was === 'intro') this.introBars = this.bar; }
      else if (this.fillNext || (this.autoFill && st.variations.fill && (this.bar - (this.introBars || 0)) % this.autoFill === this.autoFill - 1 && this.bar > 0)) { this.fillNext = false; this.playing = 'fill'; }
      else if (this.pendingSection) { this.playing = this.section = this.pendingSection; this.pendingSection = null; }
      this.emit({ type: 'bar', bar: this.bar, section: this.playing });
    }
    /** Switch variation at the next bar line, with a fill (like the Main A/B buttons on a keyboard). */
    switchTo(sec) { if (!this.running) { this.section = sec; return; } this.pendingSection = sec; this.fillNext = !!(this.style && this.style.variations.fill); }
    fill() { this.fillNext = true; }
    end() { this.endRequested = true; }
    /** Most recent step that has sounded (for the UI). */
    now() { const t = PM.Audio.getCtx().currentTime; let cur = null; for (const q of this.queue) if (q.time <= t) cur = q; return cur; }
  }

  /** An empty pattern for the beat maker. */
  function emptyPattern(beatsPerBar, stepsPerBeat) {
    const steps = beatsPerBar * stepsPerBeat;
    const tracks = {};
    for (const v of ['kick', 'snare', 'hhc', 'hho', 'clap', 'rim', 'ride', 'crash', 'tomh', 'tomm', 'toml', 'shaker', 'tamb', 'cowbell']) tracks[v] = '.'.repeat(steps);
    return { name: 'My beat', steps, stepsPerBeat, beatsPerBar, swing: 0, tracks };
  }

  PM.Drums = { VOICES, VOICE_IDS, DrumKit, Sequencer, velOf, emptyPattern };
})(typeof self !== 'undefined' ? self : globalThis);
