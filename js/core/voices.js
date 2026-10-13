/* Overture — instrument voices. Physically-inspired synthesis that renders one note to PCM so
 * it can be cached and played like a sample (offline, no downloads, no licences):
 *   piano    — inharmonic hammered strings: 1–3 detuned strings per note, two-stage decay,
 *              strike-position spectrum, velocity brightness and hammer noise
 *   guitar   — extended Karplus–Strong: pluck position, tuned all-pass loop, steel-string
 *              brightness and a resonant wooden body
 *   electric — brighter, longer string through a pickup, light valve-amp drive and cabinet
 *   bass     — warm finger-plucked long string with a solid fundamental
 *   trumpet  — brass model: lip "scoop" into pitch, brightness that grows with breath,
 *              bell resonance, delayed vibrato and breath noise
 *   voice    — formant singer ("ah", "oo", "ee") with a glottal source, vibrato and breath
 *   strings  — bowed ensemble pad (three detuned sections)
 *   organ    — drawbar organ with key click and a gentle rotary shimmer
 *   drums    — kick, snare, hats, ride, crash, toms, rim, clap and hand percussion
 * Pure JS (no Web Audio) so it renders in tests, in backing tracks and in the browser. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const TAU = Math.PI * 2;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }

  // ---- RBJ biquad
  function biquad(type, f, q, sr, gainDb) {
    const w = TAU * clamp(f, 10, sr * 0.49) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * (q || 0.707));
    const A = Math.pow(10, (gainDb || 0) / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'highpass') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else if (type === 'bandpass') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
    else { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; } // peaking
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
  }
  function bq(c, x) { const y = c.b0 * x + c.b1 * c.x1 + c.b2 * c.x2 - c.a1 * c.y1 - c.a2 * c.y2; c.x2 = c.x1; c.x1 = x; c.y2 = c.y1; c.y1 = y; return y; }
  function filterAll(buf, c) { for (let i = 0; i < buf.length; i++) buf[i] = bq(c, buf[i]); return buf; }
  function fadeOut(buf, sec, sr) { const n = Math.min(buf.length, Math.floor(sec * sr)); for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n; return buf; }

  // ------------------------------------------------------------------ piano
  function piano(midi, o) {
    const sr = o.sr, vel = o.vel, f = mtof(midi), r = rng(midi * 7919 + 13);
    const B = clamp(0.00015 * Math.pow(2, (midi - 60) / 18), 0.00003, 0.002), anchor = Math.sqrt(1 + 4 * B);
    const tau2 = clamp(1.6 * Math.pow(2, -(midi - 60) / 20), 0.25, 6), tau1 = tau2 * 0.22, w1 = 0.55;
    const len = Math.floor(Math.min(o.maxLen || 3.2, tau2 * 4.5 + 0.1) * sr);
    const out = new Float32Array(len);
    const nStr = midi < 32 ? 1 : midi < 46 ? 2 : 3, det = [0, 0.75, -0.6];
    const fc = 500 + 5200 * Math.pow(vel, 1.4) + f * 2.5, tilt = 0.85 + 0.8 * (1 - vel);
    const parts = [];
    let norm = 0;
    for (let n = 1; n <= 40; n++) {
      const fn = (n * f * Math.sqrt(1 + B * n * n)) / anchor;
      if (fn > Math.min(sr * 0.45, 14000)) break;
      let a = Math.pow(n, -tilt) * (0.12 + Math.abs(Math.sin(Math.PI * n / 8.3))) / (1 + Math.pow(fn / fc, 2));
      if (a < 0.004) continue;
      norm += a;
      const t2 = tau2 / (1 + (n - 1) * 0.12 + fn / 3500), t1 = Math.min(t2, tau1 / (1 + (n - 1) * 0.1));
      const strings = n <= 6 ? nStr : 1;
      for (let s = 0; s < strings; s++) {
        const ff = fn * Math.pow(2, (det[s] * (1 + 0.3 * r())) / 1200), w = TAU * ff / sr;
        parts.push({ amp: a / strings, c: Math.cos(w), s: Math.sin(w), re: Math.cos(r() * 0.3), im: Math.sin(r() * 0.3), e1: w1, e2: 1 - w1, k1: Math.exp(-1 / (t1 * sr)), k2: Math.exp(-1 / (t2 * sr)) });
      }
    }
    for (const p of parts) {
      let re = p.re, im = p.im, e1 = p.e1, e2 = p.e2;
      const amp = p.amp, c = p.c, s = p.s, k1 = p.k1, k2 = p.k2;
      for (let i = 0; i < len; i++) {
        const nr = re * c - im * s; im = re * s + im * c; re = nr;
        out[i] += amp * im * (e1 + e2);
        e1 *= k1; e2 *= k2;
        if ((i & 1023) === 0 && (e1 + e2) * amp < 1e-5) break;
      }
    }
    // hammer felt thump + attack ramp
    const hl = Math.floor(0.012 * sr), lp = biquad('lowpass', 1500 + 3500 * vel, 0.7, sr);
    for (let i = 0; i < hl; i++) out[i] += bq(lp, r()) * 0.06 * vel * norm * Math.exp(-i / (0.0035 * sr));
    const att = Math.floor(0.0015 * sr);
    for (let i = 0; i < att; i++) out[i] *= i / att;
    const g = (0.28 + 0.5 * vel) / Math.max(0.5, norm);
    for (let i = 0; i < len; i++) out[i] *= g;
    return fadeOut(out, 0.25, sr);
  }

  // ------------------------------------------------------------------ plucked strings (KS)
  function pluck(midi, o, kind) {
    const sr = o.sr, vel = o.vel, f = mtof(midi), r = rng(midi * 104729 + (kind === 'bass' ? 3 : kind === 'electric' ? 2 : 1));
    const spec = {
      guitar: { t60: 3.2 * Math.pow(2, -(midi - 40) / 26), S: 0.36 - 0.12 * vel, beta: 0.14, max: 3.2, gain: 0.55 },
      electric: { t60: 4.5 * Math.pow(2, -(midi - 40) / 30), S: 0.28 - 0.1 * vel, beta: 0.11, max: 4, gain: 0.5 },
      bass: { t60: 5.5 * Math.pow(2, -(midi - 28) / 30), S: 0.45, beta: 0.22, max: 4, gain: 0.8 },
    }[kind];
    const len = Math.floor(Math.min(o.maxLen || spec.max, spec.t60 * 1.1 + 0.1) * sr);
    const out = new Float32Array(len);
    const P = sr / f, S = clamp(spec.S, 0.05, 0.5);
    const D = P - S, N = Math.max(2, Math.floor(D - 0.5)), d = D - N, C = (1 - d) / (1 + d);
    const g = Math.pow(10, -3 / (spec.t60 * f));
    // excitation: velocity-filtered noise, pluck-position comb, no DC
    const buf = new Float32Array(N), ex = new Float32Array(N);
    const a = kind === 'bass' ? 0.12 + 0.2 * vel : 0.35 + 0.55 * vel;
    let lpv = 0;
    for (let i = 0; i < N; i++) { lpv += a * (r() - lpv); ex[i] = lpv; }
    const pd = Math.max(1, Math.round(spec.beta * N));
    let mean = 0;
    for (let i = 0; i < N; i++) { buf[i] = ex[i] - (i >= pd ? ex[i - pd] : 0); mean += buf[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) buf[i] -= mean;
    let idx = 0, prev = 0, ax = 0, ay = 0;
    for (let i = 0; i < len; i++) {
      const x = buf[idx];
      const lpo = g * ((1 - S) * x + S * prev); prev = x;
      const ap = C * lpo + ax - C * ay; ax = lpo; ay = ap;
      buf[idx] = ap;
      idx = idx + 1 === N ? 0 : idx + 1;
      out[i] = x;
    }
    if (kind === 'guitar') {
      // wooden body: air & top resonances + a touch of pick click
      const b1 = biquad('bandpass', 105, 5, sr), b2 = biquad('bandpass', 215, 4, sr), b3 = biquad('bandpass', 410, 3, sr), hs = biquad('peaking', 3000, 0.8, sr, 3);
      for (let i = 0; i < len; i++) { const x = out[i]; out[i] = bq(hs, x) * 0.9 + bq(b1, x) * 0.3 + bq(b2, x) * 0.25 + bq(b3, x) * 0.2; }
      const cl = Math.floor(0.003 * sr), hp = biquad('highpass', 2500, 0.7, sr);
      for (let i = 0; i < cl; i++) out[i] += bq(hp, r()) * 0.12 * vel * (1 - i / cl);
    } else if (kind === 'electric') {
      const drive = 1.6 + vel, td = Math.tanh(drive), hp = biquad('highpass', 90, 0.7, sr), cab = biquad('lowpass', 4800, 0.9, sr), pk = biquad('peaking', 1600, 1, sr, 2.5);
      let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
      const k = peak > 0 ? 1 / peak : 1;
      for (let i = 0; i < len; i++) out[i] = bq(cab, bq(pk, bq(hp, Math.tanh(out[i] * k * drive) / td))) * 0.6;
    } else {
      // warm amp tone with a solid fundamental (a resonant boost at the note keeps it perfectly periodic)
      const lp = biquad('lowpass', 1600, 0.7, sr), fund = biquad('peaking', f, 0.9, sr, 12), lo = biquad('peaking', 80, 0.8, sr, 3);
      for (let i = 0; i < len; i++) out[i] = bq(lo, bq(fund, bq(lp, out[i])));
    }
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    const gg = peak > 0 ? (spec.gain * (0.35 + 0.65 * vel)) / peak : 1;
    for (let i = 0; i < len; i++) out[i] *= gg;
    return fadeOut(out, 0.2, sr);
  }

  // ------------------------------------------------------------------ additive helpers for sustained voices
  /** Sum harmonics 1..N with amplitudes amps[] at phase ph using the Chebyshev recursion. */
  function harmonicSum(ph, amps, n) {
    const s1 = Math.sin(ph), c2 = 2 * Math.cos(ph);
    let sPrev = 0, sCur = s1, sum = amps[0] * s1;
    for (let k = 1; k < n; k++) { const sNext = c2 * sCur - sPrev; sPrev = sCur; sCur = sNext; sum += amps[k] * sCur; }
    return sum;
  }
  function envAR(t, held, att, rel) { const a = t < att ? Math.pow(t / att, 1.5) : 1; return t > held ? a * Math.max(0, 1 - (t - held) / rel) : a; }

  function trumpet(midi, o) {
    const sr = o.sr, vel = o.vel, f = mtof(midi), held = o.held, rel = 0.08, r = rng(midi * 31 + 5);
    const len = Math.floor((held + rel + 0.02) * sr), out = new Float32Array(len);
    const N = Math.max(1, Math.min(24, Math.floor((sr * 0.45) / f))), amps = new Float32Array(N);
    const bs = 0.42 + 0.33 * vel;
    const noiseF = biquad('bandpass', 1600, 0.9, sr);
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      if ((i & 63) === 0) {
        const b = bs * (1 - Math.exp(-t / 0.045)) * (1 + 0.12 * Math.exp(-Math.pow((t - 0.06) / 0.03, 2))) * (t > held ? Math.max(0.3, 1 - (t - held) / rel) : 1);
        let sum = 0;
        for (let k = 0; k < N; k++) {
          const fk = (k + 1) * f;
          const a = Math.pow(b, k) * (1 + 0.9 * Math.exp(-Math.pow((fk - 1300) / 650, 2))) / (1 + Math.pow(fk / 4800, 4));
          amps[k] = a; sum += a;
        }
        for (let k = 0; k < N; k++) amps[k] /= sum || 1;
      }
      const vib = 0.0045 * clamp((t - 0.38) / 0.3, 0, 1) * Math.sin(TAU * 5.3 * t);
      const scoop = -0.022 * Math.exp(-t / 0.028);
      ph += TAU * f * (1 + vib + scoop) / sr;
      if (ph > TAU) ph -= TAU;
      const env = envAR(t, held, 0.03, rel) * (1 + 0.15 * Math.exp(-Math.pow((t - 0.045) / 0.02, 2)));
      const breath = bq(noiseF, r()) * (0.02 + 0.08 * Math.exp(-t / 0.04));
      out[i] = (harmonicSum(ph, amps, N) + breath) * env * (0.3 + 0.45 * vel);
    }
    return out;
  }

  const VOWELS = {
    ah: { m: [[730, 80, 1], [1090, 90, 0.5], [2440, 120, 0.28], [3400, 130, 0.18], [4200, 140, 0.08]], f: [[850, 90, 1], [1220, 100, 0.45], [2810, 120, 0.3], [3500, 130, 0.2], [4500, 140, 0.08]] },
    oo: { m: [[300, 60, 1], [870, 80, 0.25], [2240, 100, 0.08], [3300, 120, 0.05], [4200, 140, 0.03]], f: [[370, 60, 1], [950, 80, 0.25], [2670, 110, 0.08], [3500, 120, 0.05], [4500, 140, 0.03]] },
    ee: { m: [[270, 60, 1], [2290, 100, 0.35], [3010, 120, 0.3], [3400, 130, 0.2], [4200, 140, 0.08]], f: [[310, 60, 1], [2790, 100, 0.35], [3310, 120, 0.3], [4000, 130, 0.2], [4950, 140, 0.08]] },
  };
  function singer(midi, o) {
    const sr = o.sr, vel = o.vel, f = mtof(midi), held = o.held, rel = 0.16, r = rng(midi * 17 + 11);
    const len = Math.floor((held + rel + 0.02) * sr), out = new Float32Array(len);
    const fm = (VOWELS[o.vowel] || VOWELS.ah)[f < 200 ? 'm' : 'f'];
    const N = Math.max(1, Math.min(30, Math.floor((sr * 0.45) / f))), amps = new Float32Array(N);
    const tilt = 1.25 - 0.35 * vel;
    const breathF = biquad('highpass', 2500, 0.7, sr);
    let ph = 0, jit = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      if ((i & 127) === 0) {
        jit = jit * 0.9 + r() * 0.0006;
        const fv = f * (1 + 0.012 * clamp((t - 0.32) / 0.4, 0, 1) * Math.sin(TAU * 5.6 * t));
        let sum = 0;
        for (let k = 0; k < N; k++) {
          const fk = (k + 1) * fv;
          let G = 0.02;
          for (const [F, BW, A] of fm) G += A / (1 + Math.pow((fk - F) / (BW / 2 + fv * 0.15), 2));
          amps[k] = Math.pow(k + 1, -tilt) * G; sum += amps[k];
        }
        for (let k = 0; k < N; k++) amps[k] /= sum || 1;
      }
      const vib = 0.012 * clamp((t - 0.32) / 0.4, 0, 1) * Math.sin(TAU * 5.6 * t);
      ph += TAU * f * (1 + vib + jit - 0.012 * Math.exp(-t / 0.05)) / sr;
      if (ph > TAU) ph -= TAU;
      const env = envAR(t, held, 0.09, rel) * (1 + 0.04 * Math.sin(TAU * 5.6 * t) * clamp((t - 0.32) / 0.4, 0, 1));
      out[i] = (harmonicSum(ph, amps, N) * 0.9 + bq(breathF, r()) * 0.03) * env * (0.3 + 0.4 * vel);
    }
    return out;
  }

  function strings(midi, o) {
    const sr = o.sr, vel = o.vel, f = mtof(midi), held = o.held, rel = 0.35;
    const len = Math.floor((held + rel + 0.02) * sr), out = new Float32Array(len);
    const N = Math.max(1, Math.min(18, Math.floor((sr * 0.45) / (f * 1.01))));
    const amps = new Float32Array(N);
    for (let k = 0; k < N; k++) amps[k] = (1 / (k + 1)) / (1 + Math.pow(((k + 1) * f) / (1800 + 1500 * vel), 2));
    const det = [0, 0.0045, -0.004], phs = [0.1, 1.7, 3.3];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let s = 0;
      for (let v = 0; v < 3; v++) { phs[v] += TAU * f * (1 + det[v] + 0.002 * Math.sin(TAU * (4.8 + v * 0.7) * t + v)) / sr; if (phs[v] > TAU) phs[v] -= TAU; s += harmonicSum(phs[v], amps, N); }
      out[i] = s * envAR(t, held, 0.22, rel) * (0.12 + 0.12 * vel);
    }
    return out;
  }

  function organ(midi, o) {
    const sr = o.sr, vel = o.vel, f = mtof(midi), held = o.held, rel = 0.06, r = rng(midi + 99);
    const len = Math.floor((held + rel + 0.02) * sr), out = new Float32Array(len);
    const bars = [[1, 1], [2, 0.7], [3, 0.4], [4, 0.45], [6, 0.18], [8, 0.12]].filter(([m]) => m * f < sr * 0.45);
    const ph = bars.map(() => 0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let s = 0;
      for (let k = 0; k < bars.length; k++) { ph[k] += TAU * f * bars[k][0] / sr; s += bars[k][1] * Math.sin(ph[k]); }
      const click = i < 0.004 * sr ? r() * 0.15 * (1 - i / (0.004 * sr)) : 0;
      out[i] = (s / 3.4 * (1 + 0.06 * Math.sin(TAU * 6.4 * t)) + click) * envAR(t, held, 0.006, rel) * (0.25 + 0.2 * vel);
    }
    return out;
  }

  // ------------------------------------------------------------------ drums
  const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
  function metal(t, scale) { let s = 0; for (const m of METAL) s += Math.sin(TAU * m * scale * t) > 0 ? 1 : -1; return s / 6; }
  function drum(id, o) {
    const sr = o.sr, vel = o.vel, r = rng((id.length * 7919 + id.charCodeAt(0) * 31) >>> 0);
    const L = { kick: 0.55, snare: 0.45, rim: 0.12, clap: 0.35, hhc: 0.12, hhp: 0.1, hho: 0.9, ride: 2.2, crash: 2.6, tomh: 0.6, tomm: 0.7, toml: 0.9, shaker: 0.16, tamb: 0.4, cowbell: 0.5, congah: 0.35, congal: 0.45, clave: 0.12, wood: 0.12, woodhi: 0.1 }[id] || 0.4;
    const len = Math.floor(L * sr), out = new Float32Array(len);
    const tone = (fn, dec, amp, sweep, sweepT) => { let ph = 0; for (let i = 0; i < len; i++) { const t = i / sr; ph += TAU * fn * (1 + (sweep || 0) * Math.exp(-t / (sweepT || 0.04))) / sr; out[i] += Math.sin(ph) * amp * Math.exp(-t / dec); } };
    const noise = (filters, dec, amp, att, delay) => { const fs = filters.map((x) => biquad(x[0], x[1], x[2] || 0.7, sr)); const d0 = Math.floor((delay || 0) * sr); for (let i = d0; i < len; i++) { const t = (i - d0) / sr; let x = r(); for (const c of fs) x = bq(c, x); out[i] += x * amp * Math.exp(-t / dec) * (att ? Math.min(1, t / att) : 1); } };
    const metalHit = (scale, filters, dec, amp) => { const fs = filters.map((x) => biquad(x[0], x[1], x[2] || 0.7, sr)); for (let i = 0; i < len; i++) { const t = i / sr; let x = metal(t, scale) * 0.7 + r() * 0.3; for (const c of fs) x = bq(c, x); out[i] += x * amp * Math.exp(-t / dec); } };
    switch (id) {
      case 'kick': {
        let ph = 0;
        for (let i = 0; i < len; i++) { const t = i / sr; ph += TAU * (50 + 110 * Math.exp(-t / 0.03)) / sr; out[i] = Math.sin(ph) * Math.exp(-t / 0.15) * (i < 0.001 * sr ? i / (0.001 * sr) : 1); }
        noise([['highpass', 1800], ['lowpass', 7000]], 0.0028, 0.55 * vel);
        for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * 1.6) * 0.95;
        break;
      }
      case 'snare': tone(185, 0.055, 0.55, 0.15, 0.02); tone(330, 0.04, 0.3, 0.1, 0.02); noise([['highpass', 1200], ['lowpass', 9500]], 0.12 + 0.04 * vel, 0.75); noise([['bandpass', 4500, 1.2]], 0.06, 0.25); break;
      case 'rim': tone(1700, 0.012, 0.6); noise([['bandpass', 1900, 4]], 0.02, 1.2); tone(520, 0.02, 0.25); break;
      case 'clap': [0, 0.011, 0.023].forEach((dl) => noise([['bandpass', 1250, 1.6]], 0.007, 1.3, 0.0005, dl)); noise([['bandpass', 1150, 1.2]], 0.11, 0.9, 0.001, 0.03); break;
      case 'hhc': metalHit(1.7, [['highpass', 7000], ['highpass', 7000], ['peaking', 10000, 1, 4]], 0.028, 1.4); break;
      case 'hhp': metalHit(1.7, [['highpass', 6000], ['highpass', 6000]], 0.02, 0.9); break;
      case 'hho': metalHit(1.7, [['highpass', 6500], ['highpass', 6500], ['peaking', 9500, 1, 3]], 0.32, 1.1); break;
      case 'ride': metalHit(1.2, [['highpass', 5000], ['highpass', 5000]], 0.9, 0.55); [520, 1083, 1694, 2342].forEach((fq, k) => tone(fq, 1.1 - k * 0.15, 0.08)); noise([['highpass', 7000]], 0.45, 0.12); break;
      case 'crash': metalHit(1.35, [['highpass', 3500], ['highpass', 4000]], 0.95, 0.7); noise([['highpass', 4000], ['lowpass', 12000]], 0.8, 0.55, 0.004); break;
      case 'tomh': case 'tomm': case 'toml': {
        const f0 = { tomh: 210, tomm: 158, toml: 104 }[id];
        tone(f0, 0.22 + (id === 'toml' ? 0.12 : 0), 0.85, 0.28, 0.035); tone(f0 * 1.52, 0.09, 0.22, 0.2, 0.03); noise([['lowpass', 3500]], 0.008, 0.35); break;
      }
      case 'shaker': noise([['bandpass', 7000, 1.4]], 0.045, 0.9, 0.012); break;
      case 'tamb': metalHit(5.2, [['highpass', 5000]], 0.11, 0.7); noise([['highpass', 7000]], 0.06, 0.3); break;
      case 'cowbell': { const bpf = biquad('bandpass', 760, 2.2, sr); for (let i = 0; i < len; i++) { const t = i / sr; const x = (Math.sin(TAU * 562 * t) > 0 ? 1 : -1) + (Math.sin(TAU * 845 * t) > 0 ? 1 : -1); out[i] = bq(bpf, x) * (0.7 * Math.exp(-t / 0.05) + 0.3 * Math.exp(-t / 0.28)); } break; }
      case 'congah': tone(330, 0.12, 0.8, 0.08, 0.02); tone(660, 0.04, 0.2); noise([['bandpass', 2500, 1.5]], 0.006, 0.6); break;
      case 'congal': tone(215, 0.17, 0.85, 0.08, 0.02); tone(430, 0.05, 0.2); noise([['bandpass', 1800, 1.5]], 0.006, 0.5); break;
      case 'clave': tone(2480, 0.025, 0.8); tone(4960, 0.012, 0.15); break;
      case 'wood': tone(1050, 0.03, 0.7); tone(1680, 0.02, 0.35); noise([['bandpass', 2500, 2]], 0.004, 0.4); break;
      case 'woodhi': tone(1500, 0.025, 0.7); tone(2350, 0.018, 0.35); noise([['bandpass', 3200, 2]], 0.004, 0.4); break;
      default: tone(200, 0.2, 0.6);
    }
    let peak = 0; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
    const lvl = { kick: 0.95, snare: 0.75, rim: 0.5, clap: 0.6, hhc: 0.32, hhp: 0.22, hho: 0.3, ride: 0.28, crash: 0.42, tomh: 0.7, tomm: 0.72, toml: 0.78, shaker: 0.22, tamb: 0.3, cowbell: 0.35, congah: 0.55, congal: 0.6, clave: 0.45, wood: 0.5, woodhi: 0.5 }[id] || 0.5;
    const g = peak > 0 ? (lvl * (0.3 + 0.7 * vel)) / peak : 1;
    for (let i = 0; i < len; i++) out[i] *= g;
    const att = Math.floor(0.0006 * sr);
    for (let i = 0; i < att; i++) out[i] *= i / att;
    return out;
  }
  /** General MIDI drum note → kit piece. */
  const GM_DRUM = { 35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'clap', 40: 'snare', 41: 'toml', 42: 'hhc', 43: 'toml', 44: 'hhp', 45: 'tomm', 46: 'hho', 47: 'tomm', 48: 'tomh', 49: 'crash', 50: 'tomh', 51: 'ride', 52: 'crash', 53: 'ride', 54: 'tamb', 55: 'crash', 56: 'cowbell', 57: 'crash', 59: 'ride', 62: 'congah', 63: 'congah', 64: 'congal', 69: 'shaker', 70: 'shaker', 75: 'clave', 76: 'woodhi', 77: 'wood' };

  // ------------------------------------------------------------------ public API
  const DECAYING = { piano: 1, guitar: 1, electric: 1, bass: 1 };
  /** Instrument id / synth name → voice. */
  const VOICE_OF = { piano: 'piano', keys: 'piano', guitar: 'guitar', acoustic: 'guitar', electric: 'electric', bass: 'bass', trumpet: 'trumpet', brass: 'trumpet', voice: 'voice', vocals: 'voice', choir: 'voice', strings: 'strings', pad: 'strings', organ: 'organ', drums: 'drums', lead: 'trumpet', winds: 'organ' };
  const voiceOf = (x) => VOICE_OF[x] || 'piano';

  /**
   * Render one note. o: {sr, vel 0..1, held (s, needed for sustained voices), vowel, maxLen}.
   * Decaying voices (piano/guitar/electric/bass) render their natural ring; damp with release().
   */
  function render(voice, midi, o) {
    o = Object.assign({ sr: 32000, vel: 0.8, held: 1 }, o || {});
    o.vel = clamp(o.vel, 0.05, 1);
    switch (voice) {
      case 'piano': return piano(midi, o);
      case 'guitar': case 'electric': case 'bass': return pluck(midi, o, voice);
      case 'trumpet': return trumpet(midi, o);
      case 'voice': return singer(midi, o);
      case 'strings': return strings(midi, o);
      case 'organ': return organ(midi, o);
      case 'drums': return drum(GM_DRUM[midi] || 'snare', o);
      default: return piano(midi, o);
    }
  }
  /** Damper time (s) used when a decaying note is let go. */
  const releaseTime = (voice, midi) => (voice === 'piano' ? (midi > 88 ? 1.2 : clamp(0.25 - (midi - 40) * 0.003, 0.08, 0.3)) : voice === 'bass' ? 0.035 : voice === 'guitar' ? 0.12 : 0.1);

  /**
   * Sustained voices as a loopable "sample": attack, then a steady body whose loop region has
   * a baked-in crossfade, so a note of any length plays seamlessly. {buf, loopStart, loopEnd} (samples).
   */
  const SUSTAIN_LEN = { trumpet: 1.9, voice: 2.1, strings: 2.4, organ: 1.2 };
  function looped(voice, midi, o) {
    const sr = o.sr, L = SUSTAIN_LEN[voice] || 2;
    const buf = render(voice, midi, Object.assign({}, o, { held: L }));
    const loopEnd = Math.floor(L * sr), loopStart = Math.floor((L * 0.5) * sr), X = Math.floor(0.12 * sr);
    for (let j = 0; j < X; j++) { const w = j / X; buf[loopEnd - X + j] = buf[loopEnd - X + j] * (1 - w) + buf[loopStart - X + j] * w; }
    return { buf: buf.subarray(0, loopEnd), loopStart, loopEnd };
  }
  /** Copy a looped sustained note of the given length (+ release) into out. */
  function addLooped(out, start, L, held, rel, gain) {
    const hs = Math.floor(held), total = hs + Math.floor(rel);
    let k = 0;
    for (let i = 0; i < total && start + i < out.length; i++) {
      out[start + i] += L.buf[k] * gain * (i > hs ? 1 - (i - hs) / rel : 1);
      k++; if (k >= L.loopEnd) k = L.loopStart;
    }
  }

  /** Mix a note into a mono buffer (backing tracks, offline rendering). */
  const cache = new Map();
  function addNote(out, start, voice, midi, held, sr, vel) {
    let buf;
    if (DECAYING[voice] || voice === 'drums') {
      const vb = Math.round(clamp(vel, 0.1, 1) * 4) / 4;
      const key = voice + ':' + midi + ':' + vb + ':' + sr;
      buf = cache.get(key);
      if (!buf) { buf = render(voice, midi, { sr, vel: vb }); cache.set(key, buf); if (cache.size > 48) cache.delete(cache.keys().next().value); }
      const k = vel / vb, hs = Math.floor(held * sr), rt = releaseTime(voice, midi) * sr;
      const end = voice === 'drums' ? buf.length : Math.min(buf.length, hs + Math.floor(rt * 5));
      for (let i = 0; i < end && start + i < out.length; i++) out[start + i] += buf[i] * k * (voice !== 'drums' && i > hs ? Math.exp(-(i - hs) / rt) : 1);
      return;
    }
    const vb = Math.round(clamp(vel, 0.1, 1) * 4) / 4, key = 'L' + voice + ':' + midi + ':' + vb + ':' + sr;
    let L = cache.get(key);
    if (!L) { L = looped(voice, midi, { sr, vel: vb }); cache.set(key, L); if (cache.size > 48) cache.delete(cache.keys().next().value); }
    addLooped(out, start, L, held * sr, (voice === 'strings' ? 0.35 : voice === 'voice' ? 0.16 : 0.08) * sr, vel / vb);
  }

  PM.Voices = { render, looped, addNote, clearCache: () => cache.clear(), SUSTAIN_LEN, voiceOf, releaseTime, DECAYING, GM_DRUM, drum: (id, o) => drum(id, Object.assign({ sr: 32000, vel: 0.8 }, o || {})), VOWELS, biquad, bq, mtof };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Voices;
})(typeof self !== 'undefined' ? self : globalThis);
