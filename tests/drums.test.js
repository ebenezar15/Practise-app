// Drums: kit, pattern library, exercise path, fills/remix and timing scoring; new instrument voices.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const D = PM.DrumCore;

test('drums is an instrument with a 50+ exercise rhythm path', () => {
  assert.strictEqual(PM.Instruments.get('drums').family, 'drums');
  const ex = PM.Curriculum.forInstrument('drums');
  assert.ok(ex.length >= 50);
  assert.ok(ex.filter((e) => e.cat === 'Note lengths').length >= 10, 'note-length exercises');
  for (const c of ['Grooves', 'Rudiments', 'Fills']) assert.ok(ex.some((e) => e.cat === c), c);
});

test('every library pattern, random fill and remix is well formed', () => {
  const ok = (p) => { const n = p.bpb * p.spb * p.bars; for (const t of Object.values(p.tracks)) assert.strictEqual(t.length, n, p.name); assert.ok(D.hits(p).length > 0, p.name); };
  [...D.GROOVES, ...D.RUDIMENTS, ...D.FILLS].forEach(ok);
  for (let l = 1; l <= 4; l++) for (let i = 0; i < 15; i++) ok(D.randomFill(l));
  for (const g of D.GROOVES) ok(D.remix(g));
  assert.ok(D.GROOVES.length >= 12 && D.RUDIMENTS.length >= 6);
});

test('timing score: perfect, early/late, misses, extras and wrong drums', () => {
  const exp = [0, 0.5, 1, 1.5].map((t, i) => ({ time: t, pieces: [i % 2 ? 'snare' : 'kick'] }));
  const perfect = D.score(exp, exp.map((e) => ({ time: e.time + 0.01, piece: e.pieces[0] })));
  assert.strictEqual(perfect.accuracy, 1); assert.strictEqual(perfect.inTime, 1); assert.strictEqual(perfect.pieceAccuracy, 1);
  const rushed = D.score(exp, exp.map((e) => ({ time: e.time - 0.08 })));
  assert.ok(rushed.avgMs < -60 && rushed.inTime === 0 && rushed.perHit.every((h) => h.result === 'early'));
  const sparse = D.score(exp, [{ time: 0 }, { time: 0.75 }, { time: 1 }]);
  assert.strictEqual(sparse.accuracy, 0.5); assert.strictEqual(sparse.extras, 1);
  const wrong = D.score(exp, exp.map((e) => ({ time: e.time, piece: 'crash' })));
  assert.strictEqual(wrong.pieceAccuracy, 0);
  assert.strictEqual(D.stars(perfect), 3); assert.strictEqual(D.stars(sparse), 0);
});

test('instrument voices render in tune, without clipping or NaNs', () => {
  const V = PM.Voices, sr = 22050;
  for (const [v, m] of [['piano', 60], ['guitar', 52], ['electric', 64], ['bass', 33], ['trumpet', 65], ['voice', 57], ['strings', 60], ['organ', 60]]) {
    const b = V.render(v, m, { sr, vel: 0.8, held: 1 });
    let peak = 0; for (const x of b) { assert.ok(Number.isFinite(x), v); peak = Math.max(peak, Math.abs(x)); }
    assert.ok(peak > 0.05 && peak < 1.2, `${v} level ${peak}`);
    const seg = b.slice(Math.floor(0.3 * sr), Math.floor(0.3 * sr) + 4096);
    const y = PM.DSP.yin(seg, sr, { minFreq: 40, maxFreq: 1500 });
    const cents = 1200 * Math.log2(y.freq / V.mtof(m));
    assert.ok(Math.abs(cents) < 12, `${v} ${m}: ${cents.toFixed(1)} cents`);
  }
  for (const d of ['kick', 'snare', 'hhc', 'hho', 'ride', 'crash', 'tomh', 'toml', 'rim', 'clap', 'cowbell']) {
    const b = V.drum(d, { sr, vel: 0.8 });
    assert.ok(b.length > 100 && b.every(Number.isFinite), d);
  }
  const L = V.looped('voice', 60, { sr, vel: 0.7 });
  assert.ok(L.loopEnd > L.loopStart && L.loopStart > 0);
});

test('tip of the day and did-you-know facts change daily and cover the whole list', () => {
  const Dly = PM.Daily;
  assert.ok(Dly.TIPS.length >= 30 && Dly.FACTS.length >= 50);
  const day = (n) => new Date(2026, 0, 1 + n, 12);
  assert.strictEqual(Dly.fact(0, day(3)), Dly.fact(0, day(3)), 'same all day');
  assert.notStrictEqual(Dly.fact(0, day(3)), Dly.fact(0, day(4)));
  const seen = new Set(); for (let i = 0; i < Dly.FACTS.length; i++) seen.add(Dly.fact(i, day(0)));
  assert.strictEqual(seen.size, Dly.FACTS.length, 'every fact appears before any repeats');
  const tips = new Set(); for (let i = 0; i < 40; i++) tips.add(Dly.tip('guitar', i, day(0)).text);
  assert.ok(tips.size >= 25, 'tips ' + tips.size);
  assert.ok([0, 1].some((o) => Dly.tip('drums', o, day(0)).about === 'Drums'), 'instrument tips are mixed in');
});
