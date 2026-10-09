/* Cadenza — on-device source separation.
 *
 * Audio: STFT soft-mask separation into four stems that always sum back to the original:
 *   drums  – percussive energy (harmonic/percussive median filtering, HPSS)
 *   bass   – harmonic energy below ~250 Hz
 *   lead   – harmonic, centre-panned energy in the vocal/lead band (stereo files only)
 *   other  – everything else (guitars, keys, pads…) = original − drums − bass − lead
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

    // Pass 2: masks → stems (overlap-add)
    const stemIds = ['drums', 'bass', 'lead'];
    const out = stemIds.map(() => [new Float32Array(len), new Float32Array(len)]);
    const binHz = sr / n;
    const wBass = new Float32Array(bins), wLead = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const fr = k * binHz;
      wBass[k] = fr < 160 ? 1 : fr < 300 ? (300 - fr) / 140 : 0;
      wLead[k] = fr < 180 ? 0 : fr < 300 ? (fr - 180) / 120 : fr < 6000 ? 1 : fr < 9000 ? (9000 - fr) / 3000 : 0;
    }
    const HT = 8, HF = 8; // median half-widths (time frames, frequency bins)
    const colT = new Float32Array(2 * HT + 1), colF = new Float32Array(2 * HF + 1), scratch = new Float32Array(Math.max(colT.length, colF.length));
    const sl = new Float64Array(bins), sli = new Float64Array(bins);
    const sr2 = new Float64Array(bins), sri = new Float64Array(bins);
    const masks = stemIds.map(() => new Float32Array(bins));
    const yr = new Float64Array(n), yi = new Float64Array(n);
    for (let f = 0; f < frames; f++) {
      loadFrame(f);
      const base = f * bins;
      for (let k = 0; k <= half; k++) {
        let cnt = 0;
        for (let d = -HT; d <= HT; d++) { const ff = f + d; if (ff >= 0 && ff < frames) colT[cnt++] = mag[ff * bins + k]; }
        const H = median(colT, cnt, scratch);
        cnt = 0;
        for (let d = -HF; d <= HF; d++) { const kk = k + d; if (kk >= 0 && kk <= half) colF[cnt++] = mag[base + kk]; }
        const P = median(colF, cnt, scratch);
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
        masks[0][k] = mp;
        masks[1][k] = harm * wBass[k];
        masks[2][k] = harm * (1 - wBass[k]) * wLead[k] * centre;
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
      if (f % 200 === 0) { progress(0.35 + (f / frames) * 0.6, 'Separating instruments…'); await tick(); }
    }
    const other = [new Float32Array(len), new Float32Array(len)];
    for (let i = 0; i < len; i++) {
      other[0][i] = L[i] - out[0][0][i] - out[1][0][i] - out[2][0][i];
      other[1][i] = R[i] - out[0][1][i] - out[1][1][i] - out[2][1][i];
    }
    progress(1, 'Stems ready');
    return {
      sampleRate: sr, length: len, stereo,
      stems: [
        { id: 'drums', name: 'Drums & percussion', icon: '🥁', data: out[0] },
        { id: 'bass', name: 'Bass', icon: '🎸', data: out[1] },
        { id: 'lead', name: stereo ? 'Vocals & lead (centre)' : 'Vocals & lead (needs stereo)', icon: '🎤', data: out[2] },
        { id: 'other', name: 'Guitars, keys & other', icon: '🎹', data: other },
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
      piano: ['keys', 'organ', 'other'],
      guitar: ['guitar', 'electric', 'other'],
      electric: ['electric', 'guitar', 'other'],
      bass: ['bass'],
      trumpet: ['lead', 'strings'],
    }[instrument] || ['other'];
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

  PM.Separation = { separateAudio, partStemFor, mixStems };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Separation;
})(typeof self !== 'undefined' ? self : globalThis);
