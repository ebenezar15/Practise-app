/* Overture — DSP primitives: FFT, windows, pitch (YIN), spectral peaks, chroma,
 * polyphonic note salience, loudness. Pure functions, no DOM; usable in Node tests. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ---------- FFT (iterative radix-2, cached twiddles) ----------
  const twiddleCache = new Map();
  function twiddles(n) {
    let t = twiddleCache.get(n);
    if (!t) {
      const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
      for (let k = 0; k < n / 2; k++) {
        cos[k] = Math.cos((2 * Math.PI * k) / n);
        sin[k] = -Math.sin((2 * Math.PI * k) / n);
      }
      t = { cos, sin };
      twiddleCache.set(n, t);
    }
    return t;
  }

  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    const { cos, sin } = twiddles(n);
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1, step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let k = 0; k < half; k++) {
          const wr = cos[k * step], wi = sin[k * step];
          const a = i + k, b = a + half;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
  }

  const windowCache = new Map();
  function hann(n) {
    let w = windowCache.get(n);
    if (!w) {
      w = new Float64Array(n);
      for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
      windowCache.set(n, w);
    }
    return w;
  }

  /** Returns a reusable magnitude-spectrum function for frame size n. */
  function spectrumAnalyzer(n) {
    const re = new Float64Array(n), im = new Float64Array(n), w = hann(n);
    const norm = 2 / n;
    return function (signal, offset, out) {
      const len = signal.length;
      for (let i = 0; i < n; i++) {
        const s = offset + i;
        re[i] = s >= 0 && s < len ? signal[s] * w[i] : 0;
        im[i] = 0;
      }
      fft(re, im);
      out = out || new Float32Array(n / 2);
      for (let k = 0; k < n / 2; k++) out[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) * norm;
      return out;
    };
  }

  // ---------- Pitch helpers ----------
  const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pcName = (pc) => NOTE_NAMES[((pc % 12) + 12) % 12];
  const midiName = (m) => pcName(Math.round(m)) + (Math.floor(Math.round(m) / 12) - 1);

  function describeFreq(freq) {
    const m = freqToMidi(freq);
    const r = Math.round(m);
    return { freq, midi: r, cents: Math.round((m - r) * 100), name: midiName(r), pc: ((r % 12) + 12) % 12 };
  }

  /** YIN monophonic pitch detector. Returns {freq, confidence} or null. */
  function yin(buf, sr, opts) {
    opts = opts || {};
    const threshold = opts.threshold || 0.15;
    const minF = opts.minFreq || 50, maxF = opts.maxFreq || 1600;
    const W = Math.floor(buf.length / 2);
    const tauMin = Math.max(2, Math.floor(sr / maxF));
    const tauMax = Math.min(W - 1, Math.ceil(sr / minF));
    if (tauMax <= tauMin + 2) return null;
    const d = new Float32Array(tauMax + 2);
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) {
        const x = buf[i] - buf[i + tau];
        s += x * x;
      }
      d[tau] = s;
    }
    d[0] = 1;
    let running = 0;
    for (let tau = 1; tau <= tauMax + 1; tau++) {
      running += d[tau];
      d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (d[t] < threshold) {
        while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau < 0) {
      let best = tauMin;
      for (let t = tauMin; t <= tauMax; t++) if (d[t] < d[best]) best = t;
      if (d[best] > 0.3) return null;
      tau = best;
    }
    let refined = tau;
    const a = d[tau - 1], b = d[tau], c = d[tau + 1];
    const den = a + c - 2 * b;
    if (den !== 0 && tau > 1) refined = tau + (a - c) / (2 * den);
    return { freq: sr / refined, confidence: Math.max(0, Math.min(1, 1 - d[tau])) };
  }

  // ---------- Spectral features ----------
  /** Local maxima with parabolic interpolation. Returns [{freq, mag}] sorted by mag desc. */
  function spectralPeaks(mags, sr, n, opts) {
    opts = opts || {};
    const minF = opts.minFreq || 40, maxF = opts.maxFreq || 5000;
    const maxPeaks = opts.maxPeaks || 40;
    const binHz = sr / n;
    const k0 = Math.max(2, Math.floor(minF / binHz)), k1 = Math.min(mags.length - 2, Math.ceil(maxF / binHz));
    let maxMag = 0;
    for (let k = k0; k <= k1; k++) if (mags[k] > maxMag) maxMag = mags[k];
    if (maxMag <= 0) return [];
    const floor = maxMag * (opts.relFloor || 0.02);
    const peaks = [];
    for (let k = k0; k <= k1; k++) {
      const m = mags[k];
      if (m > floor && m > mags[k - 1] && m >= mags[k + 1]) {
        const a = mags[k - 1], b = m, c = mags[k + 1];
        const den = a - 2 * b + c;
        const p = den !== 0 ? (0.5 * (a - c)) / den : 0;
        peaks.push({ freq: (k + p) * binHz, mag: b - 0.25 * (a - c) * p });
      }
    }
    peaks.sort((x, y) => y.mag - x.mag);
    return peaks.length > maxPeaks ? peaks.slice(0, maxPeaks) : peaks;
  }

  /** 12-bin chroma from peaks (magnitude weighted, high frequencies de-emphasised). */
  function chromaFromPeaks(peaks, out, opts) {
    opts = opts || {};
    out = out || new Float32Array(12);
    out.fill(0);
    const minF = opts.minFreq || 55, maxF = opts.maxFreq || 4200;
    for (const pk of peaks) {
      if (pk.freq < minF || pk.freq > maxF) continue;
      const m = freqToMidi(pk.freq);
      const r = Math.round(m);
      const dev = Math.abs(m - r);
      if (dev > 0.42) continue;
      const pc = ((r % 12) + 12) % 12;
      const w = 1 / (1 + Math.pow(pk.freq / 1800, 2));
      out[pc] += Math.sqrt(pk.mag) * w * (1 - dev);
    }
    return out;
  }

  /**
   * Harmonic-aware chroma: a peak that sits on the 3rd/5th/6th… harmonic of a lower, strong-enough
   * peak is credited to that lower note instead of its own pitch class. This removes the
   * "phantom fifth/third" that overtones add to plain chroma (C3's 3rd harmonic is a G, its 5th an E).
   */
  function noteChroma(peaks, out, opts) {
    opts = opts || {};
    out = out || new Float32Array(12);
    out.fill(0);
    const minF = opts.minFreq || 55, maxF = opts.maxFreq || 4200;
    const ps = peaks.filter((p) => p.freq >= minF && p.freq <= maxF).sort((a, b) => a.freq - b.freq);
    const pcOf = new Int8Array(ps.length);
    const owner = new Int16Array(ps.length).fill(-1);
    for (let i = 0; i < ps.length; i++) {
      const m = freqToMidi(ps[i].freq), r = Math.round(m);
      pcOf[i] = Math.abs(m - r) > 0.42 ? -1 : ((r % 12) + 12) % 12;
      for (let j = 0; j < i; j++) {
        const ratio = ps[i].freq / ps[j].freq, h = Math.round(ratio);
        if (h < 2 || h > 7 || h === 4 || h === 2) continue; // octaves keep their pitch class anyway
        if (Math.abs(12 * Math.log2(ratio / h)) > 0.3) continue;
        if (ps[j].mag * Math.pow(0.75, h - 1) * 2.2 < ps[i].mag) continue; // too weak to explain this peak
        owner[i] = owner[j] >= 0 ? owner[j] : j;
        break;
      }
    }
    for (let i = 0; i < ps.length; i++) {
      if (pcOf[i] < 0) continue;
      const w = Math.sqrt(ps[i].mag) / (1 + Math.pow(ps[i].freq / 1800, 2));
      if (owner[i] >= 0 && pcOf[owner[i]] >= 0) out[pcOf[owner[i]]] += w * 0.35;
      else out[pcOf[i]] += w;
    }
    return out;
  }

  function normalize(v) {
    let mx = 0;
    for (let i = 0; i < v.length; i++) if (v[i] > mx) mx = v[i];
    if (mx > 0) for (let i = 0; i < v.length; i++) v[i] /= mx;
    return v;
  }

  /**
   * Polyphonic note estimate via harmonic summation over spectral peaks.
   * Returns [{midi, salience}] for up to maxNotes notes.
   */
  function polyNotes(peaks, opts) {
    opts = opts || {};
    const lo = opts.lowMidi || 36, hi = opts.highMidi || 96, maxNotes = opts.maxNotes || 6;
    if (!peaks.length) return [];
    const sal = new Float32Array(128);
    const fund = new Float32Array(128);
    const maxMag = peaks[0].mag;
    for (const pk of peaks) {
      const amp = Math.sqrt(pk.mag);
      for (let h = 1; h <= 8; h++) {
        const m = freqToMidi(pk.freq / h);
        const r = Math.round(m);
        if (r < lo || r > hi || Math.abs(m - r) > 0.3) continue;
        sal[r] += amp * Math.pow(0.82, h - 1);
        if (h === 1 && pk.mag > fund[r]) fund[r] = pk.mag;
      }
    }
    const out = [];
    let first = 0;
    for (let iter = 0; iter < maxNotes; iter++) {
      let best = -1, bv = 0;
      for (let m = lo; m <= hi; m++) {
        if (fund[m] < maxMag * 0.06) continue;
        if (sal[m] > bv) { bv = sal[m]; best = m; }
      }
      if (best < 0) break;
      if (!first) first = bv;
      if (bv < first * (opts.relThreshold || 0.32)) break;
      out.push({ midi: best, salience: bv / first });
      const s = sal[best];
      sal[best] = 0;
      for (const iv of [12, 19, 24, 28, 31, 34, 36]) {
        if (best + iv < 128) sal[best + iv] = Math.max(0, sal[best + iv] - s * 0.55);
      }
      // suppress near neighbours (spectral leakage)
      if (best > 0) sal[best - 1] *= 0.5;
      if (best < 127) sal[best + 1] *= 0.5;
    }
    return out.sort((a, b) => a.midi - b.midi);
  }

  function rms(buf, start, end) {
    start = start || 0;
    end = end == null ? buf.length : end;
    let s = 0;
    for (let i = start; i < end; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / Math.max(1, end - start));
  }

  const toDb = (x) => 20 * Math.log10(Math.max(1e-9, x));

  function spectralFlatness(mags, k0, k1) {
    let logSum = 0, sum = 0, n = 0;
    for (let k = k0; k < k1; k++) {
      const m = mags[k] + 1e-12;
      logSum += Math.log(m);
      sum += m;
      n++;
    }
    if (!n || sum <= 0) return 0;
    return Math.exp(logSum / n) / (sum / n);
  }

  /** Mono mixdown + integer-factor decimation (box filter) for analysis speed. */
  function prepareMono(channels, sr, targetSr) {
    targetSr = targetSr || 22050;
    const len = channels[0].length;
    const factor = Math.max(1, Math.floor(sr / targetSr));
    const outLen = Math.floor(len / factor);
    const out = new Float32Array(outLen);
    const nc = channels.length;
    for (let i = 0; i < outLen; i++) {
      let s = 0;
      const base = i * factor;
      for (let f = 0; f < factor; f++) for (let c = 0; c < nc; c++) s += channels[c][base + f];
      out[i] = s / (factor * nc);
    }
    return { data: out, sampleRate: sr / factor };
  }

  /** Halve the sample rate (2-tap average) — used for low-pitched YIN. */
  function decimate2(buf) {
    const out = new Float32Array(buf.length >> 1);
    for (let i = 0; i < out.length; i++) out[i] = 0.5 * (buf[2 * i] + buf[2 * i + 1]);
    return out;
  }

  PM.DSP = {
    decimate2,
    NOTE_NAMES, fft, hann, spectrumAnalyzer, freqToMidi, midiToFreq, pcName, midiName, describeFreq,
    yin, spectralPeaks, chromaFromPeaks, noteChroma, normalize, polyNotes, rms, toDb, spectralFlatness, prepareMono,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.DSP;
})(typeof self !== 'undefined' ? self : globalThis);
