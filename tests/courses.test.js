// Academy instrument courses: every instrument at every level, interactive blocks and fresh questions.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const A = PM.Academy;

test('each instrument has a course with lessons at all three levels', () => {
  for (const inst of ['piano', 'guitar', 'bass', 'trumpet', 'voice']) {
    const c = A.COURSES.find((x) => x.course === inst);
    assert.ok(c, inst);
    const ls = A.LESSONS.filter((l) => l.subject === c.id);
    for (const lv of [1, 2, 3]) assert.ok(ls.filter((l) => l.level === lv).length >= 4, `${inst} level ${lv}`);
    assert.ok(ls.every((l) => l.instrument === inst));
    assert.ok(ls.some((l) => l.body.some((b) => ['fing', 'drill', 'fretx', 'keyx', 'valvex'].includes(b.t))), inst + ' is interactive');
  }
  assert.strictEqual(new Set(A.LESSONS.map((l) => l.id)).size, A.LESSONS.length, 'unique ids');
});

test('every practice generator exists and produces valid, varied questions', () => {
  for (const l of A.LESSONS) {
    const qs = A.questions(l.practice, 11);
    assert.ok(qs.length >= 4, l.id);
    for (const q of qs) { assert.ok(q.options.includes(q.answer), l.id + ' ' + q.prompt); assert.strictEqual(new Set(q.options).size, q.options.length); }
  }
  const prompts = (seed) => A.questions([{ gen: 'fret-note-g', n: 6 }, { gen: 'valves-for', n: 6 }], seed).map((q) => q.prompt).join('|');
  assert.notStrictEqual(prompts(1), prompts(2));
});

test('fingering blocks hold notes each instrument can play', () => {
  for (const c of A.COURSES) {
    if (c.course === 'voice') continue;
    for (const l of A.LESSONS.filter((x) => x.subject === c.id)) {
      for (const b of l.body.filter((x) => x.t === 'fing')) {
        const f = PM.Fingering.forInstrument(c.course, b.notes, b.hand);
        if (c.course === 'bass' && b.notes.some((m) => m < 28)) { PM.Instruments.setBassStrings(5); assert.ok(PM.Fingering.forInstrument('bass', b.notes).options.length, l.id); PM.Instruments.setBassStrings(4); continue; }
        assert.ok(f.options.length, `${l.id}: ${b.title}`);
        if (f.kind === 'valves') assert.ok(f.options[0].per.every((x) => x.length), `${l.id}: ${b.title} in range`);
      }
    }
  }
});
