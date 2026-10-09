const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load');
const { Midi, Separation } = PM;

function sources(sr, bars) {
  const beat = 0.5, drums = [], bass = [], lead = [], chords = [];
  const roots = [43, 36, 38, 43];
  for (let b = 0; b < bars; b++) {
    const t0 = b * 4 * beat;
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * beat;
      drums.push({ midi: i % 2 ? 38 : 36, start: t, end: t + 0.1, velocity: 0.9, channel: 9 });
      drums.push({ midi: 42, start: t + beat / 2, end: t + beat / 2 + 0.05, velocity: 0.5, channel: 9 });
      bass.push({ midi: roots[b % 4] - 12 + (i === 3 ? 7 : 0), start: t, end: t + beat * 0.9, velocity: 0.9, voice: 'bass' });
    }
    lead.push({ midi: 67 + (b % 3) * 2, start: t0, end: t0 + 1.8, velocity: 0.8, voice: 'trumpet' });
    for (const m of [55, 59, 62, 67].map((x) => x + (roots[b % 4] - 43))) chords.push({ midi: m, start: t0, end: t0 + 1.9, velocity: 0.6, voice: 'guitar' });
  }
  const dur = bars * 4 * beat + 1;
  const r = (ns) => Midi.renderNotes(ns, { sampleRate: sr, duration: dur, useProgram: false, normalize: false }).data;
  return { drums: r(drums), bass: r(bass), lead: r(lead), other: r(chords) };
}

const corr = (a, b) => { let ab = 0, aa = 0, bb = 0; for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; } return ab / Math.sqrt(aa * bb + 1e-20); };

test('audio separation: each stem correlates best with its true source, stems sum to the mix', async () => {
  const sr = 22050;
  const src = sources(sr, 6);
  const len = src.drums.length;
  // pan: drums/bass/lead centre, guitar chords hard-ish left
  const L = new Float32Array(len), R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const c = src.drums[i] + src.bass[i] + src.lead[i];
    L[i] = c + src.other[i] * 0.95;
    R[i] = c + src.other[i] * 0.2;
  }
  const t0 = Date.now();
  const sep = await Separation.separateAudio([L, R], sr);
  const secs = (Date.now() - t0) / 1000;
  const truth = { drums: src.drums, bass: src.bass, lead: src.lead, other: src.other };
  const report = {};
  for (const st of sep.stems) {
    const est = st.data[0];
    const target = st.id === 'other' ? Float32Array.from(truth.other, (x) => x * 0.95) : truth[st.id];
    const scores = Object.fromEntries(Object.entries(truth).map(([k, v]) => [k, corr(est, v)]));
    report[st.id] = Object.entries(scores).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' ');
    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    assert.strictEqual(best, st.id, `${st.id} stem best matches ${best} (${report[st.id]})`);
    assert.ok(corr(est, target) > 0.5, `${st.id} correlation ${corr(est, target)}`);
  }
  console.log(`  separated ${(len / sr).toFixed(1)}s in ${secs.toFixed(2)}s`, report);
  // perfect reconstruction
  let err = 0, tot = 0;
  for (let i = 0; i < len; i++) { const s = sep.stems.reduce((a, st) => a + st.data[0][i], 0); err += (s - L[i]) ** 2; tot += L[i] ** 2; }
  assert.ok(err / tot < 1e-6);
});

test('MIDI stems are exact per instrument family', () => {
  const notes = [
    { midi: 36, start: 0, end: 0.2, velocity: 1, channel: 9 },
    { midi: 33, start: 0, end: 1, velocity: 1, channel: 1, program: 33 },
    { midi: 60, start: 0, end: 1, velocity: 1, channel: 0, program: 0 },
    { midi: 72, start: 0.5, end: 1.5, velocity: 1, channel: 2, program: 56 },
  ];
  const st = Midi.renderStems(notes, { sampleRate: 16000 });
  assert.deepStrictEqual(st.stems.map((s) => s.id).sort(), ['bass', 'drums', 'keys', 'lead']);
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
