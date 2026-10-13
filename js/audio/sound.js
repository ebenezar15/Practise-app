/* Overture — real-time instrument sound engine. Notes are rendered once by PM.Voices into
 * AudioBuffers (like samples), cached, then played with velocity, natural release (dampers
 * for piano, palm/finger mute for strings) and a shared room reverb. Sustained voices
 * (trumpet, singer, strings, organ) loop seamlessly for any length.
 *   PM.Sound.note(voice, midi, when, dur, {vel, dest, pan, vowel}) → stop()
 *   PM.Sound.drum(id, when, vel, dest)
 *   PM.Sound.playNotes([{midi,start,dur,vel?}] | [midi], {voice|instrument, bpm, dest}) → seconds
 *   PM.Sound.voiceFor(instrumentId) · PM.Sound.warm(voice, midis) */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const V = () => PM.Voices;
  const SR_DECAY = 32000, SR_SUSTAIN = 24000;

  const cache = new Map();
  const MAX = 56; // ~20 MB of rendered notes at most (iPad/iPhone memory)
  function remember(key, val) { cache.set(key, val); if (cache.size > MAX) cache.delete(cache.keys().next().value); return val; }
  function get(key) { const v = cache.get(key); if (v) { cache.delete(key); cache.set(key, v); } return v; }

  let bus = null;
  /** Master bus: dry + convolution reverb (generated room) + gentle limiter. */
  function master(ctx) {
    if (bus && bus.ctx === ctx) return bus;
    const input = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    dry.gain.value = 1; wet.gain.value = 0.18;
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 1.7);
    input.connect(dry).connect(comp);
    input.connect(conv).connect(wet).connect(comp);
    comp.connect(ctx.destination);
    bus = { ctx, input, wet };
    return bus;
  }
  /** A small hall: early reflections + a darkening noise tail. */
  function impulse(ctx, secs) {
    const sr = ctx.sampleRate, len = Math.floor(secs * sr), b = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0, seed = ch ? 9973 : 7919;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };
      for (let i = 0; i < len; i++) {
        const t = i / sr, k = 0.25 + 0.7 * Math.exp(-t / 0.35);
        lp += k * (rnd() - lp);
        d[i] = lp * Math.exp(-t / 0.42) * (t < 0.012 ? t / 0.012 : 1);
      }
      for (const [dt, g] of [[0.011, 0.5], [0.019, 0.35], [0.027, 0.3], [0.041, 0.22], [0.053, 0.18]]) { const i = Math.floor((dt + ch * 0.003) * sr); if (i < len) d[i] += g; }
    }
    return b;
  }

  const voiceFor = (inst) => {
    if (!inst) return 'piano';
    const I = PM.Instruments && PM.Instruments.INSTRUMENTS && PM.Instruments.INSTRUMENTS[inst];
    if (I && I.synth) return V().voiceOf(I.synth);
    return V().voiceOf(inst);
  };
  const vb = (vel) => Math.round(Math.max(0.1, Math.min(1, vel)) * 4) / 4;

  function bufferFor(ctx, voice, midi, vel, vowel) {
    const v = vb(vel);
    const key = voice + ':' + midi + ':' + v + ':' + (vowel || '');
    let e = get(key);
    if (e) return e;
    if (V().DECAYING[voice]) {
      const data = V().render(voice, midi, { sr: SR_DECAY, vel: v, maxLen: voice === 'piano' ? 2.6 : voice === 'bass' ? 3 : 2.6 });
      const b = ctx.createBuffer(1, data.length, SR_DECAY); b.copyToChannel ? b.copyToChannel(data, 0) : b.getChannelData(0).set(data);
      e = { b, vel: v };
    } else {
      const L = V().looped(voice, midi, { sr: SR_SUSTAIN, vel: v, vowel });
      const b = ctx.createBuffer(1, L.loopEnd, SR_SUSTAIN); b.getChannelData(0).set(L.buf);
      e = { b, vel: v, loopStart: L.loopStart / SR_SUSTAIN, loopEnd: L.loopEnd / SR_SUSTAIN };
    }
    return remember(key, e);
  }
  function drumBuffer(ctx, id, vel) {
    const v = vb(vel), key = 'drum:' + id + ':' + v;
    let e = get(key);
    if (e) return e;
    const data = V().drum(id, { sr: SR_DECAY, vel: v });
    const b = ctx.createBuffer(1, data.length, SR_DECAY); b.getChannelData(0).set(data);
    return remember(key, { b, vel: v });
  }

  /** Play one note. Returns a stop function (releases naturally). */
  function note(voice, midi, when, dur, opts) {
    opts = opts || {};
    const ctx = PM.Audio.getCtx(), dest = opts.dest || master(ctx).input;
    voice = V().voiceOf(voice);
    if (voice === 'drums') return drum(V().GM_DRUM[midi] || 'snare', when, opts.vel, dest);
    const vel = opts.vel == null ? 0.8 : opts.vel;
    const e = bufferFor(ctx, voice, midi, vel, opts.vowel);
    const t = Math.max(when || 0, ctx.currentTime + 0.003);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = e.b;
    if (opts.detune && src.detune) src.detune.value = opts.detune;
    if (e.loopEnd) { src.loop = true; src.loopStart = e.loopStart; src.loopEnd = e.loopEnd; }
    const amp = (vel / e.vel) * (opts.gain == null ? 1 : opts.gain);
    g.gain.setValueAtTime(amp, t);
    let out = g;
    if (opts.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = opts.pan; g.connect(p); out = p; }
    src.connect(g); out.connect(dest);
    src.start(t);
    const rel = V().DECAYING[voice] ? V().releaseTime(voice, midi) : voice === 'strings' ? 0.3 : voice === 'voice' ? 0.14 : 0.07;
    let stopped = false;
    const release = (at) => {
      if (stopped) return; stopped = true;
      const tt = Math.max(at, ctx.currentTime);
      try { g.gain.cancelScheduledValues(tt); g.gain.setValueAtTime(amp, tt); g.gain.setTargetAtTime(0.0001, tt, rel / 3); src.stop(tt + rel * 2.5 + 0.05); } catch (err) { /* already stopped */ }
    };
    if (dur != null && isFinite(dur)) release(t + Math.max(0.03, dur));
    src.onended = () => { try { g.disconnect(); out.disconnect(); } catch (err) { /* ignore */ } };
    return () => release(ctx.currentTime);
  }

  function drum(id, when, vel, dest) {
    const ctx = PM.Audio.getCtx();
    const e = drumBuffer(ctx, id, vel == null ? 0.8 : vel);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = e.b;
    g.gain.value = (vel == null ? 0.8 : vel) / e.vel;
    src.connect(g).connect(dest || master(ctx).input);
    const t = Math.max(when || 0, ctx.currentTime + 0.002);
    src.start(t);
    return () => { try { src.stop(); } catch (err) { /* ignore */ } };
  }

  /** Play a list of notes (numbers = one per beat). Renders first so timing stays tight. */
  function playNotes(list, opts) {
    opts = opts || {};
    const ctx = PM.Audio.getCtx();
    const voice = opts.voice ? V().voiceOf(opts.voice) : voiceFor(opts.instrument || (PM.App && PM.App.instrument));
    const beat = 60 / (opts.bpm || 90);
    const notes = list.map((m, i) => (typeof m === 'number' ? { midi: m, start: i * beat, dur: beat * 0.92 } : m));
    for (const n of notes) if (voice !== 'drums') bufferFor(ctx, voice, n.midi, n.vel == null ? opts.vel || 0.75 : n.vel, opts.vowel);
    const t0 = ctx.currentTime + 0.06;
    const stops = notes.map((n) => note(voice, n.midi, t0 + n.start, n.dur, { vel: n.vel == null ? opts.vel || 0.75 : n.vel, dest: opts.dest, vowel: opts.vowel }));
    const end = notes.reduce((m, n) => Math.max(m, n.start + (n.dur || 0)), 0);
    playNotes.lastStop = () => stops.forEach((s) => s());
    return end;
  }

  /** Pre-render notes in small idle chunks so the first play is instant. */
  function warm(voice, midis, vel) {
    const ctx = PM.Audio.getCtx();
    voice = V().voiceOf(voice);
    const list = [...new Set(midis)];
    const step = () => {
      const t = performance.now();
      while (list.length && performance.now() - t < 12) { const m = list.shift(); if (voice === 'drums') drumBuffer(ctx, V().GM_DRUM[m] || 'snare', vel || 0.8); else bufferFor(ctx, voice, m, vel || 0.75); }
      if (list.length) (root.requestIdleCallback || ((f) => setTimeout(f, 30)))(step);
    };
    (root.requestIdleCallback || ((f) => setTimeout(f, 30)))(step);
  }

  /** Render (cache) a note without playing it. */
  function prepare(voice, midi, vel, vowel) { voice = V().voiceOf(voice); if (voice !== 'drums') bufferFor(PM.Audio.getCtx(), voice, midi, vel == null ? 0.75 : vel, vowel); }

  PM.Sound = { note, drum, playNotes, warm, prepare, voiceFor, master: (ctx) => master(ctx || PM.Audio.getCtx()).input, setReverb: (v) => { if (bus) bus.wet.gain.value = v; } };
})(typeof self !== 'undefined' ? self : globalThis);
