const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
require('../js/audio/drums.js');
require('../js/core/syncmerge.js');
const { Curriculum, Styles, Agent, Learn, Instruments, Drums, SyncMerge } = PM;

test('every instrument has 50+ graded exercises, ordered simple → complex and playable', () => {
  for (const inst of Object.keys(Instruments.INSTRUMENTS)) {
    const list = Curriculum.forInstrument(inst);
    assert.ok(list.length >= 50, `${inst}: ${list.length} exercises`);
    const R = Learn.RANGE[inst];
    let lastLevel = 0;
    const ids = new Set();
    for (const e of list) {
      assert.ok(e.level >= lastLevel, `${inst} ordered by level`);
      lastLevel = e.level;
      assert.ok(!ids.has(e.id)); ids.add(e.id);
      assert.ok(e.title && e.tip && e.bpm >= 40);
      if (e.kind === 'notes') {
        assert.strictEqual(e.notes.length, e.beats.length, e.title);
        assert.ok(e.notes.length >= 3);
        assert.ok(Math.min(...e.notes) >= R.low && Math.max(...e.notes) <= R.high, `${inst} ${e.title} in range`);
      } else {
        assert.strictEqual(e.kind, 'chords');
        for (const c of e.chords) assert.ok(PM.Theory.parseChordName(c), `${c} parses`);
      }
    }
    for (let l = 1; l <= 5; l++) assert.ok(list.filter((e) => e.level === l).length >= 8, `${inst} level ${l}`);
    if (Instruments.get(inst).chordal) assert.ok(list.some((e) => e.kind === 'chords'));
  }
});

test('rhythm style library: valid patterns, every variation, required genres', () => {
  assert.ok(Styles.STYLES.length >= 35);
  const names = Styles.STYLES.map((s) => s.name.toLowerCase()).join(' | ');
  for (const g of ['ballad', 'disco', 'hard rock', 'funk', 'bossa', 'swing', 'waltz', 'reggae', 'gospel', 'country', 'samba', 'tango', '6/8']) assert.ok(names.includes(g), 'has ' + g);
  for (const s of Styles.STYLES) {
    for (const v of ['A', 'B', 'fill', 'intro', 'ending']) {
      const p = s.variations[v];
      assert.ok(p, `${s.id} ${v}`);
      assert.strictEqual(p.steps, p.beatsPerBar * p.stepsPerBeat);
      for (const [k, t] of Object.entries(p.tracks)) { assert.ok(Drums.VOICE_IDS.includes(k), `${s.id} voice ${k}`); assert.strictEqual(t.length, p.steps, `${s.id} ${v} ${k}`); assert.ok(/^[Xxo.f]+$/.test(t)); }
      if (p.bass) assert.strictEqual(p.bass.length, p.steps, `${s.id} ${v} bass`);
      if (p.comp) assert.strictEqual(p.comp.length, p.steps, `${s.id} ${v} comp`);
    }
    assert.ok(Object.values(s.variations.A.tracks).some((t) => /[Xx]/.test(t)), s.id + ' plays something');
  }
  const ch = Styles.parseChords('C | Am7 | F G | Bb');
  assert.deepStrictEqual(ch.map((c) => [c.root, c.type]), [[0, ''], [9, 'm7'], [5, ''], [10, '']]);
  assert.strictEqual(Drums.velOf('X'), 1);
  assert.strictEqual(Drums.velOf('.'), 0);
  const e = Drums.emptyPattern(3, 4);
  assert.strictEqual(e.steps, 12);
});

test('Cadi answers music questions and reviews takes', () => {
  const r = (q, ctx) => Agent.respond(q, ctx || { instrument: 'guitar' }).text;
  assert.match(r('How do I play Bm chord?'), /B – D – F#.*x 2 4 4 3 2/);
  assert.match(r('notes in D major'), /D – E – F# – G – A – B – C#/);
  assert.match(r('A minor pentatonic scale'), /A – C – D – E – G/);
  assert.match(r('what is a perfect fifth?'), /7 semitones/);
  assert.match(r('what is 6/8?'), /3 \+ 3/);
  assert.match(r('what does allegro mean?'), /fast/);
  assert.match(r('how do I play C on piano'), /On piano/);
  assert.match(r('I keep rushing'), /.{20,}/);
  assert.match(r('what should I practise?', { instrument: 'piano', next: { id: 'p-1', n: 1, title: 'Middle C', level: 1 }, game: { dailyGoalMinutes: 15, todaySeconds: 0 } }), /Middle C/);
  const stats = Agent.takeStats([{ result: 'hit', offsetMs: 10 }, { result: 'late', offsetMs: 90 }, { result: 'wrong', playedName: 'F', expectedName: 'F#' }, { result: 'miss' }], 80);
  assert.strictEqual(stats.accuracy, 0.5);
  assert.strictEqual(stats.inTime, 0.25);
  assert.strictEqual(stats.missed, 1);
  const st = {};
  assert.ok(Agent.react({ type: 'start', title: 'X', bpm: 80 }, st).text);
  for (let i = 0; i < 3; i++) Agent.react({ type: 'note', result: 'early', offsetMs: -60 }, st);
  const rush = Agent.react({ type: 'note', result: 'early', offsetMs: -60 }, st) || Agent.react({ type: 'note', result: 'early' }, st);
  assert.ok(st.toldRush, 'warns about rushing');
  const review = Agent.react({ type: 'end', stats: Object.assign({}, stats, { accuracy: 0.9, inTime: 0.85 }), prev: stats }, st).text;
  assert.match(review, /Improvement since your last take/);
  void rush;
});

test('exercise-path progress merges across devices', () => {
  const a = { xp: 0, level: 1, path: { 'guitar-01': { best: 0.8, stars: 1, bpm: 60, takes: 2, last: '2026-01-01' } } };
  const b = { xp: 0, level: 1, path: { 'guitar-01': { best: 0.95, stars: 3, bpm: 72, takes: 1, last: '2026-02-01' }, 'guitar-02': { best: 0.7, stars: 1 } } };
  const m = SyncMerge.mergeProgress(a, b);
  assert.strictEqual(m.path['guitar-01'].stars, 3);
  assert.strictEqual(m.path['guitar-01'].bpm, 72);
  assert.ok(m.path['guitar-02']);
});
