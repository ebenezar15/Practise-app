/* Overture — Challenge Arena: 22 creative challenges at each level (Easy, Medium, Hard).
 * Every challenge has its own idea and mechanic — ear duels, beat-the-clock sprints,
 * three-lives survival, tap-back rhythms, Simon-style melody memory, key and fretboard
 * hunts, puzzle ordering — and its questions are generated fresh every time you play.
 *
 * Question shapes (all produced by pure generators so they are unit-tested):
 *   mc    {type:'mc', prompt, options[], answer, play?, show?}
 *   order {type:'order', prompt, items[] (shuffled), answer[] (correct order)}
 *   keys  {type:'keys', prompt, answer[midi], mode:'set'|'seq', pcOnly?, lo, hi, play?}
 *   fret  {type:'fret', prompt, inst, string?, answer[{string,fret}]}
 *   tap   {type:'tap', prompt, rhythm[beats], bpm}
 * play: {notes[]|chord[]|seq[[]]|clicks:{n,bpm,accents?,pattern?}|vols[]} */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const SH = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const LET = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function mc(r, prompt, answer, pool, extra) {
    const opts = [answer];
    for (const o of shuffle(r, pool)) { if (opts.length >= 4) break; if (!opts.includes(o)) opts.push(o); }
    return Object.assign({ type: 'mc', prompt, options: shuffle(r, opts), answer }, extra || {});
  }
  const two = (r, prompt, answer, other, extra) => Object.assign({ type: 'mc', prompt, options: shuffle(r, [answer, other]), answer }, extra || {});
  const flatKey = (pc) => [5, 10, 3, 8, 1].includes(mod12(pc));
  const sp = (pc, fl) => (PM.Theory ? PM.Theory.spell(mod12(pc), fl) : SH[mod12(pc)]);
  const fromAcademy = (id) => (r) => Object.assign({ type: 'mc' }, PM.Academy.GEN[id](r));
  const tf = (r, items) => { const [s, t] = pick(r, items); return { type: 'mc', prompt: 'True or false: ' + s, options: ['True', 'False'], answer: t ? 'True' : 'False' }; };
  /** close-position diatonic triad on degree d of major key t */
  const triad = (t, d) => [0, 2, 4].map((k) => t + MAJOR[(d + k) % 7] + (d + k >= 7 ? 12 : 0));

  // ------------------------------------------------------------------ generators
  const G = {
    upDown: (r) => { const a = int(r, 55, 72); let b = a + pick(r, [-7, -5, -4, -3, -2, 2, 3, 4, 5, 7]); return two(r, 'Listen: is the second note higher or lower?', b > a ? 'Higher ⬆️' : 'Lower ⬇️', b > a ? 'Lower ⬇️' : 'Higher ⬆️', { play: { notes: [a, b] }, ear: true }); },
    keyFinder: (r) => { const pc = int(r, 0, 11), nat = MAJOR.includes(pc); return { type: 'keys', prompt: `Tap ${nat ? 'a' : 'any'} ${SH[pc]} on the keyboard`, answer: [60 + pc], pcOnly: true, mode: 'set', lo: 48, hi: 71 }; },
    alphabet: (r) => { const k = int(r, 0, 6), n = int(r, 2, 5), up = r() < 0.6; const ans = LET[(k + (up ? n : 7 - n)) % 7]; return mc(r, `Start on ${LET[k]} and count ${n} letters ${up ? 'up' : 'down'} the musical alphabet. Where do you land?`, ans, LET); },
    countClicks: (r) => { const n = int(r, 3, 9); return mc(r, 'How many clicks do you hear?', String(n), ['3', '4', '5', '6', '7', '8', '9'], { play: { clicks: { n, bpm: int(r, 90, 150) } }, ear: true }); },
    twinNotes: (r) => { const a = int(r, 57, 72), same = r() < 0.45, b = same ? a : a + pick(r, [-2, -1, 1, 2]); return two(r, 'Are the two notes the same or different?', same ? 'Same' : 'Different', same ? 'Different' : 'Same', { play: { notes: [a, b] }, ear: true }); },
    lengthLadder: (r) => { const v = shuffle(r, ['Sixteenth', 'Eighth', 'Quarter', 'Half', 'Whole']).slice(0, 4); const order = ['Sixteenth', 'Eighth', 'Quarter', 'Half', 'Whole'].filter((x) => v.includes(x)); return { type: 'order', prompt: 'Tap the notes from shortest to longest', items: shuffle(r, order), answer: order }; },
    steadyBeat: (r) => ({ type: 'tap', prompt: 'Tap 8 steady beats with the click', rhythm: [1, 1, 1, 1, 1, 1, 1, 1], bpm: int(r, 70, 100) }),
    loudSoft: (r) => { const first = r() < 0.5; return two(r, 'Which note is louder?', first ? 'The first' : 'The second', first ? 'The second' : 'The first', { play: { notes: [64, 64], vols: first ? [0.5, 0.12] : [0.12, 0.5] }, ear: true }); },
    happySad: (r) => { const root = int(r, 55, 67), maj = r() < 0.5; return two(r, 'Happy (major) or sad (minor)?', maj ? 'Happy 😊' : 'Sad 😢', maj ? 'Sad 😢' : 'Happy 😊', { play: { chord: [root, root + (maj ? 4 : 3), root + 7] }, ear: true }); },
    findAll: (r) => { const pc = pick(r, [0, 5, 4, 11, 7, 2]); return { type: 'keys', prompt: `Find EVERY ${SH[pc]} on this keyboard (tap them all)`, answer: [48 + pc, 60 + pc, 72 + pc].filter((m) => m <= 83), mode: 'set', lo: 48, hi: 83 }; },
    bandBuilder: (r) => { const q = pick(r, [['Plays the low roots with the kick drum', 'Bass'], ['Keeps the tempo for the whole band', 'Drums'], ['Sings the melody', 'Lead vocal'], ['Adds pads and chords in the middle', 'Keys'], ['Plays strummed rhythm chords', 'Acoustic guitar'], ['Plays bright high melodic lines', 'Electric guitar']]); return mc(r, 'Who in the band… ' + q[0].toLowerCase() + '?', q[1], ['Bass', 'Drums', 'Lead vocal', 'Keys', 'Acoustic guitar', 'Electric guitar']); },
    echoEasy: (r) => ({ type: 'tap', prompt: 'Listen, then tap the rhythm back', rhythm: pick(r, [[1, 1, 2], [2, 1, 1], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2], [1, 1, 1, 1], [2, 2]]), bpm: 90, echo: true }),
    tempoTwins: (r) => { const a = int(r, 70, 110), faster = r() < 0.5, b = faster ? a + int(r, 25, 45) : a - int(r, 20, 35); return two(r, 'Is the second click faster or slower?', faster ? 'Faster 🐇' : 'Slower 🐢', faster ? 'Slower 🐢' : 'Faster 🐇', { play: { clicks: { n: 4, bpm: a, then: { n: 4, bpm: b } } }, ear: true }); },
    symbolSnap: (r) => { const S = [['𝄞', 'Treble clef'], ['𝄢', 'Bass clef'], ['♯', 'Sharp — a half step higher'], ['♭', 'Flat — a half step lower'], ['♮', 'Natural — cancels a sharp/flat'], ['𝄐', 'Fermata — hold the note'], ['𝄇', 'Repeat sign'], ['>', 'Accent — play it stronger'], ['𝄽', 'Quarter rest'], ['p', 'Piano — soft'], ['f', 'Forte — loud'], ['𝆒', 'Crescendo — get louder']]; const [s, m] = pick(r, S); return mc(r, `What does ${s} mean?`, m, S.map((x) => x[1]), { big: s }); },
    stepSkip: (r) => { const a = int(r, 60, 67), step = r() < 0.5, b = a + (step ? pick(r, [-2, 2, 1, -1]) : pick(r, [-5, -4, 4, 5, 7, -7])); return two(r, 'Step (next door) or skip (a jump)?', step ? 'Step 👣' : 'Skip 🦘', step ? 'Skip 🦘' : 'Step 👣', { play: { notes: [a, b] }, ear: true }); },
    melodyMap: (r) => { const a = int(r, 60, 67), d1 = pick(r, [2, -2, 3, -3]), d2 = pick(r, [2, -2, 4, -4]); const lab = (d) => (d > 0 ? 'up' : 'down'); const ans = `${lab(d1)} then ${lab(d2)}`; return mc(r, 'Listen to 3 notes. Which shape is the melody?', ans, ['up then up', 'down then down', 'up then down', 'down then up'], { play: { notes: [a, a + d1, a + d1 + d2] }, ear: true }); },
    fillBar: (r) => { const opts = [['a half + a quarter', 'Quarter note'], ['three quarters', 'Quarter note'], ['a dotted half', 'Quarter note'], ['two quarters', 'Half note'], ['a half', 'Half note'], ['a quarter + two eighths', 'Half note'], ['nothing yet', 'Whole note']]; const [has, need] = pick(r, opts); return mc(r, `A 4/4 bar already has ${has}. What single note fills it?`, need, ['Whole note', 'Half note', 'Quarter note', 'Eighth note']); },
    fretSteps: (r) => { const a = int(r, 0, 7), b = a + int(r, 1, 5); return mc(r, `On one guitar string, from fret ${a} to fret ${b} is how many half steps?`, String(b - a), ['1', '2', '3', '4', '5', '6']); },
    doReMi: (r) => { const S = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti']; const k = int(r, 0, 5), up = r() < 0.6; return mc(r, `Which syllable comes ${up ? 'right after' : 'right before'} ${S[up ? k : k + 1]}?`, S[up ? k + 1 : k], S); },
    fingerNumbers: (r) => { const F = [['Thumb', '1'], ['Index finger', '2'], ['Middle finger', '3'], ['Ring finger', '4'], ['Little finger', '5']]; const [f, n] = pick(r, F); return r() < 0.5 ? mc(r, `On piano, the ${f.toLowerCase()} is finger number…`, n, ['1', '2', '3', '4', '5']) : mc(r, `Piano finger ${n} is your…`, f, F.map((x) => x[0])); },
    whatNext: (r) => { const st = int(r, 0, 3), pat = pick(r, [[0, 1, 2], [0, 2, 4], [2, 1, 0], [0, 1]]); const seq = []; for (let i = 0; i < 3; i++) pat.forEach((x) => seq.push(LET[(st + x) % 7])); const shown = seq.slice(0, seq.length - 1); return mc(r, `What comes next? ${shown.join(' ')} …`, seq[seq.length - 1], LET); },
    simon3: (r) => { const pool = [60, 64, 67, 72]; const seq = Array.from({ length: 3 }, () => pick(r, pool)); return { type: 'keys', prompt: 'Simon says: listen, then tap the 3 notes in order', answer: seq, mode: 'seq', lo: 60, hi: 72, play: { notes: seq }, ear: true }; },

    // ---- medium
    intervalEar: (r) => { const I = [[2, 'Major 2nd'], [4, 'Major 3rd'], [5, 'Perfect 4th'], [7, 'Perfect 5th'], [12, 'Octave'], [3, 'Minor 3rd']]; const [st, n] = pick(r, I); const a = int(r, 55, 67); return mc(r, 'Name the interval you hear', n, I.map((x) => x[1]), { play: { notes: [a, a + st] }, ear: true }); },
    chordColours: (r) => { const Q = [['Major', [0, 4, 7]], ['Minor', [0, 3, 7]], ['Diminished', [0, 3, 6]], ['Augmented', [0, 4, 8]]]; const [n, iv] = pick(r, Q); const root = int(r, 55, 64); return mc(r, 'What colour is this chord?', n, Q.map((x) => x[0]), { play: { chord: iv.map((x) => root + x) }, ear: true }); },
    keySig: fromAcademy('key-sig'),
    scaleBuilder: (r) => { const t = pick(r, [0, 7, 2, 5, 9, 4, 10]); const fl = flatKey(t); const order = MAJOR.map((x) => sp(t + x, fl)); return { type: 'order', prompt: `Build ${sp(t, fl)} major: tap its notes in order from the tonic`, items: shuffle(r, order), answer: order }; },
    minorTwins: fromAcademy('relative-minor'),
    progPuzzle: (r) => { const t = pick(r, [7, 0, 2, 9, 5]); const fl = flatKey(t); const prog = pick(r, [[0, 4, 5, 3, 'I–V–vi–IV'], [0, 3, 4, 0, 'I–IV–V–I'], [5, 3, 0, 4, 'vi–IV–I–V'], [1, 4, 0, 0, 'ii–V–I–I']]); const name = (d) => sp(t + MAJOR[d], fl) + ([1, 2, 5].includes(d) ? 'm' : ''); const order = prog.slice(0, 4).map(name); const items = [...new Set(order)]; return { type: 'order', prompt: `Put the chords of ${prog[4]} in ${sp(t, fl)} major in order`, items: shuffle(r, order), answer: order, dupes: items.length !== order.length }; },
    fretHunt: (r) => { const strs = [40, 45, 50, 55, 59, 64], N = ['E', 'A', 'D', 'G', 'B', 'high E']; const s = int(r, 0, 5), f = int(r, 1, 9); const m = strs[s] + f; return { type: 'fret', prompt: `Tap ${SH[m % 12]} on the ${N[s]} string`, inst: 'guitar', string: s, answer: [{ string: s, fret: f }] }; },
    echoSync: (r) => ({ type: 'tap', prompt: 'Syncopation echo: listen, then tap it back', rhythm: pick(r, [[0.5, 1, 0.5, 2], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2], [1.5, 0.5, 2], [0.5, 1, 1, 1.5]]), bpm: 92, echo: true }),
    oddOneOut: (r) => { const t = pick(r, [0, 7, 2, 5, 9]); const fl = flatKey(t); const inKey = MAJOR.map((x) => sp(t + x, fl)); const outs = SH.filter((_, pc) => !MAJOR.includes(mod12(pc - t))); const odd = pick(r, outs); const opts = shuffle(r, inKey).slice(0, 3).concat([odd]); return { type: 'mc', prompt: `Odd one out: which note is NOT in ${sp(t, fl)} major?`, options: shuffle(r, opts), answer: odd }; },
    transposer: fromAcademy('transpose'),
    capoCalc: fromAcademy('capo'),
    melodyDetective: (r) => { const ns = []; let m = 60 + pick(r, [0, 2, 4, 7]); for (let i = 0; i < 4; i++) { ns.push(m); m = 60 + MAJOR[Math.max(0, Math.min(6, MAJOR.indexOf(m - 60) + pick(r, [-2, -1, 1, 2])))] ; } return { type: 'keys', prompt: 'Melody detective: hear 4 notes (white keys, starting near C), then tap them', answer: ns, mode: 'seq', lo: 60, hi: 72, play: { notes: ns }, ear: true }; },
    feelMeter: (r) => { const M = [['2 (march)', 2, 1], ['3 (waltz)', 3, 1], ['4 (common time)', 4, 1], ['6/8 (two big beats)', 6, 3]]; const [n, b, g] = pick(r, M); return mc(r, 'Feel the accents. How are the beats grouped?', n, M.map((x) => x[0]), { play: { clicks: { n: b * 3, bpm: b === 6 ? 200 : 110, accents: g === 3 ? 3 : b } }, ear: true }); },
    chordBuilder: (r) => { const pc = pick(r, [0, 2, 4, 5, 7, 9]), q = pick(r, ['', 'm']); const root = 60 + pc - (pc > 6 ? 12 : 0); return { type: 'keys', prompt: `Build ${sp(pc)}${q === 'm' ? ' minor' : ' major'}: tap its 3 notes (any order)`, answer: (q === 'm' ? [0, 3, 7] : [0, 4, 7]).map((x) => root + x), pcOnly: true, mode: 'set', lo: 48, hi: 79 }; },
    circleRace: fromAcademy('circle-next'),
    rapidFire: (r) => tf(r, [['A major scale has 7 different notes', true], ['A whole step is 2 frets', true], ['3/4 time has 4 beats per bar', false], ['C major has no sharps or flats', true], ['A minor chord has a major 3rd', false], ['G is the V chord in C major', true], ['An octave is 12 half steps', true], ['Allegro means slow', false], ['The relative minor of C is A minor', true], ['F major has one sharp', false], ['A dotted half note lasts 3 beats in 4/4', true], ['Forte means soft', false]]),
    bassDetective: (r) => Object.assign({ type: 'mc' }, PM.Academy.GEN['bass-root'](r)),
    bpmGuess: (r) => { const b = pick(r, [60, 90, 120, 150]); return mc(r, 'Guess the tempo (BPM) of this click', String(b), ['60', '90', '120', '150'], { play: { clicks: { n: 6, bpm: b } }, ear: true }); },
    staffSprint: fromAcademy('staff-note'),
    simon5: (r) => { const pool = [60, 62, 64, 65, 67]; const seq = Array.from({ length: 5 }, () => pick(r, pool)); return { type: 'keys', prompt: 'Simon says: listen, then tap the 5 notes in order', answer: seq, mode: 'seq', lo: 60, hi: 67, play: { notes: seq }, ear: true }; },
    valveVault: (r) => Object.assign({ type: 'mc' }, PM.Academy.GEN['valves-for'](r)),
    twinNames: (r) => { const E = [['C♯', 'D♭'], ['D♯', 'E♭'], ['F♯', 'G♭'], ['G♯', 'A♭'], ['A♯', 'B♭'], ['E♯', 'F'], ['B♯', 'C'], ['C♭', 'B'], ['F♭', 'E']]; const [a, b] = pick(r, E); return mc(r, `${a} sounds the same as…`, b, E.map((x) => x[1])); },

    // ---- hard
    seventhHeaven: (r) => { const Q = [['Major 7', [0, 4, 7, 11]], ['Dominant 7', [0, 4, 7, 10]], ['Minor 7', [0, 3, 7, 10]], ['Half-diminished', [0, 3, 6, 10]], ['Diminished 7', [0, 3, 6, 9]]]; const [n, iv] = pick(r, Q); const root = int(r, 52, 62); return mc(r, 'Which seventh chord is this?', n, Q.map((x) => x[0]), { play: { chord: iv.map((x) => root + x) }, ear: true }); },
    intervalMaster: (r) => { const [st, n] = pick(r, PM.Academy.INTERVALS.slice(1)); const a = int(r, 52, 64); const harm = r() < 0.4; return mc(r, `Name the interval (${harm ? 'played together' : 'one after the other'})`, n, PM.Academy.INTERVALS.slice(1).map((x) => x[1]), { play: harm ? { chord: [a, a + st] } : { notes: [a, a + st] }, ear: true }); },
    cadenceDetective: (r) => { const C = [['Perfect (V–I)', [4, 0]], ['Plagal (IV–I)', [3, 0]], ['Half (… –V)', [0, 4]], ['Deceptive (V–vi)', [4, 5]]]; const [n, [a, b]] = pick(r, C); const t = 53 + int(r, 0, 7); const ch = (d) => triad(t, d); return mc(r, 'Which cadence ends this phrase?', n, C.map((x) => x[0]), { play: { seq: [ch(0), ch(3), ch(a), ch(b)] }, ear: true }); },
    modeMoods: (r) => { const M = [['Ionian (major)', [0, 2, 4, 5, 7, 9, 11, 12]], ['Dorian', [0, 2, 3, 5, 7, 9, 10, 12]], ['Phrygian', [0, 1, 3, 5, 7, 8, 10, 12]], ['Lydian', [0, 2, 4, 6, 7, 9, 11, 12]], ['Mixolydian', [0, 2, 4, 5, 7, 9, 10, 12]], ['Aeolian (minor)', [0, 2, 3, 5, 7, 8, 10, 12]]]; const [n, iv] = pick(r, M); const t = int(r, 57, 64); return mc(r, 'Which mode is this scale?', n, M.map((x) => x[0]), { play: { notes: iv.map((x) => t + x) }, ear: true }); },
    progressionEar: (r) => { const P = [['I – V – vi – IV', [0, 4, 5, 3]], ['I – IV – V – I', [0, 3, 4, 0]], ['vi – IV – I – V', [5, 3, 0, 4]], ['I – vi – IV – V', [0, 5, 3, 4]]]; const [n, ds] = pick(r, P); const t = 53 + int(r, 0, 5); return mc(r, 'Which progression do you hear?', n, P.map((x) => x[0]), { play: { seq: ds.map((d) => triad(t, d)) }, ear: true }); },
    inversionSpotter: fromAcademy('piano-inversion'),
    romanRace: fromAcademy('roman'),
    secondary: (r) => { const t = pick(r, [0, 7, 2, 5]); const fl = flatKey(t); const Q = [['V/V', 2, '7'], ['V/vi', 4, '7'], ['V/IV', 0, '7'], ['V/ii', 9, '7']]; const [n, iv, q] = pick(r, Q); return mc(r, `In ${sp(t, fl)} major, the secondary dominant ${n} is…`, sp(t + iv, fl) + q, Q.map((x) => sp(t + x[1], fl) + '7').concat([sp(t + 7, fl) + '7', sp(t + 11, fl) + '7'])); },
    rhythmNinja: (r) => ({ type: 'tap', prompt: 'Rhythm ninja: listen, then tap this tricky rhythm back', rhythm: pick(r, [[0.75, 0.25, 1, 0.5, 0.5, 1], [0.5, 0.25, 0.25, 1, 1.5, 0.5], [1, 0.75, 0.25, 0.5, 1.5], [0.25, 0.25, 0.5, 1, 0.5, 1.5]]), bpm: 84, echo: true }),
    chromaticDictation: (r) => { const ns = [int(r, 60, 66)]; for (let i = 0; i < 4; i++) ns.push(Math.max(57, Math.min(76, ns[i] + pick(r, [-3, -2, -1, 1, 2, 3, 4])))); return { type: 'keys', prompt: 'Chromatic dictation: tap the 5 notes you hear (black keys too!)', answer: ns, mode: 'seq', lo: 57, hi: 76, play: { notes: ns }, ear: true }; },
    chordSpeller: (r) => { const pc = pick(r, [0, 2, 5, 7, 9, 10, 3]); const Q = pick(r, [['maj7', [0, 4, 7, 11]], ['7', [0, 4, 7, 10]], ['m7', [0, 3, 7, 10]]]); const fl = flatKey(pc); return { type: 'keys', prompt: `Spell ${sp(pc, fl)}${Q[0]}: tap all 4 notes`, answer: Q[1].map((x) => 60 + pc + x), pcOnly: true, mode: 'set', lo: 48, hi: 83 }; },
    fretMaster: (r) => { const strs = [40, 45, 50, 55, 59, 64], N = ['E', 'A', 'D', 'G', 'B', 'high E']; const s = int(r, 0, 5), f = int(r, 1, 12); const m = strs[s] + f; return { type: 'fret', prompt: `Fretboard master: tap ${SH[m % 12]} on the ${N[s]} string (frets 1–12)`, inst: 'guitar', string: s, answer: [{ string: s, fret: f }] }; },
    nameThatKey: (r) => { const t = pick(r, [0, 7, 2, 9, 4, 5, 10, 3]); const fl = flatKey(t); const ch = (d) => sp(t + MAJOR[d], fl) + ([1, 2, 5].includes(d) ? 'm' : ''); const ds = shuffle(r, [0, 3, 4, 5, 1]).slice(0, 4); return mc(r, `These chords all belong to one major key: ${ds.map(ch).join(' · ')}. Which key?`, sp(t, fl) + ' major', [0, 7, 2, 9, 4, 5, 10, 3].map((x) => sp(x, flatKey(x)) + ' major')); },
    modeBuilder: (r) => { const M = pick(r, [['Dorian', 2, [0, 2, 3, 5, 7, 9, 10]], ['Mixolydian', 7, [0, 2, 4, 5, 7, 9, 10]], ['Lydian', 5, [0, 2, 4, 6, 7, 9, 11]], ['Phrygian', 4, [0, 1, 3, 5, 7, 8, 10]]]); const t = M[1]; const order = M[2].map((x) => sp(t + x, false)); return { type: 'order', prompt: `Build ${sp(t)} ${M[0]}: tap its notes in order`, items: shuffle(r, order), answer: order }; },
    expertFire: (r) => tf(r, [['A tritone is 6 half steps', true], ['Dorian has a major 6th', true], ['Lydian has a ♭7', false], ['The vii° chord is diminished', true], ['A deceptive cadence goes V → vi', true], ['B♭ major has three flats', false], ['Mixolydian is major with a ♭7', true], ['A half-diminished chord has a diminished 7th', false], ['E major has four sharps', true], ['The iii chord in major is minor', true], ['A plagal cadence is V–I', false], ['6/8 is compound duple time', true]]),
    bandTransposer: (r) => { const from = pick(r, [7, 0, 2, 9]), st = pick(r, [2, -2, 5, 3, -3]); const fl = flatKey(from + st); const prog = [0, 3, 4].map((d) => sp(from + MAJOR[d] + st, fl)).join(' – '); const wrong = [0, 3, 4].map((d) => sp(from + MAJOR[d] + st + pick(r, [1, -1, 2]), fl)).join(' – '); const wrong2 = [0, 3, 4].map((d) => sp(from + MAJOR[d], flatKey(from))).join(' – '); const wrong3 = [0, 4, 3].map((d) => sp(from + MAJOR[d] + st, fl)).join(' – '); return { type: 'mc', prompt: `The band plays ${[0, 3, 4].map((d) => sp(from + MAJOR[d], flatKey(from))).join(' – ')} and the singer wants it ${Math.abs(st)} half steps ${st > 0 ? 'higher' : 'lower'}. New chords?`, options: shuffle(r, [...new Set([prog, wrong, wrong2, wrong3])]), answer: prog }; },
    nashville: (r) => { const t = pick(r, [4, 9, 2, 7, 0, 5]); const fl = flatKey(t); const nums = pick(r, [[1, 4, 5, 6], [1, 5, 6, 4], [6, 4, 1, 5], [2, 5, 1, 1]]); const ch = (n) => sp(t + MAJOR[n - 1], fl) + ([2, 3, 6].includes(n) ? 'm' : ''); const ans = nums.map(ch).join(' '); const alt = (k) => nums.map((n) => sp(t + MAJOR[n - 1] + k, fl) + ([2, 3, 6].includes(n) ? 'm' : '')).join(' '); return { type: 'mc', prompt: `Nashville chart in ${sp(t, fl)}: ${nums.map((n) => n + ([2, 3, 6].includes(n) ? 'm' : '')).join(' ')}. Which chords?`, options: shuffle(r, [ans, alt(2), alt(-1), nums.map((n) => sp(t + MAJOR[n - 1], fl)).join(' ')].filter((x, i, a) => a.indexOf(x) === i)), answer: ans }; },
    oddMeter: (r) => { const M = [['5/4 (3+2)', 5, [0, 3]], ['7/8 (2+2+3)', 7, [0, 2, 4]], ['6/8', 6, [0, 3]], ['4/4', 4, [0]]]; const [n, b, acc] = pick(r, M); return mc(r, 'Odd meter feel: which time signature?', n, M.map((x) => x[0]), { play: { clicks: { n: b * 3, bpm: 200, pattern: acc, bar: b } }, ear: true }); },
    simon7: (r) => { const pool = [60, 62, 64, 65, 67, 69, 71, 72]; const seq = Array.from({ length: 7 }, () => pick(r, pool)); return { type: 'keys', prompt: 'Simon says: 7 notes — listen, then tap them in order', answer: seq, mode: 'seq', lo: 60, hi: 72, play: { notes: seq }, ear: true }; },
    jazzBrain: (r) => { const pc = pick(r, [7, 0, 2, 9, 4, 5]); const sub = sp(pc + 6, true) + '7'; return mc(r, `Jazz brain: the tritone substitute for ${sp(pc)}7 is…`, sub, SH.map((x, i) => sp(i, true) + '7')); },
    pitchMemory: (r) => { const st = int(r, 1, 11); const n = SH[st]; return mc(r, 'You hear C, then a mystery note. Name it!', n, SH.slice(1), { play: { notes: [60, 60 + st] }, ear: true }); },
    bassClefSprint: (r) => { const pool = [43, 45, 47, 48, 50, 52, 53, 55, 57]; const m = pick(r, pool); return mc(r, 'Bass clef sprint: name this note', sp(m), LET, { show: { staff: [m], clef: 'bass' } }); },
  };

  // ------------------------------------------------------------------ the arena
  // mode: rounds (fixed count) · timed (beat the clock) · lives (3 hearts, survive)
  const C = (id, level, emoji, name, blurb, gen, o) => Object.assign({ id, level, emoji, name, blurb, gen, mode: 'rounds', rounds: 8 }, o || {});
  const CHALLENGES = [
    // EASY
    C('up-down', 1, '🎈', 'Balloon Pop', 'Is the second note higher or lower? Pop the right balloon.', 'upDown'),
    C('key-finder', 1, '🔑', 'Key Finder', 'Find the named key on the keyboard.', 'keyFinder'),
    C('alphabet-leap', 1, '🐸', 'Alphabet Leap', 'Hop up and down the musical alphabet.', 'alphabet', { mode: 'timed', seconds: 45 }),
    C('count-clicks', 1, '⏱️', 'Count the Clicks', 'How many clicks did you hear?', 'countClicks'),
    C('twin-notes', 1, '👯', 'Twin Notes', 'Same note twice — or not?', 'twinNotes', { mode: 'lives' }),
    C('length-ladder', 1, '🪜', 'Note Length Ladder', 'Line note values up from shortest to longest.', 'lengthLadder', { rounds: 5 }),
    C('steady-hands', 1, '🫲', 'Steady Hands', 'Tap a rock-steady beat with the click.', 'steadyBeat', { rounds: 3 }),
    C('loud-soft', 1, '🔊', 'Loud or Soft', 'Which note is louder? Train your dynamic ears.', 'loudSoft'),
    C('happy-sad', 1, '🎭', 'Happy or Sad', 'Major or minor — feel the mood.', 'happySad', { mode: 'lives' }),
    C('find-all', 1, '🔍', 'Find Them All', 'Tap every copy of the note on the keyboard.', 'findAll', { rounds: 6 }),
    C('band-builder', 1, '🎸', 'Band Builder', 'Who plays what in the band?', 'bandBuilder'),
    C('echo-clap', 1, '👏', 'Echo Clap', 'Hear a short rhythm, tap it back.', 'echoEasy', { rounds: 5 }),
    C('tempo-twins', 1, '🐇', 'Hare or Tortoise', 'Is the second click faster or slower?', 'tempoTwins'),
    C('symbol-snap', 1, '🃏', 'Symbol Snap', 'Match music symbols to their meaning.', 'symbolSnap', { mode: 'timed', seconds: 60 }),
    C('step-skip', 1, '👣', 'Step or Skip', 'Next-door note, or a jump?', 'stepSkip'),
    C('melody-map', 1, '🗺️', 'Melody Map', 'Trace the shape of a 3-note tune.', 'melodyMap'),
    C('fill-bar', 1, '🧱', 'Fill the Bar', 'Which note completes the bar?', 'fillBar'),
    C('fret-steps', 1, '🎯', 'Fret Steps', 'Count half steps between frets.', 'fretSteps', { mode: 'timed', seconds: 45 }),
    C('do-re-mi', 1, '🎶', 'Do-Re-Mi Relay', 'What comes before or after in solfège?', 'doReMi', { mode: 'timed', seconds: 45 }),
    C('finger-numbers', 1, '🖐️', 'Finger Numbers', 'Know your piano finger numbers.', 'fingerNumbers', { mode: 'timed', seconds: 40 }),
    C('what-next', 1, '🔮', 'What Comes Next?', 'Spot the pattern in the notes.', 'whatNext'),
    C('simon-3', 1, '🧠', 'Simon Says Jr.', 'Remember 3 notes and play them back.', 'simon3', { rounds: 5 }),
    // MEDIUM
    C('interval-detective', 2, '🕵️', 'Interval Detective', 'Name the distance between two notes.', 'intervalEar'),
    C('chord-colours', 2, '🎨', 'Chord Colours', 'Major, minor, diminished or augmented?', 'chordColours', { mode: 'lives' }),
    C('key-sig-sprint', 2, '⚡', 'Key Signature Sprint', 'Sharps and flats against the clock.', 'keySig', { mode: 'timed', seconds: 60 }),
    C('scale-builder', 2, '🏗️', 'Scale Builder', 'Assemble a major scale note by note.', 'scaleBuilder', { rounds: 4 }),
    C('minor-twins', 2, '🌗', 'Minor Twins', 'Find each major key’s relative minor.', 'minorTwins', { mode: 'timed', seconds: 50 }),
    C('prog-puzzle', 2, '🧩', 'Progression Puzzle', 'Put famous progressions in order.', 'progPuzzle', { rounds: 4 }),
    C('fret-hunt', 2, '🏹', 'Fretboard Hunt', 'Tap the note on the right string.', 'fretHunt'),
    C('sync-echo', 2, '🥁', 'Syncopation Echo', 'Tap back off-beat rhythms.', 'echoSync', { rounds: 4 }),
    C('odd-one-out', 2, '🦄', 'Odd One Out', 'Which note doesn’t belong in the key?', 'oddOneOut', { mode: 'lives' }),
    C('transposer', 2, '🔁', 'Transposer', 'Move chords to a new key.', 'transposer'),
    C('capo-calc', 2, '🧮', 'Capo Calculator', 'What does that capo shape really sound like?', 'capoCalc'),
    C('melody-detective', 2, '🎼', 'Melody Detective', 'Hear 4 notes, play them back.', 'melodyDetective', { rounds: 5 }),
    C('feel-meter', 2, '💃', 'Feel the Meter', 'Waltz, march or 6/8? Feel the accents.', 'feelMeter'),
    C('chord-builder', 2, '🏛️', 'Chord Builder', 'Tap the three notes of the chord.', 'chordBuilder'),
    C('circle-race', 2, '🎡', 'Circle Race', 'Race around the circle of fifths.', 'circleRace', { mode: 'timed', seconds: 60 }),
    C('rapid-fire', 2, '🔥', 'Rapid Fire', 'True or false — as fast as you can.', 'rapidFire', { mode: 'timed', seconds: 45 }),
    C('bass-detective', 2, '🔦', 'Bass Line Detective', 'Which root does the bass play?', 'bassDetective'),
    C('bpm-guess', 2, '🎚️', 'Tempo Guesser', 'Guess the BPM of the click.', 'bpmGuess', { mode: 'lives' }),
    C('staff-sprint', 2, '📜', 'Staff Sprint', 'Read notes on the staff — quickly!', 'staffSprint', { mode: 'timed', seconds: 60 }),
    C('simon-5', 2, '🧠', 'Simon Says', 'Remember 5 notes and play them back.', 'simon5', { rounds: 5 }),
    C('valve-vault', 2, '🎺', 'Valve Vault', 'Crack the trumpet valve codes.', 'valveVault'),
    C('twin-names', 2, '🪞', 'Twin Names', 'Enharmonic twins: same sound, different name.', 'twinNames', { mode: 'timed', seconds: 40 }),
    // HARD
    C('seventh-heaven', 3, '☁️', 'Seventh Heaven', 'Identify seventh chords by ear.', 'seventhHeaven', { mode: 'lives' }),
    C('interval-master', 3, '📏', 'Interval Master', 'Every interval, melodic and harmonic.', 'intervalMaster'),
    C('cadence-detective', 3, '🔚', 'Cadence Detective', 'How does the phrase end?', 'cadenceDetective'),
    C('mode-moods', 3, '🌈', 'Mode Moods', 'Hear a scale, name its mode.', 'modeMoods'),
    C('progression-ear', 3, '👂', 'Progression Ear', 'Name the chord progression you hear.', 'progressionEar', { mode: 'lives' }),
    C('inversion-spotter', 3, '🔄', 'Inversion Spotter', 'Root, 1st or 2nd inversion?', 'inversionSpotter', { mode: 'timed', seconds: 50 }),
    C('roman-race', 3, '🏛️', 'Roman Numeral Race', 'Chord → numeral, against the clock.', 'romanRace', { mode: 'timed', seconds: 60 }),
    C('secondary', 3, '🧭', 'Secondary Dominants', 'Find V of V and friends.', 'secondary'),
    C('rhythm-ninja', 3, '🥷', 'Rhythm Ninja', 'Dotted and 16th-note rhythms — tap them back.', 'rhythmNinja', { rounds: 4 }),
    C('chromatic-dictation', 3, '✍️', 'Chromatic Dictation', 'Write down a melody with black keys.', 'chromaticDictation', { rounds: 5 }),
    C('chord-speller', 3, '🔤', 'Chord Speller', 'Spell seventh chords on the keys.', 'chordSpeller'),
    C('fret-master', 3, '🎸', 'Fretboard Master', 'Any note, any string, up to fret 12.', 'fretMaster', { mode: 'timed', seconds: 60 }),
    C('name-key', 3, '🗝️', 'Name That Key', 'Which key do these chords live in?', 'nameThatKey'),
    C('mode-builder', 3, '🏗️', 'Mode Builder', 'Assemble modes note by note.', 'modeBuilder', { rounds: 4 }),
    C('expert-fire', 3, '🌋', 'Expert Rapid Fire', 'Advanced true/false at speed.', 'expertFire', { mode: 'timed', seconds: 45 }),
    C('band-transposer', 3, '🚐', 'Band Transposer', 'Re-key a progression for the singer.', 'bandTransposer'),
    C('nashville', 3, '🤠', 'Nashville Numbers', 'Turn a number chart into chords.', 'nashville'),
    C('odd-meter', 3, '🌀', 'Odd Meter Feel', '5/4, 7/8 or 6/8?', 'oddMeter', { mode: 'lives' }),
    C('simon-7', 3, '🧠', 'Simon Says Master', 'Seven notes from memory.', 'simon7', { rounds: 5 }),
    C('jazz-brain', 3, '🎷', 'Jazz Brain', 'Tritone substitutions.', 'jazzBrain', { mode: 'timed', seconds: 45 }),
    C('pitch-memory', 3, '💎', 'Pitch Memory', 'From a C, name the mystery note.', 'pitchMemory', { mode: 'lives' }),
    C('bass-clef-sprint', 3, '🐋', 'Bass Clef Sprint', 'Read the bass clef at speed.', 'bassClefSprint', { mode: 'timed', seconds: 50 }),
  ];
  const LEVEL_NAMES = ['', 'Easy', 'Medium', 'Hard'];

  function rng(seed) { let s = (seed >>> 0) || 9; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000003) / 1000003; }; }
  const get = (id) => CHALLENGES.find((c) => c.id === id);
  /** Fresh question for a challenge. Avoids repeating recent prompts when possible. */
  function question(c, r, recent) {
    let q = null;
    for (let tries = 0; tries < 8; tries++) {
      q = G[c.gen](r);
      const key = q.prompt + '|' + (q.answer && q.answer.join ? q.answer.join(',') : q.answer);
      if (!recent || !recent.includes(key)) { if (recent) { recent.push(key); if (recent.length > 6) recent.shift(); } break; }
    }
    return q;
  }
  /** A whole set of questions for a fixed-rounds challenge. */
  function round(c, seed) { const r = rng(seed); const recent = []; return Array.from({ length: c.rounds || 8 }, () => question(c, r, recent)); }

  /** Score a tapped rhythm: taps (seconds) vs rhythm (beats) at bpm → 0..1. */
  function scoreTaps(taps, rhythm, bpm) {
    if (taps.length !== rhythm.length) return Math.max(0, 1 - Math.abs(taps.length - rhythm.length) / rhythm.length) * 0.4;
    const beat = 60 / bpm, exp = []; let t = 0;
    for (const d of rhythm) { exp.push(t); t += d; }
    const t0 = taps[0];
    let err = 0;
    for (let i = 1; i < taps.length; i++) err += Math.abs((taps[i] - t0) / beat - exp[i]);
    const mean = err / Math.max(1, taps.length - 1);
    return Math.max(0, Math.min(1, 1 - mean / 0.35));
  }
  /** Check a keys answer: set or sequence, optionally by pitch class. */
  function checkKeys(q, tapped) {
    const norm = (m) => (q.pcOnly ? mod12(m) : m);
    if (q.mode === 'seq') return tapped.length === q.answer.length && tapped.every((m, i) => norm(m) === norm(q.answer[i]));
    const want = new Set(q.answer.map(norm)), got = new Set(tapped.map(norm));
    return want.size === got.size && [...want].every((x) => got.has(x));
  }
  const stars = (acc) => (acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.45 ? 1 : 0);

  PM.Challenges = { CHALLENGES, LEVEL_NAMES, GEN: G, get, question, round, rng, scoreTaps, checkKeys, stars };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Challenges;
})(typeof self !== 'undefined' ? self : globalThis);
