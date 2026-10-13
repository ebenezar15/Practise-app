/* Cadenza — harmony & part singing. Public-domain hymn melodies are harmonised into four
 * parts (soprano, alto, tenor, bass) by a small rule-based arranger: functional chord choice
 * per strong beat (I–IV–V first, V before the cadence, I at the end), passing notes on weak
 * beats keep the chord, and voices are led smoothly within their ranges while avoiding
 * parallel fifths and octaves. These are Cadenza's own teaching arrangements (not the
 * hymnal harmonisations). Also: rounds and two-part "thirds" exercises. Pure + unit-tested. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const MAJ = [0, 2, 4, 5, 7, 9, 11];

  const PARTS = [
    { id: 'S', name: 'Soprano', short: 'S', color: '#e11d48', range: [60, 79], voices: ['soprano', 'mezzo'] },
    { id: 'A', name: 'Alto', short: 'A', color: '#f59e0b', range: [55, 74], voices: ['alto', 'mezzo'] },
    { id: 'T', name: 'Tenor', short: 'T', color: '#10b981', range: [48, 67], voices: ['tenor'] },
    { id: 'B', name: 'Bass', short: 'B', color: '#3b82f6', range: [40, 60], voices: ['baritone', 'bass'] },
  ];
  const partForVoice = (type) => (PARTS.find((p) => p.voices[0] === type) || PARTS.find((p) => p.voices.includes(type)) || PARTS[1]).id;

  // ------------------------------------------------------------------ melodies (public domain)
  // deg = semitones from the tonic, beats = quarter-note beats; syl = syllables ('' = held / melisma)
  const HYMNS = [
    { id: 'doxology', title: 'Doxology (Old Hundredth)', author: 'Louis Bourgeois (1551) · Thomas Ken (1674)', tonic: 67, bpb: 4, bpm: 80, level: 1,
      deg: [0, 0, -1, -3, -5, 0, 2, 4, 4, 4, 4, 2, 0, 5, 4, 2, 0, 2, 4, 2, 0, -3, -1, 0, 7, 4, 0, 2, 5, 4, 2, 0],
      beats: [2, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 4],
      syl: 'Praise God from whom all bless- ings flow; Praise Him all crea- tures here be- low; Praise Him a- bove, ye heav’n- ly host; Praise Fa- ther, Son, and Ho- ly Ghost.'.split(' ') },
    { id: 'amazing-grace', title: 'Amazing Grace (New Britain)', author: 'John Newton (1779) · American folk tune', tonic: 67, bpb: 3, bpm: 84, level: 1, pickup: 1,
      deg: [-5, 0, 4, 0, 4, 2, 0, -3, -5, -5, 0, 4, 0, 4, 2, 7],
      beats: [1, 2, 0.5, 0.5, 2, 1, 2, 1, 2, 1, 2, 0.5, 0.5, 2, 1, 3],
      syl: ['A-', 'ma-', 'zing', '', 'grace,', 'how', 'sweet', 'the', 'sound', 'that', 'saved', 'a', '', 'wretch', 'like', 'me!'] },
    { id: 'joyful', title: 'Joyful, Joyful (Hymn to Joy)', author: 'Ludwig van Beethoven (1824) · Henry van Dyke (1907)', tonic: 67, bpb: 4, bpm: 96, level: 1,
      deg: [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2, 4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 2, 0, 0],
      beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2],
      syl: 'Joy- ful, joy- ful, we a- dore Thee, God of glo- ry, Lord of love; Hearts un- fold like flow’rs be- fore Thee, Op’n- ing to the sun a- bove.'.split(' ') },
    { id: 'silent-night', title: 'Silent Night (Stille Nacht)', author: 'Franz X. Gruber (1818)', tonic: 60, bpb: 3, bpm: 66, level: 2,
      deg: [7, 9, 7, 4, 7, 9, 7, 4, 14, 14, 11, 12, 12, 7, 9, 9, 12, 11, 9, 7, 9, 7, 4, 9, 9, 12, 11, 9, 7, 9, 7, 4, 14, 14, 17, 14, 11, 12, 16, 12, 7, 4, 7, 5, 2, 0],
      beats: [0.75, 0.25, 0.5, 1.5, 0.75, 0.25, 0.5, 1.5, 1, 0.5, 1.5, 1, 0.5, 1.5, 1, 0.5, 0.75, 0.25, 0.5, 0.75, 0.25, 0.5, 1.5, 1, 0.5, 0.75, 0.25, 0.5, 0.75, 0.25, 0.5, 1.5, 1, 0.5, 0.75, 0.25, 0.5, 1.5, 1.5, 0.75, 0.25, 0.5, 0.75, 0.25, 0.5, 3] },
    { id: 'saints', title: 'When the Saints Go Marching In', author: 'Traditional spiritual', tonic: 67, bpb: 4, bpm: 108, level: 2, pickup: 1,
      deg: [0, 4, 5, 7, 0, 4, 5, 7, 0, 4, 5, 7, 4, 0, 4, 2],
      beats: [1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1, 2, 2, 2, 2, 4] },
  ];

  // ------------------------------------------------------------------ chord choice
  const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi'];
  const PREF = [3, 1.4, 0.6, 2.5, 2.6, 1.5];
  const triad = (tonic, d) => [MAJ[d], MAJ[(d + 2) % 7], MAJ[(d + 4) % 7]].map((x) => mod12(tonic + x));

  /** Choose a diatonic chord for every melody note. notes: [{midi, start, dur}] (beats). */
  function harmonize(notes, tonicPc, bpb) {
    const out = [];
    let prev = null;
    const strong = (n) => n.dur >= 1 || Math.abs(n.start - Math.round(n.start)) < 1e-6;
    notes.forEach((n, i) => {
      const pc = mod12(n.midi);
      const last = i === notes.length - 1;
      const beforeLast = !last && notes.slice(i + 1).every((x) => x === notes[notes.length - 1] || !strong(x));
      const downbeat = Math.abs((n.start % bpb)) < 1e-6;
      if (prev != null && !strong(n) && !last) { out.push(prev); return; } // passing / neighbour note keeps the chord
      let best = null, bs = -Infinity;
      for (let d = 0; d < 6; d++) {
        const pcs = triad(tonicPc, d);
        if (!pcs.includes(pc)) continue;
        let s = PREF[d];
        if (last) s += d === 0 ? 6 : -4;
        if (beforeLast) s += d === 4 ? 2.5 : d === 3 ? 0.8 : 0;
        if (i === 0) s += d === 0 ? 2.5 : 0;
        if (prev != null) {
          if (prev === d) s += downbeat ? -0.4 : 0.8;
          if (prev === 4 && d === 3) s -= 1.2; // V → IV sounds backwards
          if (prev === 4 && d === 0) s += 0.6;
        }
        if (pcs[1] === pc) s += 0.2; // melody on the 3rd is warm
        if (s > bs) { bs = s; best = d; }
      }
      if (best == null) best = prev != null ? prev : 0; // chromatic note: hold the chord
      out.push(best);
      prev = best;
    });
    return out;
  }

  // ------------------------------------------------------------------ voicing
  const inRange = (m, r) => m >= r[0] && m <= r[1];
  function candidates(pcs, range) { const out = []; for (let m = range[0]; m <= range[1]; m++) if (pcs.includes(mod12(m))) out.push(m); return out; }
  const parallel = (a0, a1, b0, b1) => { const i0 = mod12(a0 - b0), i1 = mod12(a1 - b1); return a0 !== a1 && (i0 === 7 && i1 === 7 || i0 === 0 && i1 === 0); };

  /** Four voices for each melody note; non-chord melody notes hold the other voices. */
  function voiceSATB(notes, chords, tonicPc) {
    const R = Object.fromEntries(PARTS.map((p) => [p.id, p.range]));
    const res = [];
    let prev = null;
    notes.forEach((n, i) => {
      const d = chords[i], pcs = triad(tonicPc, d), S = n.midi;
      // same chord: the lower voices hold while the tune moves (unless it would dip below the alto)
      if (prev && i > 0 && chords[i - 1] === d && S >= prev.A) { res.push({ S, A: prev.A, T: prev.T, B: prev.B, chord: d, held: true }); if (pcs.includes(mod12(S))) prev = res[res.length - 1]; return; }
      let best = null, bc = Infinity;
      const bassOpts = candidates([pcs[0]], R.B).concat(i === notes.length - 1 ? [] : candidates([pcs[1]], R.B).map((m) => ({ m, inv: true })));
      for (const bo of bassOpts) {
        const B = typeof bo === 'number' ? bo : bo.m, inv = typeof bo !== 'number';
        for (const T of candidates(pcs, R.T)) {
          if (T < B || T - B > 19) continue;
          for (const A of candidates(pcs, R.A)) {
            if (A < T || A > S || S - A > 12 || A - T > 12) continue;
            const set = new Set([S, A, T, B].map(mod12));
            if (!set.has(pcs[1])) continue; // the 3rd must be there
            let c = 0;
            if (!set.has(pcs[2])) c += 3; // omitted 5th is allowed but not preferred
            const thirds = [S, A, T, B].filter((x) => mod12(x) === pcs[1]).length;
            if (thirds > 1) c += 4; // don't double the 3rd
            if (inv) c += 6;
            if (prev && Math.abs(B - prev.B) > 7) c += 1.5;
            if (prev) {
              c += Math.abs(A - prev.A) + Math.abs(T - prev.T) + Math.abs(B - prev.B) * 0.5;
              const v = { S, A, T, B }, p = prev;
              const keys = ['S', 'A', 'T', 'B'];
              for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) if (parallel(p[keys[x]], v[keys[x]], p[keys[y]], v[keys[y]])) c += 12;
            } else c += Math.abs(A - 64) * 0.3 + Math.abs(T - 57) * 0.3 + Math.abs(B - 48) * 0.2;
            if (c < bc) { bc = c; best = { S, A, T, B, chord: d }; }
          }
        }
      }
      if (!best) best = { S, A: S - 4, T: S - 9, B: 40 + mod12(pcs[0] - 4), chord: d };
      res.push(best);
      prev = best;
    });
    return res;
  }

  /** Build a playable piece: {title, bpm, bpb, parts: {S,A,T,B: [{midi,start,dur,syl}]}, chords:[{start,name,roman}]} (beats). */
  function buildPiece(hymn) {
    let t = 0;
    const notes = hymn.deg.map((dg, i) => { const n = { midi: hymn.tonic + dg, start: t, dur: hymn.beats[i] }; t += hymn.beats[i]; return n; });
    const tonicPc = mod12(hymn.tonic);
    const offs = hymn.pickup ? hymn.bpb - hymn.pickup : 0; // so downbeats line up
    notes.forEach((n) => (n.start += offs));
    const chords = harmonize(notes, tonicPc, hymn.bpb);
    const v = voiceSATB(notes, chords, tonicPc);
    const parts = { S: [], A: [], T: [], B: [] };
    const syl = hymn.syl || [];
    v.forEach((x, i) => {
      for (const k of ['S', 'A', 'T', 'B']) {
        const list = parts[k], last = list[list.length - 1];
        if (k !== 'S' && x.held && last && last.midi === x[k]) { last.dur += notes[i].dur; continue; }
        list.push({ midi: x[k], start: notes[i].start, dur: notes[i].dur, syl: syl[i] || '' });
      }
    });
    const names = PM.Theory ? (r, q) => PM.Theory.chordName(r, q, [5, 10, 3, 8, 1].includes(tonicPc)) : (r) => String(r);
    const chordList = [];
    chords.forEach((d, i) => { if (!i || chords[i - 1] !== d) chordList.push({ start: notes[i].start, roman: ROMAN[d], name: names(triad(tonicPc, d)[0], d === 1 || d === 2 || d === 5 ? 'm' : '') }); });
    return { id: hymn.id, title: hymn.title, author: hymn.author, bpm: hymn.bpm, bpb: hymn.bpb, length: t + offs, parts, chords: chordList, level: hymn.level, lyrics: !!hymn.syl };
  }

  /** A round: the same melody entering every `gap` beats in up to `voices` parts. */
  function round(melody, gap, voices, title) {
    const parts = {};
    const ids = ['S', 'A', 'T', 'B'].slice(0, voices);
    let len = 0;
    ids.forEach((id, k) => {
      let t = k * gap;
      parts[id] = melody.map(([m, d, s]) => { const n = { midi: m - (k >= 2 ? 12 : 0), start: t, dur: d, syl: s || '' }; t += d; return n; });
      len = Math.max(len, t);
    });
    return { id: 'round-' + title.toLowerCase().replace(/\W+/g, '-'), title, bpm: 92, bpb: 4, length: len, parts, chords: [], round: true };
  }

  // Frère Jacques (traditional) — sung as a round
  const FRERE = [[60, 1, 'Are'], [62, 1, 'you'], [64, 1, 'sleep-'], [60, 1, 'ing,'], [60, 1, 'are'], [62, 1, 'you'], [64, 1, 'sleep-'], [60, 1, 'ing,'],
    [64, 1, 'Bro-'], [65, 1, 'ther'], [67, 2, 'John?'], [64, 1, 'Bro-'], [65, 1, 'ther'], [67, 2, 'John?'],
    [67, 0.5, 'Morn-'], [69, 0.5, 'ing'], [67, 0.5, 'bells'], [65, 0.5, 'are'], [64, 1, 'ring-'], [60, 1, 'ing,'], [67, 0.5, 'morn-'], [69, 0.5, 'ing'], [67, 0.5, 'bells'], [65, 0.5, 'are'], [64, 1, 'ring-'], [60, 1, 'ing,'],
    [60, 1, 'Ding'], [55, 1, 'dang'], [60, 2, 'dong,'], [60, 1, 'ding'], [55, 1, 'dang'], [60, 2, 'dong.']];

  /** Two-part thirds exercise: a scale with a part a diatonic 3rd above. */
  function thirdsPiece(tonic) {
    const lo = [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => tonic + d);
    const hi = lo.map((m) => { const k = MAJ.indexOf(mod12(m - tonic)); return m + MAJ[(k + 2) % 7] - MAJ[k] + (k + 2 >= 7 ? 12 : 0); });
    const mk = (arr) => arr.map((m, i) => ({ midi: m, start: i * 2, dur: 2, syl: ['do', 're', 'mi', 'fa', 'so', 'fa', 'mi', 're', 'do'][i] }));
    return { id: 'thirds', title: 'Singing in thirds', bpm: 80, bpb: 4, length: lo.length * 2, parts: { S: mk(hi), A: mk(lo) }, chords: [] };
  }

  /** Which chord tone (root / 3rd / 5th) a note is in the chord at that time. */
  function chordRole(piece, t, midi) {
    const c = piece.chords.filter((x) => x.start <= t + 1e-6).pop();
    if (!c || !PM.Theory) return '';
    const p = PM.Theory.parseChordName(c.name);
    if (!p) return '';
    const pcs = PM.Theory.chordPcs(p.root, p.type);
    const k = pcs.indexOf(mod12(midi));
    return k === 0 ? 'root' : k === 1 ? '3rd' : k === 2 ? '5th' : 'passing';
  }

  PM.Harmony = { PARTS, HYMNS, partForVoice, harmonize, voiceSATB, buildPiece, round, FRERE, thirdsPiece, chordRole, triad };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Harmony;
})(typeof self !== 'undefined' ? self : globalThis);
