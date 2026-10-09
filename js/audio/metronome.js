/* Cadenza — sample-accurate metronome (look-ahead scheduler) with accents,
 * subdivisions, tap tempo, speed trainer and a timing grid for the coach. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  class Metronome {
    constructor() {
      this.bpm = 90;
      this.beatsPerBar = 4;
      this.beatUnit = 4;
      this.subdivision = 1; // 1 quarter, 2 eighths, 3 triplets, 4 sixteenths
      this.sound = 'click';
      this.volume = 0.8;
      this.accentFirst = true;
      this.running = false;
      this.queue = [];
      this.listeners = new Set();
      this.trainer = null; // {step, everyBars, target}
      this.taps = [];
      this.mutedBars = 0; // gap-click trainer: every other bar silent when >0
    }
    on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    emit(e) { this.listeners.forEach((fn) => fn(e)); }

    /** BPM counts the time-signature denominator (quarters in 4/4, eighths in 6/8). */
    get interval() { return 60 / this.bpm; }

    start(atTime) {
      const ctx = PM.Audio.getCtx();
      if (this.running) return;
      this.running = true;
      this.beat = 0;
      this.sub = 0;
      this.bar = 0;
      this.nextTime = Math.max(ctx.currentTime + 0.06, atTime || 0);
      this.anchor = { time: this.nextTime, beat: 0, interval: this.interval };
      this.out = ctx.createGain();
      this.out.gain.value = this.volume;
      this.out.connect(ctx.destination);
      this.timer = setInterval(() => this.schedule(), 25);
      this.schedule();
      this.emit({ type: 'start' });
    }

    stop() {
      if (!this.running) return;
      this.running = false;
      clearInterval(this.timer);
      try { this.out.disconnect(); } catch (e) { /* ignore */ }
      this.queue = [];
      this.emit({ type: 'stop' });
    }

    setBpm(bpm) {
      bpm = Math.max(20, Math.min(300, Math.round(bpm)));
      this.bpm = bpm;
      if (this.running) this.anchor = { time: this.nextTime, beat: this.beat + (this.sub ? 1 : 0), interval: this.interval, bar: this.bar };
      this.emit({ type: 'bpm', bpm });
    }

    setVolume(v) { this.volume = v; if (this.out) this.out.gain.value = v; }

    tap() {
      const now = performance.now();
      this.taps = this.taps.filter((t) => now - t < 2500);
      this.taps.push(now);
      if (this.taps.length >= 3) {
        const iv = [];
        for (let i = 1; i < this.taps.length; i++) iv.push(this.taps[i] - this.taps[i - 1]);
        const avg = iv.reduce((a, b) => a + b, 0) / iv.length;
        this.setBpm(60000 / avg);
      }
      return this.bpm;
    }

    schedule() {
      const ctx = PM.Audio.getCtx();
      while (this.nextTime < ctx.currentTime + 0.12) {
        const accent = this.sub === 0 && this.beat === 0 && this.accentFirst;
        const compoundAccent = this.sub === 0 && this.beatUnit === 8 && this.beat % 3 === 0;
        const silent = this.mutedBars > 0 && this.bar % 2 === 1;
        if (!silent) this.click(this.nextTime, accent ? 2 : this.sub === 0 ? (compoundAccent ? 1.5 : 1) : 0);
        this.queue.push({ time: this.nextTime, beat: this.beat, sub: this.sub, bar: this.bar, accent, silent });
        if (this.queue.length > 64) this.queue.shift();
        this.nextTime += this.interval / this.subdivision;
        this.sub++;
        if (this.sub >= this.subdivision) {
          this.sub = 0;
          this.beat++;
          if (this.beat >= this.beatsPerBar) {
            this.beat = 0;
            this.bar++;
            this.onBar();
          }
        }
      }
    }

    onBar() {
      const t = this.trainer;
      if (t && this.bar > 0 && this.bar % t.everyBars === 0 && this.bpm < t.target) {
        this.setBpm(Math.min(t.target, this.bpm + t.step));
        this.emit({ type: 'trainer', bpm: this.bpm, done: this.bpm >= t.target });
      }
    }

    click(time, level) {
      const ctx = PM.Audio.getCtx();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freqs = { click: [1000, 1600, 1250, 700], wood: [800, 1250, 1000, 520], beep: [880, 1320, 1100, 660] }[this.sound] || [1000, 1600, 1250, 700];
      osc.frequency.value = level >= 2 ? freqs[1] : level >= 1.5 ? freqs[2] : level >= 1 ? freqs[0] : freqs[3];
      osc.type = this.sound === 'beep' ? 'sine' : this.sound === 'wood' ? 'triangle' : 'square';
      const peak = level >= 1 ? 0.6 : 0.25;
      const dur = this.sound === 'beep' ? 0.08 : 0.035;
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(peak, time + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0008, time + dur);
      osc.connect(g).connect(this.out);
      osc.start(time);
      osc.stop(time + dur + 0.01);
    }

    /** Most recent scheduled tick that has already sounded. */
    current() {
      const now = PM.Audio.getCtx().currentTime;
      let cur = null;
      for (const q of this.queue) if (q.time <= now) cur = q;
      return cur;
    }

    /** Timing grid for the coach (beats + subdivisions). */
    grid(subdiv) {
      const self = this;
      return {
        nearest(t) {
          if (!self.running) return null;
          const a = self.anchor;
          const step = a.interval / (subdiv || self.subdivision || 1);
          const k = Math.round((t - a.time) / step);
          return { offset: t - (a.time + k * step), interval: step };
        },
      };
    }
  }

  PM.Metronome = Metronome;
})(typeof self !== 'undefined' ? self : globalThis);
