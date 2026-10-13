const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const { Songs, Learn, Backing, Midi, Instruments } = PM;

test('ChordPro charts parse, transpose and become backing-track bars', () => {
  const p = Songs.parseChart('{title: Test}\n{key: G}\n{time: 3/4}\n{soc}\n[G]Amazing [C]grace how [G]sweet\n{eoc}\n# comment\n{c: Slowly}');
  assert.strictEqual(p.meta.title, 'Test');
  assert.strictEqual(p.meta.time, '3/4');
  const lyr = p.lines.find((l) => l.type === 'lyric');
  assert.deepStrictEqual(lyr.segs.map((s) => s.chord), ['G', 'C', 'G']);
  assert.strictEqual(lyr.segs.map((s) => s.text).join(''), 'Amazing grace how sweet');
  assert.ok(p.lines.some((l) => l.type === 'comment' && l.text === 'Slowly'));
  assert.strictEqual(Songs.transposeChord('F#m7/C#', 2), 'G#m7/D#');
  assert.strictEqual(Songs.transposeChord('C', 3, true), 'Eb');
  assert.strictEqual(Songs.simpleType('m7b5'), 'dim');
  assert.strictEqual(Songs.simpleType('add9'), '');
  assert.strictEqual(Songs.simpleType('sus'), 'sus4');
  assert.strictEqual(Songs.beatsPerBarOf('6/8'), 2);
  assert.strictEqual(Songs.keyName(Songs.parseKey('Em'), 1), 'Fm');
  // chords-over-lyrics text is converted
  const q = Songs.parseChart('G        C\nAmazing grace');
  assert.deepStrictEqual(q.lines[0].segs.map((s) => s.chord).filter(Boolean), ['G', 'C']);
  // Tamil text survives and is detected
  const t = Songs.parseChart('[G]வாழ்க [C]இயேசு');
  assert.ok(Songs.hasTamil(t.lines[0].segs.map((s) => s.text).join('')));
  // explicit bars with repeat signs and a transposition
  const bars = Songs.chartBars(p, { bars: 'G | % | C G | D7', transpose: 2 });
  assert.strictEqual(bars.length, 4);
  assert.deepStrictEqual(bars[1].chords.map((c) => c.root), [9]);
  assert.deepStrictEqual(bars[2].chords.map((c) => [c.root, c.beats]), [[2, 1.5], [9, 1.5]]);
  assert.strictEqual(bars[3].chords[0].type, '7');
  // explicit bars repeat for each verse and point at its lines
  const ag = Songs.BUILTIN.find((x) => x.id === 'pd-amazing-grace');
  const agp = Songs.parseChart(ag.chart);
  const spread = Songs.spreadBars(agp, Songs.chartBars(agp, { bars: ag.bars }));
  assert.strictEqual(spread.length, 48);
  assert.ok(spread.every((b) => agp.lines[b.line].type === 'lyric'));
  assert.ok(spread[16].line > spread[15].line, 'verse 2 follows verse 1');
});

test('every built-in song parses and renders a backing track in its meter', () => {
  assert.ok(Songs.BUILTIN.length >= 10);
  for (const sg of Songs.BUILTIN) {
    const p = Songs.parseChart(sg.chart);
    const bpb = Songs.beatsPerBarOf(sg.timeSig);
    const bars = Songs.chartBars(p, { bars: sg.bars, beatsPerBar: bpb });
    assert.ok(bars.length >= 6, sg.title + ' has bars');
    for (const b of bars) assert.ok(Math.abs(b.chords.reduce((n, c) => n + c.beats, 0) - bpb) < 1e-9, sg.title + ' bar sums to the meter');
    const g = Backing.generateChart({ bars: bars.map((b) => b.chords), beatsPerBar: bpb, bpm: sg.bpm, exclude: 'guitar', title: sg.title });
    assert.ok(g.notes.length > bars.length * 4);
    assert.ok(!g.notes.some((n) => n.voice === 'guitar'), 'own instrument left out');
    const beat = 60 / sg.bpm;
    const end = Math.max(...g.notes.map((n) => n.end));
    assert.ok(Math.abs(end - (bars.length + 1) * bpb * beat) < beat * 3, sg.title + ' length matches the bars');
    const mid = Midi.parseMidi(Midi.writeMidi(g.notes, { bpm: g.bpm, num: bpb === 3 ? 3 : 4, key: g.key }));
    assert.ok(mid.notes.length === g.notes.length);
  }
});

test('scales, arpeggios and exercises fit each instrument', () => {
  const cMaj = Learn.scale({ tonic: 0, scale: 'major', instrument: 'piano', octaves: 1, direction: 'up' });
  assert.deepStrictEqual(cMaj, [60, 62, 64, 65, 67, 69, 71, 72]);
  const updown = Learn.scale({ tonic: 0, scale: 'major', instrument: 'piano' });
  assert.strictEqual(updown.length, 15);
  assert.strictEqual(updown[14], 60);
  const mel = Learn.scale({ tonic: 9, scale: 'melodic', instrument: 'piano', octaves: 1 });
  assert.ok(mel.includes(mel[0] + 11) && mel.slice(8).includes(mel[0] + 10), 'melodic minor goes up raised, down natural');
  assert.deepStrictEqual(Learn.arpeggio({ tonic: 7, type: '7', instrument: 'guitar', direction: 'up' }).map((m) => m % 12), [7, 11, 2, 5, 7]);
  for (const inst of Object.keys(Instruments.INSTRUMENTS).filter((i) => !Instruments.INSTRUMENTS[i].rhythmOnly)) {
    const R = Learn.RANGE[inst];
    for (let tonic = 0; tonic < 12; tonic++) {
      const s = Learn.scale({ tonic, scale: 'major', instrument: inst, octaves: inst === 'trumpet' || inst === 'voice' ? 1 : 2 });
      assert.ok(Math.min(...s) >= R.low && Math.max(...s) <= R.high, `${inst} scale on ${tonic} in range`);
      const ex = Learn.exercises(inst, tonic);
      assert.ok(ex.length >= 3);
      for (const e of ex) assert.ok(e.notes.length >= 5 && e.notes.every((m) => Number.isInteger(m)), inst + ' ' + e.id);
    }
  }
});

test('sight-reading, call & response and the progression palette', () => {
  const rand = Learn.rng(42);
  for (let level = 1; level <= 3; level++) {
    const mel = Learn.sightReading({ tonic: 0, instrument: 'piano', level, length: 8, rand });
    assert.strictEqual(mel.length, 8);
    assert.strictEqual(mel[0] % 12, 0);
    assert.strictEqual(mel[7] % 12, 0, 'ends on the tonic');
    if (level === 1) for (let i = 1; i < 7; i++) assert.ok(Math.abs(mel[i] - mel[i - 1]) <= 2, 'stepwise at level 1');
  }
  const m = Learn.motif({ tonic: 2, instrument: 'trumpet', rand });
  assert.ok(m.length >= 3 && m.every((n) => n.beats > 0));
  const g = Learn.gradeAnswer([62, 64, 66, 69, 62], 2, 'majpent');
  assert.strictEqual(g.inScale, 5);
  assert.ok(g.endsHome && g.score >= 90);
  assert.ok(Learn.gradeAnswer([63, 65], 2, 'majpent').score < 40);
  assert.deepStrictEqual(Learn.palette(7, false).slice(0, 6).map((c) => c.name), ['G', 'Am', 'Bm', 'C', 'D', 'Em']);
  assert.deepStrictEqual(Learn.palette(9, true).slice(0, 3).map((c) => c.name), ['Am', 'Bdim', 'C']);
});
