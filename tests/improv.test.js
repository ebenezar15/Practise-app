const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load');
const { Midi, Analyzer, Improv, Backing, Instruments, Separation, Theory } = PM;

test('backing generator: any key/style, excludes the student instrument, analyses to the right key & chords', async () => {
  const g = Backing.generate({ tonic: 7, progression: 'pop', style: 'rock', bpm: 100, choruses: 2, exclude: 'bass' });
  assert.ok(!g.notes.some((n) => n.voice === 'bass'));
  const midi = Midi.parseMidi(Midi.writeMidi(g.notes, { bpm: g.bpm, key: g.key }));
  const a = await Analyzer.analyzeMidi(midi, { instrument: 'bass' });
  assert.strictEqual(a.key.name, 'G major');
  assert.strictEqual(a.chordSummary.loop, 'G → D → Em → C');
  const stems = Midi.renderStems(midi.notes, { sampleRate: 8000 });
  assert.deepStrictEqual(stems.stems.map((s) => s.id).sort(), ['drums', 'keys']);
  const blues = Backing.generate({ tonic: 9, progression: 'blues', style: 'swing', bpm: 120, choruses: 1, exclude: 'trumpet' });
  const b = await Analyzer.analyzeMidi(Midi.parseMidi(Midi.writeMidi(blues.notes, { bpm: 120, key: blues.key })), {});
  assert.deepStrictEqual([...new Set(b.chords.filter((c) => c.name !== 'N').map((c) => c.name))].sort(), ['A7', 'D7', 'E7']);
});

test('improv coach: inside notes score, outside notes get corrected, targeting is praised', async () => {
  const g = Backing.generate({ tonic: 0, progression: 'pop', style: 'rock', bpm: 120, choruses: 1 });
  const ref = await Analyzer.analyzeMidi(Midi.parseMidi(Midi.writeMidi(g.notes, { bpm: 120, key: g.key })), {});
  const msgs = [];
  const c = new Improv.ImprovCoach({ instrument: 'trumpet', reference: ref, onMessage: (m) => msgs.push(m) });
  const frame = (t, midi, onset) => ({ time: t, active: true, onset, db: -20, pitch: { midi, confidence: 0.95, name: '' }, notes: [] });
  for (let t = 2; t < 6; t += 1 / 30) { const at = Analyzer.chordAt(ref, t); c.update(frame(t, 60 + Theory.chordPcs(at.chord.root, at.chord.type)[1], t - at.chord.start < 0.04), t); }
  assert.ok(c.fit() > 0.95);
  assert.ok(msgs.some((m) => /targeting/.test(m.text)), msgs.map((m) => m.text).join('\n'));
  for (let t = 6; t < 8; t += 1 / 30) c.update(frame(t, 61, false), t); // C# over C/G/Am/F
  assert.ok(msgs.some((m) => m.type === 'fix' && /clashes/.test(m.text)));
  const s = c.summary();
  assert.ok(s.insights.length >= 3 && s.score > 0);
  const sug = Improv.suggestions({ root: 7, type: '7', name: 'G7' }, Theory.keyInfo(0, 'major'));
  assert.ok(/Mixolydian/.test(sug.scaleName));
});

test('monophonic transcription recovers a bass line and a trumpet melody', async () => {
  for (const [voice, line] of [['bass', [28, 31, 33, 35, 36, 38, 40, 43]], ['trumpet', [60, 62, 64, 65, 67, 69, 71, 72]]]) {
    const notes = line.map((m, i) => ({ midi: m, start: 0.2 + i * 0.4, end: 0.2 + i * 0.4 + 0.35, velocity: 0.9, voice }));
    const r = Midi.renderNotes(notes, { sampleRate: 22050, useProgram: false });
    const got = await Analyzer.transcribeMono(r.data, 22050, { minFreq: Instruments.get(voice).minFreq, maxFreq: Instruments.get(voice).maxFreq });
    assert.deepStrictEqual(got.map((n) => n.midi), line, voice + ' got ' + got.map((n) => n.midi));
  }
});

test('instrument registry: trumpet transposition & fingering, fret positions', () => {
  assert.deepStrictEqual(Instruments.trumpetInfo(58), { written: 60, valves: '0' }); // concert Bb = written C open
  assert.strictEqual(Instruments.trumpetInfo(60).valves, '1 3'); // concert C = written D
  assert.deepStrictEqual(Instruments.fretPosition('bass', 33), { string: 1, fret: 0 });
  assert.strictEqual(Instruments.list().length, 5);
});
