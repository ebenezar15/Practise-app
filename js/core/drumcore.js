/* Overture — drums: the kit, a groove library, rudiments, fills, a graded exercise path
 * (note lengths → grooves → fills → odd meters) and timing scoring. Pure data + functions
 * (unit-tested); the Drum Studio and the drum-along trainer are in js/views/drums.js and
 * js/ui/drumalong.js.
 *
 * A pattern: {bpb (beats per bar), spb (steps per beat), bars, tracks: {piece: 'X.x.o...'},
 *             sticking?: 'RLRL…'}  · X accent · x normal · o ghost · . rest */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  // ------------------------------------------------------------------ the kit (top → bottom on the staff)
  const PIECES = [
    { id: 'crash', name: 'Crash cymbal', short: 'CR', midi: 49, key: 'R', color: '#f59e0b', role: 'Marks big moments — the start of a section or the end of a fill. Hit it with the shoulder of the stick, glancing off.' },
    { id: 'ride', name: 'Ride cymbal', short: 'RD', midi: 51, key: 'U', color: '#eab308', role: 'Keeps time like the hi-hat but washier — great for choruses and jazz. Play near the bell for a clear "ping".' },
    { id: 'hho', name: 'Hi-hat (open)', short: 'OH', midi: 46, key: 'D', color: '#14b8a6', role: 'Lift your foot so the cymbals ring — usually on an "and" to push the groove.' },
    { id: 'hhc', name: 'Hi-hat (closed)', short: 'HH', midi: 42, key: 'F', color: '#10b981', role: 'The timekeeper: two cymbals pressed together by your foot, played with sticks in 8ths or 16ths.' },
    { id: 'hhp', name: 'Hi-hat (foot)', short: 'HF', midi: 44, key: 'S', color: '#34d399', role: 'Closing the hi-hat with the foot gives a "chick" — often on 2 and 4.' },
    { id: 'tomh', name: 'High tom', short: 'T1', midi: 48, key: 'G', color: '#ec4899', role: 'Highest tom — fills usually start here and travel down.' },
    { id: 'tomm', name: 'Mid tom', short: 'T2', midi: 45, key: 'H', color: '#d946ef', role: 'Middle tom — the next step down in a fill.' },
    { id: 'snare', name: 'Snare drum', short: 'SN', midi: 38, key: 'J', color: '#8b5cf6', role: 'The crack of the backbeat on 2 and 4. Wires underneath make it buzz. Ghost notes are tiny taps in between.' },
    { id: 'rim', name: 'Side-stick', short: 'SS', midi: 37, key: 'L', color: '#a78bfa', role: 'Lay the stick across the snare and click the rim — a soft "tock" for quiet verses.' },
    { id: 'toml', name: 'Floor tom', short: 'FT', midi: 43, key: 'K', color: '#6366f1', role: 'Deep, big tom — ends fills and plays tom grooves in worship builds.' },
    { id: 'kick', name: 'Bass drum (kick)', short: 'BD', midi: 36, key: ' ', color: '#3b82f6', role: 'Played with the right foot: the heartbeat that locks with the bass guitar.' },
    { id: 'cowbell', name: 'Cowbell', short: 'CB', midi: 56, key: 'C', color: '#f97316', role: 'A bright metal bell for Latin, funk and party grooves.' },
  ];
  const PIECE = Object.fromEntries(PIECES.map((p) => [p.id, p]));
  const ORDER = PIECES.map((p) => p.id);

  const COUNT = { 1: [''], 2: ['', '&'], 3: ['', '&', 'a'], 4: ['', 'e', '&', 'a'], 6: ['', 'la', 'li', '&', 'la', 'li'] };
  const velOf = (c) => (c === 'X' ? 1 : c === 'x' ? 0.75 : c === 'o' ? 0.32 : 0);

  const P = (o) => Object.assign({ bpb: 4, spb: 4, bars: 1 }, o);
  const rep = (s, n) => Array.from({ length: n }, () => s).join('');

  /** Expected hits grouped by time step: [{step, beat, pieces:[{id, vel}]}]. */
  function hits(p) {
    const n = p.bpb * p.spb * p.bars, out = [];
    for (let k = 0; k < n; k++) {
      const ps = [];
      for (const id of ORDER) { const t = p.tracks[id]; if (t && t[k] && velOf(t[k]) > 0) ps.push({ id, vel: velOf(t[k]) }); }
      if (ps.length) out.push({ step: k, beat: k / p.spb, pieces: ps });
    }
    return out;
  }
  const lengthBeats = (p) => p.bpb * p.bars;
  const usedPieces = (p) => ORDER.filter((id) => p.tracks[id] && /[Xxo]/.test(p.tracks[id]));

  // ------------------------------------------------------------------ groove library
  const GROOVES = [
    P({ id: 'rock8', name: 'Rock 8ths', style: 'Rock / pop', level: 1, bpm: 96, spb: 2, tracks: { hhc: 'xxxxxxxx', snare: '..X...X.', kick: 'X...X...' }, tip: 'The groove behind countless songs: hats on every 8th, kick on 1 and 3, snare on 2 and 4.' }),
    P({ id: 'four-floor', name: 'Four on the floor', style: 'Dance / disco', level: 1, bpm: 118, spb: 2, tracks: { hho: '.x.x.x.x', hhc: 'x.x.x.x.', snare: '..X...X.', kick: 'X.X.X.X.' }, tip: 'Kick on every beat, open hat on every "and" — pure dance-floor energy.' }),
    P({ id: 'half-time', name: 'Half-time feel', style: 'Worship / pop', level: 2, bpm: 72, spb: 2, tracks: { hhc: 'xxxxxxxx', snare: '....X...', kick: 'X.....x.' }, tip: 'Snare only on beat 3 — the song feels half as fast and twice as big.' }),
    P({ id: 'pop-push', name: 'Pop with a push', style: 'Rock / pop', level: 2, bpm: 100, spb: 2, tracks: { hho: '.......x', hhc: 'xxxxxxx.', snare: '..X...X.', kick: 'X..xX...' }, tip: 'Kick on the "and" of 2 and an open hat on the "and" of 4 push into the next bar.' }),
    P({ id: 'worship-build', name: 'Worship tom build', style: 'Worship', level: 2, bpm: 76, spb: 4, tracks: { toml: 'x.x.x.x.x.x.x.x.', tomh: '..x...x...x...x.', kick: 'X.......X.......' }, tip: 'Floor-tom 8ths with high-tom answers build energy before a big chorus.' }),
    P({ id: 'ride-chorus', name: 'Ride chorus', style: 'Worship', level: 2, bpm: 82, spb: 2, tracks: { crash: 'X.......', ride: '.xxxxxxx', snare: '..X...X.', kick: 'X..xX.x.' }, tip: 'Move to the ride for a chorus lift; crash on 1 to announce it.' }),
    P({ id: 'shuffle', name: 'Shuffle', style: 'Blues / rock', level: 3, bpm: 100, spb: 3, tracks: { hhc: 'x.xx.xx.xx.x', snare: '...X.....X..', kick: 'X.....X.....' }, tip: 'Triplet feel with the middle note left out: "doo-ba doo-ba".' }),
    P({ id: 'six8', name: '6/8 ballad', style: 'Ballad / hymn', level: 3, bpm: 60, bpb: 2, spb: 3, tracks: { hhc: 'xxxxxx', snare: '...X..', kick: 'X....x' }, tip: 'Two big beats each split in three. Lovely for hymns and slow worship songs.' }),
    P({ id: 'hat16', name: '16th-note hats', style: 'Pop / R&B', level: 3, bpm: 88, spb: 4, tracks: { hhc: 'xoxoxoxoxoxoxoxo', snare: '....X.......X...', kick: 'X.....x...x.....' }, tip: 'Alternate strong and soft hat strokes (R L R L) to keep 16ths even.' }),
    P({ id: 'one-drop', name: 'Reggae one drop', style: 'Reggae', level: 3, bpm: 76, spb: 3, tracks: { hhc: 'x.xx.xx.xx.x', rim: '......X.....', kick: '......X.....' }, tip: 'Nothing on 1! Kick and side-stick together on beat 3.' }),
    P({ id: 'funk-ghost', name: 'Funk with ghost notes', style: 'Funk / gospel', level: 4, bpm: 92, spb: 4, tracks: { hhc: 'x.x.x.x.x.x.x.x.', snare: '..o.X..o.o.oX..o', kick: 'X..x..x...X.....' }, tip: 'Ghost notes are barely-there taps — let the backbeat stay loud.' }),
    P({ id: 'bossa', name: 'Bossa nova', style: 'Latin', level: 4, bpm: 120, spb: 4, bars: 2, tracks: { ride: rep('x.x.x.x.x.x.x.x.', 2), rim: 'X..x..x...x..x..' + 'X..x..x...x..x..', kick: rep('X..xX..xX..xX..x', 2) }, tip: 'Cross-stick plays the clave while the kick rocks "1 … a 2".' }),
    P({ id: 'gospel-chops', name: 'Gospel groove', style: 'Funk / gospel', level: 5, bpm: 96, spb: 4, tracks: { hho: '..............x.', hhc: 'x.x.x.x.x.x.x.o.', snare: '...oX..o.o.oX.oo', kick: 'X.x...x.x.x...x.' }, tip: 'Busy kick and ghosted snare — groove first, chops second.' }),
    P({ id: 'seven8', name: '7/8 groove', style: 'Odd meter', level: 5, bpm: 140, bpb: 7, spb: 1, tracks: { hhc: 'xxxxxxx', snare: '..X.X..', kick: 'X.X.X..' }, tip: 'Count 1-2 1-2 1-2-3: kick starts every group.' }),
    P({ id: 'five4', name: '5/4 groove', style: 'Odd meter', level: 5, bpm: 120, bpb: 5, spb: 2, tracks: { ride: 'xxxxxxxxxx', snare: '....X...X.', kick: 'X.x...X...' }, tip: 'Feel it as 3 + 2 — like "Take Five".' }),
  ];

  // ------------------------------------------------------------------ rudiments (snare)
  const RUD = (id, name, level, spb, sticking, accents, tip) => P({ id, name, level, spb, bars: 1, bpm: 72, sticking: rep(sticking, (4 * spb) / sticking.length), tracks: { snare: rep(accents, (4 * spb) / accents.length) }, tip, cat: 'Rudiments' });
  const RUDIMENTS = [
    RUD('singles', 'Single-stroke roll', 1, 4, 'RL', 'xx', 'Alternate hands evenly: R L R L. Same height, same sound from both hands.'),
    RUD('doubles', 'Double-stroke roll', 2, 4, 'RRLL', 'xxxx', 'Two strokes per hand: the second bounce should be as loud as the first.'),
    RUD('paradiddle', 'Single paradiddle', 2, 4, 'RLRRLRLL', 'Xxxx', 'R L R R  L R L L — accent the first note of each group.'),
    RUD('triplet-singles', 'Triplet singles', 3, 3, 'RLRLRL', 'Xxx', 'Alternating triplets — the accent switches hands every beat.'),
    RUD('accent-16', 'Accent on the beat', 2, 4, 'RLRL', 'Xxxx', 'Accent each beat, keep the in-between notes low (taps).'),
    RUD('double-para', 'Double paradiddle', 4, 6, 'RLRLRRLRLRLL', 'Xxxxxx', 'RLRLRR LRLRLL in sextuplets — great for fills.'),
    P({ id: 'five-stroke', name: 'Five-stroke roll', level: 4, spb: 4, bpm: 72, cat: 'Rudiments', sticking: 'RRLLR...LLRRL...', tracks: { snare: 'xxxxX...xxxxX...' }, tip: 'Two doubles and an accent (RRLL R), then lead with the other hand (LLRR L).' }),
    RUD('six-stroke', 'Six-stroke roll', 5, 6, 'RLLRRLRLLRRL', 'XxxxxX', 'Accent – double – double – accent: a powerful fill builder.'),
  ];

  // ------------------------------------------------------------------ fills
  const FILLS = [
    P({ id: 'fill-quarters', name: 'Quarter-note fill', level: 1, spb: 1, tracks: { snare: 'xx..', tomh: '..x.', toml: '...x' }, tip: 'Snare, snare, high tom, floor tom — then crash on 1.' }),
    P({ id: 'fill-8ths', name: 'Around the toms (8ths)', level: 2, spb: 2, tracks: { snare: 'xx......', tomh: '..xx....', tomm: '....xx..', toml: '......xx' }, tip: 'Two notes on each drum, travelling down.' }),
    P({ id: 'fill-16ths', name: '16th-note fill', level: 3, spb: 4, tracks: { snare: 'xxxx............', tomh: '....xxxx........', tomm: '........xxxx....', toml: '............xxxx' }, tip: 'Four on each drum — keep the hands alternating.' }),
    P({ id: 'fill-triplet', name: 'Triplet fill', level: 3, spb: 3, tracks: { snare: 'xxx.........', tomh: '...xxx......', tomm: '......xxx...', toml: '.........xxx' }, tip: 'R L R  L R L … a rolling, swung fill.' }),
    P({ id: 'fill-kick16', name: 'Hands & feet fill', level: 4, spb: 4, tracks: { snare: 'x..x..x.........', toml: '.........x..x..x', kick: '.x..x..x.x..x..x' }, tip: 'Hand – foot – hand patterns: a big modern sound.' }),
  ];

  /** Make a fresh random fill for a level (1 bar). */
  function randomFill(level, rnd) {
    rnd = rnd || Math.random;
    const spb = level <= 1 ? 2 : level === 2 ? (rnd() < 0.5 ? 2 : 4) : rnd() < 0.5 ? 3 : 4;
    const n = 4 * spb, drums = ['snare', 'tomh', 'tomm', 'toml'], tracks = { snare: '', tomh: '', tomm: '', toml: '', kick: '' };
    const startBeat = level <= 2 ? 2 : rnd() < 0.5 ? 0 : 2;
    let d = 0;
    for (let k = 0; k < n; k++) {
      const beat = Math.floor(k / spb);
      const on = beat >= startBeat && (level >= 3 || k % Math.max(1, spb / 2) === 0 || rnd() < 0.3);
      const hit = on && (rnd() < (level <= 1 ? 0.8 : 0.9));
      const kick = level >= 4 && hit && rnd() < 0.25;
      if (hit && !kick && k > 0 && rnd() < 0.4) d = Math.min(3, d + 1);
      for (const id of drums) tracks[id] += hit && !kick && drums[d] === id ? (k % spb === 0 ? 'X' : 'x') : '.';
      tracks.kick += kick ? 'x' : beat === 0 && k % spb === 0 ? 'X' : '.';
    }
    return P({ id: 'fill-random', name: 'Fresh fill', level, spb, tracks, tip: 'A new fill every time — play it, then crash on the next 1.' });
  }
  /** Vary a groove: move kicks, add an open hat, swap hat for ride… */
  function remix(p, rnd) {
    rnd = rnd || Math.random;
    const t = Object.assign({}, p.tracks), n = p.bpb * p.spb * p.bars;
    const set = (id, k, c) => { const s = (t[id] || '.'.repeat(n)).split(''); s[k] = c; t[id] = s.join(''); };
    const moves = Math.floor(2 + rnd() * 3);
    for (let i = 0; i < moves; i++) {
      const r = rnd(), k = Math.floor(rnd() * n);
      if (r < 0.35 && k % p.spb !== 0) set('kick', k, 'x');
      else if (r < 0.5 && t.kick && t.kick[k] !== '.' && k !== 0) set('kick', k, '.');
      else if (r < 0.65 && t.hhc) { const kk = n - (p.spb > 1 ? 1 : 2); set('hhc', kk, '.'); set('hho', kk, 'x'); }
      else if (r < 0.8 && t.snare && t.snare[k] === '.' && p.spb >= 4) set('snare', k, 'o');
      else if (t.hhc && !t.ride) { t.ride = t.hhc; delete t.hhc; }
    }
    if (!t.crash && rnd() < 0.4) set('crash', 0, 'X');
    return Object.assign({}, p, { id: p.id + '-remix', name: p.name + ' (remix)', tracks: t, remix: true });
  }

  // ------------------------------------------------------------------ the exercise path (kind: 'rhythm')
  function exercises() {
    const ex = [];
    const add = (level, cat, title, desc, tip, pat, bpm) => ex.push(Object.assign({ level, cat, title, desc, tip, kind: 'rhythm', bpm: bpm || pat.bpm || 72 }, { pattern: pat }));
    // Note lengths
    add(1, 'Note lengths', 'Whole notes', 'Crash + kick on beat 1 and let it ring for 4 beats. Count 1-2-3-4 out loud.', 'A whole note fills the whole bar — don\'t rush the next one.', P({ bars: 2, spb: 1, tracks: { crash: 'X...X...', kick: 'X...X...' } }), 70);
    add(1, 'Note lengths', 'Half notes', 'Snare on 1 and 3: two beats each.', 'Count "1-2, 3-4" and hit on 1 and 3.', P({ bars: 2, spb: 1, tracks: { snare: 'x.x.x.x.' } }), 70);
    add(1, 'Note lengths', 'Quarter notes', 'One hit on every beat. Alternate hands R L R L.', 'Keep both sticks the same height for an even sound.', P({ bars: 2, spb: 1, sticking: 'RLRLRLRL', tracks: { snare: 'xxxxxxxx' } }), 76);
    add(1, 'Note lengths', 'Eighth notes', 'Two even hits per beat: "1 & 2 & 3 & 4 &".', 'Say the "&" out loud — it sits exactly half-way.', P({ bars: 2, spb: 2, sticking: rep('RL', 8), tracks: { snare: rep('Xx', 8) } }), 72);
    add(2, 'Note lengths', 'Quarters → eighths', 'One bar of quarters, then one bar of eighths.', 'Switch smoothly — the beat itself must not speed up.', P({ bars: 2, spb: 2, tracks: { snare: 'x.x.x.x.' + rep('x', 8) } }), 76);
    add(2, 'Note lengths', 'Quarter rests', 'Hit, rest, hit, rest — silent beats still count!', 'Tap your foot on the rests so you feel them.', P({ bars: 2, spb: 1, tracks: { snare: 'x.x.xx.x' } }), 72);
    add(2, 'Note lengths', 'Sixteenth notes', 'Four even hits per beat: "1 e & a".', 'Start slowly — evenness beats speed.', P({ bars: 1, spb: 4, sticking: rep('RL', 8), tracks: { snare: rep('Xxxx', 4) } }), 60);
    add(3, 'Note lengths', 'Eighth-note triplets', 'Three even hits per beat: "1-&-a" or "trip-o-let".', 'R L R  L R L — the lead hand swaps every beat.', P({ bars: 1, spb: 3, sticking: 'RLRLRLRLRLRL', tracks: { snare: rep('Xxx', 4) } }), 66);
    add(3, 'Note lengths', 'Dotted quarter + eighth', 'Long–short: hit on 1, then the "&" of 2.', 'A dot adds half again: 1½ beats then ½ beat.', P({ bars: 2, spb: 2, tracks: { snare: 'x..xx..xx..xx..x' } }), 72);
    add(4, 'Note lengths', 'Dotted 8th + 16th', 'Swingy "long-short" inside each beat: "1 … a".', 'The 16th is just before the next beat — like a skipping rhythm.', P({ bars: 1, spb: 4, tracks: { snare: rep('x..x', 4) } }), 66);
    add(4, 'Note lengths', 'Mixed values', 'Quarter, two 8ths, four 16ths, a triplet feel — all in two bars.', 'Count everything in 16ths ("1 e & a") to place each hit.', P({ bars: 2, spb: 4, tracks: { snare: 'x...x.x.xxxxx...' + 'x.x.x...xxxxx...' } }), 64);
    // Reading & coordination
    add(1, 'Grooves', 'Backbeat (no hi-hat)', 'Kick on 1 and 3, snare on 2 and 4 — the skeleton of every groove.', 'Say "boom – CRACK – boom – CRACK" while you play.', P({ bars: 2, spb: 1, tracks: { snare: '.x.x.x.x', kick: 'x.x.x.x.' } }), 76);
    add(1, 'Grooves', 'First rock beat (quarter hats)', 'Hi-hat on every beat with the backbeat underneath.', 'Right hand on the hat, left hand on the snare, right foot on the kick.', P({ bars: 2, spb: 1, tracks: { hhc: 'xxxxxxxx', snare: '.x.x.x.x', kick: 'x.x.x.x.' } }), 76);
    add(2, 'Note lengths', 'Eighth-note rests', 'Hits and silences in 8ths — read every gap.', 'Keep counting "1 & 2 &" through the rests.', P({ bars: 2, spb: 2, tracks: { snare: 'x.xx.x.x' + 'xx.x.xx.' } }), 72);
    add(2, 'Grooves', 'Kick on the & of 3', 'Rock 8ths with an extra kick just before beat 4.', 'Keep the hat steady — only the foot changes.', P({ spb: 2, tracks: { hhc: 'xxxxxxxx', snare: '..X...X.', kick: 'X...Xx..' } }), 88);
    add(2, 'Grooves', 'Open hat on the & of 4', 'Lift the hi-hat foot on the last 8th of the bar.', 'Close it again exactly on beat 1 with the kick.', P({ spb: 2, tracks: { hho: '.......x', hhc: 'xxxxxxx.', snare: '..X...X.', kick: 'X...X...' } }), 88);
    add(3, 'Note lengths', '16th-note rests (part 1)', 'Each beat has a different 16th shape: 1 e & · | 1 · & a | 1 · · a | 1 e · a.', 'Count every 16th out loud: "1 e & a 2 e & a…".', P({ spb: 4, tracks: { snare: 'xxx.x.xxx..xxx.x' } }), 60);
    add(3, 'Note lengths', '16th-note rests (part 2)', 'Off-beat 16ths: · e & a | · e · a | · · & a | 1 · & ·.', 'The rests on the beat are the hardest — feel them with your foot.', P({ spb: 4, tracks: { snare: '.xxx.x.x..xxx.x.' } }), 56);
    add(3, 'Rudiments', 'Accent patterns in 8ths', 'Accents move around a stream of 8ths — the other notes stay soft.', 'Accent = full stroke from up high; taps = tiny strokes from low.', P({ bars: 2, spb: 2, sticking: rep('RL', 8), tracks: { snare: 'XxxXxxXx' + 'xXxxXxxX' } }), 76);
    add(3, 'Grooves', 'Syncopated snare', 'A backbeat plus an extra snare on the "a" of 2 and the "&" of 4.', 'Make the extra notes slightly softer than the backbeat.', P({ spb: 4, tracks: { hhc: 'x.x.x.x.x.x.x.x.', snare: '....X..x....X.x.', kick: 'X.....x.X.......' } }), 80);
    add(4, 'Grooves', 'Linear groove', 'No two limbs at once: hat, snare and kick take turns.', 'Linear grooves sound busy but each limb plays very little.', P({ spb: 4, tracks: { hhc: 'x.x.x..x.x.x..x.', snare: '....X.......X...', kick: '.x....x.x....x.x' } }), 76);
    add(4, 'Grooves', 'Tom groove in 16ths', 'Floor tom 16ths with snare accents — the big worship bridge sound.', 'Alternate R L on the floor tom; accents land on 2 and 4.', P({ spb: 4, sticking: rep('RLRL', 4), tracks: { toml: 'xxxx.xxxxxxx.xxx', snare: '....X.......X...', kick: 'X.......X.......' } }), 76);
    add(4, 'Grooves', '16th hats with open hats', 'Two-handed 16ths with open hats on the "&".', 'Open the hat for one 16th only — snap it shut on the next note.', P({ spb: 4, tracks: { hho: '..x.......x.....', hhc: 'xx.xxxxxxx.xxxxx', snare: '....X.......X...', kick: 'X.....x.X.......' } }), 80);
    add(5, 'Grooves', 'Double-kick 16ths', 'Both feet play 16ths on the kick under a half-time beat.', 'R L R L with the feet — start very slowly.', P({ spb: 4, tracks: { crash: 'X...............', ride: '..x...x...x...x.', snare: '........X.......', kick: rep('xxxx', 4) } }), 60);
    add(5, 'Fills', 'Groove + 16th fill + crash', 'Crash in, a bar of 16th-hat groove, then a bar ending in a 16th fill round the toms — loop it and the crash lands on the next 1.', 'Groove – fill – crash without slowing down: that is the whole job of a drummer!', P({ bars: 2, spb: 4, tracks: { crash: 'X' + '.'.repeat(31), hhc: '.xxxxxxxxxxxxxxx' + 'xxxxxxxx........', snare: '....X.......X...' + '....X...xxxx....', tomh: '................' + '............xx..', toml: '................' + '..............xx', kick: 'X.....x.X.......' + 'X.....x.........' } }), 70);
    add(5, 'Grooves', 'Half-time shuffle', 'A triplet shuffle with ghost notes and a half-time backbeat.', 'Ghost the middle triplet note on the snare; let the backbeat crack.', P({ spb: 3, tracks: { hhc: 'x.xx.xx.xx.x', snare: '.o..o.X.o..o', kick: 'X....x...x..' } }), 72);

    // Grooves, rudiments, fills from the libraries
    for (const g of GROOVES) add(g.level, 'Grooves', g.name, `${g.style} groove at ${g.bpm} BPM.`, g.tip, g, Math.round(g.bpm * (g.level <= 2 ? 0.85 : 0.8)));
    for (const r of RUDIMENTS) add(r.level, 'Rudiments', r.name, 'Sticking: ' + r.sticking.slice(0, 12).split('').join(' '), r.tip, r, r.bpm);
    for (const f of FILLS) add(Math.min(5, f.level + 1), 'Fills', f.name, 'Play 3 bars of groove in your head, then the fill — finish with a crash on 1.', f.tip, f, 80);
    // groove + fill combos
    add(3, 'Grooves', 'Groove into a fill', 'One bar of rock 8ths, then a bar of 8th-note fill.', 'Keep the tempo steady as you leave the hi-hat.', P({ bars: 2, spb: 2, tracks: { hhc: 'xxxxxxxx........', snare: '..X...X.xx......', tomh: '..........xx....', tomm: '............xx..', toml: '..............xx', kick: 'X...X...X.......' } }), 84);
    add(4, 'Grooves', 'Crash on the one', 'Fill, then crash + kick together on beat 1.', 'The crash and kick must land at exactly the same time.', P({ bars: 2, spb: 2, tracks: { crash: '........X.......', hhc: 'xxxx.....xxxxxxx', snare: '....xxxx..X...X.', kick: 'X.......X...X...' } }), 84);
    ex.sort((a, b) => a.level - b.level);
    ex.forEach((e, i) => { e.n = i + 1; e.id = 'drums-' + String(i + 1).padStart(2, '0'); e.notes = hits(e.pattern); e.hitCount = e.notes.length; });
    return ex;
  }

  // ------------------------------------------------------------------ scoring
  /**
   * Match played hits to expected ones. expected: [{time, pieces:[ids]}]; played: [{time, piece?}].
   * Returns {perHit:[{result, offsetMs, piece?}], accuracy, inTime, avgMs, spreadMs, extras, pieceAccuracy}.
   */
  function score(expected, played, opts) {
    opts = opts || {};
    const win = opts.window || 0.12, perfect = opts.perfect || 0.035, good = opts.good || 0.07;
    const used = new Set(), perHit = [];
    for (const e of expected) {
      let best = -1, bd = 1e9;
      played.forEach((p, i) => { if (used.has(i)) return; const d = Math.abs(p.time - e.time); if (d < bd && d <= win) { bd = d; best = i; } });
      if (best < 0) { perHit.push({ result: 'miss' }); continue; }
      used.add(best);
      // tap mode can play several pieces at one moment: collect the other taps within 40 ms
      const group = [best];
      played.forEach((p, i) => { if (!used.has(i) && Math.abs(p.time - played[best].time) < 0.04) { used.add(i); group.push(i); } });
      const off = (played[best].time - e.time) * 1000;
      const pieceOk = played[best].piece == null ? null : group.some((i) => e.pieces.includes(played[i].piece));
      perHit.push({ result: Math.abs(off) <= perfect * 1000 ? 'perfect' : Math.abs(off) <= good * 1000 ? 'good' : off < 0 ? 'early' : 'late', offsetMs: Math.round(off), pieceOk });
    }
    const hit = perHit.filter((h) => h.result !== 'miss');
    const offs = hit.map((h) => h.offsetMs);
    const avg = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    const spread = offs.length ? Math.sqrt(offs.reduce((a, b) => a + (b - avg) ** 2, 0) / offs.length) : 0;
    const extras = played.length - used.size;
    const pieced = hit.filter((h) => h.pieceOk != null);
    return {
      perHit,
      accuracy: expected.length ? hit.length / expected.length : 0,
      inTime: expected.length ? hit.filter((h) => h.result === 'perfect' || h.result === 'good').length / expected.length : 0,
      avgMs: Math.round(avg), spreadMs: Math.round(spread), extras,
      pieceAccuracy: pieced.length ? pieced.filter((h) => h.pieceOk).length / pieced.length : null,
    };
  }
  const stars = (s) => (s.accuracy >= 0.95 && s.inTime >= 0.85 ? 3 : s.accuracy >= 0.85 && s.inTime >= 0.6 ? 2 : s.accuracy >= 0.7 ? 1 : 0);

  PM.DrumCore = { PIECES, PIECE, ORDER, COUNT, GROOVES, RUDIMENTS, FILLS, hits, lengthBeats, usedPieces, velOf, randomFill, remix, exercises, score, stars, pattern: P };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.DrumCore;
})(typeof self !== 'undefined' ? self : globalThis);
