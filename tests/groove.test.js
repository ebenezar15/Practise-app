// Instrument groove trainer: strumming / comping / bass / articulation libraries, timing,
// direction and dynamics scoring, coaching; Academy has enough lessons at every level.
const test = require('node:test');
const assert = require('node:assert');
const { PM } = require('./load.js');
const G = PM.Groove;

test('every pattern is well formed and every time signature is covered', () => {
  for (const p of G.PATTERNS) {
    assert.ok(G.METERS[p.meter], p.id + ' meter');
    assert.strictEqual(p.seq.length, G.stepsPerBar(p), p.id + ' seq length');
    if (p.acc) assert.strictEqual(p.acc.length, p.seq.length, p.id + ' acc length');
    assert.ok([...p.seq].some((c) => G.isHit(p.kind, c)), p.id + ' has hits');
    assert.ok(p.level >= 1 && p.level <= 3 && p.tip, p.id);
    const allowed = { strum: 'DUX-.', comp: 'WBC-', bass: '1358Ax-', line: '1358~-' }[p.kind];
    for (const c of p.seq) assert.ok(allowed.includes(c), `${p.id} char ${c}`);
    // straight duple strumming keeps the pendulum: down on even steps, up on odd
    if (p.kind === 'strum' && p.seq.includes('U') && G.METERS[p.meter].groups.every((g) => g === 2)) [...p.seq].forEach((c, i) => { if (c === 'D' || c === 'X') assert.strictEqual(i % 2, 0, p.id + ' down on odd step'); if (c === 'U') assert.strictEqual(i % 2, 1, p.id + ' up on even step'); });
  }
  const strumMeters = G.meters('strum');
  for (const m of ['2/4', '3/4', '4/4', '5/4', '5/8', '6/8', '7/8', '9/8', '12/8']) assert.ok(strumMeters.includes(m), 'strum ' + m);
  assert.ok(G.forKind('strum').some((p) => p.swing) && G.forKind('strum').some((p) => p.res === 16));
  assert.ok(G.forKind('strum').length >= 25);
  for (const k of ['comp', 'bass', 'line']) for (const l of [1, 2, 3]) assert.ok(G.forKind(k).filter((p) => p.level === l).length >= 3, k + ' level ' + l);
  assert.strictEqual(new Set(G.PATTERNS.map((p) => p.id)).size, G.PATTERNS.length);
  for (const inst of ['guitar', 'electric', 'piano', 'bass', 'trumpet', 'voice']) assert.ok(G.kindFor(inst), inst);
  assert.strictEqual(G.kindFor('drums'), null);
});

test('events: timing, swing, chords and voicings', () => {
  const p = G.PATTERN['s-down-up'];
  const { events, barDur } = G.events(p, { bpm: 60, bars: 2, chords: ['G', 'C'] });
  assert.strictEqual(events.length, 16);
  assert.ok(Math.abs(barDur - 4) < 1e-9);
  assert.ok(Math.abs(events[1].time - 0.5) < 1e-9 && events[1].dir === -1 && events[0].dir === 1);
  assert.deepStrictEqual(events[0].notes, [43, 47, 50, 55, 59, 67]); // open G
  assert.strictEqual(events[8].chord, 'C');
  const sw = G.events(G.PATTERN['s-swing'], { bpm: 60, bars: 1 }).events;
  assert.ok(Math.abs(sw[1].time - 2 / 3) < 1e-9, 'swung offbeat');
  const six = G.events(G.PATTERN['s-68-basic'], { bpm: 60, bars: 1 });
  assert.ok(Math.abs(six.barDur - 2) < 1e-9, '6/8 = two dotted-quarter beats');
  assert.deepStrictEqual(G.clicks(G.PATTERN['s-78'], 60).map((c) => +c.time.toFixed(3)), [0, 1, 2]);
  const bass = G.events(G.PATTERN['b-approach'], { bpm: 80, bars: 1, chords: ['G', 'C'] }).events;
  assert.deepStrictEqual(bass.map((e) => e.notes[0]), [31, 38, 43, 35]); // G1 D2 G2, B1 → C2
  for (const e of bass) assert.ok(e.notes[0] >= 28 && e.notes[0] <= 60);
  const line = G.events(G.PATTERN['l-whole'], { bpm: 60, bars: 1, chords: ['C'], lo: 58 }).events;
  assert.strictEqual(line.length, 1); assert.ok(line[0].sustain && Math.abs(line[0].dur - 4) < 1e-9); assert.strictEqual(line[0].notes[0], 60);
  for (const p2 of G.PATTERNS) for (const pr of G.PROGRESSIONS) { const ev = G.events(p2, { bars: 2, chords: pr.chords }).events; for (const e of ev) assert.ok(e.notes.length && e.notes.every((m) => m >= 28 && m <= 90), p2.id + ' ' + pr.id); }
  // crescendo plan rises bar by bar
  const cr = G.events(p, { bars: 4, dynamics: 'cresc' }).events;
  assert.ok(cr[0].level < cr[cr.length - 1].level && G.velocity(cr[0]) < G.velocity(cr[cr.length - 1]));
});

