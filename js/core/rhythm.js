/* Cadenza — rhythm analysis: onset envelope, tempo estimation, beat tracking,
 * meter (time signature) inference and strumming-pattern transcription. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const DSP = PM.DSP;

  /** Frame-wise onset features: spectral flux (full + bass), rms, flatness. */
  function onsetFeatures(mono, sr, opts) {
    opts = opts || {};
    const n = opts.n || 1024, hop = opts.hop || 256;
    const spec = DSP.spectrumAnalyzer(n);
    const frames = Math.max(1, Math.floor((mono.length - n) / hop) + 1);
    const flux = new Float32Array(frames), bassFlux = new Float32Array(frames);
    const rmsArr = new Float32Array(frames), flat = new Float32Array(frames);
    const binHz = sr / n;
    const kMax = Math.min(n / 2, Math.floor(8000 / binHz));
    const kBass = Math.max(2, Math.floor(200 / binHz));
    let prev = new Float32Array(n / 2), cur = new Float32Array(n / 2);
    const mags = new Float32Array(n / 2);
    for (let f = 0; f < frames; f++) {
      const off = f * hop;
      spec(mono, off, mags);
      let fl = 0, bf = 0;
      for (let k = 1; k < kMax; k++) {
        cur[k] = Math.log(1 + 1000 * mags[k]);
        const d = cur[k] - prev[k];
        if (d > 0) { fl += d; if (k <= kBass) bf += d; }
      }
      flux[f] = fl;
      bassFlux[f] = bf;
      rmsArr[f] = DSP.rms(mono, off, off + n);
      flat[f] = DSP.spectralFlatness(mags, 2, kMax);
      const t = prev; prev = cur; cur = t;
    }
    if (frames) { flux[0] = 0; bassFlux[0] = 0; }
    return { flux, bassFlux, rms: rmsArr, flatness: flat, hop, n, sr, hopTime: hop / sr, frames };
  }

  function movingAverage(x, half) {
    const n = x.length, out = new Float32Array(n);
    let s = 0, lo = 0, hi = -1;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - half), b = Math.min(n - 1, i + half);
      while (hi < b) s += x[++hi];
      while (lo < a) s -= x[lo++];
      out[i] = s / (hi - lo + 1);
    }
    return out;
  }

  /** Half-wave-rectified, locally-detrended, unit-variance novelty curve. */
  function noveltyCurve(flux, hopTime) {
    const avg = movingAverage(flux, Math.max(1, Math.round(0.25 / hopTime)));
    const out = new Float32Array(flux.length);
    let ss = 0;
    for (let i = 0; i < flux.length; i++) {
      out[i] = Math.max(0, flux[i] - avg[i]);
      ss += out[i] * out[i];
    }
    const sd = Math.sqrt(ss / Math.max(1, flux.length)) || 1;
    for (let i = 0; i < out.length; i++) out[i] /= sd;
    return out;
  }

  function pickOnsets(nov, hopTime, opts) {
    opts = opts || {};
    const minGap = Math.round((opts.minGap || 0.07) / hopTime);
    const avg = movingAverage(nov, Math.round(0.15 / hopTime));
    const delta = opts.delta == null ? 0.6 : opts.delta;
    const res = [];
    let last = -1e9;
    for (let i = 1; i < nov.length - 1; i++) {
      const v = nov[i];
      if (v > nov[i - 1] && v >= nov[i + 1] && v > avg[i] * 1.4 + delta && i - last >= minGap) {
        res.push({ frame: i, time: i * hopTime, strength: v });
        last = i;
      }
    }
    return res;
  }

  /** Autocorrelation tempo estimate with a log-Gaussian prior around 115 BPM. */
  function estimateTempo(nov, hopTime, opts) {
    opts = opts || {};
    const minBpm = opts.minBpm || 55, maxBpm = opts.maxBpm || 200;
    const N = nov.length;
    const minLag = Math.max(1, Math.floor(60 / maxBpm / hopTime));
    const maxLag = Math.min(N - 2, Math.ceil(60 / minBpm / hopTime));
    if (maxLag <= minLag + 2) return { bpm: 120, confidence: 0 };
    const acLen = Math.min(N - 1, maxLag * 4 + 2);
    const ac = new Float32Array(acLen + 1);
    for (let lag = 0; lag <= acLen; lag++) {
      let s = 0;
      for (let i = 0; i + lag < N; i++) s += nov[i] * nov[i + lag];
      ac[lag] = s / (N - lag);
    }
    const score = (lag) => {
      const at = (l) => {
        const i = Math.floor(l), f = l - i;
        if (i + 1 > acLen) return 0;
        return ac[i] * (1 - f) + ac[i + 1] * f;
      };
      return at(lag) + 0.5 * at(lag * 2) + 0.25 * at(lag * 4) + 0.33 * at(lag * 3) * 0.5;
    };
    let best = minLag, bv = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      const bpm = 60 / (lag * hopTime);
      const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 115) / 0.9, 2));
      const v = score(lag) * prior;
      if (v > bv) { bv = v; best = lag; }
    }
    // Octave/triple errors: compare related tempi by how strongly the onsets (and the bass, which
    // marks the beat) line up on a grid with that period at its best phase.
    if (opts.verify !== false) {
      // strong attacks: local novelty maxima in the top 35%
      const env = (i) => nov[i] + (opts.bass ? 3 * opts.bass[i] : 0);
      const lm = [];
      for (let i = 1; i < N - 1; i++) if (env(i) > env(i - 1) && env(i) >= env(i + 1) && env(i) > 0) lm.push(i);
      const vals = lm.map(env).sort((x, y) => x - y);
      const thr = vals.length ? vals[Math.floor(vals.length * 0.65)] : 0;
      const strong = lm.filter((i) => env(i) >= thr);
      const fit = (L) => {
        if (L < minLag * 0.6 || L > N / 3 || !strong.length) return -Infinity;
        let bestV = -Infinity;
        for (let ph = 0; ph < L; ph += 0.5) {
          let sum = 0, cnt = 0;
          for (let t = ph; t < N; t += L) { const i = Math.round(t); sum += env(i); cnt++; }
          let hit = 0;
          for (const i of strong) { const k = Math.round((i - ph) / L); if (Math.abs(i - (ph + k * L)) <= 2.5) hit++; }
          const v = (sum / Math.max(1, cnt)) * Math.pow(hit / strong.length, 0.8);
          if (v > bestV) bestV = v;
        }
        return bestV;
      };
      const cands = [best, best * 1.5, best / 1.5, best * 2, best / 2].filter((L) => 60 / (L * hopTime) >= minBpm && 60 / (L * hopTime) <= maxBpm);
      let pick = best, pv = -Infinity;
      for (const L of cands) {
        const bpm = 60 / (L * hopTime);
        const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 1.1, 2));
        const v = fit(L) * prior * (L === best ? 1.03 : 1);
        if (v > pv) { pv = v; pick = L; }
      }
      best = Math.round(pick);
    }
    let refined = best;
    if (best > minLag && best < maxLag) {
      const a = ac[best - 1], b = ac[best], c = ac[best + 1];
      const den = a - 2 * b + c;
      if (den < 0) refined = best + (0.5 * (a - c)) / den;
    }
    const bpm = 60 / (refined * hopTime);
    return { bpm, confidence: Math.max(0, Math.min(1, ac[best] / (ac[0] || 1))) };
  }

  /** Dynamic-programming beat tracker (Ellis 2007). Returns beat times (s). */
  function trackBeats(nov, hopTime, bpm, opts) {
    opts = opts || {};
    const N = nov.length;
    const P = 60 / bpm / hopTime;
    const alpha = opts.tightness || 200;
    const score = new Float32Array(N), back = new Int32Array(N).fill(-1);
    const lo = Math.round(2 * P), hi = Math.max(1, Math.round(P / 2));
    for (let t = 0; t < N; t++) {
      let best = -Infinity, bp = -1;
      for (let p = Math.max(0, t - lo); p <= t - hi; p++) {
        const r = Math.log((t - p) / P);
        const v = score[p] - alpha * r * r;
        if (v > best) { best = v; bp = p; }
      }
      if (bp >= 0 && best > 0) { score[t] = nov[t] + best; back[t] = bp; }
      else score[t] = nov[t];
    }
    let end = N - 1, ev = -Infinity;
    for (let t = Math.max(0, N - Math.ceil(P)); t < N; t++) if (score[t] > ev) { ev = score[t]; end = t; }
    const beats = [];
    for (let t = end; t >= 0; t = back[t]) {
      beats.push(t * hopTime);
      if (back[t] < 0) break;
    }
    beats.reverse();
    return beats;
  }

  function sampleMax(curve, hopTime, t, win) {
    const a = Math.max(0, Math.floor((t - win) / hopTime)), b = Math.min(curve.length - 1, Math.ceil((t + win) / hopTime));
    let m = 0;
    for (let i = a; i <= b; i++) if (curve[i] > m) m = curve[i];
    return m;
  }

  function zscore(arr) {
    const n = arr.length;
    if (!n) return arr;
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n) || 1;
    return arr.map((x) => (x - mean) / sd);
  }

  /**
   * Meter inference from per-beat accents (onset strength, bass onsets, harmonic change)
   * plus subdivision analysis (duple vs. compound).
   */
  function estimateMeter(beats, feat, opts) {
    opts = opts || {};
    const nb = beats.length;
    const result = { beatsPerBar: 4, beatUnit: 4, label: '4/4', compound: false, downbeatPhase: 0, confidence: 0 };
    if (nb < 8) return result;
    const nov = feat.novelty, bass = feat.bassNovelty;
    const onset = zscore(beats.map((b) => sampleMax(nov, feat.hopTime, b, 0.05)));
    const low = zscore(beats.map((b) => sampleMax(bass, feat.hopTime, b, 0.05)));
    const harm = opts.harmonicChange ? zscore(opts.harmonicChange) : beats.map(() => 0);
    const accent = beats.map((_, i) => 0.6 * onset[i] + 0.9 * low[i] + 1.2 * (harm[i] || 0));

    const scores = {};
    for (const g of [2, 3, 4]) {
      let bestPhase = 0, bestC = -Infinity;
      for (let ph = 0; ph < g; ph++) {
        let on = 0, nOn = 0, off = 0, nOff = 0;
        for (let i = 0; i < nb; i++) {
          if ((i - ph) % g === 0) { on += accent[i]; nOn++; } else { off += accent[i]; nOff++; }
        }
        const c = on / Math.max(1, nOn) - off / Math.max(1, nOff);
        if (c > bestC) { bestC = c; bestPhase = ph; }
      }
      scores[g] = { c: bestC, phase: bestPhase };
    }
    let g = 4;
    if (scores[3].c > Math.max(scores[4].c, scores[2].c) * 1.12 && scores[3].c > 0.25) g = 3;
    else if (scores[2].c > scores[4].c * 1.35) g = 2;

    // Subdivision: compare energy at 1/2 vs 1/3 & 2/3 of each beat
    let duple = 0, triple = 0, onBeat = 0;
    for (let i = 0; i < nb - 1; i++) {
      const b0 = beats[i], ib = beats[i + 1] - b0;
      onBeat += sampleMax(nov, feat.hopTime, b0, 0.03);
      duple += sampleMax(nov, feat.hopTime, b0 + ib / 2, 0.02);
      triple += 0.5 * (sampleMax(nov, feat.hopTime, b0 + ib / 3, 0.02) + sampleMax(nov, feat.hopTime, b0 + (2 * ib) / 3, 0.02));
    }
    const compound = triple > duple * 1.3 && triple > onBeat * 0.25;
    result.compound = compound;
    result.downbeatPhase = scores[g].phase;
    result.confidence = Math.max(0, Math.min(1, scores[g].c / 1.5));
    if (compound) {
      result.beatsPerBar = g * 3;
      result.beatUnit = 8;
      result.label = g * 3 + '/8';
      result.pulsesPerBar = g;
    } else {
      result.beatsPerBar = g;
      result.beatUnit = 4;
      result.label = g + '/4';
      result.pulsesPerBar = g;
    }
    return result;
  }

  // ---------- Strumming ----------
  const GRIDS = {
    2: { label: '8th notes', counts: ['', '&'], prior: [1, -1] },
    3: { label: 'triplets', counts: ['', 'trip', 'let'], prior: [1, -0.6, 0.3] },
    4: { label: '16th notes', counts: ['', 'e', '&', 'a'], prior: [1, -1, 1, -1] },
  };

  function chooseGrid(strums, beats) {
    let best = 2, bestErr = Infinity;
    for (const g of [2, 4, 3]) {
      let err = 0, n = 0;
      for (const s of strums) {
        const pos = beatPosition(s.time, beats);
        if (!pos) continue;
        const x = pos.frac * g;
        err += Math.abs(x - Math.round(x)) / g;
        n++;
      }
      if (!n) continue;
      const penalty = g === 4 ? 0.012 : g === 3 ? 0.02 : 0;
      const e = err / n + penalty;
      if (e < bestErr) { bestErr = e; best = g; }
    }
    return best;
  }

  function beatPosition(t, beats) {
    if (beats.length < 2 || t < beats[0] - 0.05) return null;
    let lo = 0, hi = beats.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (beats[mid] <= t) lo = mid; else hi = mid;
    }
    if (t < beats[0]) return { index: 0, frac: 0 };
    let i = lo;
    if (t >= beats[beats.length - 1]) i = beats.length - 2;
    const ib = beats[i + 1] - beats[i];
    return { index: i, frac: Math.max(0, (t - beats[i]) / ib) };
  }

  /**
   * Turn strum events ({time, direction(-1..1 measured or null), strength, muted})
   * into a bar-level strumming pattern aligned to the beat grid.
   */
  function buildStrumPattern(strums, beats, meter) {
    if (!strums.length || beats.length < 4) return null;
    const grid = meter && meter.compound ? 3 : chooseGrid(strums, beats);
    const prior = GRIDS[grid].prior;
    // compound meters: the tracked beat is the dotted quarter, eighths are thirds
    const beatsPerBar = meter ? (meter.compound ? meter.pulsesPerBar : meter.beatsPerBar) : 4;
    const phase = meter ? meter.downbeatPhase : 0;
    const slotsPerBar = beatsPerBar * grid;
    const medianStrength = [...strums.map((s) => s.strength)].sort((a, b) => a - b)[Math.floor(strums.length / 2)] || 1;
    const events = [];
    for (const s of strums) {
      const pos = beatPosition(s.time, beats);
      if (!pos) continue;
      let slotInBeat = Math.round(pos.frac * grid);
      let beatIdx = pos.index;
      if (slotInBeat >= grid) { slotInBeat = 0; beatIdx++; }
      const barBeat = beatIdx - phase;
      const bar = Math.floor(barBeat / beatsPerBar);
      const beatInBar = ((barBeat % beatsPerBar) + beatsPerBar) % beatsPerBar;
      const slot = beatInBar * grid + slotInBeat;
      const measured = s.direction == null ? 0 : Math.max(-1.5, Math.min(1.5, s.direction));
      const score = prior[slotInBeat] * 0.8 + measured * 0.7;
      const dir = s.muted ? 'X' : score >= 0 ? 'D' : 'U';
      events.push({ time: s.time, bar, slot, dir, accent: s.strength > medianStrength * 1.35 });
    }
    const bars = new Map();
    for (const e of events) {
      if (e.bar < 0) continue;
      if (!bars.has(e.bar)) bars.set(e.bar, new Array(slotsPerBar).fill('-'));
      const arr = bars.get(e.bar);
      if (arr[e.slot] === '-') arr[e.slot] = e.dir;
    }
    const counts = new Map();
    for (const arr of bars.values()) {
      const key = arr.join(' ');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return null;
    const main = ranked[0][0].split(' ');
    const countLabels = [];
    for (let b = 0; b < beatsPerBar; b++) for (let g = 0; g < grid; g++) countLabels.push(g === 0 ? String(b + 1) : GRIDS[grid].counts[g]);
    const accents = new Array(slotsPerBar).fill(0);
    for (const e of events) if (e.accent && e.bar >= 0) accents[e.slot]++;
    return {
      grid, gridLabel: GRIDS[grid].label, slotsPerBar, beatsPerBar,
      pattern: main,
      patternText: main.join(' '),
      countLabels,
      accentSlots: accents.map((a) => a >= Math.max(2, bars.size * 0.4)),
      variations: ranked.slice(0, 4).map(([p, c]) => ({ pattern: p.split(' '), bars: c })),
      consistency: ranked[0][1] / bars.size,
      barCount: bars.size,
      events,
    };
  }

  /**
   * Measure strum direction from audio. A down-strum sounds the low strings first, so the
   * pitch "centre of mass" of newly-arriving energy sweeps upward. We track the flux-weighted
   * mean log-frequency across the attack and regress its slope (octaves/s).
   * Positive = down-strum, negative = up-strum, ~0 = unclear.
   */
  function strumDirection(mono, sr, t) {
    const n = 1024, hop = 64;
    const spec = DSP.spectrumAnalyzer(n);
    const binHz = sr / n;
    const k0 = Math.max(1, Math.floor(65 / binHz)), k1 = Math.min(n / 2 - 1, Math.ceil(800 / binHz));
    const start = Math.floor((t - 0.02) * sr) - n / 2, end = Math.floor((t + 0.08) * sr) - n / 2;
    let prev = null;
    const xs = [], ys = [], ws = [];
    const mags = new Float32Array(n / 2);
    for (let off = start; off < end; off += hop) {
      spec(mono, off, mags);
      const cur = new Float32Array(k1 + 2);
      for (let k = k0; k <= k1 + 1; k++) cur[k] = mags[k];
      if (prev) {
        let mx = 0, tot = 0;
        const d = new Float32Array(k1 + 2);
        for (let k = k0; k <= k1; k++) { d[k] = Math.max(0, cur[k] - prev[k]); tot += d[k]; if (d[k] > mx) mx = d[k]; }
        if (mx > 0) {
          // lowest bin carrying significant new energy ≈ fundamental of the newest low string
          let low = -1;
          for (let k = k0; k <= k1; k++) if (d[k] >= mx * 0.25 && d[k] >= d[k - 1] && d[k] >= d[k + 1]) { low = k; break; }
          if (low > 0) { xs.push((off + n / 2) / sr - t); ys.push(Math.log2(low * binHz)); ws.push(tot); }
        }
      }
      prev = cur;
    }
    if (xs.length < 4) return 0;
    let sw = 0, sx = 0, sy = 0;
    for (let i = 0; i < xs.length; i++) { sw += ws[i]; sx += ws[i] * xs[i]; sy += ws[i] * ys[i]; }
    const mx = sx / sw, my = sy / sw;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < xs.length; i++) { sxy += ws[i] * (xs[i] - mx) * (ys[i] - my); sxx += ws[i] * (xs[i] - mx) * (xs[i] - mx); }
    return sxx > 0 ? sxy / sxx : 0;
  }

  PM.Rhythm = {
    onsetFeatures, noveltyCurve, pickOnsets, estimateTempo, trackBeats, estimateMeter,
    buildStrumPattern, strumDirection, beatPosition, movingAverage, GRIDS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Rhythm;
})(typeof self !== 'undefined' ? self : globalThis);
