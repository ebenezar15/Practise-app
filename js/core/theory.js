/* Cadenza — music theory: chord & key detection, spelling, roman numerals,
 * scales, guitar chord shapes and piano voicings. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const mod12 = (x) => ((x % 12) + 12) % 12;

  const CHORD_TYPES = [
    { id: '', label: 'major', iv: [0, 4, 7], w: 1.0 },
    { id: 'm', label: 'minor', iv: [0, 3, 7], w: 1.0 },
    { id: '7', label: 'dominant 7th', iv: [0, 4, 7, 10], w: 0.94 },
    { id: 'maj7', label: 'major 7th', iv: [0, 4, 7, 11], w: 0.93 },
    { id: 'm7', label: 'minor 7th', iv: [0, 3, 7, 10], w: 0.94 },
    { id: 'dim', label: 'diminished', iv: [0, 3, 6], w: 0.88 },
    { id: 'aug', label: 'augmented', iv: [0, 4, 8], w: 0.84 },
    { id: 'sus2', label: 'suspended 2nd', iv: [0, 2, 7], w: 0.87 },
    { id: 'sus4', label: 'suspended 4th', iv: [0, 5, 7], w: 0.87 },
    { id: '5', label: 'power chord', iv: [0, 7], w: 0.78 },
  ];
  const TYPE_BY_ID = Object.fromEntries(CHORD_TYPES.map((t) => [t.id, t]));

  // Pre-built normalised templates: 12 roots × types
  const TEMPLATES = [];
  for (const type of CHORD_TYPES) {
    for (let root = 0; root < 12; root++) {
      const v = new Float32Array(12);
      type.iv.forEach((iv, i) => (v[mod12(root + iv)] = i === 0 ? 1.15 : i === 1 ? 1.0 : 0.9));
      let n = 0;
      for (let i = 0; i < 12; i++) n += v[i] * v[i];
      n = Math.sqrt(n);
      for (let i = 0; i < 12; i++) v[i] /= n;
      TEMPLATES.push({ root, type, v });
    }
  }

  function spell(pc, preferFlat) {
    return (preferFlat ? FLATS : SHARPS)[mod12(pc)];
  }

  function chordName(root, typeId, preferFlat, bass) {
    let n = spell(root, preferFlat) + typeId;
    if (bass != null && mod12(bass) !== mod12(root)) n += '/' + spell(bass, preferFlat);
    return n;
  }

  function chordPcs(root, typeId) {
    return TYPE_BY_ID[typeId].iv.map((iv) => mod12(root + iv));
  }

  function normBass(bass) {
    if (!bass) return null;
    let bm = 0;
    for (let i = 0; i < 12; i++) if (bass[i] > bm) bm = bass[i];
    return bm > 0 ? Array.from(bass, (x) => x / bm) : null;
  }

  /** Score every chord template (TEMPLATES order) against a chroma vector. */
  function chordScores(chroma, bass) {
    const out = new Float32Array(TEMPLATES.length);
    let energy = 0;
    for (let i = 0; i < 12; i++) energy += chroma[i] * chroma[i];
    if (energy <= 1e-12) return out;
    const norm = Math.sqrt(energy);
    const bassN = normBass(bass);
    for (let j = 0; j < TEMPLATES.length; j++) {
      const t = TEMPLATES[j];
      let dot = 0;
      for (let i = 0; i < 12; i++) dot += (chroma[i] / norm) * t.v[i];
      out[j] = dot * t.type.w + (bassN ? 0.08 * bassN[t.root] : 0);
    }
    return out;
  }

  /** Build a chord description for template index j, with optional slash bass. */
  function describeTemplate(j, bass, preferFlat, score) {
    const t = TEMPLATES[j];
    const pcs = chordPcs(t.root, t.type.id);
    const bassN = normBass(bass);
    let slash = null;
    if (bassN) {
      let bi = 0;
      for (let i = 1; i < 12; i++) if (bassN[i] > bassN[bi]) bi = i;
      if (bi !== t.root && pcs.includes(bi) && bassN[bi] > 0.75 && (bassN[t.root] || 0) < 0.45) slash = bi;
    }
    return {
      root: t.root, type: t.type.id, quality: t.type.label, bass: slash,
      name: chordName(t.root, t.type.id, preferFlat, slash), pcs, score: score || 0,
    };
  }

  /**
   * Template-matching chord recognition on a chroma vector.
   * opts.bass: optional 12-bin bass chroma to weight roots & detect inversions.
   */
  function detectChord(chroma, opts) {
    opts = opts || {};
    const scores = chordScores(chroma, opts.bass);
    const order = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]);
    if (!scores[order[0]]) return null;
    const preferFlat = !!opts.preferFlat;
    const d = describeTemplate(order[0], opts.bass, preferFlat, scores[order[0]]);
    d.margin = scores[order[0]] - scores[order[1]];
    d.alternatives = order.slice(1, 4).map((j) => chordName(TEMPLATES[j].root, TEMPLATES[j].type.id, preferFlat));
    return d;
  }

  /**
   * Viterbi smoothing over a sequence of chroma frames/beats.
   * frames: [{chroma, bass, silent}] → [{templateIndex | -1 (no chord), score}]
   */
  function viterbiChords(frames, opts) {
    opts = opts || {};
    const change = opts.changePenalty == null ? 0.1 : opts.changePenalty;
    const nScore = opts.noChordScore == null ? 0.55 : opts.noChordScore;
    const S = TEMPLATES.length + 1, NO = S - 1;
    const T = frames.length;
    if (!T) return [];
    const back = [];
    let prev = new Float32Array(S), cur = new Float32Array(S);
    let lastInfo = null;
    const emis = frames.map((f) => {
      const e = new Float32Array(S);
      if (f.silent) { e[NO] = 1; return e; }
      if (f.uninformative) {
        // a lone note (e.g. a bass approach note) carries little harmony: lean on the previous beat
        if (lastInfo) for (let j = 0; j < S; j++) e[j] = lastInfo[j] * 0.5;
        return e;
      }
      e.set(chordScores(f.chroma, f.bass));
      e[NO] = nScore;
      lastInfo = e;
      return e;
    });
    prev.set(emis[0]);
    for (let t = 1; t < T; t++) {
      let bi = 0;
      for (let j = 1; j < S; j++) if (prev[j] > prev[bi]) bi = j;
      const bp = new Int16Array(S);
      for (let j = 0; j < S; j++) {
        const stay = prev[j], sw = prev[bi] - change;
        if (stay >= sw) { cur[j] = stay + emis[t][j]; bp[j] = j; } else { cur[j] = sw + emis[t][j]; bp[j] = bi; }
      }
      back.push(bp);
      const tmp = prev; prev = cur; cur = tmp;
    }
    let s = 0;
    for (let j = 1; j < S; j++) if (prev[j] > prev[s]) s = j;
    const path = new Array(T);
    for (let t = T - 1; t >= 0; t--) { path[t] = s; if (t > 0) s = back[t - 1][s]; }
    return path.map((j, t) => ({ templateIndex: j === NO ? -1 : j, score: emis[t][j] }));
  }

  /** Exact chord naming from a set of MIDI notes (e.g. MIDI keyboard input). */
  function chordFromNotes(midis, opts) {
    if (!midis || !midis.length) return null;
    const chroma = new Float32Array(12);
    const bass = new Float32Array(12);
    const lowest = Math.min(...midis);
    for (const m of midis) chroma[mod12(m)] += 1;
    bass[mod12(lowest)] = 1;
    if (new Set(midis.map(mod12)).size < 2) return null;
    return detectChord(chroma, Object.assign({ bass }, opts));
  }

  // ---------- Keys ----------
  const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const FLAT_MAJOR = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb
  const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]); // d g c f bb eb
  const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

  function pearson(x, y) {
    const n = x.length;
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i] - mx, b = y[i] - my;
      sxy += a * b; sxx += a * a; syy += b * b;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  }

  function keyInfo(tonic, mode) {
    const preferFlat = mode === 'major' ? FLAT_MAJOR.has(tonic) : FLAT_MINOR.has(tonic);
    const scale = (mode === 'major' ? MAJOR_SCALE : MINOR_SCALE).map((iv) => mod12(tonic + iv));
    return {
      tonic, mode, preferFlat, scale,
      name: spell(tonic, preferFlat) + (mode === 'major' ? ' major' : ' minor'),
      short: spell(tonic, preferFlat) + (mode === 'major' ? '' : 'm'),
      scaleNames: scale.map((pc) => spell(pc, preferFlat)),
      relative: mode === 'major'
        ? spell(mod12(tonic + 9), FLAT_MINOR.has(mod12(tonic + 9))) + ' minor'
        : spell(mod12(tonic + 3), FLAT_MAJOR.has(mod12(tonic + 3))) + ' major',
      diatonic: diatonicChords(tonic, mode, preferFlat),
    };
  }

  function detectKey(chroma) {
    let total = 0;
    for (let i = 0; i < 12; i++) total += chroma[i];
    if (total <= 0) return null;
    const results = [];
    for (let t = 0; t < 12; t++) {
      const rot = Array.from({ length: 12 }, (_, i) => chroma[mod12(i + t)]);
      results.push({ tonic: t, mode: 'major', r: pearson(rot, KK_MAJOR) });
      results.push({ tonic: t, mode: 'minor', r: pearson(rot, KK_MINOR) });
    }
    results.sort((a, b) => b.r - a.r);
    const best = results[0];
    const info = keyInfo(best.tonic, best.mode);
    info.confidence = Math.max(0, Math.min(1, best.r));
    info.margin = best.r - results[1].r;
    info.alternatives = results.slice(1, 3).map((x) => keyInfo(x.tonic, x.mode).name);
    info.candidates = results.slice(0, 4);
    return info;
  }

  /**
   * Re-rank key candidates using the chord sequence: songs usually start/end on the tonic chord
   * and spend the most time on it. Resolves relative major/minor ambiguity (G major vs E minor).
   */
  function refineKeyWithChords(key, chords) {
    if (!key || !key.candidates || !chords || !chords.length) return key;
    const real = chords.filter((c) => c.root != null);
    if (!real.length) return key;
    const total = real.reduce((a, c) => a + (c.end - c.start), 0) || 1;
    const isTonic = (c, k) => c.root === k.tonic && (k.mode === 'major' ? ['', '7', 'maj7', 'sus2', 'sus4', '5'] : ['m', 'm7', '5']).includes(c.type);
    let best = null;
    for (const cand of key.candidates) {
      const share = real.filter((c) => isTonic(c, cand)).reduce((a, c) => a + (c.end - c.start), 0) / total;
      const s = cand.r + 0.35 * share + (isTonic(real[0], cand) ? 0.08 : 0) + (isTonic(real[real.length - 1], cand) ? 0.08 : 0);
      if (!best || s > best.s) best = { s, cand };
    }
    if (best.cand.tonic === key.tonic && best.cand.mode === key.mode) return key;
    const k = keyInfo(best.cand.tonic, best.cand.mode);
    k.confidence = key.confidence;
    k.alternatives = key.candidates.filter((c) => c !== best.cand).slice(0, 2).map((x) => keyInfo(x.tonic, x.mode).name);
    k.candidates = key.candidates;
    return k;
  }

  function diatonicChords(tonic, mode, preferFlat) {
    const qualities = mode === 'major' ? ['', 'm', 'm', '', '', 'm', 'dim'] : ['m', 'dim', '', 'm', 'm', '', ''];
    const scale = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE;
    return scale.map((iv, i) => {
      const root = mod12(tonic + iv);
      return { root, type: qualities[i], name: chordName(root, qualities[i], preferFlat), roman: romanNumeral(root, qualities[i], { tonic, mode }) };
    });
  }

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const MAJOR_DEG = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
  const MINOR_DEG = { 0: 'I', 1: 'bII', 2: 'II', 3: 'III', 4: '#III', 5: 'IV', 6: 'bV', 7: 'V', 8: 'VI', 9: '#VI', 10: 'VII', 11: '#VII' };

  function romanNumeral(root, typeId, key) {
    if (!key) return '';
    const deg = mod12(root - key.tonic);
    let rn = (key.mode === 'major' ? MAJOR_DEG : MINOR_DEG)[deg];
    const minorish = typeId === 'm' || typeId === 'm7' || typeId === 'dim';
    const acc = rn.match(/^[b#]*/)[0];
    let body = rn.slice(acc.length);
    if (minorish) body = body.toLowerCase();
    let suffix = '';
    if (typeId === 'dim') suffix = '°';
    else if (typeId === 'aug') suffix = '+';
    else if (typeId === '7' || typeId === 'm7') suffix = '7';
    else if (typeId === 'maj7') suffix = 'maj7';
    else if (typeId === 'sus2' || typeId === 'sus4') suffix = typeId;
    else if (typeId === '5') suffix = '5';
    return acc + body + suffix;
  }

  function chordFunction(root, key) {
    if (!key) return '';
    const deg = mod12(root - key.tonic);
    const tonicDeg = key.mode === 'major' ? [0, 4, 9] : [0, 3, 8];
    const sub = key.mode === 'major' ? [2, 5] : [2, 5];
    const dom = key.mode === 'major' ? [7, 11] : [7, 10, 11];
    if (tonicDeg.includes(deg)) return 'tonic';
    if (sub.includes(deg)) return 'subdominant';
    if (dom.includes(deg)) return 'dominant';
    return 'chromatic';
  }

  // ---------- Guitar shapes ----------
  // frets low-E → high-e, -1 = muted
  const OPEN_SHAPES = {
    'C': [-1, 3, 2, 0, 1, 0], 'D': [-1, -1, 0, 2, 3, 2], 'E': [0, 2, 2, 1, 0, 0], 'G': [3, 2, 0, 0, 0, 3], 'A': [-1, 0, 2, 2, 2, 0],
    'Am': [-1, 0, 2, 2, 1, 0], 'Dm': [-1, -1, 0, 2, 3, 1], 'Em': [0, 2, 2, 0, 0, 0],
    'C7': [-1, 3, 2, 3, 1, 0], 'D7': [-1, -1, 0, 2, 1, 2], 'E7': [0, 2, 0, 1, 0, 0], 'G7': [3, 2, 0, 0, 0, 1], 'A7': [-1, 0, 2, 0, 2, 0], 'B7': [-1, 2, 1, 2, 0, 2],
    'Am7': [-1, 0, 2, 0, 1, 0], 'Em7': [0, 2, 0, 0, 0, 0], 'Dm7': [-1, -1, 0, 2, 1, 1],
    'Cmaj7': [-1, 3, 2, 0, 0, 0], 'Dmaj7': [-1, -1, 0, 2, 2, 2], 'Fmaj7': [-1, -1, 3, 2, 1, 0], 'Gmaj7': [3, 2, 0, 0, 0, 2], 'Amaj7': [-1, 0, 2, 1, 2, 0], 'Emaj7': [0, 2, 1, 1, 0, 0],
    'Dsus2': [-1, -1, 0, 2, 3, 0], 'Dsus4': [-1, -1, 0, 2, 3, 3], 'Asus2': [-1, 0, 2, 2, 0, 0], 'Asus4': [-1, 0, 2, 2, 3, 0], 'Esus4': [0, 2, 2, 2, 0, 0],
    'E5': [0, 2, 2, -1, -1, -1], 'A5': [-1, 0, 2, 2, -1, -1], 'D5': [-1, -1, 0, 2, 3, -1],
  };
  const E_SHAPES = { '': [0, 2, 2, 1, 0, 0], 'm': [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], 'm7': [0, 2, 0, 0, 0, 0], 'maj7': [0, -1, 1, 1, 0, -1], 'sus4': [0, 2, 2, 2, 0, 0], '5': [0, 2, 2, -1, -1, -1] };
  const A_SHAPES = { '': [-1, 0, 2, 2, 2, 0], 'm': [-1, 0, 2, 2, 1, 0], '7': [-1, 0, 2, 0, 2, 0], 'm7': [-1, 0, 2, 0, 1, 0], 'maj7': [-1, 0, 2, 1, 2, 0], 'sus2': [-1, 0, 2, 2, 0, 0], 'sus4': [-1, 0, 2, 2, 3, 0], 'dim': [-1, 0, 1, 2, 1, -1], '5': [-1, 0, 2, 2, -1, -1] };
  const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

  function guitarShape(root, typeId) {
    const sharpName = SHARPS[mod12(root)] + typeId;
    if (OPEN_SHAPES[sharpName]) return { frets: OPEN_SHAPES[sharpName], baseFret: 1, barre: null };
    const options = [];
    if (E_SHAPES[typeId]) options.push({ shape: E_SHAPES[typeId], fret: mod12(root - 4) });
    if (A_SHAPES[typeId]) options.push({ shape: A_SHAPES[typeId], fret: mod12(root - 9) });
    if (!options.length) return null;
    options.sort((a, b) => (a.fret || 12) - (b.fret || 12));
    const o = options[0];
    const fret = o.fret === 0 ? 12 : o.fret;
    const frets = o.shape.map((f) => (f < 0 ? -1 : f + fret));
    return { frets, baseFret: fret, barre: fret };
  }

  /** Close-position piano voicing around middle C (MIDI). */
  function pianoVoicing(root, typeId, bass) {
    let r = 60 + mod12(root);
    if (r > 66) r -= 12;
    const notes = TYPE_BY_ID[typeId].iv.map((iv) => r + iv);
    if (bass != null) notes.unshift(48 + mod12(bass) - (mod12(bass) > 6 ? 12 : 0));
    else notes.unshift(r - 12);
    return notes;
  }

  function parseChordName(name) {
    const m = /^([A-G])([#b]?)(maj7|m7|m|7|dim|aug|sus2|sus4|5)?(?:\/([A-G][#b]?))?$/.exec(name || '');
    if (!m) return null;
    let root = SHARPS.indexOf(m[1]);
    if (m[2] === '#') root++;
    if (m[2] === 'b') root--;
    return { root: mod12(root), type: m[3] || '' };
  }

  PM.Theory = {
    SHARPS, FLATS, CHORD_TYPES, TYPE_BY_ID, STANDARD_TUNING, mod12, spell, chordName, chordPcs, detectChord, chordFromNotes,
    detectKey, refineKeyWithChords, keyInfo, romanNumeral, chordScores, describeTemplate, viterbiChords, TEMPLATES, chordFunction, diatonicChords, guitarShape, pianoVoicing, parseChordName, pearson,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Theory;
})(typeof self !== 'undefined' ? self : globalThis);
