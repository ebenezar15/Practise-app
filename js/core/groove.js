/* Overture — instrument groove trainer core (pure, no DOM). Pattern libraries made for each
 * instrument — guitar strumming patterns, piano comping, bass grooves, wind/voice articulation —
 * in every common time signature (2/4, 3/4, 4/4, 5/4, 6/8, 5/8, 7/8, 9/8, 12/8, swing), plus
 * dynamics plans, a chord-progression guide, scoring (timing, strum direction, dynamics,
 * sustain) and coaching tips.
 *
 * Pattern steps (one character per step):
 *   strum  D down · U up · X muted "chuck" · - hand moves past the strings (no sound) · . rest
 *   comp   W bass + chord · B left-hand bass note · C right-hand chord · - rest
 *   bass   1 root · 3 third · 5 fifth · 8 octave · A approach (semitone below the next root) · x dead note · - rest
 *   line   1 3 5 8 tongued / sung chord tone · ~ keep holding · - rest
 *   acc    optional string, '>' marks accents. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});

  // groups = eighth notes per pulse (the click), unit = eighths per BPM beat
  const METERS = {
    '2/4': { groups: [2, 2], unit: 2, label: '2/4 · march' },
    '3/4': { groups: [2, 2, 2], unit: 2, label: '3/4 · waltz' },
    '4/4': { groups: [2, 2, 2, 2], unit: 2, label: '4/4 · common time' },
    '5/4': { groups: [2, 2, 2, 2, 2], unit: 2, label: '5/4 · five' },
    '5/8': { groups: [3, 2], unit: 2, label: '5/8 · 3+2' },
    '6/8': { groups: [3, 3], unit: 3, label: '6/8 · compound' },
    '7/8': { groups: [2, 2, 3], unit: 2, label: '7/8 · 2+2+3' },
    '7/8b': { groups: [3, 2, 2], unit: 2, label: '7/8 · 3+2+2', name: '7/8' },
    '9/8': { groups: [3, 3, 3], unit: 3, label: '9/8 · compound triple' },
    '9/8b': { groups: [2, 2, 2, 3], unit: 2, label: '9/8 · 2+2+2+3', name: '9/8' },
    '12/8': { groups: [3, 3, 3, 3], unit: 3, label: '12/8 · slow triplet feel' },
  };
  const meterName = (id) => (METERS[id] && METERS[id].name) || id;
  const eighths = (m) => METERS[m].groups.reduce((a, b) => a + b, 0);
  const stepsPerBar = (p) => eighths(p.meter) * (p.res === 16 ? 2 : 1);

  const KINDS = {
    strum: { name: 'Strumming patterns', short: 'Strumming', art: '🎸', instruments: ['guitar', 'electric'] },
    comp: { name: 'Piano comping patterns', short: 'Comping', art: '🎹', instruments: ['piano'] },
    bass: { name: 'Bass grooves', short: 'Grooves', art: '🎸', instruments: ['bass'] },
    line: { name: 'Articulation & long tones', short: 'Articulation', art: '🎺', instruments: ['trumpet', 'voice'] },
  };
  const kindFor = (inst) => Object.keys(KINDS).find((k) => KINDS[k].instruments.includes(inst)) || null;

  const P = (kind, id, level, meter, name, seq, o) => Object.assign({ kind, id, level, meter, name, seq, bpm: 80 }, o || {});
  const S = (...a) => P('strum', ...a), C = (...a) => P('comp', ...a), B = (...a) => P('bass', ...a), L = (...a) => P('line', ...a);

  const PATTERNS = [
    // ------------------------------------------------------------ strumming
    S('s-quarters', 1, '4/4', 'Quarter-note downstrokes', 'D-D-D-D-', { bpm: 70, style: 'Foundation', tip: 'One relaxed downstroke per beat. Let the hand float back up past the strings between beats.' }),
    S('s-eighths-down', 1, '4/4', 'Eighth-note downstrokes', 'DDDDDDDD', { bpm: 72, acc: '>.......', style: 'Rock', tip: 'Short, even downstrokes from the wrist — the classic punk and rock drive.' }),
    S('s-down-up', 1, '4/4', 'Down–up eighths', 'DUDUDUDU', { bpm: 70, style: 'Foundation', tip: 'Down on the numbers, up on the “&”. The arm never stops — like a pendulum.' }),
    S('s-old-faithful', 1, '4/4', 'Old faithful (D · DU · UDU)', 'D-DU-UDU', { bpm: 76, style: 'Pop / worship', tip: 'The hand keeps moving down-up the whole time; it just misses the strings on the dashes.' }),
    S('s-waltz', 1, '3/4', 'Waltz downstrokes', 'D-D-D-', { bpm: 84, acc: '>.....', style: 'Waltz', tip: 'Strong 1, lighter 2 and 3: ONE two three.' }),
    S('s-march', 1, '2/4', 'March / polka', 'D-DU', { bpm: 90, acc: '>...', style: 'Folk', tip: 'A bright, bouncy two-beat feel. Accent beat one.' }),
    S('s-68-basic', 1, '6/8', '6/8 dotted-quarter strums', 'D--D--', { bpm: 52, acc: '>..>..', style: 'Ballad', tip: 'Two big beats per bar, each split into three: ONE-two-three FOUR-five-six.' }),
    S('s-pop-drive', 2, '4/4', 'Driving pop (D · DU DU DU)', 'D-DUDUDU', { bpm: 84, style: 'Pop', tip: 'Keep the upstrokes lighter than the downstrokes so the beat stays clear.' }),
    S('s-backbeat', 2, '4/4', 'Backbeat accents on 2 & 4', 'DUDUDUDU', { bpm: 84, acc: '..>...>.', style: 'Rock / pop', tip: 'Dig in on beats 2 and 4, where the snare drum would be.' }),
    S('s-calypso', 2, '4/4', 'Calypso / island (3-3-2 accents)', 'D-DU-UDU', { bpm: 88, acc: '>..>..>.', style: 'Island', tip: 'Accent the 3-3-2 pulse: ONE two three FOUR five six SEV-en eight.' }),
    S('s-chuck', 2, '4/4', 'Chuck on 2 & 4', 'D-XUD-XU', { bpm: 82, style: 'Acoustic pop', tip: 'For the chuck (X), slap the strings with the side of your strumming hand to mute them as you strike.' }),
    S('s-waltz-du', 2, '3/4', 'Waltz with upstrokes', 'D-DUDU', { bpm: 88, acc: '>.....', style: 'Waltz', tip: 'ONE two-and three-and. Keep the pendulum going through all three beats.' }),
    S('s-waltz-ballad', 2, '3/4', 'Ballad waltz (D · · U D U)', 'D--UDU', { bpm: 76, style: 'Ballad', tip: 'Let the first strum ring through beat 2, then lift on the “&” of 2.' }),
    S('s-68-ballad', 2, '6/8', '6/8 ballad (DDU DDU)', 'DDUDDU', { bpm: 56, acc: '>..>..', style: 'Worship ballad', tip: 'Down, down-up for each half of the bar — a gentle rocking motion.' }),
    S('s-swing', 2, '4/4', 'Swing eighths', 'DUDUDUDU', { bpm: 96, swing: true, acc: '..>...>.', style: 'Swing / jazz', tip: 'Long–short, long–short: the upstroke comes late, like a triplet.' }),
    S('s-shuffle', 2, '4/4', 'Blues shuffle', 'D-DUD-DU', { bpm: 92, swing: true, style: 'Blues', tip: 'Swing it hard and keep your wrist loose.' }),
    S('s-two-step', 2, '2/4', 'Country two-step', 'D-XU', { bpm: 104, style: 'Country', tip: 'Strum on 1, chuck on 2 — the classic boom-chick.' }),
    S('s-five', 2, '5/4', '5/4 (3 + 2)', 'D-DUD-DU-U', { bpm: 92, acc: '>.....>...', style: 'Odd meter', tip: 'Count 1-2-3 1-2. The accent on beat 4 marks the second group.' }),
    S('s-funk16', 3, '4/4', 'Sixteenth funk with chucks', 'DUDUXUDUDUDUXUDU', { res: 16, bpm: 84, acc: '....>.......>...', style: 'Funk', tip: 'Tiny wrist movements and constant 16ths; mute the strings with your fretting hand between strums.' }),
    S('s-gallop', 3, '4/4', 'Gallop (D · DU per beat)', 'D-DUD-DUD-DUD-DU', { res: 16, bpm: 88, style: 'Rock / worship', tip: 'An eighth then two sixteenths, every beat: DA-da-da.' }),
    S('s-16-folk', 3, '4/4', 'Sixteenth folk', 'D-DU-UDUD-DU-UDU', { res: 16, bpm: 76, style: 'Folk / worship', tip: 'Old faithful at double speed — keep the 16th pendulum going.' }),
    S('s-bo-diddley', 3, '4/4', 'Bo Diddley (3-3-4-2-4)', 'D--U--D---D-D---', { res: 16, bpm: 96, acc: '>..>..>...>.>...', style: 'Rock’n’roll', tip: 'Count in 16ths and feel the clave: 1 . . 2 . . 3 . . . 4 . 5 . . .' }),
    S('s-reggae', 3, '4/4', 'Reggae skank (2 & 4)', '--D---D-', { bpm: 72, style: 'Reggae', tip: 'A short, choked strum: release the fretting-hand pressure right after you strike.' }),
    S('s-ska', 3, '4/4', 'Ska upstrokes', '-U-U-U-U', { bpm: 120, style: 'Ska', tip: 'Only the offbeats — short and crisp.' }),
    S('s-58', 3, '5/8', '5/8 (3 + 2)', 'D-UDU', { bpm: 84, acc: '>..>.', style: 'Odd meter', tip: 'Long–short: 1-2-3 1-2.' }),
    S('s-78', 3, '7/8', '7/8 (2 + 2 + 3)', 'DUDUD-U', { bpm: 90, acc: '>.>.>..', style: 'Odd meter', tip: 'Short-short-long: 1-2 1-2 1-2-3.' }),
    S('s-78b', 3, '7/8b', '7/8 (3 + 2 + 2)', 'D-UD-D-', { bpm: 90, acc: '>..>.>.', style: 'Odd meter', tip: 'Long-short-short: 1-2-3 1-2 1-2.' }),
    S('s-98', 3, '9/8', '9/8 triplet strum', 'D-UD-UD-U', { bpm: 60, acc: '>..>..>..', style: 'Celtic / jig', tip: 'Three big beats, each split into three — the slip-jig feel.' }),
    S('s-98b', 3, '9/8b', '9/8 (2 + 2 + 2 + 3)', 'DUDUDUD-U', { bpm: 90, acc: '>.>.>.>..', style: 'Balkan / odd meter', tip: 'Three shorts and a long: 1-2 1-2 1-2 1-2-3.' }),
    S('s-128-blues', 3, '12/8', '12/8 slow blues', 'D-UD-UD-UD-U', { bpm: 52, acc: '>..>..>..>..', style: 'Blues / soul', tip: 'Four slow beats, each a triplet: long-short in every group.' }),
    S('s-128-gospel', 3, '12/8', '12/8 gospel backbeat', 'DDDDDDDDDDDD', { bpm: 54, acc: '...>.....>..', style: 'Gospel', tip: 'Even triplet downstrokes with a big accent on beats 2 and 4.' }),

    // ------------------------------------------------------------ piano comping
    C('c-whole', 1, '4/4', 'Block chords on every beat', 'W-W-W-W-', { bpm: 72, style: 'Foundation', tip: 'Both hands together, steady quarter notes. Keep the wrists soft.' }),
    C('c-bass-chord', 1, '4/4', 'Bass – chord (stride basics)', 'B-C-B-C-', { bpm: 76, style: 'Pop / stride', tip: 'Left hand on 1 and 3, right-hand chord on 2 and 4.' }),
    C('c-ballad', 1, '4/4', 'Ballad: hold, then two pulses', 'W---C-C-', { bpm: 68, style: 'Ballad', tip: 'Play the full chord on 1 and let it ring, then pulse the right hand on 3 and 4.' }),
    C('c-waltz', 1, '3/4', 'Oom-pah-pah waltz', 'B-C-C-', { bpm: 88, acc: '>.....', style: 'Waltz', tip: 'Low bass on 1, lighter chords on 2 and 3.' }),
    C('c-eighths', 2, '4/4', 'Pop eighths', 'WCCCWCCC', { bpm: 84, acc: '>...>...', style: 'Pop / worship', tip: 'Right-hand chords on every eighth; the left hand lands on 1 and 3.' }),
    C('c-332', 2, '4/4', 'Syncopated 3-3-2', 'W--C--C-', { bpm: 88, acc: '>..>..>.', style: 'Pop', tip: 'Feel the push: ONE two three FOUR five six SEV-en eight.' }),
    C('c-68', 2, '6/8', '6/8 rocking comp', 'BCCBCC', { bpm: 56, acc: '>..>..', style: 'Ballad', tip: 'Bass on 1 and 4, gentle chords in between.' }),
    C('c-charleston', 2, '4/4', 'Charleston (swing)', 'C--C----', { bpm: 112, swing: true, acc: '>..>....', style: 'Jazz', tip: 'Beat 1, then the “&” of 2 — short and light.' }),
    C('c-skank', 2, '4/4', 'Reggae skank', '--C---C-', { bpm: 74, style: 'Reggae', tip: 'Short, detached chords on 2 and 4.' }),
    C('c-gospel', 3, '12/8', '12/8 gospel comp', 'W--CCCB--CCC', { bpm: 56, acc: '...>.....>..', style: 'Gospel', tip: 'Triplet chords with weight on 2 and 4 — let it breathe.' }),
    C('c-bossa', 3, '4/4', 'Bossa nova comp', 'BC-CB-C-', { bpm: 120, style: 'Bossa nova', tip: 'Left hand on 1 and 3; the right hand dances around the beat.' }),
    C('c-funk16', 3, '4/4', 'Sixteenth funk stabs', 'W--C--C-C--C-C--', { res: 16, bpm: 92, acc: '...>..>.....>...', style: 'Funk', tip: 'Short stabs — lift the hand right away.' }),
    C('c-54', 3, '5/4', '5/4 comp (3 + 2)', 'W-C-C-W-C-', { bpm: 96, acc: '>.....>...', style: 'Odd meter', tip: '1-2-3 1-2, with the left hand marking each group.' }),
    C('c-78', 3, '7/8', '7/8 comp (2 + 2 + 3)', 'W-C-C--', { bpm: 92, acc: '>.>.>..', style: 'Odd meter', tip: 'Short-short-long.' }),

    // ------------------------------------------------------------ bass grooves
    B('b-roots', 1, '4/4', 'Roots on every beat', '1-1-1-1-', { bpm: 72, style: 'Foundation', tip: 'Even, full-length notes. Lock in with the click.' }),
    B('b-root-fifth', 1, '4/4', 'Root – fifth', '1---5---', { bpm: 76, style: 'Country / worship', tip: 'Root on 1, fifth on 3, both held for two beats.' }),
    B('b-eighths', 1, '4/4', 'Driving eighths', '11111111', { bpm: 80, acc: '>...>...', style: 'Rock / pop', tip: 'Alternate your plucking fingers and keep every note the same length.' }),
    B('b-waltz', 1, '3/4', 'Waltz bass', '1-5-5-', { bpm: 88, acc: '>.....', style: 'Waltz', tip: 'Root on 1, fifth on 2 and 3.' }),
    B('b-octaves', 2, '4/4', 'Disco octaves', '18181818', { bpm: 104, style: 'Disco / pop', tip: 'Jump between root and octave — use your first and third (or fourth) fingers.' }),
    B('b-approach', 2, '4/4', 'Root – fifth – octave – approach', '1-5-8-A-', { bpm: 84, style: 'Motown', tip: 'Beat 4 slides into the next chord from a semitone below.' }),
    B('b-motown', 2, '4/4', 'Motown push', '1--1-5-A', { bpm: 92, style: 'Soul', tip: 'The “&” of 2 pushes the groove forward.' }),
    B('b-68', 2, '6/8', '6/8 bass', '1--5--', { bpm: 56, acc: '>..>..', style: 'Ballad', tip: 'Root and fifth on the two big beats.' }),
    B('b-walk', 2, '4/4', 'Walking bass (swing)', '1-3-5-A-', { bpm: 104, swing: true, style: 'Jazz / blues', tip: 'Quarter notes that walk to the next chord. Each one is full length.' }),
    B('b-funk', 3, '4/4', 'Sixteenth funk', '1--x1-x-8--x1-5-', { res: 16, bpm: 88, acc: '>...............', style: 'Funk', tip: 'The dead notes (x) are muted plucks: rest your fretting fingers on the string without pressing.' }),
    B('b-reggae', 3, '4/4', 'Reggae one-drop bass', '--1-5-1-', { bpm: 72, style: 'Reggae', tip: 'Leave beat 1 empty — that space is the groove.' }),
    B('b-54', 3, '5/4', '5/4 groove (3 + 2)', '1-1-5-1-5-', { bpm: 92, acc: '>.....>...', style: 'Odd meter', tip: 'Count 1-2-3 1-2 and mark each group with the root.' }),
    B('b-78', 3, '7/8', '7/8 groove (2 + 2 + 3)', '1-5-8--', { bpm: 92, acc: '>.>.>..', style: 'Odd meter', tip: 'Short-short-long — hold the last note.' }),
    B('b-128', 3, '12/8', '12/8 blues shuffle', '1-51-58-55-3', { bpm: 56, acc: '>..>..>..>..', style: 'Blues', tip: 'Long-short in every triplet.' }),

    // ------------------------------------------------------------ wind / voice articulation
    L('l-whole', 1, '4/4', 'Long tones (whole notes)', '1~~~~~~~', { bpm: 66, dyn: 'swell', style: 'Long tones', tip: 'Breathe low, start the note cleanly and keep the sound steady to the very end.' }),
    L('l-halves', 1, '4/4', 'Half notes: root and fifth', '1~~~5~~~', { bpm: 72, style: 'Long tones', tip: 'Hold each note for two full beats. Change notes without a gap.' }),
    L('l-quarters', 1, '4/4', 'Legato quarter notes', '1~3~5~3~', { bpm: 76, style: 'Legato', tip: 'Smooth, connected notes — a soft “doo” (or “loo” for singers) on each one.' }),
    L('l-waltz', 1, '3/4', '3/4 long–short', '1~~~5~', { bpm: 84, acc: '>.....', style: 'Waltz', tip: 'Hold the first note two beats, then one beat.' }),
    L('l-staccato', 2, '4/4', 'Staccato quarter notes', '1-1-5-5-', { bpm: 88, style: 'Articulation', tip: 'Short and light — stop each note with the breath, not the throat.' }),
    L('l-eighths', 2, '4/4', 'Eighth-note arpeggio', '1358531-', { bpm: 84, style: 'Articulation', tip: 'Even eighth notes: light tongue (“tu”), steady air.' }),
    L('l-332', 2, '4/4', 'Syncopated 3-3-2', '1~~3~~5~', { bpm: 88, acc: '>..>..>.', style: 'Pop', tip: 'Accent the start of each group.' }),
    L('l-68', 2, '6/8', '6/8 lilt', '1~35~3', { bpm: 56, acc: '>..>..', style: 'Ballad', tip: 'Long–short in each half of the bar.' }),
    L('l-swing', 2, '4/4', 'Swing articulation', '13531358', { bpm: 104, swing: true, acc: '.>.>.>.>', style: 'Jazz', tip: 'Long–short, with a gentle push on the offbeats (“doo-BAH”).' }),
    L('l-double', 3, '4/4', 'Sixteenth notes (double tonguing)', '1111333355558888', { res: 16, bpm: 72, style: 'Technique', tip: 'Trumpet: “tu-ku tu-ku”. Singers: “da-ga da-ga” on one breath.' }),
    L('l-triple', 3, '12/8', 'Triplets (triple tonguing)', '111333555888', { bpm: 56, acc: '>..>..>..>..', style: 'Technique', tip: 'Trumpet: “tu-tu-ku”. Singers: crisp triplets on “da”.' }),
    L('l-54', 3, '5/4', '5/4 phrase (3 + 2)', '1~3~5~~8~~', { bpm: 92, acc: '>.....>...', style: 'Odd meter', tip: 'Feel 1-2-3 1-2 and shape the phrase over the bar.' }),
    L('l-78', 3, '7/8', '7/8 phrase (2 + 2 + 3)', '1~3~5~~', { bpm: 92, acc: '>.>.>..', style: 'Odd meter', tip: 'Short-short-long — hold the last note.' }),
  ];
  const PATTERN = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));
  const forKind = (kind) => PATTERNS.filter((p) => p.kind === kind);
  const meters = (kind) => [...new Set(forKind(kind).map((p) => meterName(p.meter)))];

  const PROGRESSIONS = [
    { id: 'one', name: 'One chord (G)', chords: ['G'] },
    { id: 'g-c', name: 'G – C', chords: ['G', 'C'] },
    { id: 'pop', name: 'G – D – Em – C', chords: ['G', 'D', 'Em', 'C'] },
    { id: 'axis', name: 'C – G – Am – F', chords: ['C', 'G', 'Am', 'F'] },
    { id: 'd-worship', name: 'D – A – Bm – G', chords: ['D', 'A', 'Bm', 'G'] },
    { id: 'minor', name: 'Am – F – C – G', chords: ['Am', 'F', 'C', 'G'] },
    { id: 'e-minor', name: 'Em – C – G – D', chords: ['Em', 'C', 'G', 'D'] },
    { id: 'fifties', name: 'C – Am – F – G', chords: ['C', 'Am', 'F', 'G'] },
    { id: 'blues', name: '12-bar blues in A', chords: ['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'] },
  ];

  // level: -1 = p, 0 = mf, 1 = f  (per bar, as a function of bar index and bar count)
  const DYNAMICS = [
    { id: 'natural', name: 'Follow the accents', short: 'mf + accents', level: () => 0 },
    { id: 'even', name: 'Even mezzo-forte', short: 'mf, even', level: () => 0, even: true },
    { id: 'pf', name: 'Piano / forte bars', short: 'p · f · p · f', level: (b) => (b % 2 ? 1 : -1), contrast: true },
    { id: 'cresc', name: 'Crescendo', short: 'p → f', level: (b, n) => (n > 1 ? -1 + (2 * b) / (n - 1) : 0), slope: 1 },
    { id: 'dim', name: 'Diminuendo', short: 'f → p', level: (b, n) => (n > 1 ? 1 - (2 * b) / (n - 1) : 0), slope: -1 },
    { id: 'swell', name: 'Swell', short: 'p → f → p', level: (b, n) => (n > 2 ? 1 - Math.abs((2 * b) / (n - 1) - 1) * 2 : 0), swell: true },
  ];
  const DYN = Object.fromEntries(DYNAMICS.map((d) => [d.id, d]));
  const dynMark = (lv) => (lv <= -0.5 ? 'p' : lv >= 0.5 ? 'f' : 'mf');

  const mod12 = (x) => ((x % 12) + 12) % 12;
  const T = () => PM.Theory;
  const parse = (name) => T().parseChordName(name) || { root: 7, type: '' };
  const chordIv = (type) => (T().TYPE_BY_ID[type] || T().TYPE_BY_ID['']).iv;
  const rootIn = (pc, lo) => lo + mod12(pc - lo);

  /** Notes to sound for one event. inst: guitar|electric|piano|bass|trumpet|voice; lo = lowest root for line/bass. */
  function voicing(kind, ch, chordName, nextName, o) {
    o = o || {};
    const c = parse(chordName), iv = chordIv(c.type);
    if (kind === 'strum') {
      const sh = T().guitarShape(c.root, c.type) || T().guitarShape(c.root, c.type.startsWith('m') ? 'm' : '');
      if (!sh) return iv.map((x) => 52 + mod12(c.root - 4) + x);
      return sh.frets.map((f, s) => (f < 0 ? null : T().STANDARD_TUNING[s] + f)).filter((x) => x != null);
    }
    if (kind === 'comp') {
      const v = T().pianoVoicing(c.root, T().TYPE_BY_ID[c.type] ? c.type : '');
      return ch === 'B' ? [v[0]] : ch === 'C' ? v.slice(1) : v;
    }
    const lo = o.lo != null ? o.lo : kind === 'bass' ? 28 : 58;
    const r = rootIn(c.root, lo);
    if (ch === 'A') { const n = parse(nextName || chordName); return [rootIn(n.root, lo) - 1 < lo ? rootIn(n.root, lo) + 11 : rootIn(n.root, lo) - 1]; }
    if (ch === 'x') return [r];
    const deg = { 1: 0, 3: iv[1], 5: iv[2] != null ? iv[2] : 7, 8: 12 }[ch];
    return [r + (deg || 0)];
  }

  const isHit = (kind, ch) => (kind === 'strum' ? 'DUX'.includes(ch) : kind === 'comp' ? 'WBC'.includes(ch) : kind === 'bass' ? '1358Ax'.includes(ch) : '1358'.includes(ch));

  /** Step timing: duration of one step and the start of step i within a bar (swing aware). */
  function stepTime(p, bpm) {
    const M = METERS[p.meter], perEighth = 60 / bpm / M.unit, sd = p.res === 16 ? perEighth / 2 : perEighth;
    const ratio = p.swing ? 2 / 3 : 0.5;
    return { sd, at: (i) => Math.floor(i / 2) * 2 * sd + (i % 2 ? 2 * sd * ratio : 0) };
  }

  /** Click times inside one bar (seconds) with downbeat flag. */
  function clicks(p, bpm) {
    const { at } = stepTime(p, bpm), mul = p.res === 16 ? 2 : 1;
    let pos = 0;
    return METERS[p.meter].groups.map((g, i) => { const t = at(pos * mul); pos += g; return { time: t, down: i === 0 }; });
  }

  /** Every sounding event for `bars` bars, times relative to the first downbeat. */
  function events(p, o) {
    o = o || {};
    const bpm = o.bpm || p.bpm, bars = o.bars || 4, chords = o.chords || ['G'], dyn = DYN[o.dynamics || p.dyn || 'natural'] || DYN.natural;
    const n = stepsPerBar(p), { sd, at } = stepTime(p, bpm), barLen = at(n - 1) + (at(n - 1) - at(n - 2) > 0 ? at(n - 1) - at(n - 2) : sd);
    const barDur = (n * sd);
    const out = [];
    for (let b = 0; b < bars; b++) {
      const lv = dyn.level(b, bars);
      const chord = chords[b % chords.length], next = chords[(b + 1) % chords.length];
      for (let i = 0; i < n; i++) {
        const ch = p.seq[i];
        if (!isHit(p.kind, ch)) continue;
        let len = 1;
        while (i + len < n && p.seq[i + len] === '~') len++;
        if (p.kind !== 'line') while (i + len < n && (p.seq[i + len] === '-' || p.seq[i + len] === '.')) len++; // let it ring to the next hit
        const accent = !!(p.acc && p.acc[i] === '>');
        out.push({
          time: b * barDur + at(i), bar: b, step: i, ch, chord, accent, level: lv,
          dir: ch === 'D' || ch === 'X' ? 1 : ch === 'U' ? -1 : 0,
          mute: ch === 'X' || ch === 'x',
          dur: Math.max(sd * 0.6, (at(Math.min(i + len, n)) - at(i)) || len * sd) * (ch === 'x' || ch === 'X' ? 0.25 : 1),
          sustain: p.kind === 'line' && len > 1,
          notes: voicing(p.kind, ch, chord, next, o),
        });
      }
    }
    void barLen;
    return { events: out, barDur, total: bars * barDur, sd };
  }

  /** Velocity for the guide part. */
  const velocity = (e) => Math.max(0.15, Math.min(1, 0.55 + 0.22 * e.level + (e.accent ? 0.2 : 0) - (e.mute ? 0.15 : 0) - (e.dir < 0 ? 0.08 : 0)));

  const median = (a) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const corr = (x, y) => { const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : 0; };

  /** Judge one played attack against one expected event (for live feedback). */
  function judge(e, played) {
    const ms = Math.round((played.time - e.time) * 1000), a = Math.abs(ms);
    const result = a <= 35 ? 'perfect' : a <= 70 ? 'good' : ms < 0 ? 'early' : 'late';
    const dirOk = e.dir && played.dir ? Math.sign(played.dir) === e.dir : null;
    return { result, ms, dirOk };
  }

  /**
   * Score a take. expected: events[] (absolute .time), played: [{time, db?, dir?}],
   * o: {dynamics, frames: [{time, active}] (for sustain), window}
   */
  function score(expected, played, o) {
    o = o || {};
    const gaps = expected.slice(1).map((e, i) => e.time - expected[i].time).filter((g) => g > 0);
    const win = o.window || Math.min(0.13, Math.max(0.05, (gaps.length ? Math.min(...gaps) : 0.3) * 0.55));
    const used = new Set(), per = [];
    for (const e of expected) {
      let best = -1, bd = 1e9;
      played.forEach((pl, i) => { if (used.has(i)) return; const d = Math.abs(pl.time - e.time); if (d < bd && d <= win) { bd = d; best = i; } });
      if (best < 0) { per.push({ result: 'miss' }); continue; }
      used.add(best);
      per.push(Object.assign(judge(e, played[best]), { db: played[best].db, i: best }));
    }
    const hits = per.filter((h) => h.result !== 'miss');
    const offs = hits.map((h) => h.ms), avg = mean(offs);
    const spread = offs.length ? Math.sqrt(mean(offs.map((x) => (x - avg) ** 2))) : 0;
    const out = {
      perHit: per,
      accuracy: expected.length ? hits.length / expected.length : 0,
      inTime: expected.length ? hits.filter((h) => h.result === 'perfect' || h.result === 'good').length / expected.length : 0,
      avgMs: Math.round(avg), spreadMs: Math.round(spread),
      early: hits.filter((h) => h.result === 'early').length, late: hits.filter((h) => h.result === 'late').length,
      extras: played.length - used.size, misses: per.length - hits.length,
    };
    // strum direction (only where the analyser was confident)
    const dirs = per.map((h, k) => ({ h, e: expected[k] })).filter((x) => x.h.dirOk != null);
    if (dirs.length >= 3) {
      out.direction = dirs.filter((x) => x.h.dirOk).length / dirs.length;
      const wrongUp = dirs.filter((x) => !x.h.dirOk && x.e.dir < 0).length, wrongDown = dirs.filter((x) => !x.h.dirOk && x.e.dir > 0).length;
      out.wrongUp = wrongUp; out.wrongDown = wrongDown;
    }
    // dynamics
    const withDb = per.map((h, k) => ({ h, e: expected[k] })).filter((x) => x.h.db != null && isFinite(x.h.db));
    const dyn = DYN[o.dynamics || 'natural'] || DYN.natural;
    if (withDb.length >= 4) {
      const db = withDb.map((x) => x.h.db), med = median(db);
      const D = { median: Math.round(med), plan: dyn.id };
      const accd = withDb.filter((x) => x.e.accent).map((x) => x.h.db), plain = withDb.filter((x) => !x.e.accent).map((x) => x.h.db);
      if (accd.length >= 2 && plain.length >= 2) D.accentDb = Math.round((mean(accd) - mean(plain)) * 10) / 10;
      if (dyn.contrast) {
        const f = withDb.filter((x) => x.e.level > 0).map((x) => x.h.db), pp = withDb.filter((x) => x.e.level < 0).map((x) => x.h.db);
        if (f.length && pp.length) D.contrastDb = Math.round((mean(f) - mean(pp)) * 10) / 10;
      }
      if (dyn.slope || dyn.swell) {
        D.follow = Math.round(corr(withDb.map((x) => x.e.level), db) * 100) / 100;
        const lv = withDb.map((x) => x.e.level), hi = db.filter((_, i) => lv[i] >= 0.5), lo = db.filter((_, i) => lv[i] <= -0.5);
        if (hi.length && lo.length) D.contrastDb = Math.round((mean(hi) - mean(lo)) * 10) / 10;
      }
      const unacc = withDb.filter((x) => !x.e.accent);
      if (unacc.length >= 3) {
        const byBar = {};
        unacc.forEach((x) => (byBar[x.e.bar] = (byBar[x.e.bar] || []).concat(x.h.db)));
        // evenness within bars (removes intended bar-to-bar changes)
        const dev = [].concat(...Object.values(byBar).map((a) => { const m = mean(a); return a.map((v) => (v - m) ** 2); }));
        D.evenDb = Math.round(Math.sqrt(mean(dev)) * 10) / 10;
      }
      // 0..1 dynamics score for the plan
      const parts = [];
      if (D.accentDb != null && dyn.id !== 'even') parts.push(Math.max(0, Math.min(1, D.accentDb / 3)));
      if (dyn.contrast || dyn.slope || dyn.swell) parts.push(D.contrastDb != null ? Math.max(0, Math.min(1, D.contrastDb / 6)) : 0);
      if (D.follow != null) parts.push(Math.max(0, Math.min(1, D.follow / 0.7)));
      if (D.evenDb != null && (dyn.even || dyn.id === 'natural')) parts.push(Math.max(0, Math.min(1, (5 - D.evenDb) / 3)));
      D.score = parts.length ? Math.round(mean(parts) * 100) / 100 : null;
      out.dynamics = D;
    }
    // sustain: share of each held note's length that kept sounding
    if (o.frames && o.frames.length) {
      const held = expected.map((e, k) => ({ e, h: per[k] })).filter((x) => x.e.sustain && x.h.result !== 'miss');
      if (held.length) {
        const r = held.map((x) => {
          const t0 = x.e.time + 0.06, t1 = x.e.time + x.e.dur - 0.08;
          const fr = o.frames.filter((f) => f.time >= t0 && f.time <= t1);
          return fr.length ? fr.filter((f) => f.active).length / fr.length : 1;
        });
        out.sustain = Math.round(mean(r) * 100) / 100;
      }
    }
    return out;
  }

  function stars(s) {
    const dyn = s.dynamics && s.dynamics.score != null ? s.dynamics.score : 1;
    const dir = s.direction != null ? s.direction : 1;
    const v = s.inTime * 0.6 + s.accuracy * 0.15 + dyn * 0.15 + dir * 0.1 - Math.min(0.2, s.extras * 0.02);
    return v >= 0.88 ? 3 : v >= 0.72 ? 2 : v >= 0.5 ? 1 : 0;
  }

  /** Coaching: ordered, specific tips plus a next step. */
  function coach(s, p, o) {
    o = o || {};
    const tips = [], kind = p.kind, bpm = o.bpm || p.bpm;
    const dyn = DYN[o.dynamics || 'natural'] || DYN.natural;
    const word = kind === 'strum' ? 'strum' : kind === 'line' ? 'note' : 'note';
    if (s.accuracy < 0.6) tips.push({ k: 'timing', text: `Many ${word}s were missed. Drop the tempo to about ${Math.max(40, Math.round(bpm * 0.75))} BPM and count out loud: ${countLine(p)}.` });
    if (Math.abs(s.avgMs) > 22 && s.accuracy >= 0.5) tips.push({ k: 'timing', text: s.avgMs < 0 ? `You're rushing by about ${-s.avgMs} ms. Relax and let the click come to you; breathe out on beat 1.` : `You're dragging by about ${s.avgMs} ms. Anticipate the beat: start your ${kind === 'strum' ? 'hand moving' : 'note'} a little earlier.` });
    if (s.spreadMs > 32 && s.accuracy >= 0.5) tips.push({ k: 'timing', text: `Your average timing is fine, but ${word}s wander by ±${s.spreadMs} ms. ${kind === 'strum' ? 'Keep the strumming hand moving down-up all the time, even on the dashes.' : 'Tap your foot on every click.'}` });
    if (s.extras >= 3) tips.push({ k: 'rests', text: kind === 'strum' ? `You played ${s.extras} extra strums on the gaps. On a dash, keep the motion but lift your hand slightly so it passes over the strings.` : `${s.extras} extra notes landed in the rests. Silence is part of the groove: count the rests.` });
    if (s.direction != null && s.direction < 0.75) tips.push({ k: 'direction', text: s.wrongUp > s.wrongDown ? 'Several upstrokes came out as downstrokes. Down on the numbers, up on the “&”: think of your arm as a pendulum that never stops.' : 'Some downstrokes were played as upstrokes. Reset: down on every number, then add the upstrokes back.' });
    const D = s.dynamics;
    if (D) {
      if (dyn.contrast && D.contrastDb != null && D.contrastDb < 6) tips.push({ k: 'dynamics', text: `Your forte bars were only ${Math.max(0, D.contrastDb)} dB louder than the piano bars. Aim for about 6 dB or more: f should feel roughly twice as loud. Play the p bars closer to the soundhole or with less arm.` });
      if ((dyn.slope || dyn.swell) && (D.follow == null || D.follow < 0.5)) tips.push({ k: 'dynamics', text: `The ${dyn.name.toLowerCase()} wasn't clear (it followed the plan only ${Math.round(Math.max(0, D.follow || 0) * 100)}%). Grow or shrink a little in every bar, not all at once.` });
      if (dyn.id !== 'even' && p.acc && D.accentDb != null && D.accentDb < 2.5) tips.push({ k: 'accents', text: `Your accents were only ${Math.max(0, D.accentDb)} dB above the other ${word}s. Make the marked ones (›) clearly stronger — about 3 dB — and keep the rest lighter.` });
      if ((dyn.even || dyn.id === 'natural') && D.evenDb != null && D.evenDb > 4) tips.push({ k: 'dynamics', text: `The volume of your ${word}s varies by about ±${D.evenDb} dB. Aim for an even level: ${kind === 'strum' ? 'keep the same depth into the strings and a relaxed grip on the pick' : kind === 'line' ? 'steady air support from the belly' : 'the same weight from the arm on every note'}.` });
    }
    if (s.sustain != null && s.sustain < 0.8) tips.push({ k: 'sustain', text: `Held notes faded early (they lasted ${Math.round(s.sustain * 100)}% of their length). Take a fuller breath before the phrase and keep the air moving to the end of each note.` });
    let next;
    if (s.inTime >= 0.9 && (!D || D.score == null || D.score >= 0.7)) next = { bpm: Math.min(220, bpm + (bpm < 80 ? 6 : 8)), text: `Excellent! Push the tempo up to ${Math.min(220, bpm + (bpm < 80 ? 6 : 8))} BPM, change the dynamics plan, or try the next pattern.` };
    else if (s.inTime < 0.6) next = { bpm: Math.max(40, Math.round(bpm * 0.8)), text: `Slow down to ${Math.max(40, Math.round(bpm * 0.8))} BPM and nail it there first. Accuracy first, speed later.` };
    else next = { bpm, text: 'Nearly there: repeat at this tempo until you get three stars.' };
    if (!tips.length) tips.push({ k: 'great', text: kind === 'strum' ? 'Steady time, clean directions and good dynamics. That groove is ready for a song!' : 'Steady time and good dynamics. That groove is ready for a song!' });
    return { tips, next };
  }

  /** The count to say for a pattern, e.g. "1 & 2 & 3 & 4 &". */
  function countLine(p) {
    const M = METERS[p.meter], out = [];
    let beat = 1;
    for (const g of M.groups) {
      if (M.unit === 3 || g === 3 && M.unit === 2) { if (M.unit === 3) out.push(String(beat), 'la', 'li'); else out.push(String(beat), '&', 'a'); }
      else out.push(String(beat), '&');
      beat++;
    }
    if (p.res === 16) return out.map((x) => (/\d/.test(x) ? x + ' e' : x + ' a')).join(' ');
    return out.join(' ');
  }
  /** Per-step count labels for the grid. */
  function countLabels(p) {
    const M = METERS[p.meter], labels = [];
    let beat = 1;
    for (const g of M.groups) {
      const sub = g === 3 ? (M.unit === 3 ? ['', 'la', 'li'] : ['', '&', 'a']) : ['', '&'];
      for (let k = 0; k < g; k++) {
        const main = k === 0 ? String(beat) : sub[k];
        if (p.res === 16) labels.push(main, k === 0 ? 'e' : 'a'); else labels.push(main);
      }
      beat++;
    }
    return labels;
  }

  PM.Groove = { METERS, KINDS, PATTERNS, PATTERN, PROGRESSIONS, DYNAMICS, DYN, kindFor, forKind, meters, meterName, stepsPerBar, stepTime, clicks, events, velocity, voicing, judge, score, stars, coach, countLine, countLabels, dynMark, isHit };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Groove;
})(typeof self !== 'undefined' ? self : globalThis);
