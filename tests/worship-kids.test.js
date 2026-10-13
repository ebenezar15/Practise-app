// v2.4: worship library & tutorials, Kids & Focus lessons, appearance settings.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const { Worship, Songs, Kids } = PM;

test('worship library: collections, valid charts, backing bars and copyright-safe charts', () => {
  const ids = new Set();
  for (const c of Worship.COLLECTIONS) assert.ok(Worship.LIBRARY.some((s) => s.collection === c), 'has ' + c);
  assert.ok(Worship.LIBRARY.filter((s) => s.collection === 'Bethel Music').length >= 4);
  assert.ok(Worship.LIBRARY.filter((s) => s.collection === 'Hillsong').length >= 5);
  assert.ok(Worship.LIBRARY.filter((s) => s.language === 'Tamil').length >= 5);
  for (const s of Worship.LIBRARY) {
    assert.ok(!ids.has(s.id), 'unique id ' + s.id); ids.add(s.id);
    const p = Songs.parseChart(s.chart);
    const bars = Songs.chartBars(p, { beatsPerBar: Songs.beatsPerBarOf(s.timeSig) });
    assert.ok(bars.length >= 8, s.title + ' has bars');
    for (const b of bars) for (const c of b.chords) assert.ok(c && c.root != null, s.title + ' chord parses');
    assert.ok(Worship.FEELS[s.feel], s.title + ' feel');
    // contemporary songs are chords only (no copyrighted words)
    if (s.collection !== 'Hymns') {
      assert.ok(p.lines.filter((l) => l.type === 'lyric').every((l) => l.chordsOnly), s.title + ' is chords only');
      assert.ok(/official chart|Practice pattern/i.test(s.notes + s.author), s.title + ' explains it is a practice arrangement');
    } else assert.ok(p.lines.some((l) => l.type === 'lyric' && !l.chordsOnly), s.title + ' has words');
  }
  // joins the built-in list without duplicates
  const all = Songs.BUILTIN.map((s) => s.id);
  assert.strictEqual(new Set(all).size, all.length);
  assert.ok(all.includes('wl-goodness-of-god') && all.includes('pd-amazing-grace'));
});

test('bar-line charts: "| G | C D |" gives one bar per cell, split chords share it', () => {
  const p = Songs.parseChart('{start_of_verse: V}\n| G | C D | % |\n{end_of_verse}');
  const bars = Songs.chartBars(p, { beatsPerBar: 4 });
  assert.deepStrictEqual(bars.map((b) => b.chords.map((c) => c.name + ':' + c.beats).join(' ')), ['G:4', 'C:2 D:2', 'D:4']);
});

test('song tutorial: patterns, capo options, hardest change, voice-led piano voicings', () => {
  const song = Worship.LIBRARY.find((s) => s.id === 'wl-way-maker'); // key E
  const t = Worship.tutorial(song);
  assert.ok(t.steps.length >= 6 && t.roadmap.length >= 2);
  assert.ok(t.capo.some((c) => c.capo === 4 && c.shapes === 'C') || t.capo.some((c) => c.capo === 2 && c.shapes === 'D'));
  assert.ok(t.hardest && /→/.test(t.hardest.pair));
  assert.match(Worship.pattern(t.feel.strum), /↓/);
  // voice leading keeps the hand still: total movement smaller than root-position jumps
  const v = Worship.voiceLead(['C', 'F', 'G', 'C']);
  const move = v.slice(1).reduce((a, x, i) => a + x.notes.reduce((s, m, k) => s + Math.abs(m - v[i].notes[k]), 0), 0);
  assert.ok(move <= 12, 'moves ' + move + ' semitones');
  assert.ok(v.some((x) => x.inversion !== 'root position'));
});

test('kids lessons: 12 per track, known step types, gentle scoring and stickers', () => {
  const TYPES = ['say', 'tap-beat', 'echo-rhythm', 'color-keys', 'high-low', 'play-note', 'chord-shape', 'breathe', 'move', 'listen-choose'];
  for (const tr of Kids.TRACKS) {
    const l = Kids.LESSONS.filter((x) => x.track === tr.id);
    assert.ok(l.length >= 12, tr.id);
    for (const x of l) {
      assert.ok(x.minutes <= 5, 'short lesson ' + x.id);
      assert.ok(x.steps.length >= 1 && x.steps.length <= 5, 'few steps ' + x.id);
      for (const s of x.steps) assert.ok(TYPES.includes(s.type), x.id + ' ' + s.type);
    }
  }
  // tap judging
  const beats = [0, 0.5, 1, 1.5];
  const r = Kids.judgeTaps([0.02, 0.45, 1.3, 1.52], beats, 0.15);
  assert.strictEqual(r.hits, 3);
  assert.deepStrictEqual(Kids.rhythmOnsets([1, 0.5, 0.5, -1, 1]), { onsets: [0, 1, 1.5, 3], length: 4 });
  assert.strictEqual(Kids.starsFor(0), 1, 'always a star for trying');
  assert.strictEqual(Kids.stickersEarned(7).length, 2);
  const plan = Kids.todaysPlan('piano', {});
  assert.ok(plan.length >= 2 && plan.length <= 3 && plan.some((l) => l.track === 'piano'));
  assert.ok(plan.reduce((a, l) => a + l.minutes, 0) <= 10, 'a plan takes under 10 minutes');
  assert.strictEqual(Kids.colorOf(60), Kids.colorOf(72), 'same colour for every C');
});

test('appearance: themes, fonts and defaults', () => {
  require('../js/ui/theme.js');
  const T = PM.Theme;
  assert.ok(T.THEMES.length >= 7 && T.THEMES.some((t) => t.id === 'contrast'));
  assert.strictEqual(T.get({}).font, 'avenir');
  assert.ok(T.FONTS.some((f) => f.id === 'readable') && T.FONTS.some((f) => f.id === 'lexend'));
  assert.strictEqual(T.get({ appearance: { theme: 'ocean' } }).theme, 'ocean');
});
