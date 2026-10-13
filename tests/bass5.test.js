const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');

test('5-string bass adds a low B string and curriculum reaches it', () => {
  const B5 = PM.Instruments.setBassStrings(5);
  assert.deepStrictEqual(B5.strings, [23, 28, 33, 38, 43]);
  assert.strictEqual(B5.stringNames[0], 'B');
  assert.strictEqual(PM.Learn.RANGE.bass.strings, 5);
  const B4 = PM.Instruments.setBassStrings(4);
  assert.deepStrictEqual(B4.strings, [28, 33, 38, 43]);
  assert.strictEqual(PM.Learn.RANGE.bass.low, 28);
});
