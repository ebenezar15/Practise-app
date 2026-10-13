// Singing: vocal curriculum per voice type, pitch-trail judging, vocal coaching, song sections.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const { Curriculum, Learn, Instruments, Agent, Analyzer, Theory, Midi, Separation } = PM;

test('voice: 50+ vocal exercises for every voice type, in range and graded', () => {
  for (const type of Object.keys(Instruments.VOICE_TYPES)) {
    Learn.setVoiceType(type);
    const R = Learn.RANGE.voice;
    const list = Curriculum.forInstrument('voice');
    assert.ok(list.length >= 50, `${type}: ${list.length} exercises`);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].level >= list[i - 1].level, 'ordered by level');
    for (const e of list) {
      assert.ok(e.notes.length && e.notes.length === e.beats.length, e.title);
      assert.ok(e.notes.every((m) => Number.isInteger(m) && m >= R.low && m <= R.high), `${type} ${e.title} in range`);
    }
    const cats = new Set(list.map((e) => e.cat));
    for (const c of ['Breath', 'Warm-up', 'Scales', 'Arpeggios', 'Agility', 'Registers', 'Harmony', 'Sight-singing', 'Sing-along', 'Carnatic', 'Style']) assert.ok(cats.has(c), `${type} has ${c}`);
    assert.ok(list.filter((e) => e.cat === 'Sing-along').length >= 6, 'sing-along songs');
    assert.ok(list.some((e) => e.syllable), 'exercises say what to sing on');
  }
  Learn.setVoiceType('alto');
  // warm-ups climb by semitones
  const ma = Curriculum.forInstrument('voice').find((e) => /on "ma"/.test(e.title));
  assert.strictEqual(ma.notes[9] - ma.notes[0], 1);
  // the voice instrument is a mono singer with vocals as its part
  const I = Instruments.get('voice');
  assert.ok(I.mono && I.family === 'voice' && I.tips.length >= 8);
  assert.strictEqual(Learn.exercises('voice', 0).length >= 3, true);
});

test('pitch trail: cents, grades and octave-free judging', () => {
  const { judge, targetAt } = PM.PitchTrail;
  assert.deepStrictEqual(judge(60.2, 60), { cents: 20, grade: 'good' });
  assert.strictEqual(judge(60.6, 60).grade, 'close');
  assert.strictEqual(judge(61.2, 60).grade, 'off');
  assert.strictEqual(judge(48.1, 60, true).grade, 'good', 'an octave down counts when octave-free');
  assert.strictEqual(judge(48.1, 60, false).grade, 'off');
  assert.strictEqual(judge(null, 60), null);
  const notes = [{ midi: 60, start: 0, end: 1 }, { midi: 62, start: 1, end: 2 }, { midi: 64, start: 3, end: 4 }];
  assert.strictEqual(targetAt(notes, 0.5).midi, 60);
  assert.strictEqual(targetAt(notes, 1.5).midi, 62);
  assert.strictEqual(targetAt(notes, 2.5), null);
  const tr = new PM.PitchTrail.PitchTrail(null, {});
  tr.setTargets(notes);
  for (let t = 0; t < 2; t += 0.02) tr.push(t, (t < 1 ? 60 : 62) + 0.1);
  assert.ok(tr.accuracy() > 0.95);
});

test('Cadi coaches singers: breath, registers, pitch, vocal health, sung chords', () => {
  const ask = (q) => Agent.respond(q, { instrument: 'voice' }).text;
  assert.match(ask('how do I breathe properly when I sing?'), /breath|belly|hiss|ribs/i);
  assert.match(ask('my voice cracks going into head voice'), /head voice|break|siren|lighter|nay/i);
  assert.match(ask('I keep singing out of tune'), /flat|sharp|ear|pitch|head/i);
  assert.match(ask('my throat is sore after singing'), /rest|hydrate|doctor|strain/i);
  assert.match(ask('how do I sing a G chord'), /arpeggiate|do-mi-so/);
  // instrument players still get instrument answers for "breath"
  assert.doesNotMatch(Agent.respond('tips for breathing', { instrument: 'trumpet' }).text, /sing|vocal|hiss/i);
  const review = Agent.takeReview({ accuracy: 0.8, inTime: 0.7, avgOffset: 5, spread: 20, slips: [], missed: 1, bpm: 72, pitch: { inTune: 0.55, avgCents: 38, bias: -22 } }, null, { title: 'x' });
  assert.match(review, /flat/);
});

test('song sections: verse / chorus / intro labels and bars for navigation', () => {
  const prog = { I: ['C', 'C', 'C', 'C'], V: ['C', 'G', 'Am', 'F'], C: ['F', 'G', 'C', 'Am'] };
  const order = ['I', 'V', 'V', 'C', 'C', 'V', 'C', 'C'];
  const bar = 2.4, chords = [], curve = [];
  let t = 0;
  for (const s of order) for (const n of prog[s]) {
    const p = Theory.parseChordName(n);
    chords.push({ start: t, end: t + bar, name: n, root: p.root, type: p.type, pcs: Theory.chordPcs(p.root, p.type) });
    for (let k = 0; k < 10; k++) curve.push({ t: t + k * 0.24, db: s === 'C' ? -8 : -20 });
    t += bar;
  }
  const downbeats = [];
  for (let x = 0; x < t - 1e-6; x += bar) downbeats.push(x);
  const secs = Analyzer.sections({ chords, downbeats, duration: t, tempo: { bpm: 100 }, dynamics: { curve } });
  assert.deepStrictEqual(secs.map((x) => x.label), ['Intro', 'Verse 1', 'Chorus 1', 'Verse 2', 'Chorus 2']);
  assert.deepStrictEqual(secs.map((x) => x.bar), [1, 5, 13, 21, 25]);
  assert.strictEqual(Analyzer.sections({ chords: [] }).length, 0);
});

test('a sung part in a MIDI file becomes the singer\'s vocals stem', () => {
  const notes = [{ midi: 60, start: 0, end: 1, velocity: 0.8, channel: 3, voice: 'voice' }, { midi: 48, start: 0, end: 1, velocity: 0.8, channel: 0, voice: 'piano' }];
  const parsed = Midi.parseMidi(Midi.writeMidi(notes, { bpm: 90 }));
  const stems = Midi.renderStems(parsed.notes, { sampleRate: 8000 }).stems;
  assert.ok(stems.some((s) => s.id === 'vocals'));
  assert.strictEqual(Separation.partStemFor('voice', stems), 'vocals');
});
