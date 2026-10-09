const test = require('node:test');
const assert = require('node:assert');
const { PM, strummedSong } = require('./load');
const { Midi, Analyzer, Theory, Coach, Game } = PM;

async function reference() {
  const midi = Midi.parseMidi(Midi.writeMidi(strummedSong({ bars: 8 }), { bpm: 96 }));
  return Analyzer.analyzeMidi(midi, { instrument: 'guitar' });
}

function frameFor(chordName, t, extra) {
  const p = Theory.parseChordName(chordName);
  const chroma = new Float32Array(12);
  Theory.chordPcs(p.root, p.type).forEach((pc) => (chroma[pc] = 1));
  return Object.assign({ time: t, refTime: t, active: true, db: -20, chord: Theory.detectChord(chroma), chroma, notes: [], onset: false }, extra);
}

test('coach rewards correct chords and corrects wrong ones', async () => {
  const ref = await reference();
  const msgs = [];
  const good = new Coach({ instrument: 'guitar', reference: ref, onMessage: (m) => msgs.push(m) });
  for (let t = 0; t < ref.duration; t += 1 / 30) {
    const at = Analyzer.chordAt(ref, t);
    if (at && at.chord.name !== 'N') good.update(frameFor(at.chord.name, t));
  }
  const s = good.summary();
  assert.ok(s.chordAccuracy > 0.95, 'accuracy ' + s.chordAccuracy);
  assert.ok(s.score > 0 && s.maxCombo > 10);
  assert.ok(msgs.some((m) => m.type === 'praise'));
  assert.ok(msgs.some((m) => m.type === 'instruction' && /Next up/.test(m.text)));

  const bad = [];
  const wrong = new Coach({ instrument: 'guitar', reference: ref, onMessage: (m) => bad.push(m) });
  for (let t = 0; t < ref.duration; t += 1 / 30) wrong.update(frameFor('F#m', t));
  assert.ok(wrong.summary().chordAccuracy < 0.3);
  assert.ok(bad.some((m) => m.type === 'fix' && /sounded like F#m/.test(m.text)), bad.map((m) => m.text).join('\n'));
});

test('coach detects dragging', async () => {
  const ref = await reference();
  const msgs = [];
  const c = new Coach({ instrument: 'guitar', reference: ref, onMessage: (m) => msgs.push(m) });
  const onsets = new Set(ref.beats.map((b) => Math.round((b + 0.045) * 100)));
  for (let t = 0; t < ref.duration; t += 0.01) {
    c.update(frameFor('G', t, { onset: onsets.has(Math.round(t * 100)) }));
  }
  assert.ok(msgs.some((m) => /dragging/.test(m.text)), msgs.map((m) => m.text).join('\n'));
  assert.ok(c.summary().meanOffsetMs > 30);
});

test('game: xp, levels, streaks, badges, daily', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) || null, setItem: (k, v) => store.set(k, v) };
  const g = new Game(storage);
  const d1 = new Date(2026, 0, 10, 20), d2 = new Date(2026, 0, 11, 20), d3 = new Date(2026, 0, 12, 20);
  const r = g.recordSession({ mode: 'studio', instrument: 'guitar', seconds: 1200, summary: { score: 3000, stars: 3, accuracy: 0.92, chordsNailed: 30, maxCombo: 30 } }, d1);
  assert.ok(r.xp > 0);
  assert.ok(r.badges.some((b) => b.id === 'first-note'));
  g.recordSession({ mode: 'studio', instrument: 'piano', seconds: 600, summary: {} }, d2);
  g.recordSession({ mode: 'studio', instrument: 'piano', seconds: 600, summary: {} }, d3);
  assert.strictEqual(g.state.streak, 3);
  assert.ok(g.state.badges['streak-3'] && g.state.badges['both'] && g.state.badges['combo-25']);
  assert.ok(g.state.level >= 2);
  const again = new Game(storage);
  assert.strictEqual(again.state.sessions, 3);
  assert.ok(again.state.daily && again.state.daily.text);
});
