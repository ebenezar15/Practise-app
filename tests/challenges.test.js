// Challenge Arena: 20+ challenges per level, valid questions and fresh sets every time.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const X = PM.Challenges;

test('at least 20 distinct challenges at each level', () => {
  for (const lv of [1, 2, 3]) {
    const cs = X.CHALLENGES.filter((c) => c.level === lv);
    assert.ok(cs.length >= 20, `level ${lv} has ${cs.length}`);
    assert.strictEqual(new Set(cs.map((c) => c.gen)).size, cs.length, `level ${lv}: every challenge has its own generator`);
    assert.ok(new Set(cs.map((c) => c.mode)).size >= 3, 'mixes rounds, timed and lives');
  }
  assert.strictEqual(new Set(X.CHALLENGES.map((c) => c.id)).size, X.CHALLENGES.length);
});

test('every generator makes well-formed questions', () => {
  const r = X.rng(42);
  for (const c of X.CHALLENGES) {
    for (let i = 0; i < 40; i++) {
      const q = X.question(c, r);
      assert.ok(q && q.prompt, c.id);
      if (q.type === 'mc') { assert.ok(q.options.includes(q.answer), `${c.id}: ${q.prompt} → ${q.answer} in ${q.options}`); assert.strictEqual(new Set(q.options).size, q.options.length, c.id); assert.ok(q.options.length >= 2, c.id); }
      else if (q.type === 'order') { assert.deepStrictEqual(q.items.slice().sort(), q.answer.slice().sort(), c.id); }
      else if (q.type === 'keys') { assert.ok(q.answer.length && q.answer.every((m) => q.pcOnly || (m >= q.lo && m <= q.hi)), c.id); assert.ok(X.checkKeys(q, q.answer), c.id); }
      else if (q.type === 'fret') assert.ok(q.answer.length && q.answer.every((a) => a.fret >= 0 && a.fret <= 12), c.id);
      else if (q.type === 'tap') assert.ok(q.rhythm.length >= 2 && q.bpm > 0, c.id);
      else assert.fail('unknown type ' + q.type);
    }
  }
});

test('questions change every time you play', () => {
  for (const c of X.CHALLENGES) {
    const a = JSON.stringify(X.round(c, 1)), b = JSON.stringify(X.round(c, 2)), d = JSON.stringify(X.round(c, 3));
    assert.ok(a !== b || b !== d, c.id + ' repeats');
  }
});

test('tap scoring rewards accurate rhythms', () => {
  const rh = [1, 0.5, 0.5, 2], bpm = 120, beat = 0.5;
  const perfect = [0, 0.5, 0.75, 1.0].map((x) => 3 + x);
  assert.ok(X.scoreTaps(perfect, rh, bpm) > 0.95);
  const sloppy = [0, 0.7, 0.85, 1.3].map((x) => 3 + x);
  assert.ok(X.scoreTaps(sloppy, rh, bpm) < 0.6);
  assert.ok(X.scoreTaps([0, 0.5], rh, bpm) < 0.5);
  void beat;
});
