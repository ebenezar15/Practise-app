const test = require('node:test');
const assert = require('node:assert');
const { PM, strummedSong } = require('./load');
const { DSP, Theory, Rhythm, Midi, Analyzer } = PM;

const sine = (f, sr, sec, amp = 0.5) => Float32Array.from({ length: Math.round(sr * sec) }, (_, i) => amp * Math.sin((2 * Math.PI * f * i) / sr));

test('YIN detects pitch within 5 cents', () => {
  for (const f of [82.41, 110, 196, 440, 659.25]) {
    const buf = sine(f, 44100, 0.05);
    const r = DSP.yin(buf.subarray(0, 2048), 44100);
    assert.ok(r, 'pitch found for ' + f);
    const cents = 1200 * Math.log2(r.freq / f);
    assert.ok(Math.abs(cents) < 5, `f=${f} got ${r.freq} (${cents}c)`);
  }
});

test('FFT peak lands on the right bin', () => {
  const sr = 8192, n = 1024;
  const spec = DSP.spectrumAnalyzer(n);
  const mags = spec(sine(1000, sr, 0.2), 0);
  const peaks = DSP.spectralPeaks(mags, sr, n);
  assert.ok(Math.abs(peaks[0].freq - 1000) < 2, 'peak ' + peaks[0].freq);
});

test('chord detection from rendered piano chords', () => {
  const cases = { C: [48, 60, 64, 67], Am: [45, 57, 60, 64], G7: [43, 55, 59, 62, 65], Em: [40, 52, 55, 59], Dm: [50, 62, 65, 69], F: [41, 53, 57, 60] };
  for (const [name, midis] of Object.entries(cases)) {
    const r = Midi.renderNotes(midis.map((m) => ({ midi: m, start: 0, end: 1, velocity: 0.8 })), { sampleRate: 22050 });
    const spec = DSP.spectrumAnalyzer(4096);
    const mags = spec(r.data, 2048);
    const peaks = DSP.spectralPeaks(mags, 22050, 4096);
    const ch = Theory.detectChord(DSP.chromaFromPeaks(peaks), { bass: DSP.chromaFromPeaks(peaks, null, { maxFreq: 260 }) });
    assert.strictEqual(ch.name, name, `expected ${name}, got ${ch.name} (alts ${ch.alternatives})`);
  }
});

test('chordFromNotes names exact chords and inversions', () => {
  assert.strictEqual(Theory.chordFromNotes([60, 64, 67]).name, 'C');
  assert.strictEqual(Theory.chordFromNotes([57, 60, 64]).name, 'Am');
  assert.strictEqual(Theory.chordFromNotes([52, 60, 67]).name, 'C/E');
  assert.strictEqual(Theory.chordFromNotes([55, 59, 62, 65]).name, 'G7');
});

test('polyphonic note estimate finds the notes of a triad', () => {
  const midis = [48, 52, 55];
  const r = Midi.renderNotes(midis.map((m) => ({ midi: m, start: 0, end: 1, velocity: 0.8 })), { sampleRate: 22050 });
  const mags = DSP.spectrumAnalyzer(4096)(r.data, 2048);
  const notes = DSP.polyNotes(DSP.spectralPeaks(mags, 22050, 4096), { maxNotes: 4 }).map((n) => n.midi);
  for (const m of midis) assert.ok(notes.includes(m), `missing ${m} in ${notes}`);
});

test('key detection', () => {
  const ch = new Float32Array(12);
  [0, 2, 4, 5, 7, 9, 11].forEach((pc, i) => (ch[pc] = [3, 1, 2, 1, 2.5, 1, 0.8][i]));
  assert.strictEqual(Theory.detectKey(ch).name, 'C major');
  const am = new Float32Array(12);
  [9, 11, 0, 2, 4, 5, 7].forEach((pc, i) => (am[pc] = [3, 1, 2, 1, 2.5, 1, 1][i]));
  assert.strictEqual(Theory.detectKey(am).name, 'A minor');
});

test('roman numerals', () => {
  const key = Theory.keyInfo(7, 'major');
  assert.strictEqual(Theory.romanNumeral(0, '', key), 'IV');
  assert.strictEqual(Theory.romanNumeral(4, 'm', key), 'vi');
  assert.strictEqual(Theory.romanNumeral(2, '7', key), 'V7');
  assert.strictEqual(Theory.romanNumeral(5, '', key), 'bVII');
});

test('guitar shapes exist for common chords', () => {
  for (const n of ['C', 'G', 'F', 'Bm', 'F#m', 'Bb', 'C#m7', 'Ebmaj7']) {
    const p = Theory.parseChordName(n);
    const s = Theory.guitarShape(p.root, p.type);
    assert.ok(s && s.frets.length === 6, 'shape for ' + n);
    // all fretted notes must be chord tones
    const pcs = Theory.chordPcs(p.root, p.type);
    s.frets.forEach((f, i) => { if (f >= 0) assert.ok(pcs.includes((Theory.STANDARD_TUNING[i] + f) % 12), `${n} string ${i}`); });
  }
});

