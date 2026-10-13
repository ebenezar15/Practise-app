#!/usr/bin/env node
/* Accuracy benchmark for the song analyser on synthetic songs with known ground truth.
 *   node scripts/bench-analyzer.js [songs=20] [--midi] [--json]
 * Reports key, tempo, chord (root / maj-min / sevenths / bass / inversions), chord-change
 * timing, melody transcription and strum-vs-fingerpick classification. */
'use strict';
const { PM } = require('../tests/load.js');
const G = require('../tests/songgen.js');

const args = process.argv.slice(2);
const N = +args.find((a) => /^\d+$/.test(a)) || 20;
const doMidi = args.includes('--midi');

const avg = (xs) => { const v = xs.filter((x) => x != null && !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const pct = (x) => (x == null ? '  —  ' : (x * 100).toFixed(1).padStart(5) + '%');

(async () => {
  const rows = [];
  const t0 = Date.now();
  for (let i = 1; i <= N; i++) {
    const song = G.makeSong(i, { texture: G.TEXTURES[(i - 1) % G.TEXTURES.length], melody: i % 2 === 0 });
    const tr = song.truth;
    let a;
    if (doMidi) {
      const buf = PM.Midi.writeMidi(song.notes, { bpm: tr.bpm, num: tr.bpb });
      a = await PM.Analyzer.analyzeMidi(PM.Midi.parseMidi(buf), { instrument: 'guitar', waveformFrom: new Float32Array(10) });
    } else {
      const r = PM.Midi.renderNotes(song.notes, { sampleRate: 22050, duration: tr.duration });
      a = await PM.Analyzer.analyzeAudio([r.data], 22050, { instrument: 'guitar' });
    }
    const keyOk = a.key && a.key.tonic === tr.key.tonic && a.key.mode === tr.key.mode;
    const relErr = a.key && !keyOk && ((tr.key.mode === 'major' && a.key.mode === 'minor' && a.key.tonic === (tr.key.tonic + 9) % 12) || (tr.key.mode === 'minor' && a.key.mode === 'major' && a.key.tonic === (tr.key.tonic + 3) % 12));
    const bpmOk = Math.abs(a.tempo.bpm - tr.bpm) / tr.bpm < 0.04;
    const ch = G.scoreChords(a.chords, tr);
    const bd = G.scoreBoundaries(a.chords, tr);
    const mel = tr.melody.length ? G.scoreMelody(a.melody || a.notes, tr) : null;
    const picking = a.picking ? a.picking.style : null;
    const pickOk = picking == null ? null : (tr.texture === 'fingerpick' || tr.texture === 'piano-arp') === (picking === 'fingerpicking' || picking === 'arpeggio');
    rows.push({ i, texture: tr.texture, key: keyOk, rel: relErr, bpm: bpmOk, ...ch, bRecall: bd.recall, bErr: bd.meanErrMs, mel, pickOk });
    if (!args.includes('--json')) console.log(`#${String(i).padStart(2)} ${tr.texture.padEnd(11)} key ${keyOk ? '✓' : relErr ? 'rel' : '✗'}  bpm ${bpmOk ? '✓' : '✗ ' + a.tempo.bpm + '/' + tr.bpm}  root ${pct(ch.root)} majmin ${pct(ch.majmin)} 7ths ${pct(ch.sevenths)} bass ${pct(ch.bass)} inv ${pct(ch.inversions)} changes ${pct(bd.recall)} ±${bd.meanErrMs}ms${mel ? `  melody R ${pct(mel.recall)} P ${pct(mel.precision)}` : ''}${picking ? '  pick ' + picking : ''}`);
  }
  const sum = {
    songs: N, mode: doMidi ? 'midi' : 'audio', seconds: Math.round((Date.now() - t0) / 100) / 10,
    key: avg(rows.map((r) => (r.key ? 1 : 0))), keyRel: avg(rows.map((r) => (r.key || r.rel ? 1 : 0))), tempo: avg(rows.map((r) => (r.bpm ? 1 : 0))),
    root: avg(rows.map((r) => r.root)), majmin: avg(rows.map((r) => r.majmin)), sevenths: avg(rows.map((r) => r.sevenths)), bass: avg(rows.map((r) => r.bass)), inversions: avg(rows.map((r) => r.inversions)),
    changeRecall: avg(rows.map((r) => r.bRecall)), changeErrMs: Math.round(avg(rows.map((r) => r.bErr)) || 0),
    melodyRecall: avg(rows.map((r) => r.mel && r.mel.recall)), melodyPrecision: avg(rows.map((r) => r.mel && r.mel.precision)), passingRecall: avg(rows.map((r) => r.mel && r.mel.passingRecall)),
    picking: avg(rows.filter((r) => r.pickOk != null).map((r) => (r.pickOk ? 1 : 0))),
  };
  if (args.includes('--json')) console.log(JSON.stringify(sum));
  else console.log(`\nSUMMARY (${sum.mode}, ${N} songs, ${sum.seconds}s): key ${pct(sum.key)} (incl. relative ${pct(sum.keyRel)}) tempo ${pct(sum.tempo)} | chords root ${pct(sum.root)} majmin ${pct(sum.majmin)} 7ths ${pct(sum.sevenths)} bass ${pct(sum.bass)} inversions ${pct(sum.inversions)} | changes found ${pct(sum.changeRecall)} ±${sum.changeErrMs}ms | melody R ${pct(sum.melodyRecall)} P ${pct(sum.melodyPrecision)} passing ${pct(sum.passingRecall)} | picking ${pct(sum.picking)}`);
})();
