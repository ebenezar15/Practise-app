/* Cadenza — Standard MIDI File parser, lightweight offline synthesiser
 * (additive piano / Karplus-Strong guitar) and WAV encoder. */
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
            open.get(key).push({ tick, vel });
          } else {
            const q = open.get(key);
            if (q && q.length) {
              const on = q.shift();
              rawNotes.push({ midi: note, startTick: on.tick, endTick: Math.max(tick, on.tick + 1), velocity: on.vel / 127, channel: ch, track: t });
            }
          }
        } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
          p += 2;
        } else if (type === 0xc0 || type === 0xd0) {
          p += 1;
        } else {
          p++;
        }
      }
      for (const [key, q] of open) for (const on of q) rawNotes.push({ midi: key % 128, startTick: on.tick, endTick: tick, velocity: on.vel / 127, channel: Math.floor(key / 128), track: t });
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
      .map((n) => ({ midi: n.midi, start: tickToSec(n.startTick), end: tickToSec(n.endTick), velocity: n.velocity, channel: n.channel, track: n.track, startTick: n.startTick }))
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

  // ---------- Synthesis ----------
  function renderNotes(notes, opts) {
    opts = opts || {};
    const sr = opts.sampleRate || 32000;
    const instrument = opts.instrument || 'piano';
    const duration = notes.reduce((m, n) => Math.max(m, n.end), 0) + 2;
    const out = new Float32Array(Math.ceil(duration * sr));
    let seed = 12345;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
    for (const n of notes) {
      if (n.channel === 9) continue;
      const f = 440 * Math.pow(2, (n.midi - 69) / 12);
      const start = Math.floor(n.start * sr);
      const vel = 0.25 + 0.75 * (n.velocity == null ? 0.8 : n.velocity);
      const held = Math.max(0.05, n.end - n.start);
      if (instrument === 'guitar') {
        const len = Math.min(out.length - start, Math.ceil((held + 0.25) * sr));
        const P = sr / f - 0.5;
        const M = Math.ceil(P) + 4;
        const d = new Float32Array(M);
        const excite = Math.ceil(P);
        const bright = 0.35 + 0.5 * vel;
        let lp = 0;
        const damp = 0.996 - Math.min(0.01, f / 200000);
        const relStart = Math.floor(held * sr);
        for (let i = 0; i < len; i++) {
          let y;
          if (i < excite) { lp += bright * (rand() - lp); y = lp; }
          else {
            const r = i - P;
            const i0 = Math.floor(r), fr = r - i0;
            const a = d[i0 % M], b = d[(i0 + 1) % M], c = d[((i0 - 1) % M + M) % M];
            y = damp * 0.5 * ((a + (b - a) * fr) + (c + (a - c) * fr));
          }
          d[i % M] = y;
          const env = i > relStart ? Math.exp(-(i - relStart) / (0.05 * sr)) : 1;
          out[start + i] += y * vel * 0.5 * env;
        }
      } else {
        const tau = Math.max(0.35, Math.min(4, 1.6 * Math.sqrt(261.6 / f)));
        const rel = 0.14;
        const len = Math.min(out.length - start, Math.ceil((held + rel) * sr));
        const harmonics = f > 2000 ? 2 : f > 1000 ? 4 : 7;
        // recursive phasors: each harmonic rotates & decays per sample (no per-sample sin/exp)
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
    }
    let peak = 0;
    for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; }
    if (peak > 0) { const g = 0.89 / peak; for (let i = 0; i < out.length; i++) out[i] *= g; }
    return { data: out, sampleRate: sr };
  }

  /** 16-bit mono PCM WAV. */
  function encodeWav(data, sr) {
    const buf = new ArrayBuffer(44 + data.length * 2);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, data.length * 2, true);
    for (let i = 0; i < data.length; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buf;
  }

  /** Minimal SMF writer (format 0) — used for exporting & for tests. */
  function writeMidi(notes, opts) {
    opts = opts || {};
    const ppq = 480, bpm = opts.bpm || 120, num = opts.num || 4, den = opts.den || 4;
    const secToTick = (s) => Math.round((s * bpm * ppq) / 60);
    const evs = [];
    for (const n of notes) {
      evs.push({ tick: secToTick(n.start), data: [0x90 | (n.channel || 0), n.midi, Math.round((n.velocity || 0.8) * 127)] });
      evs.push({ tick: secToTick(n.end), data: [0x80 | (n.channel || 0), n.midi, 0] });
    }
    evs.sort((a, b) => a.tick - b.tick || (a.data[0] & 0xf0) - (b.data[0] & 0xf0));
    const body = [];
    const vlq = (v) => { const s = [v & 0x7f]; while ((v >>= 7)) s.unshift((v & 0x7f) | 0x80); body.push(...s); };
    const us = Math.round(60e6 / bpm);
    vlq(0); body.push(0xff, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255);
    vlq(0); body.push(0xff, 0x58, 4, num, Math.log2(den), 24, 8);
    let last = 0;
    for (const e of evs) { vlq(e.tick - last); last = e.tick; body.push(...e.data); }
    vlq(0); body.push(0xff, 0x2f, 0);
    const out = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, ppq >> 8, ppq & 255, 0x4d, 0x54, 0x72, 0x6b,
      (body.length >>> 24) & 255, (body.length >>> 16) & 255, (body.length >>> 8) & 255, body.length & 255, ...body];
    return new Uint8Array(out).buffer;
  }

  PM.Midi = { parseMidi, renderNotes, encodeWav, writeMidi };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Midi;
})(typeof self !== 'undefined' ? self : globalThis);
