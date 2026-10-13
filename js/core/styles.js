/* Cadenza — rhythm style library (inspired by the style banks of arranger keyboards):
 * drum patterns with Main A / Main B / Fill / Intro / Ending variations, plus bass and
 * chord-comping lines for auto-accompaniment. Pure data + helpers (unit-tested).
 *
 * Pattern strings: one character per step — X accent, x normal, o ghost/soft, . rest.
 * Bass: R root, 5 fifth, 3 third, 8 octave, 7 seventh, _ hold.  Comp: X/x hit, _ hold. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const clean = (s) => String(s).replace(/\s+/g, '');

  /** meter: '4/4' (16 steps of 16ths), '3/4' (12 sixteenths), '2/4' (8), '12/8' (12 eighths, 4 beats),
   *  '6/8' (6 eighths, 2 beats), '4/4T' (12 triplet eighths), '3/4T' (9 triplet eighths), '4/4E' (8 eighths) */
  const METERS = {
    '4/4': { steps: 16, stepsPerBeat: 4, beatsPerBar: 4, sig: '4/4' },
    '3/4': { steps: 12, stepsPerBeat: 4, beatsPerBar: 3, sig: '3/4' },
    '2/4': { steps: 8, stepsPerBeat: 4, beatsPerBar: 2, sig: '2/4' },
    '12/8': { steps: 12, stepsPerBeat: 3, beatsPerBar: 4, sig: '12/8' },
    '6/8': { steps: 6, stepsPerBeat: 3, beatsPerBar: 2, sig: '6/8' },
    '4/4T': { steps: 12, stepsPerBeat: 3, beatsPerBar: 4, sig: '4/4' },
    '3/4T': { steps: 9, stepsPerBeat: 3, beatsPerBar: 3, sig: '3/4' },
    '4/4E': { steps: 8, stepsPerBeat: 2, beatsPerBar: 4, sig: '4/4' },
    '3/4E': { steps: 6, stepsPerBeat: 2, beatsPerBar: 3, sig: '3/4' },
  };

  function pat(meter, tracks, extra) {
    const m = METERS[meter];
    const t = {};
    for (const [k, v] of Object.entries(tracks)) t[k] = clean(v);
    const p = Object.assign({ steps: m.steps, stepsPerBeat: m.stepsPerBeat, beatsPerBar: m.beatsPerBar, swing: 0, tracks: t }, extra || {});
    if (p.bass) p.bass = clean(p.bass);
    if (p.comp) p.comp = clean(p.comp);
    return p;
  }

  /** Generic fill for the last beat(s) of a bar: snare/tom run into a crash on the next bar. */
  function genFill(base) {
    const n = base.steps, spb = base.stepsPerBeat;
    const keep = n - (n >= 12 ? 2 * spb : spb);
    const f = JSON.parse(JSON.stringify(base));
    const cut = (s) => s.slice(0, keep) + '.'.repeat(n - keep);
    for (const k of Object.keys(f.tracks)) f.tracks[k] = cut(f.tracks[k]);
    const run = n - keep;
    const voices = ['snare', 'snare', 'tomh', 'tomh', 'tomm', 'tomm', 'toml', 'toml'];
    const line = (v) => Array.from({ length: run }, (_, i) => (voices[Math.floor((i / run) * voices.length)] === v ? (i % spb === 0 ? 'X' : 'x') : '.')).join('');
    for (const v of ['snare', 'tomh', 'tomm', 'toml']) f.tracks[v] = (f.tracks[v] ? f.tracks[v].slice(0, keep) : '.'.repeat(keep)) + line(v);
    f.tracks.kick = (f.tracks.kick || '.'.repeat(n)).slice(0, keep) + '.'.repeat(run - 1) + 'x';
    return f;
  }
  function genIntro(base) {
    const f = JSON.parse(JSON.stringify(base));
    f.tracks = { hhc: f.tracks.hhc || f.tracks.ride || f.tracks.shaker || 'x'.repeat(f.steps), rim: '.'.repeat(f.steps) };
    for (let b = 0; b < f.beatsPerBar; b++) f.tracks.rim = f.tracks.rim.slice(0, b * f.stepsPerBeat) + 'X' + f.tracks.rim.slice(b * f.stepsPerBeat + 1);
    delete f.bass;
    return f;
  }
  function genEnding(base) {
    const n = base.steps;
    return Object.assign({}, base, { tracks: { kick: 'X' + '.'.repeat(n - 1), crash: 'X' + '.'.repeat(n - 1), snare: 'X' + '.'.repeat(n - 1) }, bass: 'R' + '_'.repeat(Math.min(n - 1, base.stepsPerBeat * 2 - 1)) + '.'.repeat(Math.max(0, n - base.stepsPerBeat * 2)), comp: 'X' + '_'.repeat(Math.min(n - 1, base.stepsPerBeat * 2 - 1)) + '.'.repeat(Math.max(0, n - base.stepsPerBeat * 2)) });
  }
  /** Main B = Main A with changes (more drive). */
  function vary(a, changes, extra) {
    const b = JSON.parse(JSON.stringify(a));
    for (const [k, v] of Object.entries(changes)) b.tracks[k] = clean(v);
    return Object.assign(b, extra || {}, extra && extra.bass ? { bass: clean(extra.bass) } : {}, extra && extra.comp ? { comp: clean(extra.comp) } : {});
  }

  const S = [];
  function style(id, name, cat, bpm, meter, A, Bchanges, opts) {
    opts = opts || {};
    const a = pat(meter, A.tracks, { bass: A.bass, comp: A.comp, compKind: A.compKind || 'piano', swing: A.swing || 0 });
    const b = vary(a, Bchanges.tracks || {}, Object.assign({}, Bchanges.bass ? { bass: Bchanges.bass } : {}, Bchanges.comp ? { comp: Bchanges.comp } : {}, Bchanges.compKind ? { compKind: Bchanges.compKind } : {}));
    b.tracks.crash = b.tracks.crash || ('X' + '.'.repeat(a.steps - 1));
    S.push({ id, name, category: cat, bpm, meter: METERS[meter].sig, desc: opts.desc || '', tip: opts.tip || '', variations: { A: a, B: b, fill: opts.fill ? pat(meter, opts.fill.tracks, { bass: opts.fill.bass || a.bass, comp: opts.fill.comp || a.comp, compKind: a.compKind, swing: a.swing }) : genFill(b), intro: genIntro(a), ending: genEnding(a) } });
  }

  // ------------------------------------------------------------------ Pop & Rock
  style('pop-ballad', '8Beat Pop Ballad', 'Pop & Rock', 72, '4/4',
    { tracks: { kick: 'X... .... X... ..x.', rim: '.... X... .... X...', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R___ ____ 5___ R___', comp: 'X___ ____ X___ ____' },
    { tracks: { rim: '.'.repeat(16), snare: '.... X... .... X...', kick: 'X... ..x. X... ..x.' }, comp: 'X___ X___ X___ X___' },
    { desc: 'Gentle 8th-note ballad — the classic slow pop/worship feel.', tip: 'Let long notes ring and place chord changes exactly on beat 1.' });
  style('16-ballad', '16Beat Ballad', 'Pop & Rock', 76, '4/4',
    { tracks: { kick: 'X... ...X ..X. ....', snare: '.... X... .... X...', hhc: 'xoxo xoxo xoxo xoxo' }, bass: 'R___ __R_ 5___ R___', comp: 'X___ ____ X___ ____' },
    { tracks: { kick: 'X..X ...X ..X. ..x.', tamb: '.... X... .... X...' }, comp: 'X___ __X_ X___ __X_' },
    { desc: 'Soft 16th-note hi-hat with a laid-back backbeat (R&B ballads, modern worship).', tip: 'Feel the 16ths — light up-strums or broken chords fit perfectly.' });
  style('soft-rock', 'Soft Rock', 'Pop & Rock', 100, '4/4',
    { tracks: { kick: 'X... .... X.X. ....', snare: '.... X... .... X...', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R.R. R.R. R.R. 5.5.', comp: 'X... ..X. ..X. ....', compKind: 'guitar' },
    { tracks: { hhc: '.'.repeat(16), ride: 'x.x. x.x. x.x. x.x.', kick: 'X... ..X. X.X. ....' }, comp: 'X.X. X.X. X.X. X.X.' },
    { desc: 'Steady 8th-note rock groove at a comfortable tempo.', tip: 'Strum D-D-U-U-D-U and lock your down-strums with the kick drum.' });
  style('8beat-pop', '8Beat Modern Pop', 'Pop & Rock', 112, '4/4',
    { tracks: { kick: 'X... ..X. X... ....', snare: '.... X... .... X...', hhc: 'x.x. x.x. x.x. x.x.', clap: '.... X... .... X...' }, bass: 'R..R ..R. R..5 ..5.', comp: 'X... ..X. ..X. ....' },
    { tracks: { kick: 'X..X ..X. X..X ..x.', shaker: 'xoxo xoxo xoxo xoxo' }, comp: 'X..X ..X. X..X ..X.' },
    { desc: 'Radio-pop groove with a syncopated kick and handclaps.', tip: 'Accent the "and" of beat 2 with the kick drum to make it bounce.' });
  style('16beat-pop', '16Beat Pop', 'Pop & Rock', 104, '4/4',
    { tracks: { kick: 'X... ..X. ..X. ....', snare: '.... X... .... X..o', hhc: 'xoxo xoxo xoxo xoxo' }, bass: 'R..R ..5. ..R. 8.5.', comp: 'x.x. .x.x x.x. .x.x', compKind: 'guitar' },
    { tracks: { kick: 'X..X ..X. ..X. ..x.', hho: '.... ..x. .... ..x.' } },
    { desc: 'Busy 16th-note pop feel.', tip: 'Keep your strumming hand moving in 16ths; only touch the strings on the accents.' });
  style('hard-rock', 'Hard Rock', 'Pop & Rock', 132, '4/4',
    { tracks: { kick: 'X.X. .... X.X. X...', snare: '.... X... .... X...', hho: 'x.x. x.x. x.x. x.x.' }, bass: 'R.R. R.R. R.R. R.R.', comp: 'X_X_ X_X_ X_X_ X_X_', compKind: 'guitar' },
    { tracks: { hho: '.'.repeat(16), crash: 'X... x... x... x...', ride: 'x.x. x.x. x.x. x.x.', kick: 'X.XX ..X. X.XX ..X.' } },
    { desc: 'Driving 8ths with open hi-hat — power chords and attitude.', tip: 'Palm-mute the 8ths in Main A, open up for Main B. Stay relaxed at speed.' });
  style('power-rock', 'Power Rock', 'Pop & Rock', 120, '4/4',
    { tracks: { kick: 'X... ..X. X... ....', snare: '.... X... .... X...', ride: 'x.x. x.x. x.x. x.x.', crash: 'X... .... .... ....' }, bass: 'R.R. R.R. R.R. R.R.', comp: 'X___ ____ X___ ____', compKind: 'guitar' },
    { tracks: { kick: 'X.X. ..X. X.X. ..X.', tomh: '.... .... .... ..x.' }, comp: 'X_X_ X_X_ X_X_ X_X_' },
    { desc: 'Big arena rock — wide chords over a solid ride cymbal.', tip: 'Let the chords sustain in Main A; drive 8ths in Main B.' });
  style('rock-shuffle', 'Rock Shuffle', 'Pop & Rock', 110, '4/4T',
    { tracks: { kick: 'X.. ... X.x ...', snare: '... X.. ... X..', hhc: 'x.x x.x x.x x.x' }, bass: 'R.R 5.5 8.8 5.5', comp: 'X.x X.x X.x X.x', compKind: 'guitar' },
    { tracks: { hhc: '.'.repeat(12), ride: 'X.x X.x X.x X.x', kick: 'X.x ..x X.x ..x' } },
    { desc: 'Triplet "long-short" shuffle — blues-rock essential.', tip: 'Think "dah-da, dah-da": the second note is the last triplet of each beat.' });
  style('blues-12-8', 'Slow Blues 12/8', 'Pop & Rock', 60, '12/8',
    { tracks: { kick: 'X.. ... X.x ...', snare: '... X.. ... X..', ride: 'xxx xxx xxx xxx' }, bass: 'R__ 3.5 R__ 5.3', comp: 'X.. x.x X.. x.x' },
    { tracks: { ride: 'Xxx Xxx Xxx Xxx', kick: 'X.. ..x X.x ..x' } },
    { desc: 'Slow 12/8 blues — four big beats, each split in three.', tip: 'Count "1-and-a, 2-and-a…" and lean back on the triplets.' });
  style('six-eight-rock', '6/8 Slow Rock', 'Pop & Rock', 62, '12/8',
    { tracks: { kick: 'X.. ... X.. ...', snare: '... X.. ... X..', hhc: 'Xxx xxx Xxx xxx' }, bass: 'R__ ___ 5__ ___', comp: 'X.x x.x X.x x.x' },
    { tracks: { kick: 'X.. ..x X.. ..x', crash: 'X.. ... ... ...' }, comp: 'Xxx Xxx Xxx Xxx' },
    { desc: 'Doo-wop / 50s slow rock with piano triplets.', tip: 'Play broken-chord triplets with the hi-hat; keep the left hand on the roots.' });

  // ------------------------------------------------------------------ Dance
  style('disco', 'Disco', 'Dance', 120, '4/4',
    { tracks: { kick: 'X... X... X... X...', snare: '.... X... .... X...', hhc: 'x... x... x... x...', hho: '..x. ..x. ..x. ..x.' }, bass: 'R.8. R.8. R.8. R.8.', comp: '..X. ..X. ..X. ..X.' },
    { tracks: { clap: '.... X... .... X...', tamb: 'xoxo xoxo xoxo xoxo', hho: '..X. ..X. ..X. ..X.' }, comp: '.xX. .xX. .xX. .xX.', compKind: 'guitar' },
    { desc: 'Four-on-the-floor with open hats on the off-beats and octave bass.', tip: 'Chop short chords on the off-beats; let the octave bass bounce.' });
  style('funk', 'Funk', 'Dance', 100, '4/4',
    { tracks: { kick: 'X... ..X. ..X. .X..', snare: '.... X..o .o.. X..o', hhc: 'xoxo xoxo xoxo xoxo' }, bass: 'R..R ..5. R.8. .5.R', comp: '..x. .x.. ..x. .x..', compKind: 'guitar' },
    { tracks: { kick: 'X..X ..X. ..X. .X.X', hho: '.... ..x. .... ..x.', cowbell: 'x... x... x... x...' } },
    { desc: 'Syncopated 16th funk with ghost notes.', tip: 'Muted 16th "scratches" with your strumming hand; hit the chord only on the accents.' });
  style('house', 'House', 'Dance', 124, '4/4',
    { tracks: { kick: 'X... X... X... X...', clap: '.... X... .... X...', hho: '..x. ..x. ..x. ..x.', shaker: 'oxoo oxoo oxoo oxoo' }, bass: '..R. ..R. ..R. ..5.', comp: 'X__. ..X_ _... X...', compKind: 'pad' },
    { tracks: { hhc: 'x.x. x.x. x.x. x.x.', tamb: '.... X... .... X...' } },
    { desc: 'Club four-on-the-floor with off-beat bass.', tip: 'Feel the off-beat bass "pumping" against the kick.' });
  style('hip-hop', 'Hip-Hop', 'Dance', 90, '4/4',
    { tracks: { kick: 'X... ...X ..X. ....', snare: '.... X... .... X...', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R___ ___R __5_ ____', comp: 'X___ ____ ____ ____', compKind: 'pad', swing: 0.12 },
    { tracks: { kick: 'X..X ...X ..X. ..X.', hhc: 'x.xx x.x. x.xx x.x.' } },
    { desc: 'Laid-back boom-bap groove with a light swing.', tip: 'Play slightly behind the beat — relaxed, never rushed.' });
  style('rnb', 'R&B Groove', 'Dance', 84, '4/4',
    { tracks: { kick: 'X... ..X. .X.. ....', snare: '.... X... .... X...', hhc: 'xoxo xoxo xoxo xoxo', rim: '.... .... ...o ....' }, bass: 'R___ __5_ _R__ __8_', comp: 'X___ ___x ____ X___', swing: 0.14 },
    { tracks: { kick: 'X... ..X. .X.. ..x.', clap: '.... X... .... X...' } },
    { desc: 'Smooth swung 16ths — neo-soul and modern gospel ballads.', tip: 'Add 7th and 9th chords; let the swing pull the 16ths late.' });
  style('reggae', 'Reggae One Drop', 'Dance', 76, '4/4',
    { tracks: { kick: '.... .... X... ....', rim: '.... .... X... ....', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R___ __5_ ___. R.5.', comp: '..X. ..X. ..X. ..X.', compKind: 'guitar' },
    { tracks: { kick: 'X... .... X... ....', snare: '.... .... X... ....', hhc: 'xoxo xoxo xoxo xoxo' } },
    { desc: 'Kick and rim together on beat 3 — the "one drop", with off-beat skank.', tip: 'Skank short, muted chords on every "and". Less is more.' });
  style('afrobeat', 'Afrobeat', 'Dance', 108, '4/4',
    { tracks: { kick: 'X... ..X. X... ....', snare: '.... X..x .... X...', hhc: 'x.xx x.xx x.xx x.xx', shaker: 'oxox oxox oxox oxox' }, bass: 'R..R ..5. ..R. 5...', comp: '..x. x..x ..x. x..x', compKind: 'guitar' },
    { tracks: { cowbell: 'X.X. .X.X .X.. X.X.', congah: '..x. ..x. ..xx ..x.' } },
    { desc: 'Interlocking West-African inspired groove.', tip: 'Short, percussive guitar notes; groove with the cowbell pattern.' });

  // ------------------------------------------------------------------ Swing & Jazz
  style('swing', 'Big Band Swing', 'Swing & Jazz', 140, '4/4T',
    { tracks: { ride: 'X.. X.x X.. X.x', hhp: '... x.. ... x..', kick: 'o.. o.. o.. o..' }, bass: 'R.. 3.. 5.. 8..', comp: 'x.. x.. x.. x..', compKind: 'guitar' },
    { tracks: { snare: '... ..o ... .xo', crash: 'X.. ... ... ...', kick: 'o.. o.. o.x o..' }, comp: '... X.. ... X..', compKind: 'piano' },
    { desc: 'Ride-cymbal swing with a walking bass.', tip: 'Swing your 8ths "long-short", accent beats 2 and 4.' });
  style('jazz-ballad', 'Jazz Ballad (brushes)', 'Swing & Jazz', 66, '4/4T',
    { tracks: { shaker: 'x.o x.o x.o x.o', snare: 'o.. o.. o.. o..', hhp: '... x.. ... x..' }, bass: 'R__ ___ 5__ ___', comp: 'X__ ___ X__ ___' },
    { tracks: { ride: 'X.. X.x X.. X.x' }, bass: 'R.. 3.. 5.. 3..' },
    { desc: 'Slow, brushed jazz ballad.', tip: 'Use rich chords (maj7, m7) and let each one breathe.' });
  style('jazz-waltz', 'Jazz Waltz', 'Swing & Jazz', 150, '3/4T',
    { tracks: { ride: 'X.. X.x X.x', hhp: '... x.. x..', kick: 'o.. ... ...' }, bass: 'R.. 5.. 8..', comp: '... X.. X..' },
    { tracks: { snare: '... ..o ..o', kick: 'o.. ... o..' } },
    { desc: '3/4 swing — "one" big beat per bar.', tip: 'Feel each bar as one long pulse instead of three separate beats.' });

  // ------------------------------------------------------------------ Latin
  style('bossa', 'Bossa Nova', 'Latin', 130, '4/4',
    { tracks: { kick: 'X..x X..x X..x X..x', rim: 'X..X ..X. ..X. .X..', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R..5 R..5 R..5 R..5', comp: 'X..X ..X. ..X. .X..', compKind: 'guitar' },
    { tracks: { ride: 'x.x. x.x. x.x. x.x.', hhc: '.'.repeat(16), shaker: 'xoxo xoxo xoxo xoxo' } },
    { desc: 'Brazilian bossa nova — the clave-like rim pattern drives the guitar.', tip: 'Thumb plays root-fifth with the kick; fingers play the chord with the rim.' });
  style('samba', 'Samba', 'Latin', 100, '4/4',
    { tracks: { kick: 'X..x X..x X..x X..x', rim: '..X. .X.X ..X. .X.X', shaker: 'xoxo xoxo xoxo xoxo' }, bass: 'R..5 R..5 R..5 R..5', comp: 'X.x. .x.X .x.. x.x.', compKind: 'guitar' },
    { tracks: { tamb: 'xoXo xoXo xoXo xoXo', snare: '..o. .o.o ..o. .o.o', congah: '..x. ..xx ..x. ..xx' } },
    { desc: 'Energetic Brazilian samba.', tip: 'Feel it "in 2": two big pulses per bar.' });
  style('chacha', 'Cha Cha', 'Latin', 120, '4/4',
    { tracks: { cowbell: 'X.x. X.x. X.x. X.x.', kick: 'X... .... X... ....', snare: '.... .... .... X.X.', congah: '.... ..xx .... ..xx' }, bass: 'R... ..5. 5... R...', comp: 'X... X... X... X.X.' },
    { tracks: { congal: 'X... .... X... ....', shaker: 'x.x. x.x. x.x. x.x.' } },
    { desc: '"One, two, cha-cha-cha" — Latin ballroom classic.', tip: 'Play the "cha-cha-cha" on 4-and-1 crisp and short.' });
  style('rumba', 'Rumba', 'Latin', 104, '4/4',
    { tracks: { kick: 'X... ..X. X... ..X.', rim: '...X .... ..X. ....', shaker: 'x.x. x.x. x.x. x.x.', congah: '.... ..xx .... ..xx' }, bass: 'R... ..5. R... ..5.', comp: 'X... ..X. ..X. ....' },
    { tracks: { congal: 'X... .... X... ....', clave: 'X..X ..X. ..X. X...' } },
    { desc: 'Slow, romantic ballroom rumba.', tip: 'Lean on beat 4 — the rumba "push".' });
  style('tango', 'Tango', 'Latin', 120, '4/4',
    { tracks: { kick: 'X... X... X... X.X.', snare: 'X... X... X... X.X.' }, bass: 'R... 5... R... 5.5.', comp: 'X... X... X... X.X.' },
    { tracks: { tamb: '.... .... .... X.X.', crash: 'X... .... .... ....' } },
    { desc: 'Marked, dramatic tango beat.', tip: 'Play every beat short and strong, with a sharp double on beat 4.' });
  style('reggaeton', 'Reggaeton (Dembow)', 'Latin', 96, '4/4',
    { tracks: { kick: 'X... X... X... X...', snare: '...X ..X. ...X ..X.', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R... R... R... 5...', comp: '...X ..X. ...X ..X.', compKind: 'pad' },
    { tracks: { clap: '...X ..X. ...X ..X.', shaker: 'xoxo xoxo xoxo xoxo' } },
    { desc: 'The "boom-ch-boom-chick" dembow rhythm.', tip: 'Feel the 3+3+2 accents inside each beat pair.' });
  style('latin-pop', 'Latin Pop', 'Latin', 100, '4/4',
    { tracks: { kick: 'X..X ..X. X..X ..X.', snare: '.... X... .... X...', congah: '..x. ..xx ..x. ..xx', shaker: 'xoxo xoxo xoxo xoxo' }, bass: 'R..5 ..R. R..5 ..8.', comp: 'X..X ..X. X..X ..X.', compKind: 'guitar' },
    { tracks: { cowbell: 'X.X. X.X. X.X. X.X.', congal: 'X... .... X... ....' } },
    { desc: 'Pop with a Latin percussion layer (tresillo kick).', tip: 'Play the "3-3-2" tresillo: three strums spaced 3, 3, then 2 sixteenths.' });

  // ------------------------------------------------------------------ Country & Ballroom
  style('country', 'Country Train Beat', 'Country & Folk', 120, '4/4',
    { tracks: { snare: 'xoxo Xoxo xoxo Xoxo', kick: 'X... .... X... ....' }, bass: 'R... 5... R... 5...', comp: '..X. ..X. ..X. ..X.', compKind: 'guitar' },
    { tracks: { hhc: 'x.x. x.x. x.x. x.x.', snare: '.... X... .... X...', tamb: 'xoxo xoxo xoxo xoxo' } },
    { desc: 'The "train beat" — bass on the beat, chord on the off-beat (boom-chick).', tip: 'Alternate the bass note (root, fifth) and strum the chord in between.' });
  style('country-waltz', 'Country Waltz', 'Country & Folk', 96, '3/4E',
    { tracks: { kick: 'X. .. ..', rim: '.. X. X.', hhc: 'x. x. x.' }, bass: 'R_ .. 5.', comp: '.. X. X.', compKind: 'guitar' },
    { tracks: { snare: '.. X. X.', rim: '.'.repeat(6), tamb: '.. x. x.' } },
    { desc: 'Oom-pah-pah in 3/4: bass on 1, chords on 2 and 3.', tip: 'Make beat 1 deep and beats 2–3 light.' });
  style('polka', 'Polka', 'Country & Folk', 120, '2/4',
    { tracks: { kick: 'X... X...', snare: '..X. ..X.' }, bass: 'R... 5...', comp: '..X. ..X.' },
    { tracks: { hhc: 'x.x. x.x.', crash: 'X... ....' } },
    { desc: 'Bouncy 2/4 polka.', tip: 'Short and bouncy: bass, chord, bass, chord.' });
  style('march', 'March', 'Country & Folk', 112, '2/4',
    { tracks: { kick: 'X... X...', snare: 'x.oo X.x.' }, bass: 'R... 5...', comp: '..X. ..X.' },
    { tracks: { snare: 'xooo Xoxo', crash: 'X... X...' } },
    { desc: 'Military-style 2/4 march.', tip: 'Strong, even beats — imagine marching feet.' });
  style('slow-waltz', 'Slow Waltz', 'Ballroom', 84, '3/4',
    { tracks: { kick: 'X... .... ....', hhc: 'x.x. x.x. x.x.', rim: '.... X... X...' }, bass: 'R___ .... ....', comp: '.... X... X...' },
    { tracks: { ride: 'x.x. x.x. x.x.', hhc: '.'.repeat(12) }, comp: '.... X___ X___' },
    { desc: 'English waltz — elegant 3/4.', tip: 'Rise on beat 1, glide on 2 and 3.' });
  style('viennese', 'Viennese Waltz', 'Ballroom', 168, '3/4E',
    { tracks: { kick: 'X. .. ..', rim: '.. X. X.' }, bass: 'R. .. ..', comp: '.. X. X.' },
    { tracks: { hhc: 'x. x. x.', tamb: '.. x. x.' } },
    { desc: 'Fast, whirling waltz — one beat per bar.', tip: 'Very light chords on 2 and 3; feel one pulse per bar.' });

  // ------------------------------------------------------------------ Gospel & Worship
  style('gospel-shuffle', 'Gospel Shuffle 12/8', 'Gospel & Worship', 72, '12/8',
    { tracks: { kick: 'X.. ... X.x ...', snare: '... X.. ... X..', hhc: 'x.x x.x x.x x.x', tamb: '... X.. ... X..' }, bass: 'R__ ..5 R__ 5.3', comp: 'X.x X.x X.x X.x' },
    { tracks: { clap: '... X.. ... X..', ride: 'Xxx Xxx Xxx Xxx', hhc: '.'.repeat(12) } },
    { desc: 'Church 12/8 shuffle — hymns, spirituals and slow gospel.', tip: 'Clap on 2 and 4; let the piano roll the triplets.' });
  style('gospel-praise', 'Gospel Praise', 'Gospel & Worship', 116, '4/4',
    { tracks: { kick: 'X..X ..X. ..X. .X..', snare: '.... X... .... X...', clap: '.... X... .... X...', hhc: 'xoxo xoxo xoxo xoxo', tamb: 'x.x. x.x. x.x. x.x.' }, bass: 'R..R ..5. ..R. .8..', comp: 'X..X ..X. ..X. .X..' },
    { tracks: { hho: '..x. ..x. ..x. ..x.', kick: 'X..X ..X. ..X. .X.X' }, comp: 'X.XX ..X. X.X. .X..' },
    { desc: 'Up-tempo praise & worship with tambourine and claps.', tip: 'Big energy: push the "and" of beat 4 into the next bar.' });
  style('worship-68', 'Worship 6/8', 'Gospel & Worship', 66, '12/8',
    { tracks: { kick: 'X.. ... ... ...', rim: '... ... X.. ...', hhc: 'x.x x.x x.x x.x' }, bass: 'R__ ___ ___ ___', comp: 'X__ ___ X__ ___', compKind: 'pad' },
    { tracks: { kick: 'X.. ..x X.. ...', snare: '... ... X.. ...', rim: '.'.repeat(12), ride: 'Xxx xxx Xxx xxx' }, comp: 'X.. x.. X.. x..', compKind: 'piano' },
    { desc: 'Flowing 6/8 worship — builds from pads to full band.', tip: 'Start soft with the pad in Main A, swell into Main B.' });
  style('worship-pop', 'Contemporary Worship', 'Gospel & Worship', 74, '4/4',
    { tracks: { kick: 'X... .... X... ....', rim: '.... X... .... X...', hhc: 'x.x. x.x. x.x. x.x.' }, bass: 'R___ ____ R___ ____', comp: 'X___ ____ ____ ____', compKind: 'pad' },
    { tracks: { rim: '.'.repeat(16), snare: '.... X... .... X...', kick: 'X... ..X. X... ..X.', tomh: '.... .... .... ....' }, bass: 'R.R. R.R. R.R. R.R.', comp: 'X.X. X.X. X.X. X.X.', compKind: 'guitar' },
    { desc: 'Modern worship: pad and rim in A, driving 8ths in B.', tip: 'Dynamics are everything — play softly in A, build in B.' });

  // ------------------------------------------------------------------ World
  style('bhangra', 'Bhangra', 'World', 100, '4/4',
    { tracks: { toml: 'X..X ..X. X..X ..X.', tomh: '..x. x... ..x. x...', tamb: 'x.x. x.x. x.x. x.x.', clap: '.... X... .... X...' }, bass: 'R..R ..R. R..R ..5.', comp: '..X. X... ..X. X...' },
    { tracks: { kick: 'X..X ..X. X..X ..X.', shaker: 'xoxo xoxo xoxo xoxo' } },
    { desc: 'Punjabi dhol-style groove (inspired).', tip: 'Bounce on the "chal" rhythm: strong low drum with high answers.' });
  style('keherwa', 'Keherwa (8 beats)', 'World', 90, '4/4E',
    { tracks: { congal: 'XX.. ..X.', congah: 'X.xx x.Xx', rim: '.... .X..' }, bass: 'R... ..5.', comp: 'X.x. x.X.' },
    { tracks: { tamb: 'x.x. x.x.', shaker: 'xxxx xxxx' } },
    { desc: 'Indian 8-beat tala (Dha Ge Na Ti | Na Ka Dhi Na), played on hand drums.', tip: 'Say the bols out loud while you play: "Dha Ge Na Ti, Na Ka Dhi Na".' });
  style('dadra', 'Dadra (6 beats)', 'World', 96, '3/4E',
    { tracks: { congal: 'XX .X ..', congah: 'Xx xX xx' }, bass: 'R. .5 ..', comp: 'X. .x x.' },
    { tracks: { tamb: 'x. x. x.', shaker: 'xx xx xx' } },
    { desc: 'Indian 6-beat tala (Dha Dhi Na | Dha Ti Na), light-classical and devotional songs.', tip: 'Group the six beats 3 + 3 and accent the first of each group.' });
  style('kuthu-folk', 'South Indian Folk (6/8)', 'World', 132, '6/8',
    { tracks: { toml: 'X.. X..', tomh: '.xx .xx', tamb: 'x.x x.x', clap: '... X..' }, bass: 'R.. 5..', comp: 'X.x X.x' },
    { tracks: { kick: 'X.. X.x', snare: '... X..' } },
    { desc: 'Fast folk-drum feel in 6/8 (inspired by thappu/parai folk drumming).', tip: 'Feel two strong beats per bar, each split in three.' });

  /** Parse "C | Am | F G | G7" into one chord per bar (first chord of each bar). */
  function parseChords(text) {
    const out = [];
    for (const cell of String(text || '').split(/[|\n]+/)) {
      const tok = cell.trim().split(/\s+/).filter(Boolean)[0];
      if (!tok) continue;
      const c = PM.Songs ? PM.Songs.splitChord(tok) : null;
      if (c) out.push({ root: c.root, type: PM.Songs.simpleType(c.suffix), name: tok });
    }
    return out;
  }

  const CATEGORIES = [...new Set(S.map((s) => s.category))];
  PM.Styles = { STYLES: S, CATEGORIES, METERS, pat, genFill, parseChords, get: (id) => S.find((s) => s.id === id) || null };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Styles;
})(typeof self !== 'undefined' ? self : globalThis);
