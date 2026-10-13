// Accuracy floor for the song analyser on synthetic songs with known chords, inversions,
// key, tempo, melody and picking style (see scripts/bench-analyzer.js for the full report).
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const G = require('./songgen.js');

const mean = (xs) => { const v = xs.filter((x) => x != null); return v.reduce((a, b) => a + b, 0) / v.length; };

async function run(n, midi) {
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const song = G.makeSong(i, { texture: G.TEXTURES[(i - 1) % G.TEXTURES.length], melody: i % 2 === 0 });
    const tr = song.truth;
    let a;
    if (midi) a = await PM.Analyzer.analyzeMidi(PM.Midi.parseMidi(PM.Midi.writeMidi(song.notes, { bpm: tr.bpm, num: tr.bpb })), { instrument: 'guitar', waveformFrom: new Float32Array(10) });
    else { const r = PM.Midi.renderNotes(song.notes, { sampleRate: 22050, duration: tr.duration }); a = await PM.Analyzer.analyzeAudio([r.data], 22050, { instrument: 'guitar' }); }
    const keyRel = a.key.tonic === tr.key.tonic && a.key.mode === tr.key.mode ? 1 : (tr.key.mode === 'major' && a.key.mode === 'minor' && a.key.tonic === (tr.key.tonic + 9) % 12) || (tr.key.mode === 'minor' && a.key.mode === 'major' && a.key.tonic === (tr.key.tonic + 3) % 12) ? 1 : 0;
    const ch = G.scoreChords(a.chords, tr);
    const mel = tr.melody.length ? G.scoreMelody(a.melody || [], tr) : null;
    const fp = tr.texture === 'fingerpick' || tr.texture === 'piano-arp';
    rows.push({ keyRel, root: ch.root, majmin: ch.majmin, bass: ch.bass, inv: ch.inversions, melR: mel && mel.recall, pick: a.picking ? ((a.picking.style === 'fingerpicking') === fp ? 1 : 0) : 0, tempo: Math.abs(a.tempo.bpm - tr.bpm) / tr.bpm < 0.04 ? 1 : 0 });
  }
  const s = {};
  for (const k of Object.keys(rows[0])) s[k] = mean(rows.map((r) => r[k]));
  return s;
}

test('audio analyser accuracy floor (10 synthetic songs, 5 textures)', async () => {
  const s = await run(10, false);
  assert.ok(s.keyRel >= 0.9, 'key ' + s.keyRel);
  assert.ok(s.root >= 0.88, 'chord roots ' + s.root);
  assert.ok(s.majmin >= 0.85, 'major/minor ' + s.majmin);
  assert.ok(s.bass >= 0.88, 'bass notes ' + s.bass);
  assert.ok(s.inv >= 0.55, 'inversions ' + s.inv);
  assert.ok(s.melR >= 0.65, 'melody recall ' + s.melR);
  assert.ok(s.pick >= 0.9, 'strum vs fingerpick ' + s.pick);
  assert.ok(s.tempo >= 0.7, 'tempo ' + s.tempo);
});

test('MIDI analyser accuracy floor', async () => {
  const s = await run(10, true);
  assert.ok(s.keyRel >= 0.9 && s.root >= 0.9 && s.majmin >= 0.9 && s.bass >= 0.9, JSON.stringify(s));
  assert.ok(s.melR >= 0.9, 'melody ' + s.melR);
  assert.strictEqual(s.tempo, 1);
});
