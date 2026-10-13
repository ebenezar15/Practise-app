// Synthetic songs with known ground truth (key, tempo, chords with inversions & 7ths, melody,
// texture) used to measure the analyser's accuracy. Deterministic per seed.
const { PM } = require('./load.js');
const mod12 = (x) => ((x % 12) + 12) % 12;

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const MAJOR_DEG = [[0, ''], [2, 'm'], [4, 'm'], [5, ''], [7, ''], [9, 'm']];
const MINOR_DEG = [[0, 'm'], [3, ''], [5, 'm'], [7, ''], [8, ''], [10, '']];
const PROGS_MAJ = [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 0], [5, 3, 0, 4], [0, 1, 4, 0], [0, 3, 1, 4], [0, 2, 3, 4]];
const PROGS_MIN = [[0, 4, 1, 3], [0, 5, 4, 3], [0, 2, 3, 0], [0, 4, 5, 3], [0, 3, 0, 3]];
const TEXTURES = ['strum', 'fingerpick', 'piano-block', 'piano-arp', 'band'];

/**
 * opts: {texture, melody: bool, sevenths: prob, inversions: prob, bars}
 */
function makeSong(seed, opts) {
  opts = opts || {};
  const r = rng(seed * 7919 + 13);
  const tonic = Math.floor(r() * 12);
  const mode = r() < 0.65 ? 'major' : 'minor';
  const bpm = Math.round(72 + r() * 64);
  const beat = 60 / bpm;
  const bpb = r() < 0.18 ? 3 : 4;
  const texture = opts.texture || TEXTURES[Math.floor(r() * TEXTURES.length)];
  const bars = opts.bars || 12;
  const degs = mode === 'major' ? MAJOR_DEG : MINOR_DEG;
  const prog = (mode === 'major' ? PROGS_MAJ : PROGS_MIN)[Math.floor(r() * (mode === 'major' ? PROGS_MAJ.length : PROGS_MIN.length))];
  const lead = bpb * beat; // one bar count-in of silence/hi-hat
  const chords = [];
  const notes = [];
  const melody = [];
  let t = lead;
  for (let b = 0; b < bars; b++) {
    const [deg, q] = degs[prog[b % prog.length]];
    const root = mod12(tonic + deg);
    let type = q;
    if (mode === 'minor' && deg === 7) type = '';                       // harmonic-minor V
    const sev = r() < (opts.sevenths == null ? 0.25 : opts.sevenths);
    if (sev) type = type === 'm' ? 'm7' : deg === 7 ? '7' : (deg === 0 || deg === 5) && mode === 'major' ? 'maj7' : type === '' ? '7' : type;
    const pcs = PM.Theory.chordPcs(root, type);
    let bass = root;
    if (r() < (opts.inversions == null ? 0.2 : opts.inversions)) bass = pcs[r() < 0.6 ? 1 : 2];
    // split some bars into two chords (2 beats each) for faster harmonic rhythm
    const split = bpb === 4 && r() < 0.15 && b % 2 === 1;
    const segs = split ? [[root, type, bass, 2], [mod12(tonic + degs[prog[(b + 1) % prog.length]][0]), degs[prog[(b + 1) % prog.length]][1], null, 2]] : [[root, type, bass, bpb]];
    for (const [sr, st, sb, nb] of segs) {
      const spcs = PM.Theory.chordPcs(sr, st);
      const sbass = sb == null ? sr : sb;
      chords.push({ start: t, end: t + nb * beat, root: sr, type: st, bass: sbass, pcs: spcs });
      voice(texture, notes, t, nb, beat, sr, st, sbass, r);
      if (opts.melody) melodyLine(melody, t, nb, beat, sr, st, tonic, mode, r);
      t += nb * beat;
    }
  }
  if (texture === 'band') drums(notes, lead, t, beat, bpb);
  else for (let i = 0; i < bpb; i++) notes.push({ midi: 42, start: i * beat, end: i * beat + 0.05, velocity: 0.5, channel: 9, voice: 'drums' });
  for (const m of melody) notes.push(Object.assign({ channel: 4, voice: 'trumpet', velocity: 0.75 }, m));
  notes.sort((a, b) => a.start - b.start);
  return { notes, truth: { key: { tonic, mode }, bpm, bpb, chords, melody, texture, duration: t + 1 } };
}

