/* Overture — Academy: self-paced courses from first notes to advanced harmony. Every lesson
 * has a clear explanation, real-world uses, examples you can hear, an "on your instrument"
 * panel, endless generated practice questions, and links to practise it for real.
 * Pure data + question generators (unit-tested); screens are in js/views/academy.js. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const SH = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const NAT_MIN = [0, 2, 3, 5, 7, 8, 10];
  const LEVELS = ['', 'Beginner', 'Intermediate', 'Advanced'];

  // ------------------------------------------------------------------ helpers
  const T = () => PM.Theory;
  const spell = (pc, flats) => (T() ? T().spell(pc, flats) : SH[mod12(pc)]);
  const keyFlats = (pc) => [5, 10, 3, 8, 1, 6].includes(mod12(pc)) && mod12(pc) !== 6;
  function rngFrom(seed) { let s = (seed >>> 0) || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  /** Build a multiple-choice question with distinct options including the answer. */
  function mc(r, prompt, answer, pool, extra) {
    const opts = [answer];
    for (const o of shuffle(r, pool)) { if (opts.length >= 4) break; if (!opts.includes(o)) opts.push(o); }
    return Object.assign({ prompt, options: shuffle(r, opts), answer }, extra || {});
  }

  const INTERVALS = [
    [0, 'Unison'], [1, 'Minor 2nd'], [2, 'Major 2nd'], [3, 'Minor 3rd'], [4, 'Major 3rd'], [5, 'Perfect 4th'], [6, 'Tritone'],
    [7, 'Perfect 5th'], [8, 'Minor 6th'], [9, 'Major 6th'], [10, 'Minor 7th'], [11, 'Major 7th'], [12, 'Octave'],
  ];
  const KEY_SIGS = [['C', 0, ''], ['G', 1, '♯'], ['D', 2, '♯'], ['A', 3, '♯'], ['E', 4, '♯'], ['B', 5, '♯'], ['F', 1, '♭'], ['B♭', 2, '♭'], ['E♭', 3, '♭'], ['A♭', 4, '♭'], ['D♭', 5, '♭']];
  const NOTE_VALUES = [['Whole note 𝅝', 4], ['Half note 𝅗𝅥', 2], ['Quarter note ♩', 1], ['Eighth note ♪', 0.5], ['Sixteenth note 𝅘𝅥𝅯', 0.25], ['Dotted half note', 3], ['Dotted quarter note', 1.5]];
  const TEMPO = [['Largo', 'very slow and broad'], ['Adagio', 'slow, at ease'], ['Andante', 'at a walking pace'], ['Moderato', 'moderate'], ['Allegro', 'fast and lively'], ['Presto', 'very fast'], ['Ritardando (rit.)', 'gradually slowing down'], ['Accelerando (accel.)', 'gradually speeding up'], ['A tempo', 'back to the original speed'], ['Fermata 𝄐', 'hold the note longer than written']];
  const DYN = [['pp', 'very soft (pianissimo)'], ['p', 'soft (piano)'], ['mp', 'moderately soft'], ['mf', 'moderately loud'], ['f', 'loud (forte)'], ['ff', 'very loud (fortissimo)'], ['crescendo <', 'gradually louder'], ['decrescendo >', 'gradually softer'], ['sfz', 'a sudden strong accent'], ['legato', 'smooth and connected'], ['staccato', 'short and detached']];
  const QUALITIES = [['', 'major', [0, 4, 7]], ['m', 'minor', [0, 3, 7]], ['dim', 'diminished', [0, 3, 6]], ['aug', 'augmented', [0, 4, 8]]];
  const SEVENTHS = [['maj7', 'major 7th', [0, 4, 7, 11]], ['7', 'dominant 7th', [0, 4, 7, 10]], ['m7', 'minor 7th', [0, 3, 7, 10]], ['m7b5', 'half-diminished (m7♭5)', [0, 3, 6, 10]]];
  const ROMAN_MAJ = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const MODES = [['Ionian', 'the major scale — bright and resolved'], ['Dorian', 'minor with a raised 6th — jazzy, soulful'], ['Phrygian', 'minor with a ♭2 — dark, Spanish/flamenco'], ['Lydian', 'major with a ♯4 — dreamy, floating'], ['Mixolydian', 'major with a ♭7 — bluesy rock and gospel'], ['Aeolian', 'the natural minor scale — sad, serious'], ['Locrian', 'diminished, ♭2 and ♭5 — unstable, rarely used']];
  const CADENCES = [['Perfect (authentic)', [4, 0], 'V → I: a full stop'], ['Plagal', [3, 0], 'IV → I: the "Amen" cadence'], ['Half', [0, 4], 'ends on V: a comma, a question'], ['Deceptive', [4, 5], 'V → vi: a surprise']];

  // ------------------------------------------------------------------ question generators
  // Each returns {prompt, options, answer, play?: {notes|chord|seq|rhythm}, show?: {keys|staff}}
  const GEN = {
    'note-name': (r) => { const m = 60 + Math.floor(r() * 12); return mc(r, 'Which note is highlighted on the keyboard?', SH[m % 12], SH, { show: { keys: [m] }, play: { notes: [m] } }); },
    'white-keys': (r) => { const k = pick(r, LETTERS); const up = r() < 0.6; return mc(r, `Which letter comes ${up ? 'after' : 'before'} ${k} in the musical alphabet?`, LETTERS[(LETTERS.indexOf(k) + (up ? 1 : 6)) % 7], LETTERS); },
    'half-whole': (r) => { const a = 60 + Math.floor(r() * 12), st = pick(r, [1, 2]); return mc(r, `From ${SH[a % 12]} up to ${SH[(a + st) % 12]} is a…`, st === 1 ? 'Half step (semitone)' : 'Whole step (tone)', ['Half step (semitone)', 'Whole step (tone)', 'Minor 3rd', 'Unison'], { show: { keys: [a, a + st] } }); },
    'note-value': (r) => { const [n, b] = pick(r, NOTE_VALUES); return mc(r, `In 4/4, how many beats does a ${n} last?`, String(b), NOTE_VALUES.map((x) => String(x[1]))); },
    'time-sig': (r) => { const ts = pick(r, [['4/4', 4, 'quarter'], ['3/4', 3, 'quarter'], ['2/4', 2, 'quarter'], ['6/8', 6, 'eighth'], ['12/8', 12, 'eighth'], ['5/4', 5, 'quarter']]); return mc(r, `${ts[0]} time: how many ${ts[2]} notes fill one bar?`, String(ts[1]), ['2', '3', '4', '5', '6', '8', '12']); },
    'bar-count': (r) => { const vals = [[1, 'quarter'], [2, 'half'], [0.5, 'eighth'], [4, 'whole']]; const a = pick(r, vals), b = pick(r, vals), c = pick(r, vals); const sum = a[0] + b[0] + c[0]; return mc(r, `A ${a[1]} + a ${b[1]} + a ${c[1]} note add up to how many beats?`, String(sum), ['1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '6', '8', String(sum + 1), String(Math.max(0.5, sum - 1))]); },
    'tempo-term': (r) => { const [t, d] = pick(r, TEMPO); return mc(r, `What does “${t}” mean?`, d, TEMPO.map((x) => x[1])); },
    'dynamic-term': (r) => { const [t, d] = pick(r, DYN); return mc(r, `What does “${t}” mean?`, d, DYN.map((x) => x[1])); },
    'key-sig': (r) => { const [k, n, acc] = pick(r, KEY_SIGS); return mc(r, `How many ${acc === '♭' ? 'flats' : acc ? 'sharps' : 'sharps or flats'} are in ${k} major?`, String(n), ['0', '1', '2', '3', '4', '5', '6']); },
    'key-from-sig': (r) => { const [k, n, acc] = pick(r, KEY_SIGS.slice(1)); return mc(r, `A key signature with ${n} ${acc === '♭' ? 'flat' : 'sharp'}${n > 1 ? 's' : ''} is which major key?`, k, KEY_SIGS.map((x) => x[0])); },
    'scale-notes': (r) => { const pc = pick(r, [0, 7, 2, 9, 4, 5, 10, 3]); const fl = keyFlats(pc); const notes = MAJOR.map((iv) => spell(pc + iv, fl)); const deg = 1 + Math.floor(r() * 6); return mc(r, `What is note ${deg + 1} of the ${spell(pc, fl)} major scale?`, notes[deg], notes.concat(SH), { play: { notes: MAJOR.map((iv) => 60 + pc + iv).concat([72 + pc]) } }); },
    'scale-formula': (r) => { const q = pick(r, [['major', 'W W H W W W H'], ['natural minor', 'W H W W H W W'], ['major pentatonic', '1 2 3 5 6'], ['minor pentatonic', '1 ♭3 4 5 ♭7'], ['blues', '1 ♭3 4 ♭5 5 ♭7'], ['harmonic minor', 'natural minor with a raised 7th']]); return mc(r, `Which formula builds the ${q[0]} scale?`, q[1], ['W W H W W W H', 'W H W W H W W', '1 2 3 5 6', '1 ♭3 4 5 ♭7', '1 ♭3 4 ♭5 5 ♭7', 'natural minor with a raised 7th']); },
    'relative-minor': (r) => { const pc = pick(r, [0, 7, 2, 9, 5, 10, 3, 4]); const fl = keyFlats(pc); return mc(r, `What is the relative minor of ${spell(pc, fl)} major?`, spell(pc + 9, fl) + 'm', SH.map((x) => x + 'm')); },
    'circle-next': (r) => { const pc = pick(r, [0, 7, 2, 9, 4, 5, 10, 3]); const dir = r() < 0.5; const fl = keyFlats(pc) || !dir; return mc(r, `On the circle of fifths, which key is next ${dir ? 'clockwise (up a 5th)' : 'anticlockwise (up a 4th)'} from ${spell(pc, keyFlats(pc))}?`, spell(pc + (dir ? 7 : 5), fl), SH); },
    'interval-name': (r) => { const [st, name] = pick(r, INTERVALS.slice(1)); const a = 60 + Math.floor(r() * 8); return mc(r, `${SH[a % 12]} up to ${SH[(a + st) % 12]} (${st} semitone${st > 1 ? 's' : ''}) is a…`, name, INTERVALS.map((x) => x[1]), { show: { keys: [a, a + st] }, play: { notes: [a, a + st] } }); },
    'interval-semis': (r) => { const [st, name] = pick(r, INTERVALS.slice(1)); return mc(r, `How many semitones are in a ${name}?`, String(st), INTERVALS.map((x) => String(x[0]))); },
    'interval-ear': (r) => { const [st, name] = pick(r, [[2, 'Major 2nd'], [3, 'Minor 3rd'], [4, 'Major 3rd'], [5, 'Perfect 4th'], [7, 'Perfect 5th'], [9, 'Major 6th'], [12, 'Octave']]); const a = 55 + Math.floor(r() * 10); return mc(r, 'Listen: which interval is this?', name, ['Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Perfect 5th', 'Major 6th', 'Octave'], { play: { notes: [a, a + st] }, ear: true }); },
    'interval-invert': (r) => { const p = pick(r, [['Major 3rd', 'Minor 6th'], ['Minor 3rd', 'Major 6th'], ['Perfect 4th', 'Perfect 5th'], ['Major 2nd', 'Minor 7th'], ['Major 7th', 'Minor 2nd'], ['Perfect 5th', 'Perfect 4th']]); return mc(r, `Turn a ${p[0]} upside down (invert it). What do you get?`, p[1], INTERVALS.map((x) => x[1])); },
    'triad-quality': (r) => { const [, name, iv] = pick(r, QUALITIES); const root = 57 + Math.floor(r() * 10); return mc(r, 'Listen: what kind of triad is this?', name, QUALITIES.map((x) => x[1]), { play: { chord: iv.map((x) => root + x) }, ear: true }); },
    'triad-spell': (r) => { const [id, name, iv] = pick(r, QUALITIES.slice(0, 2)); const pc = pick(r, [0, 2, 4, 5, 7, 9, 10, 3]); const fl = keyFlats(pc) || id === 'm'; const ans = iv.map((x) => spell(pc + x, fl)).join(' – '); const wrong = [[0, 3, 7], [0, 4, 7], [0, 4, 8], [0, 5, 7], [0, 3, 6]].map((v) => v.map((x) => spell(pc + x, fl)).join(' – ')); return mc(r, `Spell the ${spell(pc, fl)} ${name} triad.`, ans, wrong, { play: { chord: iv.map((x) => 60 + pc + x) } }); },
    'seventh-quality': (r) => { const [, name, iv] = pick(r, SEVENTHS); const root = 55 + Math.floor(r() * 8); return mc(r, 'Listen: which 7th chord is this?', name, SEVENTHS.map((x) => x[1]), { play: { chord: iv.map((x) => root + x) }, ear: true }); },
    'inversion': (r) => { const pc = pick(r, [0, 7, 5, 2, 9]); const fl = keyFlats(pc); const iv = [0, 4, 7]; const inv = Math.floor(r() * 3); const bass = spell(pc + iv[inv], fl); return mc(r, `${spell(pc, fl)} major with ${bass} in the bass is in…`, ['root position', '1st inversion', '2nd inversion'][inv], ['root position', '1st inversion', '2nd inversion', '3rd inversion']); },
    'roman': (r) => { const pc = pick(r, [0, 7, 2, 5, 10, 9]); const fl = keyFlats(pc); const d = Math.floor(r() * 7); const q = ['', 'm', 'm', '', '', 'm', 'dim'][d]; return mc(r, `In ${spell(pc, fl)} major, ${spell(pc + MAJOR[d], fl)}${q} is which chord?`, ROMAN_MAJ[d], ROMAN_MAJ); },
    'diatonic-chord': (r) => { const pc = pick(r, [0, 7, 2, 5, 9]); const fl = keyFlats(pc); const d = pick(r, [1, 3, 4, 5]); const q = ['', 'm', 'm', '', '', 'm', 'dim'][d]; return mc(r, `What is the ${ROMAN_MAJ[d]} chord in ${spell(pc, fl)} major?`, spell(pc + MAJOR[d], fl) + q, MAJOR.map((iv, i) => spell(pc + iv, fl) + ['', 'm', 'm', '', '', 'm', 'dim'][i]).concat([spell(pc + MAJOR[d], fl) + (q ? '' : 'm')])); },
    'function': (r) => { const p = pick(r, [['I', 'Tonic (home)'], ['vi', 'Tonic (home)'], ['IV', 'Subdominant (moving away)'], ['ii', 'Subdominant (moving away)'], ['V', 'Dominant (tension, wants home)'], ['vii°', 'Dominant (tension, wants home)']]); return mc(r, `What job does the ${p[0]} chord usually do?`, p[1], ['Tonic (home)', 'Subdominant (moving away)', 'Dominant (tension, wants home)']); },
    'cadence-ear': (r) => { const [name, degs] = pick(r, CADENCES); const tonic = 60; const triad = (d) => [0, 2, 4].map((k) => tonic + MAJOR[(d + k) % 7] + (d + k >= 7 ? 12 : 0) - 12); return mc(r, 'Listen to the ending: which cadence is it?', name, CADENCES.map((x) => x[0]), { play: { seq: [triad(0), triad(3), ...degs.map(triad)] }, ear: true }); },
    'cadence-name': (r) => { const [name, , d] = pick(r, CADENCES); return mc(r, `Which cadence is ${d.split(':')[0]}?`, name, CADENCES.map((x) => x[0])); },
    'progression-ear': (r) => { const P = [['I – V – vi – IV', [0, 4, 5, 3]], ['I – IV – V – I', [0, 3, 4, 0]], ['vi – IV – I – V', [5, 3, 0, 4]], ['I – vi – IV – V', [0, 5, 3, 4]]]; const [name, degs] = pick(r, P); const triad = (d) => [0, 2, 4].map((k) => 48 + MAJOR[(d + k) % 7] + (d + k >= 7 ? 12 : 0)); return mc(r, 'Listen: which progression is this (in C)?', name, P.map((x) => x[0]), { play: { seq: degs.map(triad) }, ear: true }); },
    'mode-character': (r) => { const [m, d] = pick(r, MODES); return mc(r, `Which mode is ${d.split(' — ')[0]}?`, m, MODES.map((x) => x[0])); },
    'transpose': (r) => { const pc = pick(r, [0, 7, 2, 9, 5]); const st = pick(r, [2, -2, 5, 7, 3, -3]); const fl = keyFlats(pc + st); return mc(r, `Transpose the chord ${spell(pc, keyFlats(pc))} ${st > 0 ? 'up' : 'down'} ${Math.abs(st)} semitones.`, spell(pc + st, fl), SH); },
    'capo': (r) => { const shape = pick(r, [['G', 7], ['C', 0], ['D', 2], ['A', 9], ['E', 4]]); const capo = 1 + Math.floor(r() * 5); const fl = keyFlats(shape[1] + capo); return mc(r, `Playing ${shape[0]}-shape chords with a capo on fret ${capo} — what key does it sound in?`, spell(shape[1] + capo, fl), SH); },
    'nashville': (r) => { const pc = pick(r, [0, 7, 2, 5, 9]); const fl = keyFlats(pc); const d = Math.floor(r() * 6); const q = ['', 'm', 'm', '', '', 'm'][d]; return mc(r, `In the key of ${spell(pc, fl)}, what Nashville number is ${spell(pc + MAJOR[d], fl)}${q}?`, String(d + 1) + (q ? '-' : ''), ['1', '2-', '3-', '4', '5', '6-', '2', '6']); },
    'rhythm-count': (r) => { const p = pick(r, [['♩ ♩ ♩ ♩', '1 2 3 4'], ['♫ ♩ ♩ ♩', '1 & 2 3 4'], ['♩ ♫ ♩ ♩', '1 2 & 3 4'], ['𝅗𝅥 ♩ ♩', '1 (2) 3 4'], ['♩ ♩ 𝅗𝅥', '1 2 3 (4)'], ['♫ ♫ ♫ ♫', '1 & 2 & 3 & 4 &']]); return mc(r, `How do you count ${p[0]} in 4/4?`, p[1], ['1 2 3 4', '1 & 2 3 4', '1 2 & 3 4', '1 (2) 3 4', '1 2 3 (4)', '1 & 2 & 3 & 4 &']); },
    'syncopation': (r) => { const q = pick(r, [['An accent on an off-beat ("&")', true], ['A note on every beat', false], ['A tie across the beat', true], ['A rest on beat 1 then a note on the "&"', true], ['Four quarter notes', false]]); return mc(r, `Is this syncopation? ${q[0]}`, q[1] ? 'Yes' : 'No', ['Yes', 'No']); },
    'swing': (r) => { const q = pick(r, [['Swung eighths feel like…', 'long-short (triplet feel)'], ['Straight eighths feel like…', 'even (equal halves)'], ['A triplet divides the beat into…', 'three equal parts'], ['6/8 is felt in…', 'two big beats of three']]); return mc(r, q[0], q[1], ['long-short (triplet feel)', 'even (equal halves)', 'three equal parts', 'two big beats of three', 'four equal parts']); },
    'form': (r) => { const q = pick(r, [['The part that repeats with the same words and the main hook', 'Chorus'], ['The part that tells the story with new words each time', 'Verse'], ['A contrasting section, usually once, before the last chorus', 'Bridge'], ['The short build that leads into the chorus', 'Pre-chorus'], ['A repeated last line at the very end', 'Tag'], ['Music before the singing starts', 'Intro']]); return mc(r, q[0] + '?', q[1], ['Chorus', 'Verse', 'Bridge', 'Pre-chorus', 'Tag', 'Intro']); },
    'chord-tone': (r) => { const pc = pick(r, [0, 5, 7, 2, 9]); const fl = keyFlats(pc); const id = pick(r, ['', 'm', '7']); const pcs = (id === '' ? [0, 4, 7] : id === 'm' ? [0, 3, 7] : [0, 4, 7, 10]).map((x) => spell(pc + x, fl)); const ans = pick(r, pcs); return mc(r, `Which note is a chord tone of ${spell(pc, fl)}${id}?`, ans, SH.filter((n) => !pcs.includes(n)).concat([ans])); },
    'scale-over-chord': (r) => { const q = pick(r, [['G7 (dominant)', 'G Mixolydian'], ['Dm7 in C major', 'D Dorian'], ['Am (sad ballad)', 'A natural minor'], ['A blues', 'A blues scale'], ['Cmaj7', 'C major (Ionian)']]); return mc(r, `A good first scale to solo over ${q[0]}?`, q[1], ['G Mixolydian', 'D Dorian', 'A natural minor', 'A blues scale', 'C major (Ionian)']); },
    'practice-skill': (r) => { const q = pick(r, [['A passage keeps going wrong. Best first step?', 'Slow it down and loop just the hard bit'], ['How long should a focused daily practice be for most learners?', '20–30 minutes every day'], ['Your hand or voice hurts. You should…', 'Stop, rest, and check your technique'], ['The best way to learn a fast piece is…', 'Perfect at a slow tempo, then speed up gradually'], ['What helps memory the most?', 'Short sessions spread over several days']]); return mc(r, q[0], q[1], ['Slow it down and loop just the hard bit', '20–30 minutes every day', 'Stop, rest, and check your technique', 'Perfect at a slow tempo, then speed up gradually', 'Short sessions spread over several days', 'Play it faster until it works']); },
    'band-role': (r) => { const q = pick(r, [['Locks with the kick drum and plays the roots', 'Bass'], ['Holds the groove and the tempo for everyone', 'Drums'], ['Fills the middle with chords and pads', 'Keys / rhythm guitar'], ['Plays melodies and answers between vocal lines', 'Lead guitar / lead instrument'], ['Carries the melody and words', 'Lead vocal']]); return mc(r, `Who in a worship band ${q[0].toLowerCase()}?`, q[1], ['Bass', 'Drums', 'Keys / rhythm guitar', 'Lead guitar / lead instrument', 'Lead vocal']); },
    'staff-note': (r) => { const treble = r() < 0.6; const pool = treble ? [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77] : [43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60]; const m = pick(r, pool); return mc(r, `Name this note on the ${treble ? 'treble' : 'bass'} clef.`, SH[m % 12], LETTERS, { show: { staff: [m], clef: treble ? 'treble' : 'bass' }, play: { notes: [m] } }); },
    'accidental': (r) => { const q = pick(r, [['♯ (sharp)', 'raises a note by a half step'], ['♭ (flat)', 'lowers a note by a half step'], ['♮ (natural)', 'cancels a sharp or flat'], ['𝄪 (double sharp)', 'raises a note by a whole step']]); return mc(r, `What does a ${q[0]} do?`, q[1], ['raises a note by a half step', 'lowers a note by a half step', 'cancels a sharp or flat', 'raises a note by a whole step']); },
    'road-map': (r) => { const q = pick(r, [['D.C. al Fine', 'go back to the beginning and stop at Fine'], ['D.S. al Coda', 'go back to the sign 𝄋, then jump to the coda'], ['Repeat sign 𝄇', 'play the section again'], ['1st and 2nd endings', 'play ending 1 the first time, skip to ending 2 the second time'], ['Fine', 'the end']]); return mc(r, `What does “${q[0]}” tell you?`, q[1], ['go back to the beginning and stop at Fine', 'go back to the sign 𝄋, then jump to the coda', 'play the section again', 'play ending 1 the first time, skip to ending 2 the second time', 'the end']); },
  };

  /** Generate n questions from a practice spec list [{gen, n}] (deterministic for a seed). */
  function questions(specs, seed) {
    const r = rngFrom(seed || Date.now());
    const out = [];
    for (const s of specs) for (let i = 0; i < (s.n || 4); i++) { const g = GEN[s.gen]; if (g) out.push(Object.assign({ gen: s.gen }, g(r))); }
    return shuffle(r, out);
  }

  // ------------------------------------------------------------------ courses
  // block types: p (paragraph, **bold** allowed) · list · ex (example to hear: notes | chord | seq | rhythm) · use (practical use) · tip · inst (on your instrument: chord | scale | notes)
  const p = (text) => ({ t: 'p', text });
  const list = (...items) => ({ t: 'list', items });
  const ex = (label, play, caption) => ({ t: 'ex', label, play, caption });
  const use = (text) => ({ t: 'use', text });
  const tip = (text) => ({ t: 'tip', text });
  const inst = (o) => Object.assign({ t: 'inst' }, o);
  const C = 60;
  const triad = (root, q) => (q === 'm' ? [0, 3, 7] : q === 'dim' ? [0, 3, 6] : q === 'aug' ? [0, 4, 8] : [0, 4, 7]).map((x) => root + x);

  const SUBJECTS = [
    { id: 'fundamentals', name: 'Music fundamentals', emoji: '🎵', color: '#7c3aed', desc: 'Notes, the keyboard, rhythm, beats and the words musicians use.' },
    { id: 'reading', name: 'Reading music', emoji: '📖', color: '#0ea5e9', desc: 'Staff, clefs, key signatures, rhythms and road maps.' },
    { id: 'rhythm', name: 'Rhythm & groove', emoji: '🥁', color: '#f97316', desc: 'Subdivision, syncopation, swing, triplets and odd meters.' },
    { id: 'scales', name: 'Scales & keys', emoji: '🪜', color: '#10b981', desc: 'Major, minor, pentatonic, blues, modes and the circle of fifths.' },
    { id: 'intervals', name: 'Intervals', emoji: '📏', color: '#ec4899', desc: 'The distance between notes — the building block of melody and harmony.' },
    { id: 'chords', name: 'Chords & harmony', emoji: '🎼', color: '#8b5cf6', desc: 'Triads, 7ths, inversions, Roman numerals, functions and cadences.' },
    { id: 'ear', name: 'Ear training', emoji: '👂', color: '#14b8a6', desc: 'Hear intervals, chord qualities, cadences and progressions.' },
    { id: 'songwriting', name: 'Melody & songwriting', emoji: '✍️', color: '#eab308', desc: 'Motifs, phrases, song form and writing your first song.' },
    { id: 'improv', name: 'Improvisation', emoji: '🎷', color: '#ef4444', desc: 'Chord tones, the right scale, targeting and phrasing.' },
    { id: 'band', name: 'Worship band & arranging', emoji: '⛪', color: '#3b82f6', desc: 'Band roles, dynamics, transposing, capo, Nashville numbers.' },
    { id: 'practice', name: 'How to practise', emoji: '🧠', color: '#64748b', desc: 'Practise smarter: goals, slow practice, memory and healthy technique.' },
  ];

  const LESSONS = [
    // ===== Music fundamentals
    { id: 'f1', subject: 'fundamentals', level: 1, title: 'Pitch and the musical alphabet', minutes: 5,
      body: [p('**Pitch** is how high or low a sound is. Music uses only seven letter names — **A B C D E F G** — and then repeats them higher and lower. The distance from one C to the next C is an **octave**.'), ex('Hear C up to the next C (an octave)', { notes: [60, 62, 64, 65, 67, 69, 71, 72] }, 'C D E F G A B C'), use('Every song you know is built from these 7 letters plus the 5 notes "in between" (sharps and flats).'), inst({ notes: [60, 62, 64, 65, 67, 69, 71, 72] }), tip('Say the letters out loud as you play them — forwards and backwards.')],
      practice: [{ gen: 'white-keys', n: 4 }, { gen: 'note-name', n: 6 }] },
    { id: 'f2', subject: 'fundamentals', level: 1, title: 'The keyboard map: sharps, flats, half and whole steps', minutes: 6,
      body: [p('Look at a piano: black keys come in groups of **2 and 3**. **C** is the white key just left of the 2 black keys. A **half step** (semitone) is the very next key; a **whole step** is two half steps.'), list('**Sharp ♯** — one half step higher (F♯ is just above F).', '**Flat ♭** — one half step lower (B♭ is just below B).', 'Some notes have two names: C♯ = D♭ (enharmonic).', 'E–F and B–C are half steps with no black key between them.'), ex('Half steps (chromatic) from C', { notes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72] }), use('Guitar frets are half steps: each fret raises the note by one semitone.'), inst({ notes: [60, 61, 62] })],
      practice: [{ gen: 'half-whole', n: 6 }, { gen: 'note-name', n: 4 }, { gen: 'accidental', n: 2 }] },
    { id: 'f3', subject: 'fundamentals', level: 1, title: 'Beat, tempo and note values', minutes: 6,
      body: [p('The **beat** is the steady pulse you tap your foot to. **Tempo** is how fast the beat is, measured in **BPM** (beats per minute). Notes last a number of beats:'), list('Whole note = 4 beats', 'Half note = 2 beats', 'Quarter note = 1 beat', 'Eighth note = ½ beat (two per beat)', 'A **dot** adds half again: dotted half = 3 beats'), ex('Quarter notes, then eighth notes at 90 BPM', { rhythm: [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], bpm: 90 }), use('Worship ballads are usually 60–75 BPM, upbeat praise 110–140 BPM.'), tip('Use the Metronome: clap quarter notes, then eighths, without stopping.')],
      practice: [{ gen: 'note-value', n: 5 }, { gen: 'bar-count', n: 3 }, { gen: 'tempo-term', n: 2 }], try: [{ label: 'Practise with the metronome', go: 'metronome' }] },
    { id: 'f4', subject: 'fundamentals', level: 1, title: 'Bars and time signatures', minutes: 5,
      body: [p('Beats are grouped into **bars** (measures). The **time signature** tells you how: the top number is how many beats per bar, the bottom number which note gets one beat (4 = quarter note, 8 = eighth note).'), list('**4/4** — 4 beats: most pop, rock and worship', '**3/4** — 3 beats: waltzes and many hymns ("Amazing Grace")', '**6/8** — 6 eighths felt as 2 big beats: lilting ballads', '**2/4** — marches'), ex('3/4: ONE two three', { rhythm: [1, 1, 1, 1, 1, 1], bpm: 100, accents: 3 }), use('Counting the bar out loud ("1-2-3, 1-2-3") stops you rushing through hymns.')],
      practice: [{ gen: 'time-sig', n: 6 }, { gen: 'bar-count', n: 2 }], try: [{ label: 'Rhythm practice', go: 'metronome' }] },
    { id: 'f5', subject: 'fundamentals', level: 1, title: 'Dynamics and expression', minutes: 5,
      body: [p('**Dynamics** are how loud or soft you play: from **pp** (very soft) to **ff** (very loud). **Articulation** says how notes start and connect: **legato** (smooth), **staccato** (short), **accent** (>).'), ex('Soft then loud', { notes: [60, 64, 67, 72], vol: [0.08, 0.12, 0.25, 0.4] }), use('A song comes alive when verses are softer and choruses fuller — this is what the Dynamics meter in the Studio measures.'), tip('Practise any scale twice: once pp, once ff. Keep the timing identical.')],
      practice: [{ gen: 'dynamic-term', n: 6 }, { gen: 'tempo-term', n: 3 }] },
    { id: 'f6', subject: 'fundamentals', level: 2, title: 'Tempo words and musical terms', minutes: 5,
      body: [p('Composers often write tempo and mood in Italian: **Largo** (very slow), **Adagio** (slow), **Andante** (walking), **Moderato**, **Allegro** (fast), **Presto** (very fast). Changes: **rit.** (slow down), **accel.** (speed up), **a tempo** (back to speed), and the **fermata 𝄐** (hold).'), use('Many hymnals mark tempos like "Andante" — set the metronome to 76–96 BPM for that.')],
      practice: [{ gen: 'tempo-term', n: 8 }] },

    // ===== Reading music
    { id: 'r1', subject: 'reading', level: 1, title: 'The staff and the treble clef', minutes: 6,
      body: [p('Music is written on a **staff** of 5 lines. The **treble clef** (𝄞) is for higher notes — melody, right hand, guitar, trumpet and most voices. Lines from bottom: **E G B D F** ("Every Good Boy Does Fine"); spaces: **F A C E**.'), ex('Line notes E G B D F', { notes: [64, 67, 71, 74, 77] }), inst({ staff: [64, 65, 67, 69, 71], clef: 'treble' }), use('Once you can read the treble clef you can read melody lines in any hymnal.')],
      practice: [{ gen: 'staff-note', n: 8 }], try: [{ label: 'Note-names quiz', go: 'learn', activity: 'notes' }] },
    { id: 'r2', subject: 'reading', level: 1, title: 'The bass clef and ledger lines', minutes: 6,
      body: [p('The **bass clef** (𝄢) is for low notes — the piano left hand, bass guitar and low voices. Lines: **G B D F A** ("Good Boys Do Fine Always"); spaces: **A C E G** ("All Cows Eat Grass"). Notes above or below the staff use short **ledger lines**; **middle C** sits on one ledger line between the two staves.'), inst({ staff: [43, 47, 50, 53, 57], clef: 'bass' })],
      practice: [{ gen: 'staff-note', n: 8 }], try: [{ label: 'Note-names quiz', go: 'learn', activity: 'notes' }] },
    { id: 'r3', subject: 'reading', level: 1, title: 'Sharps, flats, naturals and key signatures', minutes: 7,
      body: [p('An **accidental** changes a note for the rest of the bar: ♯ raises, ♭ lowers, ♮ cancels. A **key signature** at the start of each line puts sharps or flats on certain notes for the whole piece — it tells you the **key**.'), list('Sharps appear in the order **F C G D A E B**', 'Flats appear in the order **B E A D G C F**', 'Last sharp + half step = major key (F♯ → G major)', 'Second-last flat = major key (B♭ E♭ → B♭ major)'), use('Reading the key signature first tells you which chords will appear in a song.')],
      practice: [{ gen: 'key-sig', n: 5 }, { gen: 'key-from-sig', n: 4 }, { gen: 'accidental', n: 2 }] },
    { id: 'r4', subject: 'reading', level: 2, title: 'Reading rhythms', minutes: 7,
      body: [p('Count every beat out loud and say "&" for the halfway point: **1 & 2 & 3 & 4 &**. A note lasts until the next count it reaches. Rests are silent beats — keep counting through them.'), ex('Count: 1 & 2 3 4', { rhythm: [0.5, 0.5, 1, 1, 1], bpm: 84 }), use('Reading rhythm is the hardest part of sight-reading — practise rhythms on one note first.'), tip('Tap rhythms on your lap with the metronome before you play the notes.')],
      practice: [{ gen: 'rhythm-count', n: 6 }, { gen: 'bar-count', n: 3 }], try: [{ label: 'Sight-reading', go: 'learn', activity: 'sight' }] },
    { id: 'r5', subject: 'reading', level: 2, title: 'Road maps: repeats, D.C., D.S. and codas', minutes: 5,
      body: [p('Music saves space with **road signs**: repeat signs (𝄆 𝄇), **1st and 2nd endings**, **D.C.** (da capo — from the beginning), **D.S.** (dal segno — from the sign 𝄋), **al Fine** (to the end mark) and **al Coda** (jump to the coda 𝄌).'), use('Worship charts often say "Chorus x2, Bridge, D.S. al Coda" — knowing this keeps the band together.')],
      practice: [{ gen: 'road-map', n: 6 }] },

    // ===== Rhythm & groove
    { id: 'rg1', subject: 'rhythm', level: 1, title: 'Subdivision: feeling the "&"', minutes: 5,
      body: [p('**Subdivision** means feeling the smaller notes inside each beat: two eighths ("1 &"), four sixteenths ("1 e & a"). Feeling the subdivision is the secret of steady timing.'), ex('Beat → 8ths → 16ths', { rhythm: [1, 1, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25], bpm: 76 }), use('Strumming hands move in eighths (down-up) even when you only strum on some of them.')],
      practice: [{ gen: 'rhythm-count', n: 6 }], try: [{ label: 'Rhythm practice', go: 'metronome' }] },
    { id: 'rg2', subject: 'rhythm', level: 2, title: 'Syncopation and ties', minutes: 6,
      body: [p('**Syncopation** puts the accent where you don\'t expect it — on the "&" or by tying a note across the beat. It makes music groove and dance.'), ex('Straight vs syncopated', { rhythm: [1, 1, 1, 1, 0.5, 1, 0.5, 1, 1], bpm: 88 }), use('Most modern worship rhythm parts push chords onto the "&" of 4 to drive into the next bar.')],
      practice: [{ gen: 'syncopation', n: 6 }, { gen: 'rhythm-count', n: 3 }] },
    { id: 'rg3', subject: 'rhythm', level: 2, title: 'Triplets, swing and shuffle', minutes: 6,
      body: [p('A **triplet** splits a beat into three. **Swing** plays pairs of eighths long-short, like the first and last note of a triplet. **Shuffle** is swing on drums and guitar — the feel of blues and gospel.'), ex('Straight eighths, then swung', { rhythm: [0.5, 0.5, 0.5, 0.5, 0.67, 0.33, 0.67, 0.33], bpm: 96 }), use('Gospel shuffles and jazz standards almost always swing; pop ballads are straight.')],
      practice: [{ gen: 'swing', n: 6 }], try: [{ label: 'Try the gospel shuffle groove', go: 'metronome' }] },
    { id: 'rg4', subject: 'rhythm', level: 3, title: 'Compound and odd meters', minutes: 6,
      body: [p('**Compound meters** (6/8, 9/8, 12/8) group eighths in threes. **Odd meters** (5/4, 7/8) mix groups of 2 and 3 — count 5/4 as "1-2-3, 1-2".'), use('Many Tamil folk praise songs use the bouncy 6/8 Dadra/Thappu feel; Carnatic music uses talas like 7-beat Misra Chapu.')],
      practice: [{ gen: 'time-sig', n: 5 }, { gen: 'swing', n: 2 }] },

    // ===== Scales & keys
    { id: 's1', subject: 'scales', level: 1, title: 'The major scale', minutes: 7,
      body: [p('The **major scale** has the pattern **W W H W W W H** (whole, whole, half…). Start that pattern on any note to get its major scale. Sing it as **do re mi fa so la ti do**.'), ex('C major scale', { notes: [60, 62, 64, 65, 67, 69, 71, 72] }), ex('G major (one sharp: F♯)', { notes: [67, 69, 71, 72, 74, 76, 78, 79] }), inst({ scale: { tonic: 0, scale: 'major' } }), use('The major scale gives you the notes AND the chords of most songs in that key.')],
      practice: [{ gen: 'scale-notes', n: 6 }, { gen: 'scale-formula', n: 2 }], try: [{ label: 'Play scales with feedback', go: 'learn', activity: 'scales' }] },
    { id: 's2', subject: 'scales', level: 1, title: 'Keys and the circle of fifths', minutes: 7,
      body: [p('A **key** is a scale that becomes "home". The **circle of fifths** arranges keys so each step clockwise adds a sharp (C → G → D → A…) and anticlockwise adds a flat (C → F → B♭…). Neighbours share almost all their notes.'), list('Clockwise = up a 5th = +1 sharp', 'Anticlockwise = up a 4th = +1 flat', 'The chords I, IV and V of a key are its neighbours on the circle'), use('Use the circle to find which chords fit a song and to choose a key that suits a singer.')],
      practice: [{ gen: 'circle-next', n: 5 }, { gen: 'key-sig', n: 4 }], try: [{ label: 'Interactive circle of fifths', go: 'toolkit', tab: 'circle' }] },
    { id: 's3', subject: 'scales', level: 1, title: 'Minor scales and relative keys', minutes: 7,
      body: [p('The **natural minor** scale is W H W W H W W. Every major key has a **relative minor** that shares its notes and key signature, starting on the 6th note (C major → A minor). **Harmonic minor** raises the 7th; **melodic minor** raises the 6th and 7th going up.'), ex('A natural minor', { notes: [57, 59, 60, 62, 64, 65, 67, 69] }), ex('A harmonic minor (G♯)', { notes: [57, 59, 60, 62, 64, 65, 68, 69] }), inst({ scale: { tonic: 9, scale: 'minor' } }), use('Many worship songs move between a major key and its relative minor (I → vi).')],
      practice: [{ gen: 'relative-minor', n: 5 }, { gen: 'scale-formula', n: 3 }] },
    { id: 's4', subject: 'scales', level: 1, title: 'Pentatonic and blues scales', minutes: 6,
      body: [p('**Pentatonic** scales have 5 notes and no half steps — almost impossible to play a "wrong" note. **Major pentatonic** = 1 2 3 5 6; **minor pentatonic** = 1 ♭3 4 5 ♭7; add the ♭5 "blue note" for the **blues scale**.'), ex('C major pentatonic', { notes: [60, 62, 64, 67, 69, 72] }), ex('A minor pentatonic', { notes: [57, 60, 62, 64, 67, 69] }), inst({ scale: { tonic: 9, scale: 'minpent' } }), use('Gospel runs, rock solos and many folk and Tamil melodies use pentatonic scales.')],
      practice: [{ gen: 'scale-formula', n: 4 }, { gen: 'scale-over-chord', n: 2 }], try: [{ label: 'Improvise with the pentatonic', go: 'studio' }] },
    { id: 's5', subject: 'scales', level: 3, title: 'The seven modes', minutes: 8,
      body: [p('**Modes** are the major scale started on each of its notes. Each has its own colour: Ionian (major), **Dorian** (minor with a bright 6th), Phrygian (dark ♭2), **Lydian** (dreamy ♯4), **Mixolydian** (major with ♭7), Aeolian (natural minor), Locrian (diminished).'), ex('D Dorian (white keys from D)', { notes: [62, 64, 65, 67, 69, 71, 72, 74] }), ex('G Mixolydian (white keys from G)', { notes: [55, 57, 59, 60, 62, 64, 65, 67] }), use('Dorian fits minor worship and funk grooves; Mixolydian fits gospel and rock over dominant chords.')],
      practice: [{ gen: 'mode-character', n: 6 }, { gen: 'scale-over-chord', n: 2 }] },

    // ===== Intervals
    { id: 'i1', subject: 'intervals', level: 1, title: 'What is an interval?', minutes: 6,
      body: [p('An **interval** is the distance between two notes, counted in letter names (2nd, 3rd, 4th…) and measured in half steps. Seconds are steps; 3rds and up are skips and leaps.'), ex('C–D (2nd), C–E (3rd), C–G (5th), C–C (octave)', { seq: [[60, 62], [60, 64], [60, 67], [60, 72]] }), use('Melodies move by steps and skips; chords are stacked 3rds.')],
      practice: [{ gen: 'interval-name', n: 6 }, { gen: 'interval-semis', n: 3 }] },
    { id: 'i2', subject: 'intervals', level: 2, title: 'Major, minor and perfect intervals', minutes: 7,
      body: [p('2nds, 3rds, 6ths and 7ths are **major** or **minor** (one half step smaller). Unisons, 4ths, 5ths and octaves are **perfect**. The **tritone** (6 half steps) sits exactly between.'), list('Minor 3rd = 3 half steps (sad colour)', 'Major 3rd = 4 half steps (happy colour)', 'Perfect 5th = 7 half steps (strong, open)'), ex('Minor 3rd vs major 3rd', { seq: [[60, 63], [60, 64]] }), use('The 3rd decides whether a chord is major or minor.')],
      practice: [{ gen: 'interval-semis', n: 5 }, { gen: 'interval-name', n: 5 }] },
    { id: 'i3', subject: 'intervals', level: 2, title: 'Hearing intervals with song starts', minutes: 6,
      body: [p('Link each interval to a song you know: **Major 2nd** "Happy Birthday", **Minor 3rd** "Greensleeves", **Major 3rd** "When the Saints", **Perfect 4th** "Amazing Grace", **Perfect 5th** "Twinkle Twinkle", **Major 6th** "My Bonnie", **Octave** "Somewhere Over the Rainbow".'), ex('Perfect 4th (A-ma-)', { notes: [62, 67] }), ex('Perfect 5th (Twin-kle)', { notes: [60, 67] }), use('Singers use intervals to find harmony parts by ear.')],
      practice: [{ gen: 'interval-ear', n: 8 }], try: [{ label: 'Interval ear training', go: 'learn', activity: 'intervals' }] },
    { id: 'i4', subject: 'intervals', level: 3, title: 'Inverting intervals and consonance', minutes: 6,
      body: [p('Flip an interval (put the bottom note an octave up) and the numbers add to **9**; major ↔ minor, perfect stays perfect. **Consonant** intervals (3rds, 6ths, perfect) sound stable; **dissonant** ones (2nds, 7ths, tritone) create tension that wants to resolve.'), use('Harmony singers often sing a 6th below instead of a 3rd above — it\'s the same pair of notes flipped.')],
      practice: [{ gen: 'interval-invert', n: 6 }, { gen: 'interval-semis', n: 2 }] },

    // ===== Chords & harmony
    { id: 'c1', subject: 'chords', level: 1, title: 'Triads: major and minor chords', minutes: 7,
      body: [p('A **triad** stacks two 3rds: root, 3rd, 5th. **Major** = major 3rd + minor 3rd (bright). **Minor** = minor 3rd + major 3rd (darker). Change one note — the 3rd — and the mood flips.'), ex('C major', { chord: triad(60, '') }), ex('C minor', { chord: triad(60, 'm') }), inst({ chord: 'C' }), inst({ chord: 'Am' }), use('Three chords (I, IV, V) and one minor (vi) play thousands of songs.')],
      practice: [{ gen: 'triad-spell', n: 5 }, { gen: 'triad-quality', n: 4 }], try: [{ label: 'Chord library & changes', go: 'learn', activity: 'chords' }] },
    { id: 'c2', subject: 'chords', level: 2, title: 'Diminished, augmented and sus chords', minutes: 6,
      body: [p('**Diminished** = two minor 3rds (tense). **Augmented** = two major 3rds (dreamy, unresolved). **Sus2/sus4** replace the 3rd with the 2nd or 4th — open and floating, then often resolve to the major chord.'), ex('Diminished, augmented, Csus4 → C', { seq: [triad(60, 'dim'), triad(60, 'aug'), [60, 65, 67], [60, 64, 67]] }), use('Dsus4 → D is the classic worship "lift" at the end of a line.')],
      practice: [{ gen: 'triad-quality', n: 8 }] },
    { id: 'c3', subject: 'chords', level: 2, title: 'Seventh chords', minutes: 7,
      body: [p('Add another 3rd on top for a **7th chord**: **maj7** (soft, jazzy), **dominant 7** (bluesy, wants to resolve), **m7** (mellow), **m7♭5** (half-diminished).'), ex('Cmaj7, C7, Cm7', { seq: [[60, 64, 67, 71], [60, 64, 67, 70], [60, 63, 67, 70]] }), inst({ chord: 'G7' }), use('V7 → I (G7 → C) is the strongest pull home in music.')],
      practice: [{ gen: 'seventh-quality', n: 6 }, { gen: 'chord-tone', n: 3 }] },
    { id: 'c4', subject: 'chords', level: 2, title: 'Inversions and voicings', minutes: 7,
      body: [p('An **inversion** puts a note other than the root in the bass: **1st inversion** (3rd in the bass, written C/E), **2nd inversion** (5th in the bass, C/G). **Voicing** is how you spread the notes. Good voicings move each finger as little as possible (voice leading).'), ex('C, C/E, C/G', { seq: [[48, 64, 67, 72], [52, 60, 67, 72], [55, 60, 64, 72]] }), use('Slash chords like G/B make bass lines walk smoothly (G – G/B – C).'), tip('Every song page shows voice-led piano voicings in its tutorial.')],
      practice: [{ gen: 'inversion', n: 6 }] },
    { id: 'c5', subject: 'chords', level: 2, title: 'Chords in a key and Roman numerals', minutes: 8,
      body: [p('Build a triad on each note of the major scale and you get the **diatonic chords**: **I ii iii IV V vi vii°** (upper case = major, lower = minor). In C: C Dm Em F G Am B°. Numerals let you play any song in any key.'), ex('I – IV – V – I in C', { seq: [triad(48, ''), triad(53, ''), triad(55, ''), triad(48, '')] }), inst({ chord: 'F' }), use('"1-5-6-4" (I–V–vi–IV) is the four-chord progression of countless songs.')],
      practice: [{ gen: 'roman', n: 5 }, { gen: 'diatonic-chord', n: 5 }], try: [{ label: 'Progression builder', go: 'learn', activity: 'builder' }] },
    { id: 'c6', subject: 'chords', level: 2, title: 'Chord functions and cadences', minutes: 7,
      body: [p('Chords have jobs: **Tonic** (I, vi) feels like home, **Subdominant** (IV, ii) moves away, **Dominant** (V, vii°) creates tension that wants to go home. **Cadences** end phrases: perfect (V–I), plagal (IV–I, "Amen"), half (→V), deceptive (V–vi).'), ex('Perfect cadence', { seq: [triad(55, ''), triad(48, '')] }), ex('Plagal "Amen"', { seq: [triad(53, ''), triad(48, '')] }), ex('Deceptive', { seq: [triad(55, ''), triad(57, 'm')] }), use('Hymns end with perfect or plagal cadences; bridges often build on V before the last chorus.')],
      practice: [{ gen: 'function', n: 4 }, { gen: 'cadence-name', n: 4 }] },
    { id: 'c7', subject: 'chords', level: 3, title: 'Secondary dominants and borrowed chords', minutes: 8,
      body: [p('A **secondary dominant** is the V of a chord other than I: **V/V** (D or D7 in C) leads to G; **V/vi** (E7 in C) leads to Am. **Borrowed chords** come from the parallel minor: **♭VII** (B♭ in C) and **iv** (Fm in C) add drama.'), ex('C – A7 – Dm – G7 – C (V/ii)', { seq: [triad(48, ''), [57, 61, 64, 67], triad(50, 'm'), [55, 59, 62, 65], triad(48, '')] }), ex('C – F – Fm – C (borrowed iv)', { seq: [triad(48, ''), triad(53, ''), triad(53, 'm'), triad(48, '')] }), use('Gospel and hymn arrangements use secondary dominants to make lines feel "pulled" forward.')],
      practice: [{ gen: 'function', n: 3 }, { gen: 'transpose', n: 3 }] },

    // ===== Ear training
    { id: 'e1', subject: 'ear', level: 1, title: 'Major or minor?', minutes: 5,
      body: [p('Train your ear to hear the **quality** of a chord: major sounds bright and settled, minor darker. Listen to the 3rd.'), ex('Major, then minor', { seq: [triad(57, ''), triad(57, 'm')] })], practice: [{ gen: 'triad-quality', n: 8 }] },
    { id: 'e2', subject: 'ear', level: 2, title: 'Hearing cadences', minutes: 6,
      body: [p('Each cadence has a feeling: **perfect** = full stop, **plagal** = gentle "Amen", **half** = a question, **deceptive** = surprise.')], practice: [{ gen: 'cadence-ear', n: 8 }] },
    { id: 'e3', subject: 'ear', level: 2, title: 'Hearing progressions', minutes: 7,
      body: [p('Listen for the **bass** first, then how far each chord feels from home. I–V–vi–IV, I–IV–V–I, vi–IV–I–V and I–vi–IV–V cover a huge number of songs.')], practice: [{ gen: 'progression-ear', n: 8 }], try: [{ label: 'Analyse a real song', go: 'insights' }] },
    { id: 'e4', subject: 'ear', level: 3, title: 'Interval and 7th-chord drills', minutes: 6,
      body: [p('Advanced ears name intervals and 7th chords instantly. Hum the notes after you hear them — singing builds the ear fastest.')], practice: [{ gen: 'interval-ear', n: 6 }, { gen: 'seventh-quality', n: 4 }] },

    // ===== Melody & songwriting
    { id: 'w1', subject: 'songwriting', level: 1, title: 'Motifs and phrases', minutes: 6,
      body: [p('A **motif** is a short musical idea (3–6 notes) that you repeat and vary. A **phrase** is a musical sentence, usually 2 or 4 bars, often answered by a second phrase (**question and answer**).'), ex('Motif, then a varied answer', { notes: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60] }), use('Strong choruses repeat one memorable motif — that\'s the "hook".')],
      practice: [{ gen: 'form', n: 4 }], try: [{ label: 'Call & response', go: 'learn', activity: 'callresp' }] },
    { id: 'w2', subject: 'songwriting', level: 2, title: 'Song form: verse, chorus, bridge', minutes: 6,
      body: [p('**Verse** tells the story (new words), **pre-chorus** builds, **chorus** repeats the main message and hook, **bridge** contrasts once before the final chorus. A **tag** repeats the last line.'), list('Common worship form: Intro – V1 – C – V2 – C – Bridge – C – Tag', 'Hymns: verses only (strophic), sometimes a refrain'), use('Overture\'s Song Map in the Studio finds verses and choruses automatically.')],
      practice: [{ gen: 'form', n: 6 }] },
    { id: 'w3', subject: 'songwriting', level: 2, title: 'Write your first song', minutes: 10,
      body: [list('Pick a key and 4 chords (try I–V–vi–IV).', 'Speak one line of lyrics in rhythm, then sing it on chord tones.', 'Write a chorus line with a higher, repeated hook.', 'Verse low and calm; chorus higher and fuller.', 'Record it with the progression builder, then share it with your teacher.'), use('Songwriting uses everything in the Academy: rhythm, scales, chords and form.')],
      practice: [{ gen: 'diatonic-chord', n: 4 }, { gen: 'form', n: 2 }], try: [{ label: 'Progression builder', go: 'learn', activity: 'builder' }] },

    // ===== Improvisation
    { id: 'm1', subject: 'improv', level: 2, title: 'Chord tones first', minutes: 6,
      body: [p('The safest notes to improvise with are the **chord tones** (root, 3rd, 5th) of the chord that\'s playing. Land on a chord tone when the chord changes — especially the **3rd**.'), use('This is what the Studio\'s Improvise mode colours green: chord tones.')],
      practice: [{ gen: 'chord-tone', n: 8 }], try: [{ label: 'Improvise in the Studio', go: 'studio' }] },
    { id: 'm2', subject: 'improv', level: 2, title: 'Choosing a scale', minutes: 6,
      body: [p('Over a whole progression in one key, the **major pentatonic** of the key always works. Over minor songs use the **minor pentatonic** or **Dorian**; over dominant 7th chords **Mixolydian** or **blues**.')], practice: [{ gen: 'scale-over-chord', n: 6 }, { gen: 'scale-formula', n: 2 }] },
    { id: 'm3', subject: 'improv', level: 3, title: 'Phrasing and space', minutes: 6,
      body: [list('Leave space — silence makes your phrases speak.', 'Repeat an idea, then change one note.', 'Use rhythm: three notes with interesting rhythm beat ten random notes.', 'Build: start low and simple, climb toward the end.'), use('Worship pads and lead lines that breathe leave room for the singer.')],
      practice: [{ gen: 'practice-skill', n: 3 }, { gen: 'chord-tone', n: 3 }] },

    // ===== Band & arranging
    { id: 'b1', subject: 'band', level: 1, title: 'Roles in a worship band', minutes: 6,
      body: [p('Every instrument has a job: **drums** hold time, **bass** locks with the kick and plays roots, **keys/rhythm guitar** fill the harmony, **lead** answers the vocal, **vocals** carry the words. When everyone plays everything, it gets muddy.'), use('Play less when others play more: if the piano is full, the guitar can play high, simple parts.')],
      practice: [{ gen: 'band-role', n: 6 }] },
    { id: 'b2', subject: 'band', level: 2, title: 'Transposing, capo and choosing a key', minutes: 7,
      body: [p('**Transposing** moves every chord by the same distance. Guitarists use a **capo** to keep easy shapes: capo 2 + G shapes = A. Choose a key where the melody\'s highest note is comfortable for the singer.'), list('Up 2 semitones: G → A, C → D, Em → F♯m', 'Capo math: sounding key = shape key + capo fret'), use('Every song page can transpose and show the capo; Insights suggests the best key for your voice.')],
      practice: [{ gen: 'transpose', n: 5 }, { gen: 'capo', n: 4 }], try: [{ label: 'Transposer & capo tool', go: 'toolkit', tab: 'transpose' }] },
    { id: 'b3', subject: 'band', level: 2, title: 'Nashville numbers', minutes: 6,
      body: [p('The **Nashville Number System** writes chords as scale numbers: 1 4 5 6- (minus = minor). The band can change key instantly without rewriting the chart.'), use('"1 5 6- 4" works in any key: G D Em C or D A Bm G.')],
      practice: [{ gen: 'nashville', n: 8 }] },
    { id: 'b4', subject: 'band', level: 3, title: 'Dynamics maps and arranging', minutes: 7,
      body: [list('Verse 1: one or two instruments, soft.', 'Chorus 1: add bass and drums.', 'Verse 2: keep the groove, thin the harmony.', 'Bridge: build from soft to full over 4–8 bars.', 'Final chorus: everyone, highest energy; then a quiet tag.'), use('Each song tutorial includes a dynamics roadmap you can follow.')],
      practice: [{ gen: 'form', n: 3 }, { gen: 'band-role', n: 3 }] },

    // ===== How to practise
    { id: 'pr1', subject: 'practice', level: 1, title: 'A great daily practice routine', minutes: 5,
      body: [list('**Warm-up** (5 min): long notes, slow scales, stretches.', '**Technique** (5–10 min): one exercise from your Exercise path.', '**Repertoire** (10 min): a song, section by section.', '**Theory or ear** (5 min): one Academy lesson.', '**Fun** (5 min): jam over a Style or play a game.'), use('Short and daily beats long and rare. Use the Practice Planner to build your routine.')],
      practice: [{ gen: 'practice-skill', n: 5 }], try: [{ label: 'Open the Practice Planner', go: 'planner' }] },
    { id: 'pr2', subject: 'practice', level: 1, title: 'Slow practice and chunking', minutes: 5,
      body: [p('Find the exact bar that goes wrong, loop **only that**, at a tempo where it\'s perfect. Speed up 4–5 BPM at a time. Join chunks: bars 1–2, then 2–3, then 1–3.'), use('The Studio\'s "Loop 2 bars" and the Metronome speed trainer do this for you.')],
      practice: [{ gen: 'practice-skill', n: 5 }] },
    { id: 'pr3', subject: 'practice', level: 2, title: 'Healthy technique and avoiding injury', minutes: 5,
      body: [list('Relax shoulders, jaw and wrists — tension is the enemy of speed and tone.', 'Take a short break every 20–25 minutes.', 'Pain means stop. Never practise through pain.', 'Singers: hydrate and warm up; rest a tired voice.'), use('Good posture makes playing easier and lets you practise longer, safely.')],
      practice: [{ gen: 'practice-skill', n: 4 }] },

    // ===== Your instrument
    { id: 'in-piano', subject: 'piano-course', level: 1, title: 'Piano: hands, posture and first chords', minutes: 7, instrument: 'piano',
      body: [p('Sit so your forearms are level with the keys; fingers curved, numbered **1 (thumb) to 5 (little)**. Right hand plays melody, left hand bass/chords. Start with five-finger position on C, then the C, F and G chords.'), inst({ chord: 'C' }), inst({ chord: 'F' }), inst({ chord: 'G' }), use('With C, F, G and Am you can accompany hundreds of hymns.')],
      practice: [{ gen: 'note-name', n: 4 }, { gen: 'triad-spell', n: 3 }], try: [{ label: 'Piano exercise path', go: 'learn', activity: 'path' }] },
    { id: 'in-guitar', subject: 'guitar-course', level: 1, title: 'Guitar: strings, frets and the first four chords', minutes: 7, instrument: 'guitar',
      body: [p('Strings from thickest: **E A D G B E**. Each fret is a half step. Learn **Em, G, C and D** first — they play the I–V–vi–IV progression in G.'), inst({ chord: 'Em' }), inst({ chord: 'G' }), inst({ chord: 'C' }), inst({ chord: 'D' }), use('Add a capo and the same four shapes play in any key.')],
      practice: [{ gen: 'capo', n: 3 }, { gen: 'diatonic-chord', n: 3 }], try: [{ label: 'Guitar exercise path', go: 'learn', activity: 'path' }] },
    { id: 'in-bass', subject: 'bass-course', level: 1, title: 'Bass: roots, fifths and locking with the kick', minutes: 6, instrument: 'bass',
      body: [p('Bass strings: **E A D G**. Play the **root** of each chord on beat 1, then decorate with the **5th** and **octave**. Lock your rhythm with the kick drum.'), ex('Root – 5th – octave', { notes: [40, 47, 52, 47] }), use('In worship, simple roots with great timing beat busy lines.')],
      practice: [{ gen: 'chord-tone', n: 4 }, { gen: 'band-role', n: 2 }], try: [{ label: 'Bass exercise path', go: 'learn', activity: 'path' }] },
    { id: 'in-trumpet', subject: 'trumpet-course', level: 1, title: 'Trumpet: buzzing, valves and transposition', minutes: 6, instrument: 'trumpet',
      body: [p('Buzz your lips into the mouthpiece with steady air. The B♭ trumpet **transposes**: written C sounds concert B♭, so trumpet parts are written a tone higher than piano parts.'), use('When the band plays in concert B♭, you read in C.')],
      practice: [{ gen: 'transpose', n: 4 }, { gen: 'scale-notes', n: 2 }], try: [{ label: 'Trumpet exercise path', go: 'learn', activity: 'path' }] },
    { id: 'in-voice', subject: 'voice-course', level: 1, title: 'Voice: breath, resonance and range', minutes: 6, instrument: 'voice',
      body: [p('Breathe low (belly and ribs), keep the jaw and throat relaxed, and feel the buzz in your face ("forward resonance"). Find your **voice type** — soprano, alto, tenor, bass — so songs sit in a comfortable range.'), ex('A five-note warm-up', { notes: [60, 62, 64, 65, 67, 65, 64, 62, 60] }), use('Singing in the right key is the fastest way to sound good — Insights suggests one for you.')],
      practice: [{ gen: 'interval-ear', n: 4 }, { gen: 'practice-skill', n: 2 }], try: [{ label: 'Vocal exercise path', go: 'learn', activity: 'path' }, { label: 'Harmony & parts', go: 'harmony' }] },
  ];
  LESSONS.forEach((l, i) => (l.n = i + 1));

  // ------------------------------------------------------------------ placement
  /** Short placement quiz: 2 questions per stage; recommends a level and first subjects. */
  function placementQuestions(seed) {
    const r = rngFrom(seed || 3);
    const stages = [['note-name', 'note-value'], ['key-sig', 'triad-spell'], ['roman', 'interval-semis'], ['function', 'mode-character']];
    return stages.flatMap((gens, k) => gens.map((g) => Object.assign({ gen: g, stage: k + 1 }, GEN[g](r))));
  }
  function placementResult(answers) {
    // answers: [{stage, correct}]
    let level = 1;
    for (let s = 1; s <= 4; s++) { const a = answers.filter((x) => x.stage === s); if (a.length && a.every((x) => x.correct)) level = Math.min(3, Math.max(level, s === 1 ? 1 : s === 2 ? 2 : 3)); else break; }
    const start = level === 1 ? ['fundamentals', 'reading', 'scales'] : level === 2 ? ['chords', 'intervals', 'ear'] : ['chords', 'improv', 'band'];
    return { level, label: LEVELS[level], start };
  }

  /** Mastery of a lesson from its best practice score (0..1) → 0–3 stars. */
  const stars = (best) => (best == null ? 0 : best >= 0.9 ? 3 : best >= 0.75 ? 2 : best >= 0.5 ? 1 : 0);

  PM.Academy = { SUBJECTS, LESSONS, LEVELS, GEN, questions, placementQuestions, placementResult, stars, INTERVALS, KEY_SIGS, TEMPO, DYN, MODES };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Academy;
})(typeof self !== 'undefined' ? self : globalThis);
