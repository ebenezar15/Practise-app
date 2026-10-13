// Academy: subjects and lessons are complete, every generator makes valid questions,
// answers are musically right, and the placement quiz recommends a sensible level.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const A = PM.Academy;

test('every subject has lessons with explanations, examples or uses, and practice', () => {
  assert.ok(A.SUBJECTS.length >= 12);
  assert.ok(A.LESSONS.length >= 50);
  const ids = new Set();
  for (const l of A.LESSONS) {
    assert.ok(!ids.has(l.id), 'unique ' + l.id); ids.add(l.id);
    assert.ok(A.SUBJECTS.some((s) => s.id === l.subject), l.id + ' subject');
    assert.ok([1, 2, 3].includes(l.level));
    assert.ok(l.body.length >= 1 && l.body.some((b) => b.t === 'p' || b.t === 'list'), l.id + ' explains');
    assert.ok(l.practice.length && l.practice.every((p) => A.GEN[p.gen]), l.id + ' practice');
  }
  for (const s of A.SUBJECTS) assert.ok(A.LESSONS.some((l) => l.subject === s.id), s.id + ' has lessons');
  for (const lv of [1, 2, 3]) assert.ok(A.LESSONS.some((l) => l.level === lv), 'level ' + lv);
  for (const inst of ['piano', 'guitar', 'bass', 'trumpet', 'voice']) assert.ok(A.LESSONS.some((l) => l.instrument === inst), inst + ' lesson');
});

test('generators: valid multiple choice for many seeds', () => {
  for (const g of Object.keys(A.GEN)) for (let seed = 1; seed < 80; seed++) {
    const [q] = A.questions([{ gen: g, n: 1 }], seed);
    assert.ok(q.prompt && q.options.length >= 2, g);
    assert.ok(q.options.includes(q.answer), `${g} answer in options (${q.prompt})`);
    assert.strictEqual(new Set(q.options).size, q.options.length, g + ' distinct options');
  }
});

test('answers are musically correct', () => {
  const find = (g, re, seeds = 400) => { for (let s = 1; s < seeds; s++) { const [q] = A.questions([{ gen: g, n: 1 }], s); if (re.test(q.prompt)) return q; } return null; };
  const q1 = find('relative-minor', /C major/); if (q1) assert.strictEqual(q1.answer, 'Am');
  const q2 = find('key-sig', /in D major/); if (q2) assert.strictEqual(q2.answer, '2');
  const q3 = find('interval-semis', /Perfect 5th/); if (q3) assert.strictEqual(q3.answer, '7');
  const q4 = find('capo', /G-shape.*fret 2/); if (q4) assert.strictEqual(q4.answer, 'A');
  const q5 = find('roman', /In C major, G is/); if (q5) assert.strictEqual(q5.answer, 'V');
  const q6 = find('time-sig', /^3\/4/); if (q6) assert.strictEqual(q6.answer, '3');
  assert.ok(q1 || q2 || q3 || q4 || q5 || q6);
});

test('placement quiz: all right → advanced, all wrong → beginner', () => {
  const qs = A.placementQuestions(5);
  assert.strictEqual(qs.length, 8);
  assert.strictEqual(A.placementResult(qs.map((q) => ({ stage: q.stage, correct: true }))).label, 'Advanced');
  assert.strictEqual(A.placementResult(qs.map((q) => ({ stage: q.stage, correct: false }))).label, 'Beginner');
  const mid = A.placementResult(qs.map((q) => ({ stage: q.stage, correct: q.stage <= 2 })));
  assert.strictEqual(mid.label, 'Intermediate');
  assert.strictEqual(A.stars(0.95), 3); assert.strictEqual(A.stars(0.8), 2); assert.strictEqual(A.stars(0.2), 0);
});
