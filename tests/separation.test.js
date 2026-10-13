const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load');
const { Midi, Separation } = PM;

function sources(sr, bars) {
  const beat = 0.5, kick = [], snare = [], cymbals = [], bass = [], vocals = [], pads = [], chords = [];
  const roots = [43, 36, 38, 43];
  for (let b = 0; b < bars; b++) {
    const t0 = b * 4 * beat;
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * beat;
      (i % 2 ? snare : kick).push({ midi: i % 2 ? 38 : 36, start: t, end: t + 0.1, velocity: 0.9, channel: 9 });
      cymbals.push({ midi: 42, start: t + beat / 2, end: t + beat / 2 + 0.05, velocity: 0.6, channel: 9 });
      bass.push({ midi: roots[b % 4] - 12 + (i === 3 ? 7 : 0), start: t, end: t + beat * 0.9, velocity: 0.9, voice: 'bass' });
      // a moving lead line (the "singer")
      vocals.push({ midi: 72 + [0, 2, 4, 7][(i + b) % 4], start: t, end: t + beat * 0.95, velocity: 0.8, voice: 'trumpet' });
    }
    for (const m of [60, 64, 67].map((x) => x + (roots[b % 4] - 43))) pads.push({ midi: m, start: t0, end: t0 + 4 * beat, velocity: 0.5, voice: 'strings' });
    for (let i = 0; i < 4; i++) for (const m of [55, 59, 62].map((x) => x + (roots[b % 4] - 43))) chords.push({ midi: m - 12 + 12, start: t0 + i * beat, end: t0 + i * beat + 0.4, velocity: 0.7, voice: 'guitar' });
  }
  const dur = bars * 4 * beat + 1;
  const r = (ns) => Midi.renderNotes(ns, { sampleRate: sr, duration: dur, useProgram: false, normalize: false }).data;
  return { kick: r(kick), snare: r(snare), cymbals: r(cymbals), bass: r(bass), vocals: r(vocals), pads: r(pads), chords: r(chords), vocalNotes: vocals };
}

const corr = (a, b) => { let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } return ab / Math.sqrt(aa * bb + 1e-20); };

for (const mode of ['stereo', 'mono + melody']) {
  test(`audio separation into 7 stems (${mode}): each stem matches its own source, stems sum to the mix`, async () => {
    const sr = 22050;
    const src = sources(sr, 6);
    const ids = ['kick', 'snare', 'cymbals', 'bass', 'vocals', 'pads', 'chords'];
    const len = src.kick.length;
    const L = new Float32Array(len), R = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const c = src.kick[i] + src.snare[i] + src.cymbals[i] + src.bass[i] + src.vocals[i];
      // pads slightly right, guitars left (typical stereo mix); mono = same both sides
      L[i] = c + src.pads[i] * 0.6 + src.chords[i] * 0.9;
      R[i] = mode === 'stereo' ? c + src.pads[i] * 0.9 + src.chords[i] * 0.25 : L[i];
    }
    const t0 = Date.now();
    const sep = await Separation.separateAudio(mode === 'stereo' ? [L, R] : [L], sr, { melody: mode === 'stereo' ? [] : src.vocalNotes });
    const secs = (Date.now() - t0) / 1000;
    assert.deepStrictEqual(sep.stems.map((s) => s.id).sort(), ids.slice().sort());
    const report = {};
    let ok = 0;
    for (const st of sep.stems) {
      const est = st.data[0];
      const scores = Object.fromEntries(ids.map((k) => [k, corr(est, src[k])]));
      const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      report[st.id] = `${best === st.id ? '✓' : '✗ ' + best} ${scores[st.id].toFixed(2)}`;
      if (best === st.id) ok++;
      assert.ok(scores[st.id] > 0.3, `${st.id} correlation ${scores[st.id].toFixed(2)} (${JSON.stringify(report)})`);
    }
    console.log(`  ${mode}: ${(len / sr).toFixed(1)}s separated in ${secs.toFixed(2)}s`, report);
    assert.ok(ok >= 6, `at least 6 of 7 stems best match their own source: ${JSON.stringify(report)}`);
    let err = 0, tot = 0;
    for (let i = 0; i < len; i++) { const s = sep.stems.reduce((a, st) => a + st.data[0][i], 0); err += (s - L[i]) ** 2; tot += L[i] ** 2; }
    assert.ok(err / tot < 1e-6, 'perfect reconstruction');
  });
}

test('MIDI stems are exact per instrument family', () => {
  const notes = [
    { midi: 36, start: 0, end: 0.2, velocity: 1, channel: 9 },
    { midi: 33, start: 0, end: 1, velocity: 1, channel: 1, program: 33 },
    { midi: 60, start: 0, end: 1, velocity: 1, channel: 0, program: 0 },
    { midi: 72, start: 0.5, end: 1.5, velocity: 1, channel: 2, program: 56 },
  ];
  const st = Midi.renderStems(notes, { sampleRate: 16000 });
  assert.deepStrictEqual(st.stems.map((s) => s.id).sort(), ['bass', 'drums', 'keys', 'lead']);
  const st2 = Midi.renderStems([{ midi: 64, start: 0, end: 1, velocity: 1, channel: 3, program: 52 }, { midi: 76, start: 0, end: 1, velocity: 1, channel: 4, program: 73 }], { sampleRate: 16000 });
  assert.deepStrictEqual(st2.stems.map((s) => s.id).sort(), ['vocals', 'winds']);
  assert.strictEqual(Separation.partStemFor('voice', st2.stems), 'vocals');
  assert.strictEqual(Separation.partStemFor('trumpet', st.stems), 'lead');
  assert.strictEqual(Separation.partStemFor('bass', st.stems), 'bass');
  const mix = Separation.mixStems(st, { bass: 0 });
  assert.strictEqual(mix.length, 1);
});

test('MIDI parser keeps program changes', () => {
  const buf = Midi.writeMidi([{ midi: 60, start: 0, end: 1, channel: 2, voice: 'trumpet' }, { midi: 40, start: 0, end: 1, channel: 1, voice: 'bass' }], { bpm: 100 });
  const m = Midi.parseMidi(buf);
  const byCh = Object.fromEntries(m.notes.map((n) => [n.channel, n.program]));
  assert.strictEqual(byCh[2], 56);
  assert.strictEqual(byCh[1], 33);
});
