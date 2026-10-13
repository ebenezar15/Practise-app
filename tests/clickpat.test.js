// Click patterns: step-sequencer model, presets, resize, timing and random generation.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const C = PM.ClickPat;

test('every preset parses into a whole number of beats and bars', () => {
  for (const P of C.PRESETS) {
    const p = C.preset(P.id);
    assert.ok(Number.isInteger(p.beats) && p.beats >= 1, P.id);
    assert.strictEqual(p.steps.length, p.beats * p.sub * p.bars, P.id);
    assert.ok(p.steps.some((v) => v > 0), P.id + ' has a hit');
  }
});

test('encode/parse round-trips and cycle visits every level', () => {
  const p = C.preset('clave32');
  assert.strictEqual(C.encode(p), 'X..x..x...x.x...');
  assert.deepStrictEqual(C.parse(C.encode(p), { sub: 4 }).steps, p.steps);
  const seen = new Set(); let v = 0;
  for (let i = 0; i < 4; i++) { v = C.cycle(v); seen.add(v); }
  assert.strictEqual(seen.size, 4);
});

test('resize keeps the beats when changing subdivision', () => {
  const p = C.resize(C.preset('four'), 4, 2, 1);
  assert.strictEqual(C.encode(p), 'X.x.x.x.');
  assert.strictEqual(C.encode(C.resize(p, 4, 1, 1)), 'Xxxx');
});

test('step times follow tempo and swing', () => {
  const p = C.preset('swing8');
  const { steps, loop } = C.stepTimes(p, 120);
  assert.strictEqual(loop, 2);
  assert.strictEqual(steps[2].t, 0.5);
  assert.ok(steps[1].t > 0.25, 'off-beat delayed by swing');
});

test('random patterns are fresh and harder at higher levels', () => {
  let r = 1; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(C.encode(C.random(1, rnd)));
  assert.ok(seen.size >= 15);
  const avg = (lvl) => { let s = 0; for (let i = 0; i < 30; i++) s += C.difficulty(C.random(lvl, rnd)); return s / 30; };
  assert.ok(avg(2) > avg(0));
});
