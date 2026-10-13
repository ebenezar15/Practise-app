/* Overture — Learn: generators for scales, arpeggios, technique exercises, sight-reading,
 * intervals, call-and-response phrases and chord palettes, per instrument. Pure functions
 * (no DOM) so they are unit-tested in Node. Notes are concert-pitch MIDI numbers. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;

  const SCALES = {
    major: { name: 'Major (Ionian)', iv: [0, 2, 4, 5, 7, 9, 11] },
    minor: { name: 'Natural minor (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10] },
    harmonic: { name: 'Harmonic minor', iv: [0, 2, 3, 5, 7, 8, 11] },
    melodic: { name: 'Melodic minor (ascending)', iv: [0, 2, 3, 5, 7, 9, 11] },
    majpent: { name: 'Major pentatonic', iv: [0, 2, 4, 7, 9] },
    minpent: { name: 'Minor pentatonic', iv: [0, 3, 5, 7, 10] },
    blues: { name: 'Blues', iv: [0, 3, 5, 6, 7, 10] },
    dorian: { name: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10] },
    mixolydian: { name: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10] },
    chromatic: { name: 'Chromatic', iv: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  };

  const INTERVALS = [
    { st: 1, name: 'Minor 2nd', short: 'm2', song: 'Jaws' },
    { st: 2, name: 'Major 2nd', short: 'M2', song: 'Happy Birthday' },
    { st: 3, name: 'Minor 3rd', short: 'm3', song: 'Greensleeves' },
    { st: 4, name: 'Major 3rd', short: 'M3', song: 'When the Saints' },
    { st: 5, name: 'Perfect 4th', short: 'P4', song: 'Amazing Grace' },
    { st: 6, name: 'Tritone', short: 'TT', song: 'The Simpsons' },
    { st: 7, name: 'Perfect 5th', short: 'P5', song: 'Twinkle Twinkle' },
    { st: 8, name: 'Minor 6th', short: 'm6', song: 'The Entertainer (3rd–4th notes)' },
    { st: 9, name: 'Major 6th', short: 'M6', song: 'My Bonnie' },
    { st: 10, name: 'Minor 7th', short: 'm7', song: 'Somewhere (West Side Story)' },
    { st: 11, name: 'Major 7th', short: 'M7', song: 'Take On Me (chorus)' },
    { st: 12, name: 'Octave', short: 'P8', song: 'Somewhere Over the Rainbow' },
  ];

  /** Comfortable starting octave & playable range for each instrument (concert pitch). */
  const RANGE = {
    piano: { low: 48, high: 84, start: 60 },
    guitar: { low: 40, high: 76, start: 48 },
    electric: { low: 40, high: 79, start: 48 },
    bass: { low: 28, high: 63, start: 31 },
    trumpet: { low: 52, high: 80, start: 58 }, // written C4 = concert Bb3
  };
  RANGE.voice = { low: 53, high: 77, start: 55 };
  /** Singers pick a voice type; scales and exercises then sit in that range. */
  function setVoiceType(type) {
    const V = PM.Instruments && PM.Instruments.VOICE_TYPES[type];
    if (!V) return;
    RANGE.voice = { low: V.range[0], high: V.range[1], start: V.start, type };
  }
  const rangeOf = (inst) => RANGE[inst] || RANGE.piano;

  /** Lowest MIDI note with pitch class pc at or above `from`. */
  const atOrAbove = (pc, from) => from + mod12(pc - from);

  /** First note of a scale/arpeggio on this tonic that leaves room for `span` semitones. */
  function startNote(inst, tonic, span) {
    const R = rangeOf(inst);
    let m = atOrAbove(tonic, R.start - 5);
    while (m + span > R.high && m - 12 >= R.low) m -= 12;
    while (m < R.low) m += 12;
    return m;
  }

  /** Scale notes. opts: {tonic, scale, octaves, direction: 'up'|'updown', instrument} */
  function scale(opts) {
    const sc = SCALES[opts.scale] || SCALES.major;
    const oct = Math.max(1, Math.min(3, opts.octaves || 1));
    const first = opts.start != null ? opts.start : startNote(opts.instrument, mod12(opts.tonic || 0), 12 * oct);
    const up = [];
    for (let o = 0; o < oct; o++) for (const iv of sc.iv) up.push(first + o * 12 + iv);
    up.push(first + oct * 12);
    if (opts.direction === 'up') return up;
    const down = opts.scale === 'melodic' ? [...SCALES.minor.iv].map((iv) => iv) : null;
    if (down) {
      const d = [];
      for (let o = oct - 1; o >= 0; o--) for (let k = down.length - 1; k >= 0; k--) d.push(first + o * 12 + down[k]);
      return up.concat(d);
    }
    return up.concat(up.slice(0, -1).reverse());
  }

  /** Arpeggio of a chord type (Theory ids: '', 'm', '7', 'maj7', 'm7', 'dim', 'aug', 'sus2', 'sus4'). */
  function arpeggio(opts) {
    const T = PM.Theory.TYPE_BY_ID[opts.type || ''] || PM.Theory.TYPE_BY_ID[''];
    const oct = Math.max(1, Math.min(3, opts.octaves || 1));
    const first = opts.start != null ? opts.start : startNote(opts.instrument, mod12(opts.tonic || 0), 12 * oct);
    const up = [];
    for (let o = 0; o < oct; o++) for (const iv of T.iv) up.push(first + o * 12 + iv);
    up.push(first + oct * 12);
    return opts.direction === 'up' ? up : up.concat(up.slice(0, -1).reverse());
  }

  /** Scale played in a melodic pattern: thirds (1-3, 2-4…) or groups of 3/4. */
  function scalePattern(opts) {
    const notes = scale(Object.assign({}, opts, { direction: 'up' }));
    const out = [];
    if (opts.pattern === 'thirds') for (let i = 0; i + 2 < notes.length; i++) out.push(notes[i], notes[i + 2]);
    else {
      const g = opts.pattern === 'groups3' ? 3 : 4;
      for (let i = 0; i + g <= notes.length; i++) out.push(...notes.slice(i, i + g));
    }
    return out;
  }

  /** Instrument-specific technique exercises. Each returns {id, name, desc, notes}. */
  function exercises(inst, tonic) {
    tonic = mod12(tonic || 0);
    const I = PM.Instruments.get(inst);
    const list = [];
    const sc = (o) => scale(Object.assign({ tonic, scale: 'major', instrument: inst }, o));
    if (inst === 'piano') {
      const c = startNote('piano', tonic, 12);
      const maj = SCALES.major.iv;
      list.push({ id: 'five-finger', name: 'Five-finger pattern', desc: 'Fingers 1-2-3-4-5 and back, one finger per key. Keep the wrist level and every note even.', notes: [0, 1, 2, 3, 4, 3, 2, 1, 0].map((k) => c + maj[k]) });
      const h = [];
      for (let s = 0; s < 6; s++) [0, 2, 3, 4, 5, 4, 3, 2].forEach((k) => h.push(c + maj[(s + k) % 7] + 12 * Math.floor((s + k) / 7)));
      h.push(c + 12);
      list.push({ id: 'hanon', name: 'Climbing pattern (Hanon-style)', desc: 'A 8-note finger pattern that climbs one step at a time. Builds finger independence — go slow and even.', notes: h });
      list.push({ id: 'thirds', name: 'Scale in thirds', desc: 'Broken thirds through the scale: C-E, D-F, E-G… trains finger crossings.', notes: scalePattern({ tonic, scale: 'major', instrument: inst, pattern: 'thirds' }) });
    } else if (I.family === 'fretted' && inst !== 'bass') {
      const ch = [];
      I.strings.slice(0, 4).forEach((open) => [1, 2, 3, 4].forEach((f) => ch.push(open + f)));
      list.push({ id: 'chromatic', name: 'Chromatic 1-2-3-4', desc: 'Frets 1-2-3-4 on the low four strings, one finger per fret. The classic warm-up for accuracy and finger independence.', notes: ch });
      list.push({ id: 'groups4', name: 'Scale in groups of 4', desc: 'Play the scale in overlapping groups of four notes (1234, 2345…). Use alternate picking.', notes: scalePattern({ tonic, scale: 'major', instrument: inst, pattern: 'groups4' }).slice(0, 32) });
      list.push({ id: 'pent', name: 'Pentatonic box', desc: 'Minor pentatonic up and down — the shape every lead guitarist knows.', notes: sc({ scale: 'minpent', octaves: 2 }) });
    } else if (inst === 'bass') {
      const r = startNote('bass', tonic, 12);
      list.push({ id: 'root-fifth', name: 'Root – fifth – octave', desc: 'The foundation of bass lines. Let each note ring for its full value.', notes: [r, r + 7, r + 12, r + 7, r, r + 7, r + 12, r + 7, r] });
      list.push({ id: 'walk', name: 'Walking up the scale', desc: 'Quarter notes up and down the major scale — keep a steady, even pulse.', notes: sc({ octaves: 1 }) });
      const ch = [];
      I.strings.forEach((open) => [1, 2, 3, 4].forEach((f) => ch.push(open + f)));
      list.push({ id: 'chromatic', name: 'Chromatic 1-2-3-4', desc: 'One finger per fret across all four strings. Builds strength and stretch.', notes: ch });
    } else if (inst === 'trumpet') {
      // concert pitches of the open (0-valve) harmonic series: written C4, G4, C5, E5, G5
      const open = [58, 65, 70, 74, 77];
      list.push({ id: 'lip-slurs', name: 'Lip slurs (open)', desc: 'Slur between the open notes without changing valves: written C – G – C and back. Keep the air moving.', notes: [open[0], open[1], open[2], open[1], open[0]] });
      list.push({ id: 'lip-slurs-2', name: 'Lip slurs (2nd valve)', desc: 'Same slur pattern with the 2nd valve down: written B – F# – B.', notes: [open[0] - 1, open[1] - 1, open[2] - 1, open[1] - 1, open[0] - 1] });
      list.push({ id: 'long-ladder', name: 'Long-tone ladder', desc: 'Hold each note of the scale for a full breath with a steady sound before moving on.', notes: sc({ octaves: 1, direction: 'up' }) });
    } else if (inst === 'voice') {
      const c = startNote('voice', tonic, 12);
      list.push({ id: 'lip-trill', name: 'Lip trill 1-2-3-4-5-4-3-2-1', desc: 'Blow through loose lips ("brr") on the five-note scale — the easiest way to connect breath and voice.', notes: [0, 2, 4, 5, 7, 5, 4, 2, 0].map((d) => c + d) });
      list.push({ id: 'siren', name: 'Octave siren on "oo"', desc: 'Do – so – do\' – so – do on a gentle "oo", letting the voice lighten at the top.', notes: [0, 7, 12, 7, 0].map((d) => c + d) });
      list.push({ id: 'long-ladder', name: 'Long-tone ladder', desc: 'Hold each note of the scale for a full, steady breath on "ah".', notes: sc({ octaves: 1, direction: 'up' }) });
    }
    list.push({ id: 'scale-arp', name: 'Scale + arpeggio', desc: 'Major scale up, then the tonic arpeggio back down.', notes: sc({ direction: 'up' }).concat(arpeggio({ tonic, type: '', instrument: inst, direction: 'up' }).reverse().slice(1)) });
    return list;
  }

  // ---------- randomness (seedable for tests) ----------
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
  }

  /** Sight-reading melody: mostly stepwise in a scale, starting and ending on the tonic. */
  function sightReading(opts) {
    const rand = opts.rand || Math.random;
    const level = opts.level || 1; // 1: steps, 2: + skips, 3: + leaps and accidentals
    const len = opts.length || 8;
    const pool = scale({ tonic: opts.tonic || 0, scale: opts.scale || 'major', instrument: opts.instrument, octaves: level >= 3 ? 2 : 1, direction: 'up' });
    let i = 0;
    const out = [pool[0]];
    for (let k = 1; k < len - 1; k++) {
      const maxStep = level === 1 ? 1 : level === 2 ? 2 : 4;
      let step = 0;
      while (step === 0) step = Math.round((rand() * 2 - 1) * maxStep);
      i = Math.max(0, Math.min(pool.length - 1, i + step));
      let m = pool[i];
      if (level >= 3 && rand() < 0.12) m += rand() < 0.5 ? 1 : -1;
      out.push(m);
    }
    out.push(pool[0] + (i > pool.length / 2 && pool.length > 8 ? 12 : 0));
    return out;
  }

  /** Call & response: a short motif from a scale (rhythm in beats). */
  function motif(opts) {
    const rand = opts.rand || Math.random;
    const pool = scale({ tonic: opts.tonic || 0, scale: opts.scale || 'majpent', instrument: opts.instrument, octaves: 1, direction: 'up' });
    const n = opts.length || 4;
    const rhythms = [[1, 1, 1, 1], [0.5, 0.5, 1, 2], [1, 0.5, 0.5, 2], [1.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2]];
    const r = rhythms[Math.floor(rand() * rhythms.length)].slice(0, Math.max(n, 3));
    let i = Math.floor(rand() * 3);
    const notes = [];
    r.forEach((beats, k) => {
      if (k) { const st = Math.round((rand() * 2 - 1) * 2) || 1; i = Math.max(0, Math.min(pool.length - 1, i + st)); }
      notes.push({ midi: pool[i], beats });
    });
    return notes;
  }

  /** Grade a free "answer" phrase: how many notes were in the scale, and did it end home? */
  function gradeAnswer(playedMidis, tonic, scaleId) {
    const sc = SCALES[scaleId] || SCALES.majpent;
    const pcs = new Set(sc.iv.map((iv) => mod12(tonic + iv)));
    const inScale = playedMidis.filter((m) => pcs.has(mod12(m))).length;
    const endsHome = playedMidis.length > 0 && mod12(playedMidis[playedMidis.length - 1]) === mod12(tonic);
    const variety = new Set(playedMidis.map(mod12)).size;
    const score = playedMidis.length ? Math.round(100 * (0.6 * (inScale / playedMidis.length) + (endsHome ? 0.25 : 0) + Math.min(0.15, variety * 0.03))) : 0;
    return { notes: playedMidis.length, inScale, endsHome, variety, score };
  }

  /** Diatonic chord palette for the progression builder. */
  function palette(tonic, minor) {
    const T = PM.Theory;
    const deg = minor ? [[0, 'm', 'i'], [2, 'dim', 'ii°'], [3, '', 'III'], [5, 'm', 'iv'], [7, '', 'V'], [8, '', 'VI'], [10, '', 'VII']]
      : [[0, '', 'I'], [2, 'm', 'ii'], [4, 'm', 'iii'], [5, '', 'IV'], [7, '', 'V'], [9, 'm', 'vi'], [7, '7', 'V7']];
    const flats = [5, 10, 3, 8, 1].includes(minor ? mod12(tonic + 3) : tonic);
    return deg.map(([d, type, roman]) => ({ root: mod12(tonic + d), type, roman, name: T.spell(tonic + d, flats) + type }));
  }

  const PROMPTS = [
    'Play a phrase that only uses three notes — make it sing with rhythm.',
    'Start a phrase on the 3rd of the chord and end it on the root.',
    'Leave a whole bar of silence between every phrase.',
    'Repeat one short idea three times, then change the last note.',
    'Play the same melody once loud and once very soft.',
    'Make up a melody for your own name — one note per syllable.',
    'Play a question phrase (ending up high) and an answer phrase (ending on the tonic).',
    'Use only long notes for a whole chorus — make every note count.',
    'Climb slowly to your highest note, then come down in steps.',
    'Hum a phrase first, then find it on your instrument.',
  ];

  /** Letter name for the note-names quiz (written pitch for transposing instruments). */
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  PM.Learn = { setVoiceType, SCALES, INTERVALS, RANGE, PROMPTS, LETTERS, scale, arpeggio, scalePattern, exercises, sightReading, motif, gradeAnswer, palette, startNote, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Learn;
})(typeof self !== 'undefined' ? self : globalThis);