test('scoring: timing, direction, dynamics, sustain and coaching', () => {
  const p = G.PATTERN['s-backbeat'];
  const { events } = G.events(p, { bpm: 80, bars: 4, dynamics: 'natural' });
  // perfect, with accents 5 dB louder and correct directions
  const good = events.map((e) => ({ time: e.time + 0.01, db: -30 + (e.accent ? 5 : 0), dir: e.dir * 0.5 }));
  const s = G.score(events, good, { dynamics: 'natural' });
  assert.strictEqual(s.accuracy, 1); assert.strictEqual(s.inTime, 1); assert.strictEqual(s.direction, 1);
  assert.ok(s.dynamics.accentDb >= 4.9); assert.strictEqual(G.stars(s), 3);
  assert.strictEqual(G.coach(s, p, { bpm: 80 }).next.bpm, 88);
  // rushing, flat accents and upstrokes played down
  const bad = events.map((e) => ({ time: e.time - 0.05, db: -30, dir: 1 }));
  const b = G.score(events, bad, { dynamics: 'natural' });
  assert.ok(b.avgMs < -40 && b.direction < 0.6);
  const tips = G.coach(b, p, { bpm: 80 }).tips.map((t) => t.k);
  assert.ok(tips.includes('timing') && tips.includes('direction') && tips.includes('accents'), tips.join());
  // contrast plan
  const pf = G.events(G.PATTERN['s-down-up'], { bars: 4, dynamics: 'pf' }).events;
  const flat = G.score(pf, pf.map((e) => ({ time: e.time, db: -30 })), { dynamics: 'pf' });
  assert.ok(flat.dynamics.contrastDb < 1 && G.coach(flat, G.PATTERN['s-down-up'], { dynamics: 'pf' }).tips.some((t) => t.k === 'dynamics'));
  const loud = G.score(pf, pf.map((e) => ({ time: e.time, db: -30 + 4 * e.level })), { dynamics: 'pf' });
  assert.ok(loud.dynamics.contrastDb >= 7.9 && loud.dynamics.score > 0.9);
  // crescendo followed
  const cr = G.events(G.PATTERN['s-down-up'], { bars: 4, dynamics: 'cresc' }).events;
  const crs = G.score(cr, cr.map((e) => ({ time: e.time, db: -30 + 5 * e.level })), { dynamics: 'cresc' });
  assert.ok(crs.dynamics.follow > 0.9);
  // extra strums on the rests
  const of = G.PATTERN['s-old-faithful'], ofe = G.events(of, { bars: 2 }).events, sd = G.stepTime(of, of.bpm).sd;
  const ex = G.score(ofe, ofe.map((e) => ({ time: e.time })).concat([1, 4, 9, 12].map((k) => ({ time: k * sd }))));
  assert.strictEqual(ex.extras, 4); assert.ok(G.coach(ex, of).tips.some((t) => t.k === 'rests'));
  // sustain for long tones
  const lw = G.PATTERN['l-whole'], le = G.events(lw, { bars: 2, bpm: 60 }).events;
  const frames = []; for (let t = 0; t < 8; t += 0.02) frames.push({ time: t, active: t % 4 < 2 });
  const su = G.score(le, le.map((e) => ({ time: e.time })), { frames });
  assert.ok(su.sustain < 0.6 && G.coach(su, lw).tips.some((t) => t.k === 'sustain'));
});

test('counting labels', () => {
  assert.strictEqual(G.countLine(G.PATTERN['s-down-up']), '1 & 2 & 3 & 4 &');
  assert.strictEqual(G.countLine(G.PATTERN['s-68-basic']), '1 la li 2 la li');
  assert.deepStrictEqual(G.countLabels(G.PATTERN['s-78']), ['1', '&', '2', '&', '3', '&', 'a']);
  assert.strictEqual(G.countLabels(G.PATTERN['s-funk16']).length, 16);
});

test('Academy: every subject has at least 4 lessons at every level', () => {
  const A = PM.Academy;
  for (const s of A.SUBJECTS) for (const lv of [1, 2, 3]) assert.ok(A.LESSONS.filter((l) => l.subject === s.id && l.level === lv).length >= 4, `${s.id} level ${lv}`);
  assert.strictEqual(new Set(A.LESSONS.map((l) => l.id)).size, A.LESSONS.length);
  for (const l of A.LESSONS) for (const q of l.practice) assert.ok(A.GEN[q.gen], l.id + ' ' + q.gen);
});
