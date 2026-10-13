/* Overture — on-device source separation.
 *
 * Audio: STFT soft-mask separation into seven stems that always sum back to the original:
 *   kick      – percussive energy below ~150 Hz            ┐
 *   snare     – percussive mid band (snare, toms, claps)    ├ drums (HPSS median filtering)
 *   cymbals   – percussive highs (hi-hats, cymbals, shakers)┘
 *   bass      – harmonic energy below ~250 Hz
 *   vocals    – harmonic lead: centre-panned (stereo) and/or following the melody's
 *               harmonics (pitch-informed comb mask from the analysed melody)
 *   pads      – sustained harmonic sound (strings, pads, organ, held brass)
 *   chords    – the rest: plucked/struck harmonic sound (guitars, piano) = residual
 * This is signal processing, not a neural network: separation is approximate and works
 * best on studio stereo mixes. MIDI files are separated exactly by instrument instead.
 */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { DSP } = PM;

  const tick = () => new Promise((r) => setTimeout(r, 0));

  function median(arr, n, scratch) {
    for (let i = 0; i < n; i++) scratch[i] = arr[i];
    // insertion sort (n ≤ 17)
    for (let i = 1; i < n; i++) {
      const v = scratch[i];
      let j = i - 1;
      while (j >= 0 && scratch[j] > v) { scratch[j + 1] = scratch[j]; j--; }
      scratch[j + 1] = v;
    }
    return scratch[n >> 1];
  }

  /**
   * channels: [L, R] or [mono] Float32Array. Returns {sampleRate, length, stereo,
   * stems: [{id,name,icon,data:[L,R]}]} where "other" is the residual.
   */
  async function separateAudio(channels, sr, opts) {
    opts = opts || {};
    const progress = opts.onProgress || (() => {});
    const L = channels[0], R = channels[1] || channels[0];
    const stereo = !!channels[1] && !sameSignal(channels[0], channels[1]);
    const len = L.length;
    const n = sr > 32000 ? 4096 : 2048, hop = n / 4, half = n / 2;
    const win = new Float64Array(n);
    for (let i = 0; i < n; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n)); // sqrt periodic Hann
    const olaNorm = 1 / 2; // Σ hann over hop n/4 = 2
    const frames = Math.ceil((len + n) / hop) + 1;
    const offset = (f) => f * hop - n; // pad n samples before start

    const re = new Float64Array(n), im = new Float64Array(n);
    const loadFrame = (f) => {
      const off = offset(f);
      for (let i = 0; i < n; i++) {
        const s = off + i;
        const inside = s >= 0 && s < len;
        re[i] = inside ? L[s] * win[i] : 0;
        im[i] = inside ? R[s] * win[i] : 0;
      }
      DSP.fft(re, im); // Z = FFT(L + iR)
    };

    // Pass 1: magnitude of the mid signal for every frame
    const bins = half + 1;
    const mag = new Float32Array(frames * bins);
    for (let f = 0; f < frames; f++) {
      loadFrame(f);
      for (let k = 0; k <= half; k++) {
        const nk = (n - k) % n;
        // XL = (Z[k] + conj Z[n-k]) / 2 ; XR = (Z[k] - conj Z[n-k]) / 2i
        const lr = (re[k] + re[nk]) / 2, li = (im[k] - im[nk]) / 2;
        const rr = (im[k] + im[nk]) / 2, ri = -(re[k] - re[nk]) / 2;
        mag[f * bins + k] = Math.hypot(lr + rr, li + ri) / 2;
      }
      if (f % 400 === 0) { progress((f / frames) * 0.35, 'Listening to each instrument…'); await tick(); }
    }

    // Sustain floor: per-bin running minimum over ±SUS frames (~±0.3 s). Pads/strings/organ keep
    // their level, plucked & struck notes decay below it between attacks.
    const SUS = Math.max(6, Math.round((0.3 * sr) / hop));
    const sus = new Float32Array(frames * bins);
    {
      const col = new Float32Array(frames), g = new Float32Array(frames), h = new Float32Array(frames);
      const W = 2 * SUS + 1;
      for (let k = 0; k < bins; k++) {
        for (let f = 0; f < frames; f++) col[f] = mag[f * bins + k];
        // van Herk / Gil-Werman sliding minimum
        for (let f = 0; f < frames; f++) g[f] = f % W === 0 ? col[f] : Math.min(g[f - 1], col[f]);
        for (let f = frames - 1; f >= 0; f--) h[f] = f === frames - 1 || (f + 1) % W === 0 ? col[f] : Math.min(h[f + 1], col[f]);
        for (let f = 0; f < frames; f++) {
          const a = Math.max(0, f - SUS), b = Math.min(frames - 1, f + SUS);
          sus[f * bins + k] = Math.min(h[a], g[b]);
        }
      }
    }
    progress(0.4, 'Separating instruments…');
    await tick();

    // Melody f0 per frame (from the analysis) for the pitch-informed vocal/lead mask
    const melody = opts.melody || [];
    const f0At = (t) => { for (const nt of melody) if (nt.start <= t && nt.end > t) return 440 * Math.pow(2, (nt.midi - 69) / 12); return 0; };

    // Pass 2: masks → stems (overlap-add)
    const stemIds = ['kick', 'snare', 'cymbals', 'bass', 'vocals', 'pads'];
    const out = stemIds.map(() => [new Float32Array(len), new Float32Array(len)]);
    const binHz = sr / n;
    const wBass = new Float32Array(bins), wLead = new Float32Array(bins), wKick = new Float32Array(bins), wHat = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const fr = k * binHz;
      wBass[k] = fr < 160 ? 1 : fr < 300 ? (300 - fr) / 140 : 0;
      wLead[k] = fr < 180 ? 0 : fr < 300 ? (fr - 180) / 120 : fr < 6000 ? 1 : fr < 9000 ? (9000 - fr) / 3000 : 0;
      wKick[k] = fr < 110 ? 1 : fr < 200 ? (200 - fr) / 90 : 0;
      wHat[k] = fr < 3500 ? 0 : fr < 5500 ? (fr - 3500) / 2000 : 1;
    }
    const comb = new Float32Array(bins), Hm = new Float32Array(bins), Pm = new Float32Array(bins), midHist = new Float64Array(3);
    const HT = 8, HF = 8; // median half-widths (time frames, frequency bins)
    const colT = new Float32Array(2 * HT + 1), colF = new Float32Array(2 * HF + 1), scratch = new Float32Array(Math.max(colT.length, colF.length));
    const sl = new Float64Array(bins), sli = new Float64Array(bins);
    const sr2 = new Float64Array(bins), sri = new Float64Array(bins);
    const masks = stemIds.map(() => new Float32Array(bins));
    const yr = new Float64Array(n), yi = new Float64Array(n);
    for (let f = 0; f < frames; f++) {
      loadFrame(f);
      const base = f * bins;
      // harmonic comb around the melody's partials
      comb.fill(0);
      const f0 = melody.length ? f0At((offset(f) + n / 2) / sr) : 0;
      if (f0) for (let hN = 1; hN * f0 < 8000; hN++) {
        const fc = hN * f0, bw = Math.max(1.5 * binHz, 0.025 * fc);
        const k0 = Math.max(0, Math.floor((fc - bw) / binHz)), k1 = Math.min(half, Math.ceil((fc + bw) / binHz));
        for (let k = k0; k <= k1; k++) comb[k] = Math.max(comb[k], 1 - Math.abs(k * binHz - fc) / (bw * 1.2));
      }
      // 1) harmonic (time-median) and percussive (frequency-median) magnitudes for this frame
      for (let k = 0; k <= half; k++) {
        let cnt = 0;
        for (let d = -HT; d <= HT; d++) { const ff = f + d; if (ff >= 0 && ff < frames) colT[cnt++] = mag[ff * bins + k]; }
        Hm[k] = median(colT, cnt, scratch);
        cnt = 0;
        for (let d = -HF; d <= HF; d++) { const kk = k + d; if (kk >= 0 && kk <= half) colF[cnt++] = mag[base + kk]; }
        Pm[k] = median(colF, cnt, scratch);
      }
      // 2) drum character of the percussive part: noisiness (snare/claps vs pick/hammer attacks)
      //    and body (150 Hz–3.5 kHz) relative to highs (snare hit vs hi-hat)
      let lg = 0, ar = 0, nb = 0, mid = 0, hi = 0;
      for (let k = Math.floor(1000 / binHz); k <= Math.min(half, Math.ceil(6000 / binHz)); k++) { const v = Pm[k] + 1e-9; lg += Math.log(v); ar += v; nb++; }
      for (let k = Math.floor(150 / binHz); k <= Math.min(half, Math.ceil(3500 / binHz)); k++) mid += Pm[k];
      for (let k = Math.floor(5000 / binHz); k <= half; k++) hi += Pm[k];
      const flat = nb ? Math.exp(lg / nb) / (ar / nb) : 0;
      const noisy = Math.max(0, Math.min(1, (flat - 0.25) / 0.35));
      const midPrev = (midHist[0] + midHist[1] + midHist[2]) / 3;
      midHist[f % 3] = mid;
      const attack = f < 3 ? 1 : Math.max(0, Math.min(1, (mid / (midPrev + 1e-9) - 1.25) / 0.75));
      const snareness = Math.max(0, Math.min(1, (mid / (hi + 1e-9) - 0.15) / 0.35)) * noisy * attack;
      for (let k = 0; k <= half; k++) {
        const H = Hm[k], P = Pm[k];
        const mp = (P * P) / (H * H + P * P + 1e-12);
        const nk = (n - k) % n;
        sl[k] = (re[k] + re[nk]) / 2; sli[k] = (im[k] - im[nk]) / 2;
        sr2[k] = (im[k] + im[nk]) / 2; sri[k] = -(re[k] - re[nk]) / 2;
        let centre = 0;
        if (stereo) {
          const pl = sl[k] * sl[k] + sli[k] * sli[k], pr = sr2[k] * sr2[k] + sri[k] * sri[k];
          const c = (2 * (sl[k] * sr2[k] + sli[k] * sri[k])) / (pl + pr + 1e-12);
          centre = c > 0 ? Math.pow(c, 8) : 0;
        }
        const harm = 1 - mp;
        // lead: centre-panned (stereo) and/or on the melody's harmonics
        const leadW = stereo ? (f0 ? Math.min(1, centre * (0.4 + 0.6 * comb[k]) * 1.3) : centre) : comb[k];
        masks[0][k] = mp * wKick[k];
        const hiPerc = mp * wHat[k] * (1 - wKick[k]);
        masks[2][k] = hiPerc * (1 - snareness);
        masks[1][k] = (mp - masks[0][k] - hiPerc) * noisy + hiPerc * snareness;
        masks[3][k] = harm * wBass[k];
        const lead = harm * (1 - wBass[k]) * wLead[k] * leadW;
        masks[4][k] = lead;
        // what is left of the harmonic part: sustained vs decaying
        const rest = harm * (1 - wBass[k]) - lead;
        const m = mag[base + k], S = sus[base + k], T = Math.max(0, m - S);
        masks[5][k] = rest > 0 ? rest * ((S * S) / (S * S + T * T + 1e-12)) : 0;
      }
      const off = offset(f);
      for (let s = 0; s < stemIds.length; s++) {
        const m = masks[s];
        // build Y = SL + i·SR over the full (Hermitian) spectrum, inverse FFT via conj trick
        for (let k = 0; k <= half; k++) {
          const ar = sl[k] * m[k], ai = sli[k] * m[k], br = sr2[k] * m[k], bi = sri[k] * m[k];
          // Y[k] = A + iB ; conj for inverse
          yr[k] = ar - bi; yi[k] = -(ai + br);
          if (k > 0 && k < half) {
            // Y[n-k] = conj(A) + i conj(B)
            const nk = n - k;
            yr[nk] = ar + bi; yi[nk] = -(-ai + br);
          }
        }
        DSP.fft(yr, yi);
        const outL = out[s][0], outR = out[s][1];
        for (let i = 0; i < n; i++) {
          const t = off + i;
          if (t < 0 || t >= len) continue;
          const w = (win[i] * olaNorm) / n;
          outL[t] += yr[i] * w;
          outR[t] -= yi[i] * w;
        }
      }
      if (f % 200 === 0) { progress(0.4 + (f / frames) * 0.55, 'Separating instruments…'); await tick(); }
    }
    const rest = [new Float32Array(len), new Float32Array(len)];
    for (let i = 0; i < len; i++) {
      let a = L[i], b = R[i];
      for (let s = 0; s < stemIds.length; s++) { a -= out[s][0][i]; b -= out[s][1][i]; }
      rest[0][i] = a; rest[1][i] = b;
    }
    progress(1, 'Stems ready');
    const leadName = stereo || melody.length ? 'Vocals & lead' : 'Vocals & lead (needs stereo or a melody)';
    return {
      sampleRate: sr, length: len, stereo,
      stems: [
        { id: 'vocals', name: leadName, icon: '🎤', data: out[4] },
        { id: 'chords', name: 'Guitars & piano', icon: '🎸', data: rest },
        { id: 'pads', name: 'Pads, strings & organ', icon: '🎻', data: out[5] },
        { id: 'bass', name: 'Bass', icon: '🎸', data: out[3] },
        { id: 'kick', name: 'Kick drum', icon: '🥁', group: 'drums', data: out[0] },
        { id: 'snare', name: 'Snare & toms', icon: '🥁', group: 'drums', data: out[1] },
        { id: 'cymbals', name: 'Hi-hats & cymbals', icon: '🔔', group: 'drums', data: out[2] },
      ],
    };
  }

  function sameSignal(a, b) {
    const step = Math.max(1, Math.floor(a.length / 5000));
    for (let i = 0; i < a.length; i += step) if (Math.abs(a[i] - b[i]) > 1e-4) return false;
    return true;
  }

  /** Which stem holds a student's part, for audio stems and MIDI families. */
  function partStemFor(instrument, stems) {
    const ids = stems.map((s) => s.id);
    const prefs = {
      piano: ['keys', 'organ', 'chords', 'other'],
      guitar: ['guitar', 'electric', 'chords', 'other'],
      electric: ['electric', 'guitar', 'chords', 'other'],
      bass: ['bass'],
      trumpet: ['lead', 'winds', 'vocals', 'strings', 'pads'],
      voice: ['vocals', 'lead', 'winds'],
    }[instrument] || ['other', 'chords'];
    return prefs.find((p) => ids.includes(p)) || null;
  }

  /** Mix stems with per-stem gains. Returns channel arrays. */
  function mixStems(sep, gains) {
    const nc = sep.stems.some((s) => s.data.length > 1) ? 2 : 1;
    const out = Array.from({ length: nc }, () => new Float32Array(sep.length));
    let peak = 0;
    for (const st of sep.stems) {
      const g = gains[st.id] == null ? 1 : gains[st.id];
      if (!g) continue;
      for (let c = 0; c < nc; c++) {
        const src = st.data[Math.min(c, st.data.length - 1)], dst = out[c];
        for (let i = 0; i < sep.length; i++) dst[i] += src[i] * g;
      }
    }
    for (const ch of out) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > peak) peak = a; }
    if (peak > 0.99) { const k = 0.98 / peak; for (const ch of out) for (let i = 0; i < ch.length; i++) ch[i] *= k; }
    return out;
  }

  /** Stems that make up the drum kit (audio splits drums into kick / snare / cymbals). */
  const DRUM_IDS = ['drums', 'kick', 'snare', 'cymbals'];

  PM.Separation = { separateAudio, partStemFor, mixStems, DRUM_IDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Separation;
})(typeof self !== 'undefined' ? self : globalThis);
