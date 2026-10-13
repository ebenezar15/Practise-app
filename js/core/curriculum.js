/* Cadenza — graded exercise path: 50+ exercises per instrument from first notes to advanced
 * technique. Each exercise has a level (1–5), category, notes (concert-pitch MIDI) with
 * rhythm (beats per note) or a chord sequence, a target tempo and a coaching tip.
 * Pure data generator — unit-tested for count, range and ordering. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // keys in a sensible order of difficulty for each instrument (concert pitch);
  // trumpet keys are chosen so the WRITTEN key is easy (concert Bb = written C, etc.)
  const KEY_ORDER = {
    piano: [0, 7, 5, 2, 10, 9, 3, 4, 8, 11, 1, 6],
    guitar: [7, 0, 2, 9, 4, 5, 10, 11, 3, 6, 8, 1],
    electric: [9, 4, 7, 2, 0, 5, 11, 6, 10, 3, 8, 1],
    bass: [4, 9, 7, 2, 0, 5, 10, 3, 11, 6, 8, 1],
    trumpet: [10, 3, 5, 8, 0, 1, 7, 6, 2, 9, 11, 4],
  };
  const keyName = (pc, inst) => NAMES[mod12(pc + (inst === 'trumpet' ? 2 : 0))];

  // public-domain melodies (scale degrees relative to the tonic, rhythm in beats)
  const MELODIES = [
    { id: 'twinkle', title: 'Twinkle, Twinkle, Little Star', deg: [0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0], beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2] },
    { id: 'mary', title: 'Mary Had a Little Lamb', deg: [4, 2, 0, 2, 4, 4, 4, 2, 2, 2, 4, 7, 7, 4, 2, 0, 2, 4, 4, 4, 4, 2, 2, 4, 2, 0], beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2] },
    { id: 'ode', title: 'Ode to Joy (Beethoven)', deg: [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2, 4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 2, 0, 0], beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2] },
    { id: 'saints', title: 'When the Saints Go Marching In', deg: [0, 4, 5, 7, 0, 4, 5, 7, 0, 4, 5, 7, 4, 0, 4, 2], beats: [1, 1, 1, 4, 1, 1, 1, 4, 1, 1, 1, 2, 2, 2, 2, 4] },
    { id: 'amazing', title: 'Amazing Grace (melody)', deg: [-5, 0, 4, 0, 4, 2, 0, -3, -5, -5, 0, 4, 0, 4, 2, 7], beats: [1, 2, 0.5, 0.5, 2, 1, 2, 1, 2, 1, 2, 0.5, 0.5, 2, 1, 3] },
    { id: 'jingle', title: 'Jingle Bells (chorus)', deg: [4, 4, 4, 4, 4, 4, 4, 7, 0, 2, 4, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 2, 2, 4, 2, 7], beats: [1, 1, 2, 1, 1, 2, 1, 1, 1.5, 0.5, 4, 1, 1, 1.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 2, 2] },
  ];

  /** Fit a list of notes into the instrument's range by whole octaves. */
  function fit(inst, notes) {
    const R = PM.Learn.RANGE[inst];
    let lo = Math.min(...notes), hi = Math.max(...notes), shift = 0;
    while (lo + shift < R.low) shift += 12;
    while (hi + shift > R.high && lo + shift - 12 >= R.low) shift -= 12;
    return notes.map((m) => m + shift);
  }

  function build(inst) {
    const L = PM.Learn, T = PM.Theory, I = PM.Instruments.get(inst);
    const keys = KEY_ORDER[inst];
    const ex = [];
    const add = (level, cat, title, desc, tip, notes, opts) => {
      opts = opts || {};
      const fitted = opts.noFit ? notes : fit(inst, notes);
      ex.push(Object.assign({ id: `${inst}-${ex.length + 1}`, n: ex.length + 1, level, cat, title, desc, tip, kind: 'notes', notes: fitted, beats: opts.beats || fitted.map(() => opts.each || 1), bpm: opts.bpm || 72, octaveFree: !!opts.octaveFree }, opts.extra || {}));
    };
    const addChords = (level, title, desc, tip, chords, bpm, beatsPer) => ex.push({ id: `${inst}-${ex.length + 1}`, n: ex.length + 1, level, cat: 'Chords', title, desc, tip, kind: 'chords', chords, beatsPer: beatsPer || 4, bpm: bpm || 70 });
    const kn = (pc) => keyName(pc, inst);
    const start = (pc, span) => L.startNote(inst, pc, span || 12);
    const scale = (pc, sc, oct, dir) => L.scale({ tonic: pc, scale: sc, octaves: oct || 1, direction: dir || 'updown', instrument: inst });
    const arp = (pc, type, oct, dir) => L.arpeggio({ tonic: pc, type, octaves: oct || 1, direction: dir || 'updown', instrument: inst });
    const k0 = keys[0], k1 = keys[1], k2 = keys[2], k3 = keys[3];

    // ---------------- Level 1 — first notes, steady pulse, simple patterns
    if (I.strings) {
      const open = I.strings.slice().reverse();
      add(1, 'Basics', 'Open strings, one by one', `Play each open string from the highest to the lowest${inst === 'bass' ? '' : ' (no fretting)'}. Let each ring for two beats.`, 'Pluck from the same spot each time for an even tone.', open, { each: 2, bpm: 60, noFit: true });
      add(1, 'Basics', 'Open strings, up and down', 'Lowest string to highest and back, one beat each.', 'Keep a steady pulse — tap your foot.', I.strings.concat(I.strings.slice(0, -1).reverse()), { bpm: 66, noFit: true });
      add(1, 'Basics', 'First frets on one string', `Frets 0-1-2-3 on the ${I.stringNames[I.strings.length - 2]} string, then back down.`, 'One finger per fret: index on fret 1, middle on 2, ring on 3.', [0, 1, 2, 3, 2, 1, 0].map((f) => I.strings[I.strings.length - 2] + f), { bpm: 60, noFit: true });
    } else if (inst === 'piano') {
      const c = start(0);
      add(1, 'Basics', 'Middle C and its neighbours', 'C-D-C-B-C with fingers 1-2-1-… (right hand thumb on middle C).', 'Curve your fingers like holding a small ball.', [c, c + 2, c, c - 1, c], { each: 2, bpm: 60, noFit: true });
      add(1, 'Basics', 'Five-finger C position', 'C-D-E-F-G and back, fingers 1-2-3-4-5.', 'Each key gets the same weight — listen for even volume.', [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => c + d), { bpm: 66, noFit: true });
      add(1, 'Basics', 'Left-hand five-finger C', 'C-D-E-F-G with the left hand, finger 5 on C.', 'Left hand fingering runs 5-4-3-2-1 going up.', [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => c - 12 + d), { bpm: 60, noFit: true });
    } else if (inst === 'trumpet') {
      add(1, 'Basics', 'First notes: written C, D, E', 'Open, 1+3, 1+2 — play each note for two beats with a full, steady sound.', 'Breathe low; buzz into the mouthpiece without pinching.', [58, 60, 62, 60, 58], { each: 2, bpm: 60, noFit: true });
      add(1, 'Basics', 'Long tones: written G', 'Hold written G (open) for 4 beats, rest, repeat.', 'Aim for a steady pitch — watch the tuner needle.', [65, 65, 65], { each: 4, bpm: 60, noFit: true });
      add(1, 'Basics', 'Written C to G', 'Written C-D-E-F-G and back.', 'Valves straight down, fingertips on the pearls.', [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => 58 + d), { bpm: 60, noFit: true });
    }
    add(1, 'Pulse', `Quarter notes on ${kn(k0)}`, 'Play the same note eight times, perfectly in time with the click.', 'Start each note exactly on the click — not before, not after.', new Array(8).fill(start(k0)), { bpm: 70 });
    add(1, 'Pulse', `Half notes & quarter notes on ${kn(k0)}`, 'Long-long-short-short-short-short: feel two-beat and one-beat notes.', 'Count "1-2, 3-4" out loud.', [0, 0, 0, 0, 0, 0].map(() => start(k0)), { beats: [2, 2, 1, 1, 1, 1], bpm: 70 });
    add(1, 'Patterns', `Three-note steps in ${kn(k0)}`, 'Do-re-mi-re-do — the first three notes of the major scale.', 'Move only the finger you need.', [0, 2, 4, 2, 0].map((d) => start(k0) + d), { bpm: 66 });
    add(1, 'Patterns', `Five-note scale in ${kn(k0)}`, 'Do-re-mi-fa-so and back.', 'Smooth and connected, like singing.', [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => start(k0) + d), { bpm: 66 });
    add(1, 'Patterns', `Five-note scale in ${kn(k1)}`, 'The same five-note pattern in a new key.', 'Notice which note changed compared with the last key.', [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => start(k1) + d), { bpm: 66 });
    add(1, 'Patterns', `Skipping notes in ${kn(k0)}`, 'Do-mi-so-mi-do: skip every other note.', 'Keep the hand still and let the fingers do the work.', [0, 4, 7, 4, 0].map((d) => start(k0) + d), { bpm: 66 });
    add(1, 'Melody', MELODIES[0].title, 'A first melody — listen once, then play along.', 'Sing the tune in your head while you play.', MELODIES[0].deg.map((d) => start(k0) + d), { beats: MELODIES[0].beats, bpm: 80 });

    // ---------------- Level 2 — major scales, arpeggios, simple melodies, chords
    for (const pc of [k0, k1, k2, k3]) add(2, 'Scales', `${kn(pc)} major scale (1 octave)`, 'Up and down, one beat per note.', 'Say the note names as you play them.', scale(pc, 'major', 1), { bpm: 72 });
    for (const pc of [k0, k1, k2]) add(2, 'Arpeggios', `${kn(pc)} major arpeggio`, 'Root – 3rd – 5th – octave and back.', 'Arpeggios are chords played one note at a time — hear the chord!', arp(pc, '', 1), { bpm: 72 });
    for (const m of [MELODIES[1], MELODIES[2]]) add(2, 'Melody', m.title, 'Play the melody with the click — watch the long notes.', 'Hold long notes for their full value before moving on.', m.deg.map((d) => start(k0) + d), { beats: m.beats, bpm: 84 });
    add(2, 'Rhythm', `Eighth notes in ${kn(k0)}`, 'The five-note scale in eighth notes: two notes per click.', 'Count "1 & 2 & …" — the "&" is exactly halfway.', [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => start(k0) + d), { each: 0.5, bpm: 66 });
    add(2, 'Intervals', `Steps and leaps in ${kn(k0)}`, 'Do-re, do-mi, do-fa, do-so: growing intervals from the tonic.', 'Hear each interval before you play it.', [0, 2, 0, 4, 0, 5, 0, 7, 0].map((d) => start(k0) + d), { bpm: 66 });

    // ---------------- Level 3 — minor, pentatonic, patterns, more melodies & keys
    for (const pc of [k0 + 9, k1 + 9, k2 + 9].map(mod12)) add(3, 'Scales', `${kn(pc)} natural minor scale`, 'The relative minor — same notes as its major, new home note.', 'Listen for the darker sound of the minor 3rd.', scale(pc, 'minor', 1), { bpm: 76 });
    for (const pc of [k0, k1]) add(3, 'Scales', `${kn(pc)} major pentatonic`, 'Five-note scale used in countless melodies and solos.', 'No half steps — every note sounds good over the I chord.', scale(pc, 'majpent', inst === 'trumpet' ? 1 : 2), { bpm: 80 });
    for (const pc of [k0 + 9, k1 + 9].map(mod12)) add(3, 'Scales', `${kn(pc)} minor pentatonic`, 'The essential rock, blues and gospel lead scale.', 'Bend or slide into the 4th and 5th for extra feeling.', scale(pc, 'minpent', inst === 'trumpet' ? 1 : 2), { bpm: 80 });
    for (const pc of [k3, keys[4]]) add(3, 'Scales', `${kn(pc)} major scale`, 'A new key with more sharps or flats.', 'Know which notes are black keys / which frets change before you start.', scale(pc, 'major', 1), { bpm: 80 });
    for (const pc of [k0 + 9, k1 + 9].map(mod12)) add(3, 'Arpeggios', `${kn(pc)} minor arpeggio`, 'Root – minor 3rd – 5th – octave.', 'Compare it with the major arpeggio: only the 3rd moves.', arp(pc, 'm', 1), { bpm: 76 });
    add(3, 'Patterns', `${kn(k0)} major in thirds`, 'Broken thirds through the scale: 1-3, 2-4, 3-5…', 'A classic pattern for finger independence.', L.scalePattern({ tonic: k0, scale: 'major', instrument: inst, pattern: 'thirds' }), { each: 0.5, bpm: 70 });
    add(3, 'Patterns', `${kn(k1)} major in groups of 3`, '1-2-3, 2-3-4, 3-4-5…', 'Accent the first note of each group.', L.scalePattern({ tonic: k1, scale: 'major', instrument: inst, pattern: 'groups3' }), { each: 0.5, bpm: 66 });
    for (const m of [MELODIES[3], MELODIES[4]]) add(3, 'Melody', m.title, 'A well-known melody with longer phrases.', 'Breathe / lift between phrases, not in the middle of one.', m.deg.map((d) => start(k0) + d), { beats: m.beats, bpm: 90 });
    add(3, 'Rhythm', `Dotted rhythm in ${kn(k0)}`, 'Long-short (dotted quarter + eighth) up the scale.', 'Count "1 – & 2": the short note is on the "&".', scale(k0, 'major', 1, 'up'), { beats: [1.5, 0.5, 1.5, 0.5, 1.5, 0.5, 1.5, 0.5], bpm: 72 });

    // ---------------- Level 4 — two octaves, blues & modes, 7th arpeggios, sequences
    const oct2 = inst === 'trumpet' ? 1 : 2;
    for (const pc of [k0, k1, k2]) add(4, 'Scales', `${kn(pc)} major scale, ${oct2} octave${oct2 > 1 ? 's' : ''}`, 'Up and down in eighth notes.', 'Plan your shifts / thumb-unders before the tempo goes up.', scale(pc, 'major', oct2), { each: 0.5, bpm: 76 });
    for (const pc of [k0 + 9, k1 + 9].map(mod12)) add(4, 'Scales', `${kn(pc)} blues scale`, 'Minor pentatonic plus the "blue note" (♭5).', 'Use the blue note as a passing note — don\'t sit on it.', scale(pc, 'blues', oct2), { each: 0.5, bpm: 80 });
    add(4, 'Scales', `${kn(mod12(k0 + 2))} Dorian mode`, 'Minor scale with a raised 6th — jazz, funk and modern worship.', 'Play it over a minor chord and listen for the bright 6th.', scale(mod12(k0 + 2), 'dorian', 1), { each: 0.5, bpm: 80 });
    add(4, 'Scales', `${kn(k1)} Mixolydian mode`, 'Major scale with a ♭7 — rock, blues and gospel.', 'This is the scale of the dominant (V7) chord.', scale(k1, 'mixolydian', 1), { each: 0.5, bpm: 80 });
    add(4, 'Scales', `${kn(mod12(k0 + 9))} harmonic minor`, 'Natural minor with a raised 7th — the exotic leading tone.', 'Watch the 1½-step gap between the 6th and 7th.', scale(mod12(k0 + 9), 'harmonic', 1), { each: 0.5, bpm: 76 });
    for (const [pc, type, name] of [[k0, 'maj7', 'major 7th'], [mod12(k0 + 2), 'm7', 'minor 7th'], [k1, '7', 'dominant 7th']]) add(4, 'Arpeggios', `${kn(pc)}${type} arpeggio`, `Four-note ${name} arpeggio.`, '7th chords are the colour of jazz and gospel — hear the 4th note.', arp(pc, type, 1), { each: 0.5, bpm: 76 });
    add(4, 'Patterns', `${kn(k0)} major in groups of 4`, '1-2-3-4, 2-3-4-5…', 'Keep the 16th notes even — use a light touch.', L.scalePattern({ tonic: k0, scale: 'major', instrument: inst, pattern: 'groups4' }), { each: 0.5, bpm: 72 });
    const ii = mod12(k0 + 2), V = mod12(k0 + 7);
    add(4, 'Chord tones', `ii–V–I chord tones in ${kn(k0)}`, `Arpeggiate ${kn(ii)}m7 → ${kn(V)}7 → ${kn(k0)}maj7.`, 'Land on the 3rd of each new chord — that is "playing the changes".', [...arp(ii, 'm7', 1, 'up').slice(0, 4), ...arp(V, '7', 1, 'up').slice(0, 4), ...arp(k0, 'maj7', 1, 'up')], { each: 0.5, bpm: 72 });
    add(4, 'Melody', MELODIES[5].title, 'A lively melody with quick repeated notes.', 'Keep repeated notes light and separate.', MELODIES[5].deg.map((d) => start(k0) + d), { beats: MELODIES[5].beats, bpm: 100 });

    // ---------------- Level 5 — advanced: melodic minor, chromatic, wide intervals, speed
    add(5, 'Scales', `${kn(mod12(k0 + 9))} melodic minor`, 'Raised 6th and 7th going up, natural minor coming down.', 'Classical rule: the scale changes direction and notes.', scale(mod12(k0 + 9), 'melodic', 1), { each: 0.5, bpm: 84 });
    add(5, 'Scales', `Chromatic scale from ${kn(k0)}`, 'Every semitone for an octave, up and down.', 'Smooth fingering is the secret — never jump fingers.', scale(k0, 'chromatic', 1), { each: 0.5, bpm: 80 });
    for (const pc of [keys[5], keys[6], keys[7]]) add(5, 'Scales', `${kn(pc)} major scale (hard key)`, 'A key with many sharps or flats, in eighth notes.', 'Think in the key signature, not in single accidentals.', scale(pc, 'major', oct2), { each: 0.5, bpm: 88 });
    add(5, 'Arpeggios', `${kn(mod12(k0 + 11))} diminished arpeggio`, 'Stacked minor thirds — tension that wants to resolve.', 'Every note is a minor 3rd from the next.', arp(mod12(k0 + 11), 'dim', inst === 'trumpet' ? 1 : 2), { each: 0.5, bpm: 80 });
    add(5, 'Intervals', `${kn(k0)} major in sixths`, 'Wide leaps of a sixth through the scale.', 'Hear the target note before you jump.', (() => { const s = scale(k0, 'major', 2, 'up'); const o = []; for (let i = 0; i + 5 < s.length && o.length < 16; i++) o.push(s[i], s[i + 5]); return o; })(), { each: 0.5, bpm: 72 });
    add(5, 'Patterns', `${kn(k1)} major in thirds, ${oct2} octave${oct2 > 1 ? 's' : ''}`, 'Broken thirds across the whole range.', 'Light, even and relaxed — speed comes later.', (() => { const s = scale(k1, 'major', oct2, 'up'); const o = []; for (let i = 0; i + 2 < s.length; i++) o.push(s[i], s[i + 2]); return o; })(), { each: 0.5, bpm: 84 });
    add(5, 'Speed', `${kn(k0)} major scale at speed`, 'The first scale you learned — now in 16th notes.', 'Use the speed trainer: start at 60 and add 4 BPM each time it\'s clean.', scale(k0, 'major', oct2), { each: 0.25, bpm: 80 });
    add(5, 'Chord tones', `Circle of 4ths arpeggios`, `Major arpeggios ${[0, 5, 10, 3].map((s) => kn(mod12(k0 + s))).join(' → ')}.`, 'Move by the shortest path between chords (voice leading).', [0, 5, 10, 3].flatMap((s) => arp(mod12(k0 + s), '', 1, 'up').slice(0, 3)), { each: 0.5, bpm: 76 });

    // ---------------- instrument-specific technique
    for (const e of L.exercises(inst, k0)) add(e.id === 'scale-arp' ? 2 : e.id === 'chromatic' || e.id === 'hanon' ? 3 : 2, 'Technique', e.name, e.desc, I.tips[ex.length % I.tips.length], e.notes, { each: e.id === 'long-ladder' ? 2 : 1, bpm: 72, noFit: true });

    // ---------------- chord changes for chordal instruments
    if (I.chordal) {
      if (I.family === 'keys') {
        addChords(1, 'Your first chords: C and G', 'Alternate C and G major, one bar each.', 'Keep your hand in shape; move only the fingers that need to.', ['C', 'G', 'C', 'G'], 64);
        addChords(2, 'I–IV–V in C', 'C – F – G – C.', 'Look for common notes between chords to move smoothly.', ['C', 'F', 'G', 'C'], 68);
        addChords(2, 'Pop progression in C', 'C – G – Am – F.', 'The four chords behind hundreds of songs.', ['C', 'G', 'Am', 'F'], 72);
        addChords(3, 'Minor key: Am – Dm – E – Am', 'A harmonic-minor cadence.', 'E major (G#!) pulls strongly back to Am.', ['Am', 'Dm', 'E', 'Am'], 72);
        addChords(3, 'I–vi–ii–V in F', 'F – Dm – Gm – C.', 'The classic "circle" turnaround.', ['F', 'Dm', 'Gm', 'C'], 76);
        addChords(4, '7th chords: ii–V–I in C', 'Dm7 – G7 – Cmaj7 – Cmaj7.', 'Gospel and jazz colour — keep the voicings close.', ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'], 72);
        addChords(4, 'Gospel 1–4–5 in Bb', 'Bb – Eb – F – Bb.', 'Add the 7th on F (F7) for a stronger pull home.', ['Bb', 'Eb', 'F7', 'Bb'], 80);
        addChords(5, 'Minor ii–V–i in Cm', 'Dm(♭5) feel: Ddim – G7 – Cm – Cm.', 'The diminished chord is the minor-key "ii".', ['Ddim', 'G7', 'Cm', 'Cm'], 76);
      } else {
        addChords(1, 'First chords: Em and G', 'Em – G – Em – G, one bar each.', 'Keep finger 3 anchored where you can.', ['Em', 'G', 'Em', 'G'], 60);
        addChords(1, 'Am and C', 'Am – C – Am – C.', 'Only one finger moves between Am and C!', ['Am', 'C', 'Am', 'C'], 60);
        addChords(2, 'G – C – D', 'The three-chord song in G.', 'Lift fingers on the last "&" of the bar so the next chord lands on 1.', ['G', 'C', 'D', 'G'], 66);
        addChords(2, 'Pop progression in G', 'G – D – Em – C.', 'Four chords, endless songs.', ['G', 'D', 'Em', 'C'], 70);
        addChords(2, 'D – A – Bm – G', 'Pop progression in D.', 'Bm can be played as a small 4-string shape first.', ['D', 'A', 'Bm', 'G'], 70);
        addChords(3, 'Seventh chords: G7 – C – D7 – G', 'Dominant 7th chords add tension.', 'Listen how G7 pulls to C.', ['G7', 'C', 'D7', 'G'], 72);
        addChords(3, 'First barre chord: F', 'C – F – G – C with a full F barre.', 'Roll the index finger slightly onto its side.', ['C', 'F', 'G', 'C'], 64);
        addChords(4, 'Barre chords: Bm and F#m', 'D – Bm – G – F#m — barre shapes on 7th / 2nd fret.', 'Thumb behind the neck, not over the top.', ['D', 'Bm', 'G', 'F#m'], 72);
        addChords(4, 'Minor key: Am – Dm – E7 – Am', 'Harmonic minor sound.', 'E7 → Am is the classic minor-key resolution.', ['Am', 'Dm', 'E7', 'Am'], 76);
        addChords(5, 'Jazz ii–V–I: Am7 – D7 – Gmaj7', 'Seventh-chord voicings.', 'Move between voicings with the least finger movement.', ['Am7', 'D7', 'Gmaj7', 'Gmaj7'], 80);
      }
    } else {
      // bass & trumpet: chord-tone lines over progressions
      const prog = [[k0, ''], [mod12(k0 + 5), ''], [mod12(k0 + 7), ''], [k0, '']];
      add(2, 'Chord tones', `Roots of I–IV–V–I in ${kn(k0)}`, 'Play the root of each chord, one bar (4 beats) each.', 'The root on beat 1 is the foundation of the band.', prog.map(([pc]) => start(pc, 0)), { each: 4, bpm: 72 });
      add(3, 'Chord tones', `Root–3rd–5th over I–IV–V–I in ${kn(k0)}`, 'Triad tones for each chord.', 'Target the 3rd — it tells you if the chord is major or minor.', prog.flatMap(([pc, t]) => arp(pc, t, 1, 'up').slice(0, 3).concat([start(pc, 7) + 7])), { bpm: 76 });
      add(3, 'Chord tones', `Pop progression roots & fifths in ${kn(k1)}`, 'I – V – vi – IV with root and fifth.', 'Lock the root with the kick drum.', [[k1, ''], [mod12(k1 + 7), ''], [mod12(k1 + 9), 'm'], [mod12(k1 + 5), '']].flatMap(([pc]) => [start(pc, 7), start(pc, 7) + 7, start(pc, 7), start(pc, 7) + 7]), { bpm: 80 });
      add(4, 'Chord tones', `Walking line over ii–V–I in ${kn(k0)}`, 'Four quarter notes per chord using chord tones.', 'Approach the next root from a half step above or below.', [...arp(ii, 'm7', 1, 'up').slice(0, 4), ...arp(V, '7', 1, 'up').slice(0, 4), ...arp(k0, 'maj7', 1, 'up').slice(0, 4)], { bpm: 88 });
      add(5, 'Chord tones', `12-bar blues line in ${kn(k1)}`, 'Root–3–5–6 pattern through a 12-bar blues.', 'Swing the eighths and keep the groove locked.', [0, 0, 5, 0, 7, 5, 0, 7].flatMap((s) => { const r = start(mod12(k1 + s), 9); return [r, r + 4, r + 7, r + 9]; }).slice(0, 32), { each: 0.5, bpm: 92 });
    }

    // stable order: by level, then as authored
    ex.sort((a, b) => a.level - b.level || a.n - b.n);
    ex.forEach((e, i) => { e.n = i + 1; e.id = `${inst}-${String(i + 1).padStart(2, '0')}`; });
    return ex;
  }

  const cache = {};
  function forInstrument(inst) { return cache[inst] || (cache[inst] = build(inst)); }
  const LEVELS = ['', 'Beginner', 'Elementary', 'Intermediate', 'Upper-intermediate', 'Advanced'];

  PM.Curriculum = { forInstrument, LEVELS, MELODIES, keyName };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Curriculum;
})(typeof self !== 'undefined' ? self : globalThis);