test('tempo from a click track', () => {
  for (const bpm of [72, 100, 128]) {
    const sr = 22050, sec = 20;
    const data = new Float32Array(sr * sec);
    for (let t = 0.3; t < sec; t += 60 / bpm) {
      const s = Math.floor(t * sr);
      for (let i = 0; i < 400; i++) data[s + i] += Math.sin(i * 0.4) * Math.exp(-i / 60) * 0.8;
    }
    const f = Rhythm.onsetFeatures(data, sr);
    const nov = Rhythm.noveltyCurve(f.flux, f.hopTime);
    const est = Rhythm.estimateTempo(nov, f.hopTime);
    assert.ok(Math.abs(est.bpm - bpm) / bpm < 0.03, `bpm ${bpm} got ${est.bpm}`);
    const beats = Rhythm.trackBeats(nov, f.hopTime, est.bpm);
    assert.ok(beats.length > (sec - 1) * bpm / 60 * 0.9, 'enough beats');
  }
});

test('MIDI write/parse round trip', () => {
  const notes = [{ midi: 60, start: 0, end: 0.5, velocity: 0.8 }, { midi: 64, start: 0.5, end: 1, velocity: 0.5 }];
  const m = Midi.parseMidi(Midi.writeMidi(notes, { bpm: 90, num: 3, den: 4 }));
  assert.strictEqual(m.notes.length, 2);
  assert.ok(Math.abs(m.notes[1].start - 0.5) < 0.01);
  assert.ok(Math.abs(m.tempos[0].bpm - 90) < 0.1);
  assert.deepStrictEqual([m.timeSigs[0].num, m.timeSigs[0].den], [3, 4]);
});

test('MIDI guitar analysis: tempo, meter, key, chords, strumming', async () => {
  const notes = strummedSong({});
  const midi = Midi.parseMidi(Midi.writeMidi(notes, { bpm: 96 }));
  const a = await Analyzer.analyzeMidi(midi, { instrument: 'guitar' });
  assert.strictEqual(Math.round(a.tempo.bpm), 96);
  assert.strictEqual(a.meter.label, '4/4');
  assert.strictEqual(a.key.name, 'G major');
  const names = a.chords.filter((c) => c.name !== 'N').map((c) => c.name);
  for (const n of ['G', 'C', 'D']) assert.ok(names.includes(n), 'has ' + n + ' in ' + names);
  assert.ok(a.strum, 'strum pattern');
  assert.strictEqual(a.strum.patternText, 'D - D U - U D U');
});

test('audio guitar analysis recovers tempo, key, chords and strum pattern', async () => {
  const notes = strummedSong({ bars: 12 });
  const r = Midi.renderNotes(notes, { instrument: 'guitar', sampleRate: 22050 });
  const a = await Analyzer.analyzeAudio([r.data], r.sampleRate, { instrument: 'guitar' });
  console.log('  audio →', a.tempo.bpm, a.meter.label, a.key && a.key.name, a.chordSummary.loop, '|', a.strum && a.strum.patternText, a.strum && a.strum.consistency.toFixed(2));
  assert.ok(Math.abs(a.tempo.bpm - 96) < 3 || Math.abs(a.tempo.bpm - 192) < 6 || Math.abs(a.tempo.bpm - 48) < 2, 'tempo ' + a.tempo.bpm);
  assert.ok(['G major', 'E minor'].includes(a.key.name), 'key ' + a.key.name);
  const names = new Set(a.chords.map((c) => c.name));
  for (const n of ['G', 'C', 'D']) assert.ok(names.has(n), 'chord ' + n + ' in ' + [...names]);
  assert.strictEqual(a.strum.patternText, 'D - D U - U D U');
  assert.strictEqual(a.strum.gridLabel, '8th notes');
  assert.strictEqual(a.meter.label, '4/4');
});

test('audio piano analysis in 3/4', async () => {
  // waltz: bass on 1, chord on 2 & 3
  const bpm = 120, beat = 0.5, notes = [];
  const prog = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]];
  for (let bar = 0; bar < 16; bar++) {
    const c = prog[bar % 4], t = 0.25 + bar * 3 * beat;
    notes.push({ midi: c[0], start: t, end: t + beat * 3, velocity: 1 });
    for (const b of [1, 2]) for (const m of c.slice(1)) notes.push({ midi: m, start: t + b * beat, end: t + (b + 0.8) * beat, velocity: 0.45 });
  }
  const r = Midi.renderNotes(notes, { sampleRate: 22050 });
  const a = await Analyzer.analyzeAudio([r.data], r.sampleRate, { instrument: 'piano' });
  console.log('  waltz →', a.tempo.bpm, a.meter.label, a.key.name, a.chordSummary.loop);
  assert.ok(Math.abs(a.tempo.bpm - 120) < 4, 'tempo ' + a.tempo.bpm);
  assert.strictEqual(a.meter.beatsPerBar, 3);
  assert.strictEqual(a.key.name, 'C major');
  assert.strictEqual(a.chordSummary.loop, 'C → G → Am → F');
  assert.deepStrictEqual(a.chords.filter((c) => c.name !== 'N').slice(0, 4).map((c) => c.roman), ['I', 'V', 'vi', 'IV']);
});
