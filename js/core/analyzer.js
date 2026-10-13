/* Cadenza — offline song analysis for uploaded audio and MIDI.
 * Produces: tempo, beats, meter, key, beat-synchronous chords, notes,
 * dynamics curve and (for guitar) the strumming pattern. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const { DSP, Theory, Rhythm } = PM;

  const tick = () => new Promise((r) => setTimeout(r, 0));

  const DYN_MARKS = [
    { mark: 'ff', name: 'fortissimo', min: -4 },
    { mark: 'f', name: 'forte', min: -8 },
    { mark: 'mf', name: 'mezzo-forte', min: -12.5 },
    { mark: 'mp', name: 'mezzo-piano', min: -17 },
    { mark: 'p', name: 'piano', min: -23 },
    { mark: 'pp', name: 'pianissimo', min: -Infinity },
  ];
  const markFor = (relDb) => DYN_MARKS.find((d) => relDb >= d.min);

  function waveformPeaks(data, buckets) {
    const out = new Float32Array(buckets * 2);
    const step = data.length / buckets;
    for (let b = 0; b < buckets; b++) {
      let mn = 0, mx = 0;
      const s = Math.floor(b * step), e = Math.min(data.length, Math.floor((b + 1) * step));
      for (let i = s; i < e; i += 4) { const v = data[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
      out[b * 2] = mn; out[b * 2 + 1] = mx;
    }
    return out;
  }

  /**
   * Viterbi-smoothed chord segmentation over beats.
   * beatFrames: [{chroma, bass, silent}] aligned with beats.
   */
  function segmentChords(beatFrames, beats, duration, key, richThreshold) {
    // short beats hold fewer notes (e.g. finger-picking): demand more evidence before changing chord
    const ibi = beats.length > 2 ? (beats[beats.length - 1] - beats[0]) / (beats.length - 1) : 0.5;
    const path = Theory.viterbiChords(beatFrames, { changePenalty: 0.12 * Math.max(1, Math.min(2, 0.55 / ibi)), noChordScore: 0.55, prior: key && key.confidence > 0 ? Theory.keyPrior(key, 0.035) : null });
    const runs = [];
    for (let i = 0; i < path.length; i++) {
      const last = runs[runs.length - 1];
      if (last && last.j === path[i].templateIndex) { last.to = i; continue; }
      runs.push({ j: path[i].templateIndex, from: i, to: i });
    }
    // a one-beat chord whose notes are contained in a neighbour is usually a partial voicing
    for (let r = 0; r < runs.length; r++) {
      const x = runs[r];
      if (x.j < 0 || x.to !== x.from) continue;
      const pcs = Theory.TEMPLATES[x.j].type.iv.map((iv) => Theory.mod12(Theory.TEMPLATES[x.j].root + iv));
      for (const nb of [runs[r + 1], runs[r - 1]]) {
        if (!nb || nb.j < 0) continue;
        const npcs = Theory.TEMPLATES[nb.j].type.iv.map((iv) => Theory.mod12(Theory.TEMPLATES[nb.j].root + iv));
        if (pcs.every((p) => npcs.includes(p)) || (pcs.length === 3 && pcs.filter((p) => npcs.includes(p)).length >= 2 && Theory.TEMPLATES[x.j].root === Theory.TEMPLATES[nb.j].root)) { x.j = nb.j; break; }
      }
    }
    const merged = [];
    for (const x of runs) {
      const last = merged[merged.length - 1];
      if (last && last.j === x.j) last.to = x.to; else merged.push(Object.assign({}, x));
    }
    return merged.map((x) => {
      const start = beats[x.from], end = x.to + 1 < beats.length ? beats[x.to + 1] : duration;
      if (x.j < 0) return { start, end, beats: x.to - x.from + 1, name: 'N', root: null, type: null, bass: null, pcs: [], score: 0, roman: '', fn: '' };
      const chroma = new Float32Array(12), bass = new Float32Array(12);
      for (let i = x.from; i <= x.to; i++) {
        const f = beatFrames[i];
        if (f.silent) continue;
        for (let k = 0; k < 12; k++) { chroma[k] += f.chroma[k]; bass[k] += f.bass ? f.bass[k] : 0; }
      }
      // refine the quality (e.g. A → A7) with the whole segment's notes, keeping the root
      const scores = Theory.chordScores(chroma, bass);
      const root = Theory.TEMPLATES[x.j].root;
      let j = x.j;
      for (let t = 0; t < Theory.TEMPLATES.length; t++) if (Theory.TEMPLATES[t].root === root && scores[t] > scores[j] + 0.02) j = t;
      // if every note of a richer same-root chord (e.g. the 7th) is clearly present, prefer it
      let cmax = 0;
      for (let k = 0; k < 12; k++) cmax = Math.max(cmax, chroma[k]);
      for (let t = 0; t < Theory.TEMPLATES.length; t++) {
        const T = Theory.TEMPLATES[t];
        if (T.root !== root || T.type.iv.length <= Theory.TEMPLATES[j].type.iv.length) continue;
        const pcs = T.type.iv.map((iv) => Theory.mod12(root + iv));
        const jpcs = Theory.TEMPLATES[j].type.iv.map((iv) => Theory.mod12(root + iv));
        if (jpcs.every((p) => pcs.includes(p)) && pcs.every((p) => chroma[p] >= cmax * (richThreshold || 0.6))) j = t;
      }
      const d = Theory.describeTemplate(j, bass, key && key.preferFlat, scores[j]);
      return Object.assign(d, {
        start, end, beats: x.to - x.from + 1,
        roman: Theory.romanNumeral(d.root, d.type, key), fn: Theory.chordFunction(d.root, key),
      });
    });
  }

  /** Returns the beat parity (0/1) to keep when the tempo looks doubled, else null. */
  function halfTimeCheck(chords, beats, bpm) {
    if (bpm < 120 || bpm / 2 < 55) return null;
    const real = chords.filter((c) => c.root != null);
    if (real.length < 4) return null;
    const startIdx = real.slice(1).map((c) => beats.findIndex((b) => Math.abs(b - c.start) < 1e-6)).filter((i) => i >= 0);
    if (startIdx.length < 3) return null;
    const runs = real.slice(1, -1).map((c) => c.beats).sort((a, b) => a - b);
    const med = runs.length ? runs[runs.length >> 1] : 0;
    const even = startIdx.filter((i) => i % 2 === 0).length / startIdx.length;
    if (med >= 8 && (even >= 0.85 || even <= 0.15)) return even >= 0.85 ? 0 : 1;
    return null;
  }

  function summarizeChords(segs) {
    const dur = new Map();
    for (const s of segs) if (s.name !== 'N') dur.set(s.name, (dur.get(s.name) || 0) + (s.end - s.start));
    const total = [...dur.values()].reduce((a, b) => a + b, 0) || 1;
    const unique = [...dur.entries()].sort((a, b) => b[1] - a[1]).map(([name, d]) => {
      const seg = segs.find((s) => s.name === name);
      return { name, share: d / total, roman: seg.roman, root: seg.root, type: seg.type };
    });
    // most common 4-chord loop
    const seq = segs.filter((s) => s.name !== 'N').map((s) => s.name);
    const loops = new Map();
    for (let len of [4, 3, 2]) {
      for (let i = 0; i + len <= seq.length; i++) {
        const k = seq.slice(i, i + len).join(' → ');
        if (new Set(seq.slice(i, i + len)).size < 2) continue;
        loops.set(k, (loops.get(k) || 0) + len);
      }
    }
    const loop = [...loops.entries()].sort((a, b) => b[1] - a[1])[0];
    return { unique, loop: loop ? loop[0] : seq.slice(0, 4).join(' → '), changes: seq.length };
  }

  function dynamicsFromCurve(times, db, duration) {
    // smooth ~0.6 s
    const smooth = new Float32Array(db.length);
    let acc = db[0] || -60;
    for (let i = 0; i < db.length; i++) { acc = acc * 0.85 + db[i] * 0.15; smooth[i] = acc; }
    const peak = Math.max(-70, ...smooth);
    const silent = (x) => x < peak - 40 || x < -70; // lead-in / tail silence is not a dynamic
    const sorted = Array.from(smooth).filter((x) => !silent(x)).sort((a, b) => a - b);
    const ref = sorted.length ? sorted[Math.floor(sorted.length * 0.97)] : 0;
    const floor = sorted.length ? sorted[Math.floor(sorted.length * 0.1)] : -60;
    const curve = [];
    for (let i = 0; i < smooth.length; i++) curve.push({ t: times[i], db: smooth[i], rel: smooth[i] - ref });
    // sections of constant marking (min 2 s)
    const sections = [];
    for (const pt of curve) {
      if (silent(pt.db)) { const last = sections[sections.length - 1]; if (last) last.end = pt.t; continue; }
      const m = markFor(pt.rel);
      const last = sections[sections.length - 1];
      if (last && last.mark === m.mark) last.end = pt.t;
      else sections.push({ start: pt.t, end: pt.t, mark: m.mark, name: m.name });
    }
    const merged = [];
    for (const s of sections) {
      const last = merged[merged.length - 1];
      if (last && (s.end - s.start < 2 || last.mark === s.mark)) last.end = s.end;
      else merged.push(Object.assign({}, s));
    }
    if (merged.length) merged[merged.length - 1].end = duration;
    // crescendo / decrescendo events: ≥6 dB change within 4 s
    const events = [];
    const step = times.length > 1 ? times[1] - times[0] : 0.1;
    const win = Math.max(1, Math.round(3 / step));
    for (let i = 0; i + win < curve.length; i += Math.max(1, Math.floor(win / 2))) {
      const d = curve[i + win].db - curve[i].db;
      if (Math.abs(d) >= 6 && !silent(curve[i].db) && !silent(curve[i + win].db)) {
        const type = d > 0 ? 'crescendo' : 'decrescendo';
        const last = events[events.length - 1];
        if (last && last.type === type && curve[i].t - last.end < 1.5) last.end = curve[i + win].t;
        else events.push({ type, start: curve[i].t, end: curve[i + win].t, change: d });
      }
    }
    const audible = curve.filter((p) => !silent(p.db));
    const avgRel = audible.reduce((a, p) => a + p.rel, 0) / Math.max(1, audible.length);
    return { curve, sections: merged, events, step, rangeDb: ref - floor, overall: markFor(avgRel).mark };
  }

  /** Reference loudness at time t, 0 (quiet) … 1 (loudest). Plain-data helpers so analyses can be stored. */
  function dynLevelAt(dyn, t) {
    const c = dyn && dyn.curve;
    if (!c || !c.length) return 0.5;
    const i = Math.max(0, Math.min(c.length - 1, Math.round(t / (dyn.step || 0.1))));
    return Math.max(0, Math.min(1, (c[i].rel + 30) / 30));
  }
  function dynMarkAt(dyn, t) {
    const s = dyn && dyn.sections && dyn.sections.find((x) => t >= x.start && t <= x.end);
    return s ? s.mark : 'mf';
  }

  /** One-hot-ish bass pitch class: the lowest reasonably strong peak below 300 Hz. */
  function bassVector(peaks) {
    const v = new Float32Array(12);
    let mx = 0;
    for (const p of peaks) if (p.freq < 300 && p.mag > mx) mx = p.mag;
    if (!mx) return v;
    let low = null;
    for (const p of peaks) if (p.freq >= 38 && p.freq < 300 && p.mag >= mx * 0.3 && (!low || p.freq < low.freq)) low = p;
    if (low) v[Theory.mod12(Math.round(DSP.freqToMidi(low.freq)))] = Math.sqrt(low.mag);
    return v;
  }

  /** Main audio analysis entry point. channels: Float32Array[] */
  async function analyzeAudio(channels, sampleRate, opts) {
    opts = opts || {};
    const progress = opts.onProgress || (() => {});
    const instrument = opts.instrument || 'guitar';
    const { data: mono, sampleRate: sr } = DSP.prepareMono(channels, sampleRate, 22050);
    const duration = mono.length / sr;
    progress(0.03, 'Listening for rhythm…');
    await tick();

    // Rhythm features
    const feat = Rhythm.onsetFeatures(mono, sr, { n: 1024, hop: 256 });
    feat.novelty = Rhythm.noveltyCurve(feat.flux, feat.hopTime);
    feat.bassNovelty = Rhythm.noveltyCurve(feat.bassFlux, feat.hopTime);
    progress(0.25, 'Estimating tempo…');
    await tick();
    const tempo = Rhythm.estimateTempo(feat.novelty, feat.hopTime, { bass: feat.bassNovelty });
    let beats = Rhythm.trackBeats(feat.novelty, feat.hopTime, tempo.bpm);
    if (beats.length >= 4) {
      const ibis = [];
      for (let i = 1; i < beats.length; i++) ibis.push(beats[i] - beats[i - 1]);
      ibis.sort((a, b) => a - b);
      tempo.bpm = 60 / ibis[Math.floor(ibis.length / 2)];
    } else {
      beats = [];
      for (let t = 0; t < duration; t += 60 / tempo.bpm) beats.push(t);
    }
    progress(0.4, 'Tracking harmony…');
    await tick();

    // Harmony features (4096-pt frames, 1024 hop)
    const n = 4096, hop = 1024;
    const spec = DSP.spectrumAnalyzer(n);
    const nFrames = Math.max(1, Math.floor((mono.length - n) / hop) + 1);
    const chromaFrames = [], bassFrames = [], energy = [], noteFrames = [], melFrames = [];
    const mags = new Float32Array(n / 2);
    for (let f = 0; f < nFrames; f++) {
      spec(mono, f * hop, mags);
      const peaks = DSP.spectralPeaks(mags, sr, n, { minFreq: 40, maxFreq: 5000, maxPeaks: 30 });
      chromaFrames.push(DSP.noteChroma(peaks, null));
      bassFrames.push(bassVector(peaks));
      let e = 0;
      for (const p of peaks) e += p.mag;
      energy.push(e);
      noteFrames.push(DSP.polyNotes(peaks, { lowMidi: 36, highMidi: 96, maxNotes: 4, relThreshold: 0.4 }));
      melFrames.push(DSP.polyNotes(peaks, { lowMidi: 55, highMidi: 96, maxNotes: 3, relThreshold: 0.25 }));
      if (f % 300 === 0) { progress(0.4 + 0.35 * (f / nFrames), 'Tracking harmony…'); await tick(); }
    }
    const frameTime = (f) => (f * hop + n / 2) / sr;

    // Key
    const total = new Float32Array(12);
    chromaFrames.forEach((c) => { for (let i = 0; i < 12; i++) total[i] += c[i]; });
    let key = Theory.detectKey(total);

    // Beat-synchronous chords
    const maxE = Math.max(...energy, 1e-9);
    let beatFrames = [], harmonicChange = [];
    const syncToBeats = () => {
    beatFrames = []; harmonicChange = [];
    let prevChroma = null;
    for (let b = 0; b < beats.length; b++) {
      const t0 = beats[b], t1 = b + 1 < beats.length ? beats[b + 1] : Math.min(duration, t0 + 60 / tempo.bpm);
      const c = new Float32Array(12), bc = new Float32Array(12);
      let e = 0, cnt = 0;
      for (let f = 0; f < nFrames; f++) {
        const ft = frameTime(f);
        if (ft < t0 || ft >= t1) continue;
        for (let i = 0; i < 12; i++) { c[i] += chromaFrames[f][i]; bc[i] += bassFrames[f][i]; }
        e += energy[f]; cnt++;
      }
      const nc = DSP.normalize(Float32Array.from(c));
      if (prevChroma) {
        let d = 0;
        for (let i = 0; i < 12; i++) d += Math.abs(nc[i] - prevChroma[i]);
        harmonicChange.push(d);
      } else harmonicChange.push(0);
      prevChroma = nc;
      beatFrames.push({ chroma: c, bass: bc, silent: !cnt || e / cnt < maxE * 0.02 });
    }
    };
    syncToBeats();
    let chords = segmentChords(beatFrames, beats, duration, key);
    // Slow songs with busy 8th-note picking/strumming are easily tracked at double tempo. If the
    // harmony only ever changes every 8+ "beats", always on the same alternate beat, the real beat
    // is every other one: halve the tempo and redo the beat-synchronous chords.
    const half = halfTimeCheck(chords, beats, tempo.bpm);
    if (half != null) {
      beats = beats.filter((_, i) => i % 2 === half);
      tempo.bpm /= 2;
      syncToBeats();
      chords = segmentChords(beatFrames, beats, duration, key);
    }
    const refined = Theory.refineKeyWithChords(key, chords);
    if (refined !== key) { key = refined; chords = segmentChords(beatFrames, beats, duration, key); }
    const chordSummary = summarizeChords(chords);
    progress(0.8, 'Feeling the groove…');
    await tick();

    // Meter
    const meter = Rhythm.estimateMeter(beats, feat, { harmonicChange });
    const downbeats = beats.filter((_, i) => (i - meter.downbeatPhase) % (meter.compound ? meter.pulsesPerBar : meter.beatsPerBar) === 0);

    // Notes (approximate transcription)
    const notes = [];
    const active = new Map();
    for (let f = 0; f < noteFrames.length; f++) {
      const t = frameTime(f);
      const present = new Set(noteFrames[f].map((x) => x.midi));
      for (const [m, nt] of active) if (!present.has(m)) { nt.end = t; if (nt.end - nt.start >= 0.09) notes.push(nt); active.delete(m); }
      for (const x of noteFrames[f]) if (!active.has(x.midi) && energy[f] > maxE * 0.03) active.set(x.midi, { midi: x.midi, start: t - hop / sr / 2, end: t, velocity: Math.min(1, Math.sqrt(energy[f] / maxE)) });
    }
    for (const nt of active.values()) { nt.end = duration; notes.push(nt); }
    notes.sort((a, b) => a.start - b.start);

    // Melody line (highest sustained voice) incl. passing notes, and chord voicings
    const melody = extractMelody(melFrames, frameTime, energy, maxE, feat, hop / sr);
    attachVoicings(chords, notes);
    // Picking style: strummed/block chords vs picked/arpeggiated notes
    const picking = pickingStyle(mono, sr, feat, chords);

    // Dynamics (0.1 s resolution)
    const dynStep = Math.max(1, Math.round(0.1 / feat.hopTime));
    const dTimes = [], dDb = [];
    for (let i = 0; i < feat.frames; i += dynStep) {
      let s = 0, c = 0;
      for (let j = i; j < Math.min(feat.frames, i + dynStep); j++) { s += feat.rms[j] * feat.rms[j]; c++; }
      dTimes.push(i * feat.hopTime);
      dDb.push(DSP.toDb(Math.sqrt(s / c)));
    }
    const dynamics = dynamicsFromCurve(dTimes, dDb, duration);

    // Strumming
    let strum = null;
    if (opts.strum !== false) {
      progress(0.88, 'Transcribing strumming…');
      await tick();
      const onsets = Rhythm.pickOnsets(feat.novelty, feat.hopTime, { minGap: 0.09, delta: 0.8 });
      const strums = onsets.map((o) => {
        const fi = Math.min(feat.frames - 1, o.frame + 1);
        return {
          time: o.time,
          strength: o.strength,
          direction: Rhythm.strumDirection(mono, sr, o.time) / 20,
          // a "chuck" (muted strum) is noisy and dies almost immediately
          muted: feat.flatness[fi] > 0.55 && feat.rms[Math.min(feat.frames - 1, fi + 8)] < feat.rms[fi] * 0.3,
        };
      });
      strum = Rhythm.buildStrumPattern(strums, beats, meter);
      if (strum) strum.onsetCount = onsets.length;
    }
    progress(1, 'Done');
    return {
      source: 'audio', instrument, duration, sampleRate,
      tempo: { bpm: Math.round(tempo.bpm * 10) / 10, confidence: tempo.confidence },
      beats, downbeats, meter, key, chords, chordSummary, notes, melody, picking, dynamics, strum,
      waveform: waveformPeaks(mono, 1200),
    };
  }

  /**
   * Predominant melody: in each frame take the highest note that is clearly present (salience),
   * keep it continuous (median filter, no octave jumps for one frame), split on pitch changes and
   * on re-attacks seen in the onset curve. Passing / neighbour notes are kept if ≥ ~70 ms.
   */
  function extractMelody(melFrames, frameTime, energy, maxE, feat, frameDur) {
    // most salient note per frame, but stay with a close neighbour of the previous melody note
    // when it is nearly as strong (melodies move by small steps)
    let prev = null;
    const raw = melFrames.map((ns, f) => {
      if (!ns.length || energy[f] < maxE * 0.03) { prev = null; return null; }
      let best = ns.reduce((x, y) => (y.salience > x.salience ? y : x));
      if (prev != null) {
        const near = ns.filter((n) => Math.abs(n.midi - prev) <= 4 && n.salience >= best.salience * 0.6);
        if (near.length) best = near.reduce((x, y) => (Math.abs(y.midi - prev) < Math.abs(x.midi - prev) ? y : x));
      }
      prev = best.midi;
      return best.midi;
    });
    // median-of-3 smoothing removes single-frame glitches
    const sm = raw.map((m, i) => {
      const w = [raw[i - 1], m, raw[i + 1]].filter((x) => x != null).sort((a, b) => a - b);
      return w.length >= 2 ? w[w.length >> 1] : m;
    });
    const out = [];
    let cur = null;
    const onsetAt = (t) => { const i = Math.round(t / feat.hopTime); let mx = 0; for (let k = i - 2; k <= i + 2; k++) mx = Math.max(mx, feat.novelty[k] || 0); return mx; };
    let novMean = 0; for (const v of feat.novelty) novMean += v; novMean /= Math.max(1, feat.novelty.length);
    for (let f = 0; f < sm.length; f++) {
      const t = frameTime(f) - frameDur / 2;
      const m = sm[f];
      const reattack = cur && m === cur.midi && t - cur.start > 0.12 && onsetAt(t) > novMean * 4 && raw[f] === m;
      if (cur && (m !== cur.midi || reattack)) { cur.end = t; if (cur.end - cur.start >= 0.07) out.push(cur); cur = null; }
      if (m != null && !cur) cur = { midi: m, start: t, end: t + frameDur, velocity: Math.min(1, Math.sqrt(energy[f] / maxE)) };
    }
    if (cur) { cur.end = frameTime(sm.length - 1); out.push(cur); }
    // snap starts to the nearest onset (frames are coarse: ~46 ms)
    for (const n of out) {
      const i0 = Math.round(n.start / feat.hopTime);
      let bi = i0, bv = -1;
      for (let k = i0 - 4; k <= i0 + 3; k++) if ((feat.novelty[k] || 0) > bv) { bv = feat.novelty[k] || 0; bi = k; }
      if (bv > novMean * 2) n.start = Math.max(0, bi * feat.hopTime);
    }
    // a melody needs a lead voice: if the "top line" just mirrors the chords, report none
    return out.length >= 4 ? out : [];
  }

  /** Melody of a MIDI file: the most "lead-like" channel (mostly one note at a time, high, busy). */
  function midiMelody(notes) {
    const by = new Map();
    for (const n of notes) { if (!by.has(n.channel)) by.set(n.channel, []); by.get(n.channel).push(n); }
    let best = null;
    for (const [ch, ns] of by) {
      if (ns.length < 8) continue;
      let overl = 0;
      for (let i = 1; i < ns.length; i++) if (ns[i].start < ns[i - 1].end - 0.03) overl++;
      const poly = overl / ns.length;
      const mean = ns.reduce((a, n) => a + n.midi, 0) / ns.length;
      if (poly > 0.35 || mean < 55) continue;
      const score = mean + Math.min(ns.length, 200) * 0.004 - poly * 20;
      if (!best || score > best.score) best = { ch, score, ns };
    }
    if (best) { const out = best.ns.map((n) => ({ midi: n.midi, start: n.start, end: n.end, velocity: n.velocity })); out.channel = best.ch; return out; }
    // no single lead channel: skyline (highest note at each onset)
    const sky = [];
    for (const n of notes) {
      const last = sky[sky.length - 1];
      if (last && n.start - last.start < 0.03) { if (n.midi > last.midi) Object.assign(last, { midi: n.midi, end: n.end }); }
      else sky.push({ midi: n.midi, start: n.start, end: n.end, velocity: n.velocity });
    }
    return sky.filter((n) => n.midi >= 55);
  }

  /** Voicing of each chord: the notes actually sounding, bass/top note and inversion name. */
  function attachVoicings(chords, notes) {
    for (const c of chords) {
      if (c.root == null) continue;
      const dur = Math.max(0.05, c.end - c.start);
      const w = new Map();
      for (const n of notes) {
        const ov = Math.min(n.end, c.end) - Math.max(n.start, c.start);
        if (ov > 0) w.set(n.midi, (w.get(n.midi) || 0) + ov);
      }
      const sounding = [...w.entries()].filter(([m, d]) => d >= dur * 0.2 && c.pcs.includes(((m % 12) + 12) % 12)).map(([m]) => m).sort((a, b) => a - b);
      const bassPc = c.bass != null ? c.bass : c.root;
      const iv = Theory.mod12(bassPc - c.root);
      const pos = c.pcs.indexOf(bassPc);
      const inversion = pos <= 0 ? 'root position' : pos === 1 ? '1st inversion' : pos === 2 ? '2nd inversion' : '3rd inversion';
      c.voicing = { notes: sounding.slice(0, 8), inversion, bassInterval: iv, top: sounding.length ? sounding[sounding.length - 1] : null, spread: sounding.length > 1 ? sounding[sounding.length - 1] - sounding[0] : 0 };
    }
  }

  /**
   * Strummed vs picked: at each attack, count how many NEW notes start together (from the
   * positive spectral difference). Strums/block chords start 3+ notes at once; finger-picking
   * and arpeggios start 1–2. For picked parts, report a thumb/finger pattern over one bar.
   */
  function pickingStyle(mono, sr, feat, chords) {
    const onsets = Rhythm.pickOnsets(feat.novelty, feat.hopTime, { minGap: 0.08, delta: 0.8 });
    if (onsets.length < 6) return null;
    const n = 2048, spec = DSP.spectrumAnalyzer(n);
    const a = new Float32Array(n / 2), b = new Float32Array(n / 2), d = new Float32Array(n / 2);
    const counts = [], events = [];
    const step = Math.max(1, Math.floor(onsets.length / 80)); // sample up to ~80 attacks
    for (let i = 0; i < onsets.length; i += step) {
      const t = onsets[i].time;
      const s0 = Math.floor((t - 0.06) * sr) - n / 2, s1 = Math.floor((t + 0.07) * sr) - n / 2;
      if (s0 < 0 || s1 + n >= mono.length) continue;
      spec(mono, s0, a); spec(mono, s1, b);
      for (let k = 0; k < d.length; k++) d[k] = Math.max(0, b[k] - a[k] * 1.1);
      const peaks = DSP.spectralPeaks(d, sr, n, { minFreq: 60, maxFreq: 2500, maxPeaks: 24, relFloor: 0.08 });
      const ns = DSP.polyNotes(peaks, { lowMidi: 36, highMidi: 88, maxNotes: 6, relThreshold: 0.3 });
      counts.push(ns.length);
      events.push({ t, notes: ns.map((x) => x.midi) });
    }
    if (counts.length < 5) return null;
    const sorted = counts.slice().sort((x, y) => x - y);
    const med = sorted[sorted.length >> 1];
    const avg = counts.reduce((x, y) => x + y, 0) / counts.length;
    const style = med >= 3 ? 'strumming' : avg <= 2.2 ? 'fingerpicking' : 'hybrid';
    const res = { style, notesPerAttack: Math.round(avg * 10) / 10, confidence: Math.min(1, Math.abs(avg - 2.5) / 1.5) };
    if (style !== 'strumming') {
      // thumb (bass) vs fingers: lowest new note below the chord's middle → thumb
      const fingers = ['i', 'm', 'a'];
      const pat = events.slice(0, 16).map((e) => {
        if (!e.notes.length) return '·';
        const low = Math.min(...e.notes);
        if (low < 52) return 'T';
        const c = chords.find((x) => x.start <= e.t && x.end > e.t);
        const top = c && c.voicing && c.voicing.top ? c.voicing.top : 72;
        return fingers[Math.max(0, Math.min(2, Math.round(((low - 52) / Math.max(1, top - 52)) * 2)))];
      });
      res.pattern = pat.join(' ');
    }
    return res;
  }

  /** Exact analysis from a parsed MIDI file. */
  async function analyzeMidi(midi, opts) {
    opts = opts || {};
    const instrument = opts.instrument || 'piano';
    const notes = midi.notes.filter((n) => n.channel !== 9);
    const duration = Math.max(midi.duration, 0.5);
    const bpm = midi.tempos.length ? midi.tempos[0].bpm : 120;
    const ts = midi.timeSigs[0] || { num: 4, den: 4 };
    // beat grid from tempo map (in ticks → exact)
    const compound = ts.den === 8 && ts.num % 3 === 0 && ts.num > 3;
    const beatTicks = midi.ppq * (4 / ts.den) * (compound ? 3 : 1);
    const beats = [];
    for (let tk = 0; ; tk += beatTicks) {
      const t = midi.tickToSec(tk);
      if (t > duration + 0.01) break;
      beats.push(t);
      if (beats.length > 20000) break;
    }
    const pulses = compound ? ts.num / 3 : ts.num;
    const meter = { beatsPerBar: ts.num, beatUnit: ts.den, label: ts.num + '/' + ts.den, compound, pulsesPerBar: pulses, downbeatPhase: 0, confidence: 1, fromFile: true };

    const total = new Float32Array(12);
    for (const n of notes) total[n.midi % 12] += (n.end - n.start) * (0.5 + n.velocity);
    let key = Theory.detectKey(total);
    if (midi.keySigs.length) {
      const ks = midi.keySigs[0];
      const tonic = Theory.mod12(ks.sf * 7 + (ks.minor ? 9 : 0));
      const k = Theory.keyInfo(tonic, ks.minor ? 'minor' : 'major');
      k.confidence = 1; k.fromFile = true;
      key = k;
    }

    const harmonyNotes = notes;
    // index notes by the beats they overlap (one pass instead of notes × beats)
    const perBeat = beats.map(() => []);
    const beatIdx = (t) => { let lo = 0, hi = beats.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (beats[mid] <= t) lo = mid; else hi = mid - 1; } return lo; };
    for (const n of harmonyNotes) { const a = beatIdx(n.start), b = beatIdx(Math.max(n.start, n.end - 1e-6)); for (let k = a; k <= b && k < perBeat.length; k++) perBeat[k].push(n); }
    const beatFrames = [];
    for (let b = 0; b < beats.length; b++) {
      const t0 = beats[b], t1 = b + 1 < beats.length ? beats[b + 1] : duration;
      const c = new Float32Array(12), bc = new Float32Array(12);
      let lowest = 999;
      for (const n of perBeat[b]) {
        const ov = Math.min(n.end, t1) - Math.max(n.start, t0);
        if (ov <= 0) continue;
        // low notes (walking bass lines) shape the bass vector more than the harmony;
        // notes ringing over from an earlier beat count less than fresh attacks, so a new
        // chord is heard on its first beat even when the old one is still sustaining
        const fresh = n.start >= t0 - 0.03 ? 1 : 0.7;
        c[n.midi % 12] += ov * (0.5 + n.velocity) * (n.midi < 48 ? 0.4 : 1) * fresh;
        if (n.midi < lowest) lowest = n.midi;
      }
      // alternating (Travis) bass: the note on the strong beats names the inversion, so the
      // bass vote is weighted by metre — downbeat 1.6, mid-bar 1.25, weak beats 1
      if (lowest < 999) { const pos = b % pulses; bc[lowest % 12] = pos === 0 ? 1.6 : pulses % 2 === 0 && pos === pulses / 2 ? 1.25 : 1; }
      const pcsPresent = c.reduce((a, x) => a + (x > 0 ? 1 : 0), 0);
      beatFrames.push({ chroma: c, bass: bc, silent: pcsPresent === 0, uninformative: pcsPresent === 1 });
    }
    let chords = segmentChords(beatFrames, beats, duration, key, 0.3);
    if (!key.fromFile) {
      const refined = Theory.refineKeyWithChords(key, chords);
      if (refined !== key) { key = refined; chords = segmentChords(beatFrames, beats, duration, key, 0.3); }
    }

    // dynamics from velocity density
    const step = 0.1;
    const dTimes = [], dDb = [];
    const nSteps = Math.ceil(duration / step);
    const acc = new Float32Array(nSteps + 2);
    for (const n of notes) { const a = Math.ceil(n.start / step), b = Math.floor(n.end / step); for (let k = Math.max(0, a); k <= Math.min(nSteps, b); k++) acc[k] += n.velocity * n.velocity; }
    for (let k = 0; k < nSteps; k++) { dTimes.push(k * step); dDb.push(DSP.toDb(Math.sqrt(acc[k]) * 0.3 + 1e-4)); }
    const dynamics = dynamicsFromCurve(dTimes, dDb, duration);

    // Strums from clustered note-ons; ascending pitch order = down-strum
    let strum = null;
    if (opts.strum !== false) {
      const clusters = [];
      for (const n of notes) {
        const last = clusters[clusters.length - 1];
        if (last && n.start - last.start < 0.04) last.notes.push(n);
        else clusters.push({ start: n.start, notes: [n] });
      }
      const strums = clusters.map((c) => {
        const ordered = [...c.notes].sort((a, b) => a.start - b.start);
        let dir = 0;
        if (ordered.length >= 3 && ordered[ordered.length - 1].start - ordered[0].start > 0.002) {
          dir = ordered[ordered.length - 1].midi > ordered[0].midi ? 1.5 : -1.5;
        }
        return { time: c.start, strength: c.notes.reduce((a, n) => a + n.velocity, 0), direction: dir, muted: false };
      });
      strum = Rhythm.buildStrumPattern(strums, beats, meter);
    }

    attachVoicings(chords, notes);
    const melody = midiMelody(notes);
    // picking style from simultaneous note-ons
    let picking = null;
    {
      const cl = [];
      for (const n of notes) { const last = cl[cl.length - 1]; if (last && n.start - last.start < 0.035) last.k++; else cl.push({ start: n.start, k: 1 }); }
      if (cl.length >= 6) {
        const ks = cl.map((c) => c.k).sort((a, b) => a - b), med = ks[ks.length >> 1], avg = ks.reduce((a, b) => a + b, 0) / ks.length;
        picking = { style: med >= 3 ? 'strumming' : avg <= 2.2 ? 'fingerpicking' : 'hybrid', notesPerAttack: Math.round(avg * 10) / 10, confidence: 1 };
      }
    }
    const render = opts.waveformFrom ? { data: opts.waveformFrom, sampleRate: 32000 } : PM.Midi.renderNotes(notes, { instrument, sampleRate: 32000 });
    return {
      source: 'midi', instrument, duration,
      tempo: { bpm: Math.round(bpm * 10) / 10, confidence: 1, fromFile: true },
      beats, downbeats: beats.filter((_, i) => i % pulses === 0), meter, key, chords,
      chordSummary: summarizeChords(chords), notes, melody, picking, dynamics, strum,
      waveform: waveformPeaks(render.data, 1200), rendered: render,
    };
  }

  /**
   * Monophonic transcription (bass lines, trumpet/vocal melodies) with YIN on a
   * decimated signal. Returns [{midi, start, end, velocity}].
   */
  async function transcribeMono(data, sr, opts) {
    opts = opts || {};
    const minF = opts.minFreq || 40, maxF = opts.maxFreq || 1000;
    let x = data, rate = sr;
    while (rate / 2 >= Math.max(2.5 * maxF, 8000)) { x = DSP.decimate2(x); rate /= 2; }
    const W = Math.max(256, Math.ceil(rate / minF) + 8), frame = 2 * W, hop = Math.max(64, Math.round(rate * 0.012));
    const track = [];
    let peak = 0;
    for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
    const gate = peak * 0.06;
    const buf = new Float32Array(frame);
    for (let off = 0, f = 0; off + frame < x.length; off += hop, f++) {
      for (let i = 0; i < frame; i++) buf[i] = x[off + i];
      const r = DSP.rms(buf, 0, frame);
      let midi = null;
      if (r > gate * 0.35) {
        const p = DSP.yin(buf, rate, { minFreq: minF, maxFreq: maxF, threshold: 0.15 });
        if (p && p.confidence > 0.75) midi = Math.round(DSP.freqToMidi(p.freq));
      }
      track.push({ t: (off + W) / rate, midi, rms: r });
      if (f % 500 === 0) await tick();
    }
    // median-of-5 smoothing on pitch, then segment runs
    const sm = track.map((p, i) => {
      const win = track.slice(Math.max(0, i - 2), i + 3).map((q) => (q.midi == null ? -1 : q.midi)).sort((a, b) => a - b);
      const m = win[win.length >> 1];
      return m < 0 ? null : m;
    });
    const notes = [];
    let cur = null;
    const hopT = hop / rate;
    for (let i = 0; i < track.length; i++) {
      const m = sm[i];
      const reattack = cur && track[i].rms > track[Math.max(0, i - 2)].rms * 1.8 && track[i].t - cur.start > 0.08;
      if (m == null || (cur && (m !== cur.midi || reattack))) {
        if (cur) { cur.end = track[i].t; if (cur.end - cur.start >= 0.06) notes.push(cur); cur = null; }
      }
      if (m != null && !cur) cur = { midi: m, start: track[i].t - hopT, end: track[i].t, velocity: Math.min(1, track[i].rms / (peak * 0.5)) };
    }
    if (cur) { cur.end = track[track.length - 1].t; notes.push(cur); }
    return notes;
  }

  /** Lookup helpers used by the live coach. */
  function chordAt(analysis, t) {
    const cs = analysis.chords;
    let lo = 0, hi = cs.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cs[mid].end <= t) lo = mid + 1;
      else if (cs[mid].start > t) hi = mid - 1;
      else return { chord: cs[mid], index: mid, next: cs[mid + 1] || null };
    }
    return null;
  }

  function notesAt(analysis, t, tol) {
    tol = tol || 0.05;
    return analysis.notes.filter((n) => n.start - tol <= t && n.end + tol >= t);
  }

  /**
   * Song sections for navigation: bars are grouped into 4-bar phrases, phrases with the same
   * chord sequence share a letter, and runs of one letter become a section. The loudest
   * repeated part is labelled Chorus, the most common other repeated part Verse; unique
   * quiet openers/closers become Intro/Outro. Returns [{start, end, label, letter, bar}].
   */
  function sections(a) {
    if (!a || !a.chords || !a.chords.length) return [];
    let downs = a.downbeats && a.downbeats.length > 3 ? a.downbeats.slice() : null;
    if (!downs) { const bar = (60 / (a.tempo && a.tempo.bpm || 100)) * 4; downs = []; for (let t = 0; t < a.duration; t += bar) downs.push(t); }
    if (downs[downs.length - 1] < a.duration - 0.5) downs.push(a.duration);
    const chordName = (t) => { const c = chordAt(a, t); return c && c.chord ? c.chord.name : 'N'; };
    const bars = [];
    for (let i = 0; i + 1 < downs.length; i++) {
      const s = downs[i], e = downs[i + 1];
      bars.push({ start: s, end: e, sig: [0.05, 0.5].map((f) => chordName(s + (e - s) * f)).join(' ') });
    }
    const curve = a.dynamics && a.dynamics.curve || [];
    const loud = (s, e) => { let n = 0, sum = 0; for (const p of curve) if (p.t >= s && p.t < e) { sum += p.db; n++; } return n ? sum / n : -60; };
    const P = 4, phrases = [];
    for (let i = 0; i < bars.length; i += P) {
      const g = bars.slice(i, i + P);
      phrases.push({ start: g[0].start, end: g[g.length - 1].end, bar: i + 1, sig: g.map((b) => b.sig), db: loud(g[0].start, g[g.length - 1].end) });
    }
    const sim = (x, y) => { let m = 0; const n = Math.max(x.length, y.length); for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) m++; return n ? m / n : 0; };
    const reps = [];
    for (const ph of phrases) {
      let best = -1, bs = 0;
      reps.forEach((r, k) => { const v = sim(ph.sig, r.sig); if (v > bs) { bs = v; best = k; } });
      if (best >= 0 && bs >= 0.7) { ph.k = best; reps[best].count++; reps[best].db += ph.db; }
      else { ph.k = reps.length; reps.push({ sig: ph.sig, count: 1, db: ph.db }); }
    }
    // runs of the same phrase type → sections
    const out = [];
    for (const ph of phrases) {
      const last = out[out.length - 1];
      if (last && last.k === ph.k) last.end = ph.end;
      else out.push({ start: ph.start, end: ph.end, k: ph.k, bar: ph.bar });
    }
    // merge a lone non-repeating phrase into its neighbour when there are many sections
    const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const repeated = reps.map((r, k) => ({ k, count: r.count, db: r.db / r.count })).filter((r) => r.count > 1);
    const chorus = repeated.length >= 2 ? repeated.slice().sort((x, y) => y.db - x.db)[0].k : null;
    const verse = repeated.filter((r) => r.k !== chorus).sort((x, y) => y.count - x.count || x.k - y.k)[0];
    const name = (sec, i) => {
      if (sec.k === chorus) return 'Chorus';
      if (verse && sec.k === verse.k) return 'Verse';
      if (reps[sec.k].count === 1 && i === 0 && out.length > 2) return 'Intro';
      if (reps[sec.k].count === 1 && i === out.length - 1 && out.length > 2) return 'Outro';
      return reps[sec.k].count === 1 && chorus != null ? 'Bridge' : 'Part ' + LET[sec.k % 26];
    };
    const named = out.map((sec, i) => ({ start: sec.start, end: sec.end, bar: sec.bar, letter: LET[sec.k % 26], label: name(sec, i) }));
    const total = {}, seen = {};
    named.forEach((x) => (total[x.label] = (total[x.label] || 0) + 1));
    named.forEach((x) => { if (total[x.label] > 1 && !/^Part/.test(x.label)) { seen[x.label] = (seen[x.label] || 0) + 1; x.label += ' ' + seen[x.label]; } });
    return named;
  }

  PM.Analyzer = { analyzeAudio, analyzeMidi, transcribeMono, chordAt, notesAt, sections, segmentChords, dynamicsFromCurve, dynLevelAt, dynMarkAt, markFor, DYN_MARKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Analyzer;
})(typeof self !== 'undefined' ? self : globalThis);
