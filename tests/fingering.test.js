// Fingering engine: classic piano fingerings, fretted positions (incl. 5-string bass) and trumpet alternates.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const F = PM.Fingering;
const fj = (notes, hand) => F.piano(notes, hand)[0].fingers.join('');

test('piano: textbook scale fingerings', () => {
  assert.strictEqual(fj([60, 62, 64, 65, 67, 69, 71, 72], 'R'), '12312345'); // C major RH up
  assert.strictEqual(fj([72, 71, 69, 67, 65, 64, 62, 60], 'R'), '54321321'); // RH down
  assert.strictEqual(fj([48, 50, 52, 53, 55, 57, 59, 60], 'L'), '54321321'); // LH up
  assert.strictEqual(fj([65, 67, 69, 70, 72, 74, 76, 77], 'R'), '12341234'); // F major: thumb not on B♭
  assert.strictEqual(fj([60, 62, 64, 65, 67, 65, 64, 62, 60], 'R'), '123454321'); // five-finger position
});

test('piano: offers distinct alternatives with hints', () => {
  const opts = F.piano([60, 62, 64, 65, 67, 69, 71, 72], 'R');
  assert.ok(opts.length >= 2);
  assert.strictEqual(new Set(opts.map((o) => o.fingers.join())).size, opts.length);
  assert.ok(opts[0].hints.includes('thumb under'));
});

test('guitar: G major in open position uses open strings and finger = fret', () => {
  const [best, ...alts] = F.fretted([55, 57, 59, 60, 62, 64, 66, 67], 'guitar');
  assert.ok(best.path.some((p) => p.fret === 0));
  for (const p of best.path) if (p.fret) assert.ok(p.finger >= 1 && p.finger <= 4 && p.fret - p.finger >= -1);
  assert.ok(alts.some((o) => o.path.every((p) => p.fret > 0)), 'an up-the-neck option without open strings');
});

test('bass: 5-string low B notes are fingered on the B string', () => {
  PM.Instruments.setBassStrings(5);
  const best = F.fretted([23, 25, 26, 28], 'bass')[0];
  assert.deepStrictEqual(best.path.slice(0, 3).map((p) => p.string), [0, 0, 0]);
  assert.strictEqual(best.path[0].fret, 0);
  PM.Instruments.setBassStrings(4);
  assert.strictEqual(F.fretted([23], 'bass').length, 0, 'low B is unplayable on a 4-string');
});

test('trumpet: standard valves plus alternates', () => {
  const g = F.trumpet(77); // concert F = written G
  assert.strictEqual(g[0].valves, '0');
  assert.ok(g.some((o) => o.valves === '1 3'));
  const a = F.trumpet(79); // written A
  assert.strictEqual(a[0].valves, '1 2');
  assert.ok(a.some((o) => o.valves === '3'));
});