function closeVoicing(pcs, low) {
  // stack chord tones upward from `low`
  const out = [];
  let cur = low;
  for (const pc of pcs) { let m = cur + mod12(pc - cur); if (out.length && m <= out[out.length - 1]) m += 12; out.push(m); cur = m; }
  return out;
}

function voice(texture, notes, t0, nbeats, beat, root, type, bass, r) {
  const pcs = PM.Theory.chordPcs(root, type);
  const bassMidi = 40 + mod12(bass - 4); // E2..D#3
  const upper = closeVoicing([...pcs.slice(1), pcs[0]], 55 + Math.floor(r() * 5));
  const add = (midi, s, d, v, voiceName, ch) => notes.push({ midi, start: s, end: s + d, velocity: v, channel: ch || 0, voice: voiceName });
  if (texture === 'strum' || texture === 'band') {
    const g = [bassMidi + 12 > 52 ? bassMidi : bassMidi + 12, ...closeVoicing(pcs, 52)];
    const pattern = 'D-DU-UDU'.slice(0, nbeats * 2);
    for (let s = 0; s < nbeats * 2; s++) {
      const c = pattern[s % 8];
      if (c === '-') continue;
      const st = t0 + (s * beat) / 2;
      const order = c === 'D' ? g : [...g].reverse().slice(0, 4);
      order.forEach((m, i) => add(m, st + i * 0.012, beat * 0.9, s % 2 ? 0.55 : 0.85, 'guitar', 2));
    }
    if (texture === 'band') {
      for (let k = 0; k < nbeats; k++) add(bassMidi - 12 >= 28 ? bassMidi - 12 : bassMidi, t0 + k * beat, beat * 0.9, 0.85, 'bass', 1);
      closeVoicing(pcs, 60).forEach((m) => add(m, t0, nbeats * beat * 0.95, 0.4, 'piano', 0));
    }
  } else if (texture === 'fingerpick') {
    // Travis-style: thumb alternates bass (root / fifth), fingers pick chord tones on the off-beats
    const tones = closeVoicing(pcs, 55);
    for (let s = 0; s < nbeats * 2; s++) {
      const st = t0 + (s * beat) / 2;
      if (s % 2 === 0) add(s % 4 === 0 ? bassMidi : bassMidi + (mod12(pcs[2] - bass) || 7), st, beat * 0.95, 0.8, 'guitar', 2);
      else add(tones[(s >> 1) % tones.length] + (s % 4 === 3 ? 12 : 0), st, beat * 1.4, 0.6, 'guitar', 2);
    }
  } else if (texture === 'piano-block') {
    add(bassMidi - 12 >= 33 ? bassMidi - 12 + 12 : bassMidi, t0, nbeats * beat * 0.98, 0.75, 'piano', 0);
    for (let k = 0; k < nbeats; k++) upper.forEach((m) => add(m + 12 > 76 ? m : m + 12, t0 + k * beat, beat * 0.9, k ? 0.5 : 0.65, 'piano', 0));
  } else {
    // broken chords (Alberti-ish 8ths) over a held bass
    add(bassMidi, t0, nbeats * beat * 0.98, 0.7, 'piano', 0);
    const tones = closeVoicing(pcs, 60);
    const order = [0, 2, 1, 2];
    for (let s = 0; s < nbeats * 2; s++) add(tones[order[s % 4] % tones.length], t0 + (s * beat) / 2, beat * 0.5, 0.55, 'piano', 0);
  }
}

