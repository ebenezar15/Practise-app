// Harmony & part singing: the SATB arranger keeps voices in range, spells full chords,
// avoids parallel fifths/octaves, ends on the tonic; rounds and thirds pieces line up.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const H = PM.Harmony;
const mod12 = (x) => ((x % 12) + 12) % 12;

test('every hymn becomes four singable parts with complete chords', () => {
  for (const h of H.HYMNS) {
    assert.strictEqual(h.deg.length, h.beats.length, h.id + ' melody/rhythm lengths');
    if (h.syl) assert.strictEqual(h.syl.length, h.deg.length, h.id + ' one syllable per note');
    const p = H.buildPiece(h);
    for (const part of H.PARTS) {
      const notes = p.parts[part.id];
      assert.ok(notes.length > 4, h.id + ' ' + part.id);
      for (const n of notes) assert.ok(n.midi >= part.range[0] - 1 && n.midi <= part.range[1] + 1, `${h.id} ${part.id} ${n.midi} in range`);
    }
    // voices never cross
    for (const s of p.parts.S) {
      const at = (id) => p.parts[id].find((n) => s.start >= n.start && s.start < n.start + n.dur);
      const [A, T, B] = ['A', 'T', 'B'].map(at);
      if (A && T && B) assert.ok(s.midi >= A.midi && A.midi >= T.midi && T.midi >= B.midi, `${h.id} no crossing at ${s.start}`);
    }
    // a tune that ends on a tonic-chord note gets a full cadence; one ending on "re" a half cadence (V)
    const endsHome = [0, 4, 7].includes(mod12(h.deg[h.deg.length - 1]));
    assert.strictEqual(p.chords[p.chords.length - 1].roman, endsHome ? 'I' : 'V', h.id + ' cadence');
    const lastB = p.parts.B[p.parts.B.length - 1];
    assert.strictEqual(mod12(lastB.midi), mod12(h.tonic + (endsHome ? 0 : 7)), h.id + ' bass ends on the root');
  }
});

test('voice leading: few parallel fifths/octaves and the 3rd is always present', () => {
  const h = H.HYMNS.find((x) => x.id === 'doxology');
  let t = 0;
  const notes = h.deg.map((d, i) => { const n = { midi: h.tonic + d, start: t, dur: h.beats[i] }; t += h.beats[i]; return n; });
  const chords = H.harmonize(notes, mod12(h.tonic), h.bpb);
  const v = H.voiceSATB(notes, chords, mod12(h.tonic));
  let par = 0;
  for (let i = 1; i < v.length; i++) {
    const a = v[i - 1], b = v[i], k = ['S', 'A', 'T', 'B'];
    for (let x = 0; x < 4; x++) for (let y = x + 1; y < 4; y++) {
      const i0 = mod12(a[k[x]] - a[k[y]]), i1 = mod12(b[k[x]] - b[k[y]]);
      if (a[k[x]] !== b[k[x]] && ((i0 === 7 && i1 === 7) || (i0 === 0 && i1 === 0))) par++;
    }
    const pcs = H.triad(mod12(h.tonic), b.chord);
    if (!b.held) assert.ok([b.S, b.A, b.T, b.B].map(mod12).includes(pcs[1]), 'third present at ' + i);
  }
  assert.ok(par <= 2, 'parallels: ' + par);
});

test('parts for voice types, rounds and the thirds exercise', () => {
  assert.strictEqual(H.partForVoice('soprano'), 'S');
  assert.strictEqual(H.partForVoice('alto'), 'A');
  assert.strictEqual(H.partForVoice('tenor'), 'T');
  assert.strictEqual(H.partForVoice('bass'), 'B');
  const r = H.round(H.FRERE, 8, 4, 'Round');
  assert.deepStrictEqual(Object.keys(r.parts), ['S', 'A', 'T', 'B']);
  assert.strictEqual(r.parts.A[0].start, 8);
  assert.strictEqual(r.parts.A[0].midi, r.parts.S[0].midi);
  const th = H.thirdsPiece(60);
  th.parts.S.forEach((n, i) => assert.ok([3, 4].includes(n.midi - th.parts.A[i].midi), 'a third above'));
});
