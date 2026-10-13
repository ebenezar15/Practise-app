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
    voice: [0, 2, 7, 9, 5, 4, 10, 3, 11, 1, 8, 6],
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


  // ---------------- singing: a dedicated vocal path (warm-ups that climb by semitones,
  // breath, registers, agility, harmony, solfege, Carnatic sarali varisai, sing-alongs)
  function buildVoice() {
    const L = PM.Learn, R = L.RANGE.voice, I = PM.Instruments.get('voice');
    const ex = [];
    const lo = R.low, hi = R.high;
    const home = lo + 3; // comfortable low-middle note to start warm-ups
    const MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
    const add = (level, cat, title, desc, tip, notes, opts) => {
      opts = opts || {};
      const out = opts.noFit ? notes : fit('voice', notes);
      ex.push(Object.assign({ id: '', n: ex.length + 1, level, cat, title, desc, tip, kind: 'notes', notes: out, beats: opts.beats || out.map(() => opts.each || 1), bpm: opts.bpm || 72, octaveFree: !!opts.octaveFree, syllable: opts.syl || '' }, opts.extra || {}));
    };
    /** A pattern (semitones from its root) sung in rising keys, a semitone apart — the classic warm-up. */
    const rising = (level, cat, title, desc, tip, pat, opts) => {
      opts = opts || {};
      const step = opts.step || 1;
      let root = opts.from != null ? opts.from : home - Math.min(0, Math.min(...pat));
      const notes = [], beats = [];
      for (let r = 0; r < (opts.reps || 4) && root + Math.max(...pat) <= hi; r++, root += step) {
        pat.forEach((iv, i) => { notes.push(root + iv); beats.push(i === pat.length - 1 ? (opts.hold || 2) : (opts.each || 1)); });
      }
      if (!notes.length) pat.forEach((iv, i) => { notes.push(lo + iv); beats.push(i === pat.length - 1 ? 2 : opts.each || 1); });
        add(level, cat, title, desc, tip, notes, Object.assign({}, opts, { beats, noFit: true }));
    };
    const tonicAt = (pc, span, below) => {
      below = below || 0; // lowest note sits `below` semitones under the tonic
      let m = lo + below + mod12(pc - lo - below);
      const miss = (x) => Math.max(0, lo - (x - below)) + Math.max(0, x + span - hi);
      if (miss(m - 12) < miss(m)) m -= 12;
      return m;
    };
    const kn = (pc) => NAMES[mod12(pc)];
    // keys that sit well in THIS voice type: low enough that an octave + a step fits above
    const k0 = mod12(lo + 2), k1 = mod12(lo + 4), k2 = mod12(lo + 5), mn0 = mod12(lo + 2), mn1 = mod12(lo + 4);
    const scale = (pc, sc, dir) => L.scale({ tonic: pc, scale: sc, octaves: 1, direction: dir || 'updown', start: tonicAt(pc, 12) });
    // sing-alongs: start from the suggested key, nudging it until the whole tune fits the voice
    const tune = (m, pc) => {
      const a = Math.min(0, ...m.deg), b = Math.max(...m.deg);
      for (const off of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6]) {
        const t = tonicAt(mod12(pc + off), b, -a);
        if (t + a >= lo && t + b <= hi) return m.deg.map((d) => t + d);
      }
      return m.deg.map((d) => tonicAt(pc, b, -a) + d);
    };
    const rnd = L.rng(7);
    const thirdAbove = (d) => { const i = MAJ.indexOf(mod12(d)); return i < 0 ? d + 4 : d + MAJ[i + 2] - MAJ[i]; };

    // ---------------- Level 1 — breath, posture, first pitches
    add(1, 'Breath', 'Long tone on "ah" — 4 counts', 'Breathe low (belly and ribs expand), then sing one comfortable note for four beats.', 'Keep the sound steady to the very end of the note — the tuner trail should stay flat.', [home + 2, home + 2, home + 2], { each: 4, bpm: 60, syl: 'ah', noFit: true });
    add(1, 'Breath', 'Breath pulses on "ha"', 'Eight short, bouncy "ha"s on one note — feel the belly kick in on each one.', 'The pulse comes from the abs, not the throat.', new Array(8).fill(home + 4), { bpm: 76, syl: 'ha', noFit: true });
    add(1, 'Breath', 'Long tones on "oo" — three pitches', 'Three long notes, four beats each, stepping up.', 'Breathe in through the nose for 4, sing for 4 — never squeeze out the last air.', [home, home + 2, home + 4], { each: 4, bpm: 60, syl: 'oo', noFit: true });
    rising(1, 'Warm-up', 'Humming 5-4-3-2-1 on "mm"', 'Hum down five notes with lips gently closed; repeat a semitone higher each time.', 'Feel the buzz on your lips and nose — that is forward resonance.', [7, 5, 4, 2, 0], { syl: 'mm', bpm: 72 });
    rising(1, 'Warm-up', 'Lip trill 1-2-3-2-1', 'Blow through loose lips ("brr") while gliding 1-2-3-2-1. Rises a semitone each time.', 'Press your cheeks lightly with your fingers if the lips stop buzzing.', [0, 2, 4, 2, 0], { syl: 'brr', bpm: 76 });
    rising(1, 'Warm-up', 'Stepped siren 1-5-8-5-1 on "oo"', 'An easy "oo" from bottom to top and back — think of a gentle fire-engine siren.', 'Let the voice flip lighter at the top; do not push.', [0, 7, 12, 7, 0], { syl: 'oo', bpm: 66, reps: 3 });
    add(1, 'Pitch', 'Match the note', 'Listen, then sing each note back on "la": home, a 3rd up, a 5th up, a step up.', 'Hear the note in your head before you sing it.', [home, home + 4, home + 7, home + 2, home], { each: 2, bpm: 60, syl: 'la', noFit: true, octaveFree: true });
    add(1, 'Pitch', 'Echo do-re-mi', 'Sing do-re-mi-re-do in solfege.', 'Keep "do" exactly the same pitch at the start and the end.', [0, 2, 4, 2, 0].map((d) => tonicAt(k0, 7) + d), { bpm: 66, syl: 'do re mi re do' });
    add(1, 'Sing-along', MELODIES[0].title, 'Your first sing-along — listen once, then sing with the guide.', 'Open the mouth a little more on the long notes.', tune(MELODIES[0], k0), { beats: MELODIES[0].beats, bpm: 80, syl: 'la' });
    add(1, 'Sing-along', MELODIES[1].title, 'A simple stepwise tune to sing on "la" or the words.', 'Stay relaxed on repeated notes — no extra push.', tune(MELODIES[1], k1), { beats: MELODIES[1].beats, bpm: 88, syl: 'la' });

    // ---------------- Level 2 — five-note scales, vowels, legato & staccato
    rising(2, 'Scales', '5-note scale on "ma"', '1-2-3-4-5-4-3-2-1 on "ma", rising a semitone each repetition.', 'Keep the jaw loose and dropped on "ah".', [0, 2, 4, 5, 7, 5, 4, 2, 0], { syl: 'ma', bpm: 84, reps: 5 });
    rising(2, 'Scales', '5-4-3-2-1 on "nee"', 'Descending five notes on a bright "nee".', 'The "n" places the sound forward; keep that buzz as you go down.', [7, 5, 4, 2, 0], { syl: 'nee', bpm: 84, reps: 5 });
    rising(2, 'Vowels', 'Vowel ladder 1-3-5-3-1', '"mee-may-mah-moh-moo" on a broken chord.', 'Change only the vowel shape — keep the same space in the throat.', [0, 4, 7, 4, 0], { syl: 'mee may mah moh moo', bpm: 76, reps: 5 });
    for (const pc of [k0, k1]) add(2, 'Scales', `${kn(pc)} major scale in solfege`, 'do-re-mi-fa-so-la-ti-do and back.', 'Say the solfege names in rhythm first, then sing them.', scale(pc, 'major'), { bpm: 72, syl: 'do re mi fa so la ti do' });
    add(2, 'Intervals', 'Growing intervals from do', 'do-re, do-mi, do-fa, do-so — come back home each time.', 'Picture the step size before you sing it.', [0, 2, 0, 4, 0, 5, 0, 7, 0].map((d) => tonicAt(k0, 7) + d), { bpm: 66, syl: 'do' });
    rising(2, 'Articulation', 'Staccato arpeggio on "ha"', '1-3-5-8-5-3-1 short and bouncy.', 'Each note starts from a little belly kick — no glottal "click".', [0, 4, 7, 12, 7, 4, 0], { syl: 'ha', each: 0.5, bpm: 72, reps: 3 });
    rising(2, 'Articulation', 'Legato 5-note scale on "yah"', 'The same five notes, perfectly smooth and connected.', 'Imagine one long line of sound — no bumps between notes.', [0, 2, 4, 5, 7, 5, 4, 2, 0], { syl: 'yah', bpm: 66, reps: 4 });
    rising(2, 'Resonance', 'Bratty "nay" 1-3-5-3-1', 'A cheeky, bright "nay" — it gives the voice an easy forward edge.', 'Think "nasal" at first; it balances out with practice.', [0, 4, 7, 4, 0], { syl: 'nay', bpm: 80, reps: 5 });
    for (const m of [MELODIES[2], MELODIES[3]]) add(2, 'Sing-along', m.title, 'Sing along with the guide melody, then try it with the guide muted.', 'Breathe at the ends of phrases, not in the middle.', tune(m, k0), { beats: m.beats, bpm: 88, syl: 'la' });

    // ---------------- Level 3 — arpeggios, octaves, minor, registers, harmony, solfege
    rising(3, 'Arpeggios', 'Arpeggio 1-3-5-8-5-3-1 on "ah"', 'A major arpeggio across the octave, rising each time.', 'Let the top note float — less push, more space.', [0, 4, 7, 12, 7, 4, 0], { syl: 'ah', bpm: 80, reps: 4 });
    rising(3, 'Registers', 'Octave jump 1-8-7-6-5-4-3-2-1', 'Leap to the octave on "oo", then walk down the scale.', 'The leap lands softly in head voice; blend back to chest as you descend.', [0, 12, 11, 9, 7, 5, 4, 2, 0], { syl: 'oo', bpm: 84, reps: 3 });
    rising(3, 'Scales', 'Rossini scale 1-2-3-4-5-6-7-8-9-8-…-1', 'The nine-note scale classical singers use to stretch the range.', 'Keep the tempo steady through the top — no rushing.', [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0], { syl: 'ah', each: 0.5, bpm: 72, reps: 2 });
    for (const pc of [mn0, mn1]) add(3, 'Scales', `${kn(pc)} natural minor scale`, 'Sing the minor scale on "la" — feel its darker colour.', 'The minor 3rd is the note that sounds "sad" — tune it carefully.', scale(pc, 'minor'), { bpm: 76, syl: 'la' });
    add(3, 'Scales', `${kn(k0)} major pentatonic`, 'Five-note scale used in folk, gospel and pop melodies.', 'No half steps — every note sits nicely over the home chord.', scale(k0, 'majpent'), { bpm: 80, syl: 'ah' });
    rising(3, 'Dynamics', 'Messa di voce (soft–loud–soft)', 'Each note held 6 beats: start soft, swell, and come back soft.', 'Pitch must not rise as you get louder — watch the trail.', [0, 4, 7], { syl: 'ah', each: 6, hold: 6, bpm: 72, reps: 2, step: 2 });
    rising(3, 'Registers', 'Bridging the break 1-5-8-5-1 on "goo"', 'Rising through the passaggio, where chest voice hands over to head voice.', '"G" and "oo" keep the larynx low and the sound smooth across the break.', [0, 7, 12, 7, 0], { syl: 'goo', bpm: 76, reps: 5, from: lo + 5 });
    add(3, 'Vowels', 'Five vowels on one pitch', '"ee-eh-ah-oh-oo" on the same note, two beats each.', 'Pitch should not move when the vowel changes.', new Array(5).fill(home + 5), { each: 2, bpm: 66, syl: 'ee eh ah oh oo', noFit: true });
    add(3, 'Intervals', `Thirds through ${kn(k1)} major`, 'do-mi, re-fa, mi-so… broken thirds up the scale.', 'Hear the upper note before you leap.', (() => { const s = scale(k1, 'major', 'up'); const o = []; for (let i = 0; i + 2 < s.length; i++) o.push(s[i], s[i + 2]); return o; })(), { each: 0.5, bpm: 72, syl: 'solfege' });
    add(3, 'Harmony', `Harmony a 3rd above: ${MELODIES[0].title}`, 'Sing a harmony line a diatonic 3rd above the melody — play the original in the band to hear them together.', 'Lock onto the melody in your ear and stay parallel to it.', tune({ deg: MELODIES[0].deg.map(thirdAbove) }, k0), { beats: MELODIES[0].beats, bpm: 76, syl: 'la' });
    add(3, 'Sight-singing', 'Sight-sing a stepwise melody', 'Read and sing a short stepwise tune in solfege.', 'Find "do" first; then count steps.', L.sightReading({ tonic: k0, scale: 'major', instrument: 'voice', level: 1, length: 8, rand: rnd }), { bpm: 66, syl: 'solfege' });
    // Carnatic warm-ups (Mayamalavagowla): sa ri ga ma pa da ni sa
    const MMG = [0, 1, 4, 5, 7, 8, 11, 12];
    add(3, 'Carnatic', 'Sarali varisai 1 (Mayamalavagowla)', 'Sa-Ri-Ga-Ma-Pa-Da-Ni-Ṡa and back — the first exercise of Carnatic singing.', 'Sing with open "aa" and steady śruti (pitch) — keep Sa rock solid.', MMG.concat(MMG.slice(0, -1).reverse()).map((d) => tonicAt(k0, 12) + d), { bpm: 66, syl: 'sa ri ga ma pa da ni sa' });
    add(3, 'Carnatic', 'Sarali varisai 2', 'Sa-Ri, Sa-Ri, Sa-Ri-Ga-Ma | Sa-Ri-Ga-Ma-Pa-Da-Ni-Ṡa.', 'Count the tala on your hand: clap, finger counts, clap.', [0, 1, 0, 1, 0, 1, 4, 5, 0, 1, 4, 5, 7, 8, 11, 12].map((d) => tonicAt(k0, 12) + d), { each: 0.5, bpm: 72, syl: 'sa ri ga ma' });
    add(3, 'Sing-along', MELODIES[4].title, 'A slow hymn — shape each phrase with a gentle swell.', 'Take a full breath before each phrase so you can hold the long notes.', tune(MELODIES[4], k2), { beats: MELODIES[4].beats, bpm: 72, syl: 'words' });

    // ---------------- Level 4 — agility, runs, gospel & blues colour, harmony below
    rising(4, 'Agility', 'Fast 5-note scale on "ah"', '1-2-3-4-5-4-3-2-1 in eighth notes, light and clean.', 'Lighter is faster: smaller sound, crisp separation, no aspirate "h".', [0, 2, 4, 5, 7, 5, 4, 2, 0], { syl: 'ah', each: 0.5, bpm: 96, reps: 5 });
    rising(4, 'Agility', 'Zig-zag 1-3-2-4-3-5-4-2-1', 'A twisting pattern that trains quick, accurate pitch changes.', 'Practise slowly at first — accuracy before speed.', [0, 4, 2, 5, 4, 7, 5, 2, 0], { syl: 'ah', each: 0.5, bpm: 88, reps: 4 });
    rising(4, 'Arpeggios', 'Extended arpeggio 1-3-5-8-10-8-5-3-1', 'Up past the octave to the 10th and back.', 'Keep the mouth shape tall as you go higher.', [0, 4, 7, 12, 16, 12, 7, 4, 0], { syl: 'ah', each: 0.5, bpm: 80, reps: 3 });
    add(4, 'Style', `Gospel run: ${kn(k0)} pentatonic descent`, 'A classic run down the major pentatonic: 8-6-5-3-2-1.', 'Start on the beat, land on "do" with a held note.', [12, 9, 7, 4, 2, 0, 0].map((d) => tonicAt(k0, 12) + d), { beats: [0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 2], bpm: 80, syl: 'oh' });
    add(4, 'Style', `${kn(mn0)} minor pentatonic (R&B)`, 'The minor pentatonic — the backbone of soul and R&B riffs.', 'Swing it gently and slide into the 4th and 5th.', scale(mn0, 'minpent'), { each: 0.5, bpm: 84, syl: 'ah' });
    add(4, 'Style', `${kn(mn1)} blues scale`, 'Minor pentatonic plus the blue note.', 'Use the blue note as a passing colour — slide through it.', scale(mn1, 'blues'), { each: 0.5, bpm: 84, syl: 'yeah' });
    add(4, 'Scales', `${kn(mn0)} Dorian mode`, 'Minor with a bright 6th — modern worship and jazz.', 'Tune the 6th a little high in your mind — it is the signature note.', scale(mn0, 'dorian'), { each: 0.5, bpm: 80, syl: 'ah' });
    add(4, 'Scales', `${kn(mn1)} harmonic minor`, 'Natural minor with a raised 7th.', 'Prepare the wide step between the 6th and 7th.', scale(mn1, 'harmonic'), { each: 0.5, bpm: 76, syl: 'ah' });
    add(4, 'Harmony', `Harmony a 3rd below: ${MELODIES[2].title}`, 'An alto/tenor line a 3rd under the tune — the sound of a choir section.', 'Lower harmony lines are often quieter: support, don\'t lead.', tune({ deg: MELODIES[2].deg.map((d) => thirdAbove(d) - 12 + (mod12(d) === 0 || mod12(d) === 7 ? 0 : 0)) }, k0), { beats: MELODIES[2].beats, bpm: 84, syl: 'oo' });
    add(4, 'Sight-singing', 'Sight-sing with skips', 'A tune with steps and small skips.', 'Spot the skips (do-mi, re-fa…) before you start.', L.sightReading({ tonic: k1, scale: 'major', instrument: 'voice', level: 2, length: 10, rand: rnd }), { bpm: 66, syl: 'solfege' });
    add(4, 'Articulation', 'Staccato vs legato contrast', 'The scale up staccato, down legato.', 'Same pitch accuracy both ways — only the length changes.', scale(k2, 'major'), { beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 2], bpm: 72, syl: 'ha / ah' });
    add(4, 'Carnatic', 'Janta varisai (doubled notes)', 'Sa-Sa Ri-Ri Ga-Ga Ma-Ma … each note sung twice with a clean re-attack.', 'The second note gets a tiny stress — no glottal stop.', MMG.flatMap((d) => [d, d]).map((d) => tonicAt(k0, 12) + d), { each: 0.5, bpm: 72, syl: 'sa sa ri ri' });
    add(4, 'Sing-along', MELODIES[5].title, 'Bright and quick — crisp consonants!', 'Smile slightly to keep the tone bright on fast notes.', tune(MELODIES[5], k1), { beats: MELODIES[5].beats, bpm: 104, syl: 'words' });

    // ---------------- Level 5 — advanced range, runs and control
    add(5, 'Scales', `Chromatic scale from ${kn(k0)}`, 'Every semitone up the octave and back.', 'Think tiny, even steps — practise against the drone.', scale(k0, 'chromatic'), { each: 0.5, bpm: 72, syl: 'ah' });
    rising(5, 'Agility', 'Rossini run in 16ths', 'The nine-note scale at speed.', 'Practise in short bursts with full rest between them.', [0, 2, 4, 5, 7, 9, 11, 12, 14, 12, 11, 9, 7, 5, 4, 2, 0], { syl: 'ah', each: 0.25, bpm: 76, reps: 3 });
    add(5, 'Intervals', 'Wide leaps from do', 'do-la, do-ti, do-do\' and back down.', 'Aim for the top note from above, mentally — never scoop.', [0, 9, 0, 11, 0, 12, 0].map((d) => tonicAt(k1, 12) + d), { each: 1, bpm: 66, syl: 'do' });
    add(5, 'Intervals', 'Descending intervals from the top', 'do\'-ti, do\'-la, do\'-so… down to do.', 'Keep the top note light; descend without dropping energy.', [12, 11, 12, 9, 12, 7, 12, 4, 12, 0].map((d) => tonicAt(k2, 12) + d), { each: 1, bpm: 66, syl: 'do' });
    add(5, 'Style', 'Gospel riff with blue note', 'A soulful riff: 5-♭3-3-1 / 6-5-3-2-1.', 'Bend lightly through the ♭3 into the 3rd.', [7, 3, 4, 0, 9, 7, 4, 2, 0].map((d) => tonicAt(k0, 12) + d), { beats: [0.5, 0.25, 0.25, 1, 0.25, 0.25, 0.25, 0.25, 2], bpm: 76, syl: 'oh' });
    add(5, 'Style', 'Melisma: minor pentatonic run', 'A long R&B run down and up the minor pentatonic.', 'Map the run in slow motion first, then speed it up 4 BPM at a time.', (() => { const t = tonicAt(mn0, 12); return [12, 10, 7, 5, 3, 0, 3, 5, 7, 5, 3, 0].map((d) => t + d); })(), { each: 0.25, bpm: 72, syl: 'ah' });
    add(5, 'Dynamics', 'Messa di voce at the top', 'Soft–loud–soft on the upper notes of your range.', 'If it squeezes, back off the volume — the swell must stay free.', [hi - 5, hi - 3, hi - 1], { each: 6, bpm: 72, syl: 'ah', noFit: true });
    add(5, 'Agility', 'Vocal trill practice', 'Alternate two neighbouring notes faster and faster.', 'A trill is a relaxed wobble between two notes — never forced.', new Array(16).fill(0).map((_, i) => home + 7 + (i % 2 ? 2 : 0)), { each: 0.25, bpm: 76, syl: 'ah', noFit: true });
    add(5, 'Arpeggios', `${kn(mod12(k1 + 1))} diminished arpeggio`, 'Stacked minor thirds — hard to tune!', 'Every step is a minor 3rd; count three semitones each time.', L.arpeggio({ tonic: mod12(k1 + 1), type: 'dim', octaves: 1, direction: 'updown', start: tonicAt(mod12(k1 + 1), 12) }), { bpm: 66, syl: 'ah' });
    add(5, 'Sight-singing', 'Sight-sing with leaps and accidentals', 'A harder tune with leaps and the odd chromatic note.', 'Name each accidental as "raised" or "lowered" before singing it.', L.sightReading({ tonic: k2, scale: 'major', instrument: 'voice', level: 3, length: 12, rand: rnd }), { bpm: 66, syl: 'solfege' });
    add(5, 'Harmony', `Harmony a 3rd above: ${MELODIES[4].title}`, 'The hymn with a descant line a 3rd above.', 'Blend: match the lead singer\'s vowel and volume.', tune({ deg: MELODIES[4].deg.map(thirdAbove) }, k2), { beats: MELODIES[4].beats, bpm: 72, syl: 'oo' });
    add(5, 'Sing-along', `${MELODIES[4].title} — expressive`, 'Sing the full hymn with dynamics: soft verse start, building to the high note.', 'Plan your breaths, and crescendo through the long notes.', tune(MELODIES[4], k0), { beats: MELODIES[4].beats, bpm: 66, syl: 'words' });

    // ---------------- vocal technique from the instrument tips (one per level band)
    I.tips.slice(0, 4).forEach((tip, i) => add(Math.min(5, 1 + i), 'Technique', ['Posture & breath check', 'Resonance check', 'Relaxation check', 'Vocal health check'][i], tip, tip, [home + 4, home + 4, home + 4], { each: 4, bpm: 60, syl: 'ah', noFit: true }));

    ex.sort((a, b) => a.level - b.level || a.n - b.n);
    ex.forEach((e, i) => { e.n = i + 1; e.id = `voice-${String(i + 1).padStart(2, '0')}`; });
    return ex;
  }

  const cache = {};
  function forInstrument(inst) {
    const key = inst === 'voice' ? 'voice:' + (PM.Learn.RANGE.voice.type || 'alto') : inst;
    return cache[key] || (cache[key] = inst === 'voice' ? buildVoice() : build(inst));
  }
  const LEVELS = ['', 'Beginner', 'Elementary', 'Intermediate', 'Upper-intermediate', 'Advanced'];

  PM.Curriculum = { forInstrument, LEVELS, MELODIES, keyName };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Curriculum;
})(typeof self !== 'undefined' ? self : globalThis);