function melodyLine(mel, t0, nbeats, beat, root, type, tonic, mode, r) {
  const scale = (mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 11]).map((iv) => mod12(tonic + iv));
  const pcs = PM.Theory.chordPcs(root, type);
  const inScale = (m) => scale.includes(mod12(m));
  let last = mel.length ? mel[mel.length - 1].midi : 67;
  for (let k = 0; k < nbeats; k++) {
    // strong beat: nearest chord tone; off-beat (sometimes): a passing scale tone
    let m = last;
    let best = null;
    for (let c = 62; c <= 79; c++) if (pcs.includes(mod12(c)) && (!best || Math.abs(c - last) < Math.abs(best - last))) best = c;
    m = best;
    const st = t0 + k * beat;
    const eighth = r() < 0.45;
    mel.push({ midi: m, start: st, end: st + (eighth ? beat * 0.48 : beat * 0.95) });
    if (eighth) {
      let p = m + (r() < 0.5 ? 1 : -1);
      while (!inScale(p)) p += p > m ? 1 : -1;
      mel.push({ midi: p, start: st + beat * 0.5, end: st + beat * 0.95, passing: !pcs.includes(mod12(p)) });
    }
    last = m;
  }
}

function drums(notes, t0, t1, beat, bpb) {
  for (let t = t0, k = 0; t < t1 - 0.01; t += beat / 2, k++) {
    notes.push({ midi: 42, start: t, end: t + 0.05, velocity: k % 2 ? 0.4 : 0.6, channel: 9, voice: 'drums' });
    const bi = Math.floor(k / 2) % bpb;
    if (k % 2 === 0 && (bi === 0 || (bpb === 4 && bi === 2))) notes.push({ midi: 36, start: t, end: t + 0.1, velocity: 0.9, channel: 9, voice: 'drums' });
    if (k % 2 === 0 && (bi === 1 || bi === 3)) notes.push({ midi: 38, start: t, end: t + 0.1, velocity: 0.75, channel: 9, voice: 'drums' });
  }
}

// ---------------------------------------------------------------- scoring
const majmin = (type) => (['m', 'm7', 'dim'].includes(type) ? 'min' : 'maj');
function chordAt(list, t) { return list.find((c) => c.start <= t && c.end > t) || null; }

function scoreChords(pred, truth) {
  let n = 0, root = 0, mm = 0, full = 0, bassOk = 0, invN = 0, invOk = 0;
  for (const tc of truth.chords) {
    for (let t = tc.start + 0.05; t < tc.end - 0.05; t += 0.1) {
      const p = chordAt(pred, t);
      n++;
      if (!p || p.root == null) continue;
      if (p.root === tc.root) { root++; if (majmin(p.type) === majmin(tc.type)) { mm++; if (p.type === tc.type) full++; } }
      const pb = p.bass == null ? p.root : p.bass;
      if (pb === tc.bass) bassOk++;
      if (tc.bass !== tc.root) { invN++; if (p.root === tc.root && pb === tc.bass) invOk++; }
    }
  }
  return { root: root / n, majmin: mm / n, sevenths: full / n, bass: bassOk / n, inversions: invN ? invOk / invN : null, frames: n };
}

function scoreBoundaries(pred, truth) {
  const tb = truth.chords.slice(1).map((c) => c.start);
  const pb = pred.filter((c) => c.root != null).slice(1).map((c) => c.start);
  let hit = 0, err = 0;
  for (const b of tb) { let best = Infinity; for (const p of pb) best = Math.min(best, Math.abs(p - b)); if (best < 0.25) { hit++; err += best; } }
  return { recall: tb.length ? hit / tb.length : 1, precision: pb.length ? Math.min(1, hit / pb.length) : 0, meanErrMs: hit ? Math.round((err / hit) * 1000) : null };
}

function scoreMelody(pred, truth) {
  const tm = truth.melody;
  if (!tm.length) return null;
  let found = 0, used = new Set();
  for (const n of tm) {
    const i = pred.findIndex((p, k) => !used.has(k) && p.midi === n.midi && Math.abs(p.start - n.start) < 0.07);
    if (i >= 0) { used.add(i); found++; }
  }
  const passing = tm.filter((n) => n.passing);
  let pf = 0;
  for (const n of passing) if (pred.some((p) => p.midi === n.midi && Math.abs(p.start - n.start) < 0.07)) pf++;
  return { recall: found / tm.length, precision: pred.length ? found / pred.length : 0, passingRecall: passing.length ? pf / passing.length : null };
}

module.exports = { makeSong, scoreChords, scoreBoundaries, scoreMelody, TEXTURES, majmin };
