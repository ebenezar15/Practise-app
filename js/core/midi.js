/* Overture — Standard MIDI File parser, lightweight offline synthesiser
 * (piano, acoustic/electric guitar, bass, trumpet, strings, organ, drums) and WAV encoder. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  function parseMidi(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let p = 0;
    const u8 = () => bytes[p++];
    const u16 = () => (bytes[p++] << 8) | bytes[p++];
    const u32 = () => ((bytes[p++] << 24) | (bytes[p++] << 16) | (bytes[p++] << 8) | bytes[p++]) >>> 0;
    const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[p++]); return s; };
    const vlq = () => { let v = 0, b; do { b = bytes[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80 && p < bytes.length); return v; };

    if (str(4) !== 'MThd') throw new Error('Not a MIDI file (missing MThd header)');
    const hlen = u32();
    const format = u16(), ntrks = u16(), division = u16();
    p = 8 + hlen;
    let ppq = division, smpteTicksPerSec = 0;
    if (division & 0x8000) {
      const fps = 256 - (division >> 8);
      smpteTicksPerSec = fps * (division & 0xff);
      ppq = 480;
    }

    const tempos = [], timeSigs = [], keySigs = [], rawNotes = [], names = [];
    for (let t = 0; t < ntrks && p < bytes.length; t++) {
      const id = str(4), len = u32();
      const end = p + len;
      if (id !== 'MTrk') { p = end; continue; }
      let tick = 0, status = 0;
      const open = new Map();
      const program = new Array(16).fill(0);
      while (p < end) {
        tick += vlq();
        let b = bytes[p];
        if (b & 0x80) { status = b; p++; } else if (!status) { p++; continue; }
        const type = status & 0xf0, ch = status & 0x0f;
        if (status === 0xff) {
          const mt = u8(), ml = vlq(), ms = p;
          if (mt === 0x51 && ml === 3) tempos.push({ tick, usPerQuarter: (bytes[p] << 16) | (bytes[p + 1] << 8) | bytes[p + 2] });
          else if (mt === 0x58 && ml >= 2) timeSigs.push({ tick, num: bytes[p], den: Math.pow(2, bytes[p + 1]) });
          else if (mt === 0x59 && ml >= 2) keySigs.push({ tick, sf: (bytes[p] << 24) >> 24, minor: bytes[p + 1] === 1 });
          else if (mt === 0x03) { let s = ''; for (let i = 0; i < ml; i++) s += String.fromCharCode(bytes[p + i]); names.push(s); }
          p = ms + ml;
          status = 0;
        } else if (status === 0xf0 || status === 0xf7) {
          p += vlq();
          status = 0;
        } else if (type === 0x90 || type === 0x80) {
          const note = u8(), vel = u8();
          const key = ch * 128 + note;
          if (type === 0x90 && vel > 0) {
            if (!open.has(key)) open.set(key, []);
            open.get(key).push({ tick, vel, program: program[ch] });
          } else {
            const q = open.get(key);
            if (q && q.length) {
              const on = q.shift();
              rawNotes.push({ midi: note, startTick: on.tick, endTick: Math.max(tick, on.tick + 1), velocity: on.vel / 127, channel: ch, track: t, program: on.program });
            }
          }
        } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
          p += 2;
        } else if (type === 0xc0) {
          program[ch] = u8();
        } else if (type === 0xd0) {
          p += 1;
        } else {
          p++;
        }
      }
      for (const [key, q] of open) for (const on of q) rawNotes.push({ midi: key % 128, startTick: on.tick, endTick: tick, velocity: on.vel / 127, channel: Math.floor(key / 128), track: t, program: on.program });
      p = end;
    }

    tempos.sort((a, b) => a.tick - b.tick);
    if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, usPerQuarter: 500000 });
    // tempo map → seconds
    const segs = [];
    let acc = 0;
    for (let i = 0; i < tempos.length; i++) {
      const tp = tempos[i];
      if (i > 0) acc += ((tp.tick - tempos[i - 1].tick) * tempos[i - 1].usPerQuarter) / 1e6 / ppq;
      segs.push({ tick: tp.tick, sec: acc, us: tp.usPerQuarter });
    }
    const tickToSec = (tick) => {
      if (smpteTicksPerSec) return tick / smpteTicksPerSec;
      let lo = 0;
      for (let i = 0; i < segs.length; i++) if (segs[i].tick <= tick) lo = i; else break;
      const s = segs[lo];
      return s.sec + ((tick - s.tick) * s.us) / 1e6 / ppq;
    };
    const notes = rawNotes
      .map((n) => ({ midi: n.midi, start: tickToSec(n.startTick), end: tickToSec(n.endTick), velocity: n.velocity, channel: n.channel, track: n.track, program: n.program || 0, startTick: n.startTick }))
      .sort((a, b) => a.start - b.start || a.midi - b.midi);
    const lastTick = rawNotes.reduce((m, n) => Math.max(m, n.endTick), 0);
    timeSigs.sort((a, b) => a.tick - b.tick);
    return {
      format, ppq, notes, names,
      tempos: segs.map((s) => ({ time: s.sec, tick: s.tick, bpm: 60e6 / s.us })),
      timeSigs: timeSigs.map((t) => ({ time: tickToSec(t.tick), tick: t.tick, num: t.num, den: t.den })),
      keySigs: keySigs.map((k) => ({ time: tickToSec(k.tick), sf: k.sf, minor: k.minor })),
      duration: notes.reduce((m, n) => Math.max(m, n.end), 0),
      tickToSec, lastTick,
    };
  }

  // ---------- Instrument families (General MIDI) ----------
  const FAMILIES = {
    keys: { name: 'Piano & keys', icon: '🎹', voice: 'piano' },
    organ: { name: 'Organ', icon: '🎛️', voice: 'organ' },
    guitar: { name: 'Guitar', icon: '🎸', voice: 'guitar' },
    electric: { name: 'Electric guitar', icon: '⚡', voice: 'electric' },
    bass: { name: 'Bass', icon: '🎸', voice: 'bass' },
    strings: { name: 'Strings & pads', icon: '🎻', voice: 'strings' },
    vocals: { name: 'Vocals & choir', icon: '🎤', voice: 'voice' },
    lead: { name: 'Brass & lead', icon: '🎺', voice: 'trumpet' },
    winds: { name: 'Woodwinds & flutes', icon: '🪈', voice: 'organ' },
    drums: { name: 'Drums', icon: '🥁', voice: 'drums' },
  };
  function familyOf(note) {
    if (note.channel === 9) return 'drums';
    const p = note.program || 0;
    if (p < 16) return 'keys';
    if (p < 24) return 'organ';
    if (p < 26) return 'guitar';
    if (p < 32) return 'electric';
    if (p < 40) return 'bass';
    if (p >= 52 && p <= 54) return 'vocals';
    if (p < 56) return 'strings';
    if (p < 64) return 'lead';
    if (p < 80) return 'winds';
    if (p < 88) return 'lead';
    if (p < 104) return 'strings';
    return 'keys';
  }
  /** Programs used when the app writes MIDI for a voice. */
  const VOICE_PROGRAM = { piano: 0, organ: 16, guitar: 25, electric: 29, bass: 33, strings: 48, voice: 52, trumpet: 56 };

  // ---------- Synthesis ----------
  function makeRand(seed) {
    return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  }

  const tableCache = {};
  /** One-cycle wavetable from harmonic amplitudes. */
  function wavetable(name, amps) {
    if (tableCache[name]) return tableCache[name];
    const N = 2048, t = new Float32Array(N + 1);
    for (let i = 0; i <= N; i++) {
      let v = 0;
      for (let h = 0; h < amps.length; h++) v += amps[h] * Math.sin((2 * Math.PI * (h + 1) * i) / N);
      t[i] = v;
    }
    let mx = 0;
    for (let i = 0; i <= N; i++) mx = Math.max(mx, Math.abs(t[i]));
    for (let i = 0; i <= N; i++) t[i] /= mx;
    return (tableCache[name] = t);
  }

  function karplus(out, start, f, held, sr, vel, rand, o) {
    const len = Math.min(out.length - start, Math.ceil((held + (o.tail || 0.25)) * sr));
    if (len <= 0) return;
    const P = sr / f - 0.5, M = Math.ceil(P) + 4, d = new Float32Array(M), excite = Math.ceil(P);
    const bright = o.bright != null ? o.bright : 0.35 + 0.5 * vel;
    const damp = (o.damp || 0.996) - Math.min(0.01, f / 200000);
    const relStart = Math.floor(held * sr), relK = Math.exp(-1 / ((o.release || 0.05) * sr));
    let lp = 0, env = 1;
    const drive = o.drive || 0, sub = o.sub || 0, subInc = (2 * Math.PI * f) / sr;
    for (let i = 0; i < len; i++) {
      let y;
      if (i < excite) { lp += bright * (rand() - lp); y = lp; }
      else {
        const r = i - P, i0 = Math.floor(r), fr = r - i0;
        const a = d[i0 % M], b = d[(i0 + 1) % M], c = d[((i0 - 1) % M + M) % M];
        y = damp * 0.5 * ((a + (b - a) * fr) + (c + (a - c) * fr));
      }
      d[i % M] = y;
      if (i > relStart) env *= relK;
      let v = y;
      if (sub) v += sub * Math.sin(subInc * i) * Math.exp(-i / sr / 1.2) * (i < 64 ? i / 64 : 1);
      if (drive) v = Math.tanh(v * drive) / Math.tanh(drive);
      out[start + i] += v * vel * (o.gain || 0.5) * env;
    }
  }

  function additivePiano(out, start, f, held, sr, vel) {
    const tau = Math.max(0.35, Math.min(4, 1.6 * Math.sqrt(261.6 / f)));
    const rel = 0.14;
    const len = Math.min(out.length - start, Math.ceil((held + rel) * sr));
    const harmonics = f > 2000 ? 2 : f > 1000 ? 4 : 7;
    const hs = [];
    for (let h = 1; h <= harmonics; h++) {
      const hf = f * h * Math.sqrt(1 + 0.0004 * h * h);
      if (hf > sr / 2.2) break;
      const w = (2 * Math.PI * hf) / sr;
      const decay = Math.exp(-(1 + h * 0.6) / tau / sr);
      hs.push({ amp: Math.pow(h, -1.25) * (h === 1 ? 1 : 0.55 + 0.45 * vel), cr: Math.cos(w) * decay, ci: Math.sin(w) * decay, re: 1, im: 0 });
    }
    const heldS = held * sr, attack = 0.004 * sr, relK = Math.exp(-1 / (rel * sr * 0.35));
    let relEnv = 1;
    for (let i = 0; i < len; i++) {
      let s = 0;
      for (let h = 0; h < hs.length; h++) {
        const o = hs[h];
        const re = o.re * o.cr - o.im * o.ci;
        o.im = o.re * o.ci + o.im * o.cr;
        o.re = re;
        s += o.amp * o.im;
      }
      let env = i < attack ? i / attack : 1;
      if (i > heldS) { relEnv *= relK; env *= relEnv; }
      out[start + i] += s * env * vel * 0.3;
    }
  }

  /** Sustained wavetable voices: trumpet, strings, organ. */
  function sustained(out, start, f, held, sr, vel, voice) {
    const spec = {
      trumpet: { table: wavetable('brass', [1, 0.9, 0.8, 0.7, 0.55, 0.45, 0.35, 0.28, 0.2, 0.15, 0.1, 0.07]), dull: wavetable('brass-soft', [1, 0.6, 0.35, 0.2, 0.1, 0.05]), attack: 0.035, release: 0.08, vib: 0.006, gain: 0.32 },
      strings: { table: wavetable('saw', Array.from({ length: 16 }, (_, h) => 1 / (h + 1))), dull: wavetable('saw-soft', [1, 0.4, 0.2, 0.1]), attack: 0.14, release: 0.3, vib: 0.004, gain: 0.18 },
      voice: { table: wavetable('voice-ah', [1, 0.55, 0.35, 0.5, 0.42, 0.18, 0.1, 0.12, 0.08, 0.05]), dull: wavetable('voice-oo', [1, 0.3, 0.1, 0.05]), attack: 0.08, release: 0.15, vib: 0.012, gain: 0.3 },
      organ: { table: wavetable('organ', [1, 0.8, 0.0, 0.5, 0, 0.3, 0, 0.25]), dull: wavetable('organ', [1, 0.8, 0.0, 0.5, 0, 0.3, 0, 0.25]), attack: 0.01, release: 0.06, vib: 0, gain: 0.2 },
    }[voice];
    const rel = spec.release, len = Math.min(out.length - start, Math.ceil((held + rel) * sr));
    const N = 2048, inc = (f * N) / sr, heldS = held * sr, att = spec.attack * sr;
    const mix = Math.min(1, Math.max(0, vel * 1.2 - 0.2)); // louder = brighter
    let ph = 0;
    const vibW = (2 * Math.PI * 5.2) / sr;
    for (let i = 0; i < len; i++) {
      const vibAmt = spec.vib * Math.min(1, Math.max(0, (i / sr - 0.3) * 2));
      ph += inc * (1 + vibAmt * Math.sin(vibW * i));
      if (ph >= N) ph -= N;
      const i0 = ph | 0, fr = ph - i0;
      const a = spec.table[i0] + (spec.table[i0 + 1] - spec.table[i0]) * fr;
      const b = spec.dull[i0] + (spec.dull[i0 + 1] - spec.dull[i0]) * fr;
      let env = i < att ? i / att : 1;
      if (i > heldS) env *= Math.max(0, 1 - (i - heldS) / (rel * sr));
      out[start + i] += (a * mix + b * (1 - mix)) * env * vel * spec.gain;
    }
  }

  function drum(out, start, midi, sr, vel, rand) {
    const put = (i, v) => { if (start + i < out.length) out[start + i] += v; };
    if (midi === 35 || midi === 36) { // kick: pitch-swept sine
      let ph = 0;
      for (let i = 0; i < 0.35 * sr; i++) { const t = i / sr; ph += (2 * Math.PI * (50 + 110 * Math.exp(-t * 30))) / sr; put(i, Math.sin(ph) * Math.exp(-t * 9) * vel * 0.9); }
    } else if (midi === 38 || midi === 40 || midi === 37 || midi === 39) { // snare / clap
      let ph = 0, hp = 0, prev = 0;
      for (let i = 0; i < 0.25 * sr; i++) {
        const t = i / sr, n = rand();
        hp = 0.85 * (hp + n - prev); prev = n;
        ph += (2 * Math.PI * 190) / sr;
        put(i, (hp * 0.6 * Math.exp(-t * 18) + Math.sin(ph) * 0.35 * Math.exp(-t * 25)) * vel * 0.7);
      }
    } else if ([42, 44, 46, 49, 51, 52, 55, 57, 59].includes(midi)) { // hats / cymbals
      const dec = midi === 42 || midi === 44 ? 40 : midi === 46 ? 8 : 3;
      let hp = 0, prev = 0;
      for (let i = 0; i < Math.min(1.5, 5 / dec) * sr; i++) { const n = rand(); hp = 0.6 * (hp + n - prev); prev = n; put(i, hp * Math.exp(-(i / sr) * dec) * vel * 0.28); }
    } else { // toms & others
      const f0 = 80 + (midi - 41) * 12;
      let ph = 0;
      for (let i = 0; i < 0.3 * sr; i++) { const t = i / sr; ph += (2 * Math.PI * f0 * (1 + 0.5 * Math.exp(-t * 20))) / sr; put(i, Math.sin(ph) * Math.exp(-t * 10) * vel * 0.6); }
    }
  }

  /**
   * Render notes to mono PCM. Each note's voice comes from note.voice, its GM program/channel,
   * or opts.instrument. opts.normalize=false keeps absolute levels (needed for stems).
   * opts.classic uses the simple reference synth (test signals for the audio separator).
   */
  function renderNotes(notes, opts) {
    opts = opts || {};
    const sr = opts.sampleRate || 32000;
    const duration = opts.duration || notes.reduce((m, n) => Math.max(m, n.end), 0) + 2;
    const out = new Float32Array(Math.ceil(duration * sr));
    const rand = makeRand(12345);
    const instVoice = { piano: 'piano', guitar: 'guitar', electric: 'electric', bass: 'bass', trumpet: 'trumpet', voice: 'voice' }[opts.instrument] || 'piano';
    for (const n of notes) {
      const start = Math.floor(n.start * sr);
      if (start >= out.length) continue;
      const vel = 0.25 + 0.75 * (n.velocity == null ? 0.8 : n.velocity);
      const held = Math.max(0.05, n.end - n.start);
      const voice = n.voice || (n.channel === 9 ? 'drums' : opts.useProgram ? FAMILIES[familyOf(n)].voice : instVoice);
      if (PM.Voices && !opts.classic) { PM.Voices.addNote(out, start, PM.Voices.voiceOf(voice), n.midi, held, sr, Math.min(1, vel)); continue; }
      const f = 440 * Math.pow(2, (n.midi - 69) / 12);
      if (voice === 'drums') drum(out, start, n.midi, sr, vel, rand);
      else if (voice === 'guitar') karplus(out, start, f, held, sr, vel, rand, {});
      else if (voice === 'electric') karplus(out, start, f, held, sr, vel, rand, { damp: 0.998, drive: 2.2, gain: 0.32, bright: 0.6 });
      else if (voice === 'bass') karplus(out, start, f, held, sr, vel, rand, { damp: 0.9985, bright: 0.18, sub: 0.6, gain: 0.55, tail: 0.08, release: 0.03 });
      else if (voice === 'trumpet' || voice === 'strings' || voice === 'organ' || voice === 'voice') sustained(out, start, f, held, sr, vel, voice);
      else additivePiano(out, start, f, held, sr, vel);
    }
    if (opts.normalize !== false) {
      let peak = 0;
      for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
      if (peak > 0) { const g = 0.89 / peak; for (let i = 0; i < out.length; i++) out[i] *= g; }
    }
    return { data: out, sampleRate: sr };
  }

  /** Render each instrument family to its own stem (exact separation for MIDI). */
  function renderStems(notes, opts) {
    opts = opts || {};
    const sr = opts.sampleRate || 32000;
    const duration = notes.reduce((m, n) => Math.max(m, n.end), 0) + 2;
    const groups = new Map();
    for (const n of notes) {
      const fam = familyOf(n);
      if (!groups.has(fam)) groups.set(fam, []);
      groups.get(fam).push(n);
    }
    const stems = [];
    for (const [fam, ns] of groups) {
      const r = renderNotes(ns, { sampleRate: sr, duration, useProgram: true, normalize: false });
      stems.push({ id: fam, name: FAMILIES[fam].name, icon: FAMILIES[fam].icon, data: [r.data], notes: ns });
    }
    // common gain so the full mix peaks at ~0.89 while stems keep their balance
    const len = Math.ceil(duration * sr);
    let peak = 0;
    for (let i = 0; i < len; i++) { let s = 0; for (const st of stems) s += st.data[0][i]; peak = Math.max(peak, Math.abs(s)); }
    const g = peak > 0 ? 0.89 / peak : 1;
    for (const st of stems) { const d = st.data[0]; for (let i = 0; i < d.length; i++) d[i] *= g; }
    return { sampleRate: sr, length: len, stems };
  }

  /** 16-bit PCM WAV, mono or multi-channel (channels: Float32Array | Float32Array[]). */
  function encodeWav(channels, sr) {
    if (!Array.isArray(channels)) channels = [channels];
    const nc = channels.length, len = channels[0].length;
    const buf = new ArrayBuffer(44 + len * 2 * nc);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len * 2 * nc, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2 * nc, true); v.setUint16(32, 2 * nc, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, len * 2 * nc, true);
    let o = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nc; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return buf;
  }

  /**
   * Minimal SMF writer (format 0). Notes may carry channel, and opts.programs maps
   * channel → GM program (or note.voice picks the program automatically).
   */
  function writeMidi(notes, opts) {
    opts = opts || {};
    const ppq = 480, bpm = opts.bpm || 120, num = opts.num || 4, den = opts.den || 4;
    const secToTick = (s) => Math.round((s * bpm * ppq) / 60);
    const programs = Object.assign({}, opts.programs || {});
    for (const n of notes) if (n.voice && VOICE_PROGRAM[n.voice] != null && programs[n.channel || 0] == null) programs[n.channel || 0] = VOICE_PROGRAM[n.voice];
    const evs = [];
    for (const n of notes) {
      evs.push({ tick: secToTick(n.start), data: [0x90 | (n.channel || 0), n.midi, Math.max(1, Math.round((n.velocity || 0.8) * 127))] });
      evs.push({ tick: secToTick(n.end), data: [0x80 | (n.channel || 0), n.midi, 0] });
    }
    evs.sort((a, b) => a.tick - b.tick || (a.data[0] & 0xf0) - (b.data[0] & 0xf0));
    const body = [];
    const vlq = (v) => { const s = [v & 0x7f]; while ((v >>= 7)) s.unshift((v & 0x7f) | 0x80); for (const x of s) body.push(x); };
    const us = Math.round(60e6 / bpm);
    vlq(0); body.push(0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255);
    vlq(0); body.push(0xff, 0x58, 4, num, Math.log2(den), 24, 8);
    if (opts.key) { vlq(0); body.push(0xff, 0x59, 2, opts.key.sf & 255, opts.key.minor ? 1 : 0); }
    for (const ch of Object.keys(programs)) { vlq(0); body.push(0xc0 | +ch, programs[ch]); }
    let last = 0;
    for (const e of evs) { vlq(e.tick - last); last = e.tick; for (const x of e.data) body.push(x); }
    vlq(0); body.push(0xff, 0x2f, 0);
    const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, ppq >> 8, ppq & 255, 0x4d, 0x54, 0x72, 0x6b,
      (body.length >>> 24) & 255, (body.length >>> 16) & 255, (body.length >>> 8) & 255, body.length & 255];
    const out = new Uint8Array(head.length + body.length);
    out.set(head, 0);
    out.set(body, head.length);
    return out.buffer;
  }

  PM.Midi = { parseMidi, renderNotes, renderStems, encodeWav, writeMidi, familyOf, FAMILIES, VOICE_PROGRAM };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Midi;
})(typeof self !== 'undefined' ? self : globalThis);
