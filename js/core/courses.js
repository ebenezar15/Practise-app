/* Cadenza — Instrument courses for the Academy: piano, guitar, bass, trumpet and voice, each
 * with Beginner, Intermediate and Advanced lessons. Lessons use interactive blocks:
 *   fing  — fingering guide (piano roll + keyboard/fretboard/valves, with alternatives)
 *   fretx — tap-to-hear fretboard explorer (follows the 4/5-string bass setting)
 *   keyx  — tap-to-hear keyboard explorer
 *   valvex — press-the-valves trumpet simulator
 *   drill — play it now with the microphone (scored play-along)
 * plus instrument-specific question generators that make fresh questions every time.
 * Pure data + generators (unit-tested); rendering lives in js/views/academy.js. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const A = PM.Academy;
  if (!A) return;
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const SH = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function mc(r, prompt, answer, pool, extra) {
    const opts = [answer];
    for (const o of shuffle(r, pool)) { if (opts.length >= 4) break; if (!opts.includes(o)) opts.push(o); }
    return Object.assign({ prompt, options: shuffle(r, opts), answer }, extra || {});
  }
  const flatKey = (pc) => [5, 10, 3, 8, 1].includes(mod12(pc));
  const spell = (pc, fl) => (PM.Theory ? PM.Theory.spell(mod12(pc), fl) : SH[mod12(pc)]);
  const nameOct = (m) => spell(m) + (Math.floor(m / 12) - 1);
  const Inst = (id) => PM.Instruments.get(id);
  const strName = (I, s) => (I.stringNames[s] === 'e' ? 'high E' : I.stringNames[s]) + ' string';
  const vLabel = (v) => (v === '0' ? 'Open (0)' : v.replace(/ /g, '-'));
  const VALVE_SETS = ['0', '1', '2', '1 2', '2 3', '1 3', '1 2 3'];
  const scaleNotes = (tonic, ivs, octaves) => { const out = []; for (let o = 0; o < (octaves || 1); o++) ivs.forEach((iv) => out.push(tonic + 12 * o + iv)); out.push(tonic + 12 * (octaves || 1)); return out; };

  // ------------------------------------------------------------------ fact pools (fresh order every time)
  const FACTS = {
    piano: [
      ['Which finger is number 1 on the piano?', 'Thumb', ['Index', 'Little finger', 'Middle']],
      ['Where is C on the keyboard?', 'Just left of the group of 2 black keys', ['Just left of the 3 black keys', 'On every black key', 'Right of the 2 black keys']],
      ['Which pedal sustains notes after you lift your fingers?', 'The right (sustain/damper) pedal', ['The left (soft) pedal', 'The middle pedal only', 'No pedal does that']],
      ['When should you change the sustain pedal?', 'Just after each new chord sounds (legato pedalling)', ['Before playing anything', 'Never during a song', 'Only at the very end']],
      ['In a C major scale (RH up), the thumb tucks under after…', 'Finger 3 (on E)', ['Finger 4', 'Finger 5', 'Finger 2']],
      ['A good hand shape for piano is…', 'Curved fingers, like holding a ball', ['Flat, straight fingers', 'Fingers pointing up', 'Wrists below the keys']],
      ['A chord with the 3rd in the bass is in…', '1st inversion', ['Root position', '2nd inversion', '3rd inversion']],
      ['“Rootless voicings” in jazz piano leave out…', 'The root (the bass plays it)', ['The 3rd', 'The 7th', 'Every black key']],
      ['Alberti bass is…', 'A broken-chord pattern: low–high–middle–high', ['Playing octaves', 'A walking bass', 'A drum pattern']],
      ['In a worship band, the piano left hand should usually…', 'Stay light — the bass guitar covers the low end', ['Double the bass loudly', 'Play nothing ever', 'Play the melody']],
    ],
    guitar: [
      ['Guitar strings from thickest to thinnest are…', 'E A D G B E', ['E B G D A E', 'A D G C E A', 'G C E A D G']],
      ['Each fret raises the note by a…', 'Half step (semitone)', ['Whole step', 'Fifth', 'Octave']],
      ['Fret 12 on any string gives…', 'The same note one octave higher', ['A fifth higher', 'A random note', 'The next string’s note']],
      ['Where should your fretting finger press?', 'Just behind the fret, not on top of it', ['In the middle between frets', 'On top of the fret wire', 'Anywhere — it does not matter']],
      ['A capo on fret 2 with a G shape sounds as…', 'A', ['G', 'B', 'F♯']],
      ['A “barre chord” means…', 'One finger presses several strings at once', ['Only open strings', 'Playing with a slide', 'Muting all strings']],
      ['The CAGED system connects…', 'Five chord shapes up the neck', ['Five strumming patterns', 'Five scales in one key', 'Five types of guitar']],
      ['Palm muting is done with…', 'The side of the picking hand on the strings near the bridge', ['The fretting hand thumb', 'A capo', 'The tuning pegs']],
      ['Travis picking keeps a steady bass with…', 'The thumb alternating on low strings', ['The pinky', 'Only downstrokes', 'A pick on the high strings']],
      ['On the B string, the open note is…', 'B (it is tuned a major 3rd above G)', ['C', 'A', 'B♭']],
    ],
    bass: [
      ['4-string bass strings from lowest are…', 'E A D G', ['B E A D', 'E A D G B E', 'G D A E']],
      ['A 5-string bass usually adds…', 'A low B string', ['A high C string', 'A second E', 'A drone string']],
      ['On beat 1 of a new chord the bass usually plays…', 'The root of the chord', ['The 7th', 'A random fill', 'Nothing']],
      ['The 5th of the chord on bass is usually…', 'One string up, two frets up from the root', ['One fret down', 'Same fret, one string down', 'Twelve frets up']],
      ['“Locking with the kick drum” means…', 'Playing your notes exactly with the bass drum', ['Playing louder than the drums', 'Ignoring the drummer', 'Playing only on beat 4']],
      ['A chromatic approach note is…', 'A note a half step above or below the next root', ['The root again', 'An octave jump', 'Silence']],
      ['Simandl (1-2-4) fingering on low frets uses…', 'Fingers 1, 2 and 4 to cover three frets', ['One finger per fret', 'Only the index', 'Thumb and index']],
      ['Why use the low B on a 5-string?', 'To reach low D, C and B without retuning', ['It is louder', 'It replaces the G string', 'To play chords']],
      ['Ghost notes on bass are…', 'Muted, percussive notes that add groove', ['Very loud notes', 'Notes played twice', 'Harmonics only']],
      ['A walking bass line mostly moves…', 'In steady quarter notes connecting chord tones', ['In whole notes', 'Only on the root', 'In random rhythms']],
    ],
    trumpet: [
      ['A B♭ trumpet playing written C sounds…', 'Concert B♭', ['Concert C', 'Concert D', 'Concert F']],
      ['How are trumpet notes changed without valves?', 'Lip tension and air speed select the partial', ['Moving the bell', 'Changing mouthpiece', 'They cannot be']],
      ['Valve 2 lowers the pitch by…', 'A half step', ['A whole step', 'A minor 3rd', 'An octave']],
      ['Valve 1 lowers the pitch by…', 'A whole step', ['A half step', 'A 4th', 'A minor 3rd']],
      ['Valves 1+2 together equal…', 'Valve 3 (a minor 3rd)', ['Valve 2', 'No change', 'An octave']],
      ['Low C♯ and D (1-2-3, 1-3) are sharp, so you…', 'Extend the 3rd-valve slide', ['Push the main slide in', 'Play softer', 'Use valve 2']],
      ['Lip slurs train…', 'Moving between partials with the same valves', ['Valve speed only', 'Tonguing speed', 'Reading music']],
      ['Double tonguing uses the syllables…', 'Ta-Ka (or Tu-Ku)', ['Ta-Ta', 'La-La', 'Ma-Ma']],
      ['Before playing high notes you should…', 'Warm up and build range gradually', ['Press the mouthpiece hard', 'Play loudly at once', 'Skip breathing']],
      ['When the band plays in concert E♭, the trumpet reads in…', 'F', ['E♭', 'D♭', 'G']],
    ],
    voice: [
      ['Good singing breath comes from…', 'Low in the body: belly and ribs expand', ['Lifting the shoulders', 'The throat', 'Holding your breath']],
      ['The “mix” voice is…', 'A blend of chest and head registers', ['Shouting', 'Only falsetto', 'Whispering']],
      ['A tenor’s comfortable range is roughly…', 'C3 to A4', ['C4 to A5', 'E2 to E4', 'G4 to C6']],
      ['Before singing high, you should…', 'Warm up with lip trills and sirens', ['Drink something icy', 'Shout a few times', 'Skip the warm-up']],
      ['To stay in tune, the best habit is…', 'Hear the note in your head before you sing it', ['Sing louder', 'Close your ears', 'Push from the throat']],
      ['Singing harmony a 3rd above the melody means…', 'Two scale steps higher than the tune', ['One semitone higher', 'An octave higher', 'The same note']],
      ['Holding a microphone for worship, keep it…', 'About a fist away, closer for soft parts', ['At arm’s length', 'Touching your lips always', 'Pointing at the speakers']],
      ['Belting safely needs…', 'Support, forward resonance and no throat squeeze', ['Tight throat', 'Shoulders raised', 'Maximum volume always']],
      ['Vocal runs are best learned…', 'Slowly, note by note, then sped up', ['At full speed first', 'Only by feel', 'By skipping notes']],
      ['Which vowel shape is most open and resonant?', '“Ah”', ['“Ee”', '“Mm”', '“Ss”']],
    ],
  };
  FACTS.drums = [
    ['Which drum usually plays the backbeat on 2 and 4?', 'Snare drum', ['Kick drum', 'Floor tom', 'Crash cymbal']],
    ['Which part of the kit is played with the right foot?', 'The kick (bass) drum', ['The snare', 'The ride', 'The high tom']],
    ['The hi-hat is played by…', 'Sticks and the left foot pedal', ['Only the right foot', 'Only brushes', 'The kick beater']],
    ['A ghost note is…', 'A very soft snare tap between the main hits', ['A missed note', 'A cymbal choke', 'A loud accent']],
    ['A paradiddle is sticked…', 'R L R R  L R L L', ['R L R L  R L R L', 'R R L L  R R L L', 'R R R L  L L R L']],
    ['Where do fills usually end?', 'On beat 1 of the next bar, often with a crash', ['On beat 3', 'In the middle of a bar', 'They never end']],
    ['The crash cymbal is mostly used to…', 'Mark the start of a new section', ['Keep steady 8ths', 'Play the backbeat', 'Tune the toms']],
    ['In a half-time feel the snare plays on…', 'Beat 3', ['Beats 2 and 4', 'Every beat', 'Beat 1 only']],
    ['A shuffle is built on…', 'Triplets with the middle note left out', ['Straight 16ths', 'Whole notes', 'Quintuplets']],
    ['Why do drummers count out loud?', 'To keep an internal clock and place every note', ['To warm up the voice', 'To tune the drums', 'It is required by law']],
    ['Matched grip means…', 'Both hands hold the sticks the same way', ['Only one stick is used', 'Holding the sticks at the tips', 'Using brushes']],
    ['In worship songs, verses are often played…', 'Softly — side-stick, hats or toms', ['As loud as possible', 'With double-kick', 'Without any time']],
  ];
  const facts = (k) => (r) => { const [q, a, w] = pick(r, FACTS[k]); return mc(r, q, a, w); };

  // ------------------------------------------------------------------ instrument question generators
  const fretNote = (id) => (r) => {
    const I = Inst(id), s = Math.floor(r() * I.strings.length), f = Math.floor(r() * (id === 'bass' ? 8 : 10));
    const m = I.strings[s] + f;
    return mc(r, `What note is at fret ${f} on the ${strName(I, s)}${id === 'bass' && I.strings.length === 5 ? ' (5-string)' : ''}?`, SH[m % 12], SH, { show: { fret: { inst: id, string: s, fret: f } }, play: { notes: [m] } });
  };
  const fretFind = (id) => (r) => {
    const I = Inst(id), s = Math.floor(r() * I.strings.length), f = 1 + Math.floor(r() * 11);
    const m = I.strings[s] + f;
    return mc(r, `On the ${strName(I, s)}, which fret gives ${SH[m % 12]}?`, String(f), Array.from({ length: 12 }, (_, i) => String(i + 1)), { show: { fret: { inst: id, string: s } } });
  };
  const stringOrder = (id) => (r) => {
    const I = Inst(id), n = I.strings.length, k = Math.floor(r() * n);
    const names = I.stringNames.map((x) => (x === 'e' ? 'high E' : x));
    return mc(r, `On a ${n}-string ${id}, counting from the thickest, string ${k + 1} is…`, names[k], [...new Set(['E', 'A', 'D', 'G', 'B', 'high E', 'C'].concat(names))], { show: { fret: { inst: id, string: k } } });
  };
  const tabRead = (id) => (r) => {
    const I = Inst(id), s = Math.floor(r() * I.strings.length), f = Math.floor(r() * 9);
    const m = I.strings[s] + f;
    const lines = I.stringNames.map((nm, i) => `${(nm === 'e' ? 'e' : nm).padEnd(1)}|--${i === s ? String(f).padEnd(2, '-') : '--'}--|`).reverse();
    return mc(r, 'Read the tab: which note is this?', SH[m % 12], SH, { show: { tab: lines }, play: { notes: [m] } });
  };
  const PIANO_SCALES = [['C', 60], ['G', 67], ['D', 62], ['A', 57], ['F', 65], ['E', 64]];
  const pianoFinger = (r) => {
    const [key, tonic] = pick(r, PIANO_SCALES), hand = r() < 0.6 ? 'R' : 'L';
    const notes = scaleNotes(hand === 'L' ? tonic - 12 : tonic, MAJOR, 1);
    const fing = PM.Fingering.piano(notes, hand)[0].fingers;
    const k = 1 + Math.floor(r() * 6);
    return mc(r, `${key} major scale, ${hand === 'R' ? 'right' : 'left'} hand going up: which finger plays ${spell(notes[k], flatKey(tonic))} (note ${k + 1})?`, String(fing[k]), ['1', '2', '3', '4', '5'], { show: { keys: [notes[k]] }, play: { notes } });
  };
  const INV = [['Root position', [0, 4, 7]], ['1st inversion', [4, 7, 12]], ['2nd inversion', [7, 12, 16]]];
  const pianoInversion = (r) => {
    const pc = pick(r, [0, 2, 5, 7, 9]), [nm, iv] = pick(r, INV), q = r() < 0.5 ? '' : 'm';
    const ivs = q === 'm' ? iv.map((x) => (x === 4 ? 3 : x === 16 ? 15 : x)) : iv;
    const notes = ivs.map((x) => 60 + pc + x - (pc > 5 ? 12 : 0));
    return mc(r, `This is ${spell(pc)}${q === 'm' ? ' minor' : ' major'}. Which position is it in?`, nm, INV.map((x) => x[0]), { show: { keys: notes }, play: { chord: notes } });
  };
  const pianoChordKeys = (r) => {
    const pc = pick(r, [0, 2, 4, 5, 7, 9]), q = pick(r, ['', 'm']);
    const notes = (q === 'm' ? [0, 3, 7] : [0, 4, 7]).map((x) => 60 + pc + x - (pc > 6 ? 12 : 0));
    const ans = spell(pc) + (q === 'm' ? 'm' : '');
    return mc(r, 'Which chord is lit up on the keyboard?', ans, SH.slice(0).flatMap((x) => [x, x + 'm']), { show: { keys: notes }, play: { chord: notes } });
  };
  const chordShape = (r) => {
    const c = pick(r, ['C', 'G', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F', 'Bm', 'B7', 'E7']);
    return mc(r, 'Which chord is this diagram?', c, ['C', 'G', 'D', 'Em', 'Am', 'E', 'A', 'Dm', 'F', 'Bm', 'B7', 'E7', 'Cmaj7', 'A7'], { show: { diagram: c } });
  };
  const capoShape = (r) => {
    const target = pick(r, [['A', 9], ['B♭', 10], ['B', 11], ['D', 2], ['E', 4], ['E♭', 3]]);
    const shapes = [['G', 7], ['C', 0], ['D', 2], ['A', 9], ['E', 4]];
    const opts = shapes.map(([s, pc]) => ({ s, capo: mod12(target[1] - pc) })).filter((o) => o.capo <= 7 && o.capo > 0);
    const o = pick(r, opts.length ? opts : [{ s: 'G', capo: 2 }]);
    return mc(r, `To play in ${target[0]} using ${o.s}-shapes, put the capo on fret…`, String(o.capo), ['1', '2', '3', '4', '5', '6', '7']);
  };
  const bassRoot = (r) => {
    const pc = pick(r, [7, 0, 2, 9, 4, 5]), deg = pick(r, [[0, 'I'], [3, 'IV'], [4, 'V'], [5, 'vi'], [1, 'ii']]);
    const fl = flatKey(pc);
    return mc(r, `In ${spell(pc, fl)} major, what root does the bass play for the ${deg[1]} chord?`, spell(pc + MAJOR[deg[0]], fl), SH);
  };
  const bassFifth = (r) => { const pc = pick(r, [0, 2, 4, 5, 7, 9, 11]); return mc(r, `Root–5th pattern on ${spell(pc)}: which note is the 5th?`, spell(pc + 7, flatKey(pc)), SH, { play: { notes: [40 + mod12(pc - 4), 47 + mod12(pc - 4)] } }); };
  const bassApproach = (r) => { const pc = pick(r, [0, 2, 4, 5, 7, 9]); const below = r() < 0.6; return mc(r, `Walking to a ${spell(pc)} chord: the chromatic approach note a half step ${below ? 'below' : 'above'} is…`, spell(pc + (below ? -1 : 1), !below && [10, 3, 8].includes(mod12(pc + 1))), SH); };
  const lowB = (r) => { const m = pick(r, [23, 24, 25, 26, 27]); return mc(r, `On a 5-string bass, which fret of the low B string gives ${SH[m % 12]}?`, String(m - 23), ['0', '1', '2', '3', '4', '5'], { play: { notes: [m] }, show: { fret: { inst: 'bass5', string: 0, fret: m - 23 } } }); };
  const valvesFor = (r) => {
    const written = pick(r, [60, 62, 64, 65, 67, 69, 70, 71, 72, 74, 76, 77, 79, 61, 63, 66, 68]);
    const v = PM.Instruments.TRUMPET_FINGERING[written];
    return mc(r, `Which valves play written ${nameOct(written)} on B♭ trumpet?`, vLabel(v), VALVE_SETS.map(vLabel), { show: { valves: v }, play: { notes: [written - 2] } });
  };
  const PARTIALS = [[60, 'C4'], [67, 'G4'], [72, 'C5'], [76, 'E5'], [79, 'G5']];
  const VAL_SEMIS = { '0': 0, '2': 1, '1': 2, '1 2': 3, '3': 3, '2 3': 4, '1 3': 5, '1 2 3': 6 };
  const valvePartial = (r) => {
    const [base, nm] = pick(r, PARTIALS), v = pick(r, ['2', '1', '1 2', '2 3', '1 3']);
    const w = base - VAL_SEMIS[v];
    return mc(r, `Buzzing the open ${nm} partial, you press valves ${v.replace(/ /g, '-')}. Which written note sounds?`, SH[w % 12], SH, { show: { valves: v }, play: { notes: [w - 2] } });
  };
  const trumpetWritten = (r) => { const pc = pick(r, [10, 3, 5, 0, 7, 8, 2]); return mc(r, `The song is in concert ${spell(pc, flatKey(pc))}. What key does the B♭ trumpet read in?`, spell(pc + 2, flatKey(pc + 2)), SH); };
  const VOICES = [['Soprano', 'C4–A5'], ['Alto', 'F3–D5'], ['Tenor', 'C3–A4'], ['Bass', 'E2–E4'], ['Mezzo-soprano', 'A3–F5'], ['Baritone', 'A2–F4']];
  const voiceRange = (r) => { const [t, rg] = pick(r, VOICES); return mc(r, `A singer most comfortable around ${rg} is probably a…`, t, VOICES.map((x) => x[0])); };
  const SOLF = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti'];
  const solfege = (r) => { const k = Math.floor(r() * 7), up = r() < 0.5; const tonic = pick(r, [60, 62, 65, 67]); const ns = scaleNotes(tonic, MAJOR, 1); return up ? mc(r, `Which solfège syllable is degree ${k + 1} of the major scale?`, SOLF[k], SOLF, { play: { notes: ns.slice(0, k + 1) } }) : mc(r, `Listen: the tune climbs from Do. Which syllable does it stop on?`, SOLF[k], SOLF, { play: { notes: ns.slice(0, k + 1) }, ear: true }); };
  const REF = [['Perfect 4th', 'Here Comes the Bride'], ['Perfect 5th', 'Twinkle Twinkle (first leap)'], ['Major 6th', 'My Bonnie'], ['Octave', 'Somewhere Over the Rainbow'], ['Major 3rd', 'Oh When the Saints'], ['Major 2nd', 'Happy Birthday (first step up)'], ['Minor 3rd', 'Brahms’ Lullaby (opening)']];
  const intervalSong = (r) => { const [iv, song] = pick(r, REF); const st = A.INTERVALS.find((x) => x[1] === iv)[0]; return mc(r, `Singers remember intervals with songs. “${song}” starts with a…`, iv, REF.map((x) => x[0]), { play: { notes: [60, 60 + st] } }); };
  const singHarmony = (r) => { const pc = pick(r, [0, 2, 4, 5, 7]); const k = Math.floor(r() * 5); const tonic = 60; const mel = tonic + MAJOR[k]; const harm = tonic + MAJOR[(k + 2) % 7] + (k + 2 >= 7 ? 12 : 0); void pc; return mc(r, `In C major the melody sings ${spell(mel)}. A harmony a 3rd above sings…`, spell(harm), SH.filter((x) => !x.includes('♯') && !x.includes('♭')), { play: { chord: [mel, harm] } }); };

  const COUNT16 = ['1', 'e', '&', 'a'];
  const drumCount = (r) => { const beat = 1 + Math.floor(r() * 4), sub = Math.floor(r() * 4); const name = sub ? COUNT16[sub] + ' of ' + beat : String(beat); const spot = sub ? `the “${COUNT16[sub]}” after beat ${beat}` : `beat ${beat}`; return mc(r, `Counting 16ths (“1 e & a 2 e & a…”), which syllable is ${spot}?`, sub ? COUNT16[sub] : String(beat), ['1', '2', '3', '4', 'e', '&', 'a'], { extra: name }); };
  const drumPiece = (r) => { const pcs = PM.DrumCore ? PM.DrumCore.PIECES.filter((p) => p.id !== 'cowbell' && p.id !== 'hhp') : []; const p = pick(r, pcs); return mc(r, 'Which part of the kit is this? “' + p.role.split('.')[0] + '.”', p.name, pcs.map((x) => x.name)); };
  const drumGrid = (r) => { const G = PM.DrumCore.GROOVES.filter((g) => g.level <= 3); const g = pick(r, G); return mc(r, 'Look at the grid: which groove is it?', g.name, G.map((x) => x.name), { show: { drumgrid: g } }); };
  const drumNote = (r) => { const V = [['Whole note', 4, 'one hit lasting the whole 4/4 bar'], ['Half note', 2, 'two per bar'], ['Quarter note', 1, 'one per beat'], ['Eighth note', 0.5, 'two per beat'], ['Sixteenth note', 0.25, 'four per beat'], ['Eighth-note triplet', 1 / 3, 'three per beat']]; const [n, , d] = pick(r, V); return mc(r, `On the drums, ${d} is a…`, n, V.map((x) => x[0])); };
  Object.assign(A.GEN, {
    'drum-count': drumCount, 'drum-piece': drumPiece, 'drum-grid': drumGrid, 'drum-note': drumNote, 'facts-drums': facts('drums'),
    'fret-note-g': fretNote('guitar'), 'fret-find-g': fretFind('guitar'), 'string-order-g': stringOrder('guitar'), 'tab-g': tabRead('guitar'),
    'fret-note-b': fretNote('bass'), 'fret-find-b': fretFind('bass'), 'string-order-b': stringOrder('bass'), 'tab-b': tabRead('bass'),
    'piano-finger': pianoFinger, 'piano-inversion': pianoInversion, 'piano-chord-keys': pianoChordKeys,
    'chord-shape': chordShape, 'capo-shape': capoShape, 'bass-root': bassRoot, 'bass-fifth': bassFifth, 'bass-approach': bassApproach, 'low-b': lowB,
    'valves-for': valvesFor, 'valve-partial': valvePartial, 'trumpet-written': trumpetWritten,
    'voice-range': voiceRange, 'solfege': solfege, 'interval-song': intervalSong, 'sing-harmony': singHarmony,
    'facts-piano': facts('piano'), 'facts-guitar': facts('guitar'), 'facts-bass': facts('bass'), 'facts-trumpet': facts('trumpet'), 'facts-voice': facts('voice'),
  });

  // ------------------------------------------------------------------ lesson building blocks
  const p = (text) => ({ t: 'p', text });
  const list = (...items) => ({ t: 'list', items });
  const ex = (label, play, caption) => ({ t: 'ex', label, play, caption });
  const use = (text) => ({ t: 'use', text });
  const tip = (text) => ({ t: 'tip', text });
  const inst = (o) => Object.assign({ t: 'inst' }, o);
  const fing = (title, notes, o) => Object.assign({ t: 'fing', title, notes }, o || {});
  const drill = (title, notes, o) => Object.assign({ t: 'drill', title, notes }, o || {});
  const fretx = (title, o) => Object.assign({ t: 'fretx', title }, o || {});
  const keyx = (title, o) => Object.assign({ t: 'keyx', title }, o || {});
  const valvex = (title) => ({ t: 'valvex', title });
  const W = (written) => written.map((m) => m - 2); // trumpet: written → concert
  const drumx = (title, id, o) => Object.assign({ t: 'drumx', title, id }, o || {});

  const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];
  const C5F = [60, 62, 64, 65, 67, 65, 64, 62, 60];

  const SUBJECTS = [
    { id: 'piano-course', name: 'Piano course', emoji: '🎹', color: '#7c3aed', desc: 'From five-finger melodies to scales, inversions, voicings and band playing.', course: 'piano' },
    { id: 'guitar-course', name: 'Guitar course', emoji: '🎸', color: '#f97316', desc: 'Open chords and strumming to barre chords, scales, CAGED and soloing.', course: 'guitar' },
    { id: 'bass-course', name: 'Bass course', emoji: '🎸', color: '#0ea5e9', desc: 'Roots and grooves to walking lines, 5-string low B and slap.', course: 'bass' },
    { id: 'trumpet-course', name: 'Trumpet course', emoji: '🎺', color: '#eab308', desc: 'Buzzing and valves to lip slurs, alternate fingerings and lead playing.', course: 'trumpet' },
    { id: 'drums-course', name: 'Drums course', emoji: '🥁', color: '#22c55e', desc: 'Note lengths and counting to grooves, rudiments, fills, shuffles and odd meters.', course: 'drums' },
    { id: 'voice-course', name: 'Singing course', emoji: '🎤', color: '#ec4899', desc: 'Breath, pitch and range to harmony, mix voice, runs and leading worship.', course: 'voice' },
  ];

  const L = (id, subject, instrument, level, title, minutes, body, practice, tryIt) => ({ id, subject, instrument, level, title, minutes, body, practice, try: tryIt });
  const PATH = (i) => [{ label: 'Exercise path', go: 'learn', activity: 'path' }].concat(i || []);

  const LESSONS = [
    // =================================================================== PIANO
    L('pc1', 'piano-course', 'piano', 1, 'The keyboard and your finger numbers', 6, [
      p('Fingers are numbered **1 (thumb) to 5 (little finger)** in both hands. Find **C** just left of the two black keys — everything starts from there.'),
      keyx('Tap any key to hear it and see its name', { highlight: [60, 62, 64, 65, 67] }),
      fing('Right hand five-finger position on C', C5F),
      tip('Keep fingers curved and loose, as if holding a small ball. Play from the fingertips.'),
      drill('Play C-D-E-F-G and back', C5F, { bpm: 70 }),
    ], [{ gen: 'note-name', n: 4 }, { gen: 'facts-piano', n: 3 }, { gen: 'piano-finger', n: 3 }], PATH()),
    L('pc2', 'piano-course', 'piano', 1, 'Five-finger melodies', 6, [
      p('Many first tunes fit under five fingers without moving the hand. Each finger owns one key — read the finger numbers, not just the note names.'),
      fing('“Ode to Joy” — right hand', ODE),
      ex('Hear it', { notes: ODE, bpm: 120 }),
      use('Hymns and choruses often start inside a five-note range — perfect first melodies.'),
      drill('Play “Ode to Joy”', ODE, { bpm: 80 }),
    ], [{ gen: 'piano-finger', n: 4 }, { gen: 'note-name', n: 3 }, { gen: 'white-keys', n: 3 }], PATH()),
    L('pc3', 'piano-course', 'piano', 1, 'First chords: C, F and G', 7, [
      p('A **triad** is three keys, skipping one white key between each. Play C (C-E-G), F (F-A-C) and G (G-B-D) with fingers **1-3-5**.'),
      inst({ chord: 'C' }), inst({ chord: 'F' }), inst({ chord: 'G' }),
      p('Moving between them, keep common notes still: C→F keeps C; C→G keeps G. That is **voice leading** and it sounds smooth.'),
      use('C, F and G are I, IV and V in C major — enough for hundreds of songs.'),
    ], [{ gen: 'piano-chord-keys', n: 5 }, { gen: 'triad-spell', n: 3 }, { gen: 'facts-piano', n: 2 }], PATH([{ label: 'Chord dictionary', go: 'toolkit', tab: 'chords' }])),
    L('pc4', 'piano-course', 'piano', 1, 'Hands together: bass note and melody', 7, [
      p('Left hand plays the **root** of the chord (low C, F, G) while the right hand plays the tune. Start with the left hand on beat 1 only.'),
      fing('Left hand roots: C – F – G – C', [48, 53, 55, 48], { hand: 'L' }),
      fing('Right hand: a simple tune over it', [64, 65, 67, 64], { hand: 'R' }),
      tip('Practise hands separately until each is easy, then together very slowly.'),
      drill('Left hand roots C F G C', [48, 53, 55, 48], { bpm: 60, beats: 2 }),
    ], [{ gen: 'facts-piano', n: 3 }, { gen: 'note-value', n: 3 }, { gen: 'piano-finger', n: 2 }], PATH()),
    L('pc5', 'piano-course', 'piano', 2, 'Scales with the thumb under', 8, [
      p('A one-octave major scale needs a **thumb-under** (going up) or **finger-over** (going down). In C major right hand: **1-2-3, thumb under, 1-2-3-4-5**.'),
      fing('C major — right hand, up', scaleNotes(60, MAJOR, 1)),
      fing('C major — left hand, up', scaleNotes(48, MAJOR, 1), { hand: 'L' }),
      fing('F major — right hand (thumb avoids B♭)', scaleNotes(65, MAJOR, 1)),
      tip('Tap through the alternatives: the guide shows why the recommended fingering is easiest — fewer crossings, thumb on white keys.'),
      drill('C major scale, right hand', scaleNotes(60, MAJOR, 1), { bpm: 76 }),
    ], [{ gen: 'piano-finger', n: 6 }, { gen: 'scale-notes', n: 2 }, { gen: 'facts-piano', n: 2 }], PATH([{ label: 'Scale trainer', go: 'learn', activity: 'scales' }])),
    L('pc6', 'piano-course', 'piano', 2, 'Inversions and smooth chord changes', 7, [
      p('Re-order a triad’s notes to make an **inversion**: root position C-E-G, 1st inversion E-G-C, 2nd inversion G-C-E. Pick the inversion closest to the last chord.'),
      ex('C (root) → F (2nd inv) → G (1st inv) → C', { seq: [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]] }),
      keyx('Find each inversion — tap to hear', { highlight: [60, 64, 67, 72, 76] }),
      use('Worship pianists move chords by the smallest steps so the sound stays smooth under the singers.'),
    ], [{ gen: 'piano-inversion', n: 6 }, { gen: 'piano-chord-keys', n: 3 }], PATH()),
    L('pc7', 'piano-course', 'piano', 2, 'Accompaniment patterns', 7, [
      p('Turn chords into rhythm: **block chords**, **broken chords**, **Alberti bass** (low-high-middle-high) and the worship **pad** (sustained right hand, steady left hand).'),
      fing('Alberti bass on C — left hand', [48, 55, 52, 55, 48, 55, 52, 55], { hand: 'L' }),
      ex('Broken-chord arpeggio', { notes: [48, 55, 60, 64, 67, 64, 60, 55], bpm: 140 }),
      drill('Alberti bass', [48, 55, 52, 55, 48, 55, 52, 55], { bpm: 80, beats: 0.5 }),
    ], [{ gen: 'facts-piano', n: 3 }, { gen: 'diatonic-chord', n: 3 }, { gen: 'piano-chord-keys', n: 2 }], PATH([{ label: 'Play with a backing band', go: 'songs' }])),
    L('pc8', 'piano-course', 'piano', 2, 'Reading lead sheets', 6, [
      p('A **lead sheet** has the melody plus chord symbols. Right hand: melody (or chord on top); left hand: roots or broken chords on each new symbol.'),
      list('Play the chord on the beat where its symbol appears', 'Slash chords (G/B): play B in the bass', 'Simplify: triads first, add 7ths later'),
      use('Every song in the Songs library is a lead sheet — try playing one with the backing band.'),
    ], [{ gen: 'roman', n: 3 }, { gen: 'diatonic-chord', n: 3 }, { gen: 'piano-chord-keys', n: 2 }], [{ label: 'Open the Songs library', go: 'songs' }]),
    L('pc9', 'piano-course', 'piano', 3, 'Two-octave scales and arpeggios', 8, [
      p('Over two octaves the thumb tucks under twice. Arpeggios (1-2-3-1-2-3-5) stretch the hand — keep the wrist level and let the elbow guide.'),
      fing('C major, two octaves (RH)', scaleNotes(60, MAJOR, 2)),
      fing('C major arpeggio, two octaves (RH)', [60, 64, 67, 72, 76, 79, 84]),
      drill('C arpeggio', [60, 64, 67, 72, 76, 79, 84, 79, 76, 72, 67, 64, 60], { bpm: 72 }),
    ], [{ gen: 'piano-finger', n: 6 }, { gen: 'facts-piano', n: 2 }, { gen: 'scale-notes', n: 2 }], PATH()),
    L('pc10', 'piano-course', 'piano', 3, '7th chords and pro voicings', 8, [
      p('Add the 7th for colour: Cmaj7 (C-E-G-B), Dm7, G7. Pianists often play **rootless voicings** (3-5-7-9) with the bass covering the root.'),
      ex('ii–V–I in C: Dm7 – G7 – Cmaj7', { seq: [[50, 53, 57, 60], [43, 53, 59, 62], [48, 52, 55, 59]] }),
      ex('Rootless voicings', { seq: [[53, 57, 60, 64], [53, 57, 59, 64], [52, 55, 59, 62]] }),
      use('Gospel and contemporary worship use 9ths and sus chords for that warm, open sound.'),
    ], [{ gen: 'seventh-quality', n: 4 }, { gen: 'facts-piano', n: 3 }, { gen: 'function', n: 2 }], PATH([{ label: 'Chord dictionary', go: 'toolkit', tab: 'chords' }])),
    L('pc11', 'piano-course', 'piano', 3, 'Pedalling and legato phrasing', 6, [
      p('**Legato pedalling**: press the sustain pedal just *after* a new chord sounds, lift as the next one plays. Change pedal on every chord change to avoid blur.'),
      list('Shape phrases like breaths — lead up to the high point', 'Balance: melody louder than the accompaniment', 'Use less pedal in fast passages'),
      tip('Listen: if it sounds muddy, change the pedal more often.'),
    ], [{ gen: 'facts-piano', n: 5 }, { gen: 'dynamic-term', n: 3 }], PATH()),
    L('pc12', 'piano-course', 'piano', 3, 'Playing piano in a band', 7, [
      p('In a band, leave room: the bass covers the low end, guitars the mid-range. Play **higher, lighter voicings**, pads in verses and rhythm in choruses.'),
      list('Verse: sustained pads, left hand light', 'Chorus: rhythmic chords, fuller', 'Fills: short melodic answers between vocal lines'),
      use('Record yourself with the backing band in the Play-Along studio and listen back for space.'),
    ], [{ gen: 'band-role', n: 3 }, { gen: 'facts-piano', n: 3 }, { gen: 'function', n: 2 }], [{ label: 'Play-Along studio', go: 'studio' }]),

    // =================================================================== GUITAR
    L('gc1', 'guitar-course', 'guitar', 1, 'Strings, frets and first notes', 6, [
      p('Strings from thickest: **E A D G B E**. Each fret is a **half step** higher. Press just behind the fret with the fingertip.'),
      fretx('Tap the fretboard to hear each note and see its name', { pcs: [4, 9, 2, 7, 11] }),
      fing('First notes on the top strings: E F G – B C D', [64, 65, 67, 59, 60, 62]),
      drill('E F G on the high E string', [64, 65, 67, 65, 64], { bpm: 70 }),
    ], [{ gen: 'string-order-g', n: 3 }, { gen: 'fret-note-g', n: 4 }, { gen: 'facts-guitar', n: 2 }], PATH([{ label: 'Tuner', go: 'tuner' }])),
    L('gc2', 'guitar-course', 'guitar', 1, 'Open chords: Em, G, C, D', 7, [
      p('These four shapes play the most common progression in G (**G–D–Em–C**). Practise switching between two chords for one minute at a time.'),
      inst({ chord: 'Em' }), inst({ chord: 'G' }), inst({ chord: 'C' }), inst({ chord: 'D' }),
      tip('Keep a finger that stays on the same string as an "anchor" between chord changes.'),
    ], [{ gen: 'chord-shape', n: 5 }, { gen: 'facts-guitar', n: 2 }, { gen: 'diatonic-chord', n: 2 }], PATH([{ label: 'Play a worship song', go: 'songs' }])),
    L('gc3', 'guitar-course', 'guitar', 1, 'Strumming basics', 6, [
      p('Strum from the wrist, down on the beat, up on the “and”. Keep the hand moving like a pendulum even when you skip a strum.'),
      ex('Down down-up up-down-up (the “folk” pattern)', { rhythm: [1, 0.5, 0.5, 0.5, 0.5, 1], bpm: 90 }),
      list('Pattern 1: D D D D (quarters)', 'Pattern 2: D DU D DU', 'Pattern 3: D DU UDU — the most used in worship'),
      use('Use the Click patterns tab to make a loop of the strum rhythm and play along.'),
    ], [{ gen: 'facts-guitar', n: 3 }, { gen: 'note-value', n: 3 }, { gen: 'bar-count', n: 2 }], [{ label: 'Click patterns', go: 'metronome' }]),
    L('gc4', 'guitar-course', 'guitar', 1, 'Your first melody', 6, [
      p('Melodies on guitar mostly use the top three strings in open position. Follow the fingering guide — one finger per fret.'),
      fing('“Ode to Joy” in C', ODE.map((m) => m)),
      drill('Play “Ode to Joy”', ODE, { bpm: 80 }),
    ], [{ gen: 'fret-note-g', n: 4 }, { gen: 'tab-g', n: 4 }], PATH()),
    L('gc5', 'guitar-course', 'guitar', 2, 'Barre chords: F and Bm', 8, [
      p('A **barre** lays the index finger across several strings. The E-shape barre (F at fret 1) and A-shape barre (Bm at fret 2) can move anywhere.'),
      inst({ chord: 'F' }), inst({ chord: 'Bm' }),
      tip('Roll the index finger slightly onto its bony side and pull the elbow in — less squeezing, more leverage.'),
    ], [{ gen: 'chord-shape', n: 4 }, { gen: 'fret-note-g', n: 3 }, { gen: 'facts-guitar', n: 2 }], PATH()),
    L('gc6', 'guitar-course', 'guitar', 2, 'The major scale in position', 8, [
      p('Learn a scale **in position**: the hand stays still and each finger covers one fret. Compare the open-position and up-the-neck fingerings below.'),
      fing('G major — two octaves', scaleNotes(43, MAJOR, 2)),
      fretx('G major scale on the whole neck', { pcs: MAJOR.map((x) => (x + 7) % 12), root: 7 }),
      drill('G major scale', scaleNotes(55, MAJOR, 1), { bpm: 76 }),
    ], [{ gen: 'fret-find-g', n: 4 }, { gen: 'scale-notes', n: 3 }, { gen: 'tab-g', n: 2 }], PATH([{ label: 'Scale trainer', go: 'learn', activity: 'scales' }])),
    L('gc7', 'guitar-course', 'guitar', 2, 'Power chords and palm muting', 6, [
      p('A **power chord** is root + 5th (+ octave). Slide one shape around the low strings; mute with the edge of the picking hand for a chugging rock sound.'),
      ex('E5 – G5 – A5', { seq: [[40, 47, 52], [43, 50, 55], [45, 52, 57]] }),
      fing('Root notes on the low E string', [40, 43, 45, 43]),
    ], [{ gen: 'fret-find-g', n: 4 }, { gen: 'facts-guitar', n: 3 }], PATH()),
    L('gc8', 'guitar-course', 'guitar', 2, 'Fingerpicking patterns', 7, [
      p('Thumb (p) plays the bass strings, index (i), middle (m) and ring (a) play G, B and high E. **Travis picking** alternates the thumb while the fingers pinch melody notes.'),
      ex('C chord: p-i-m-a arpeggio', { notes: [48, 55, 60, 64, 60, 55], bpm: 120 }),
      list('p-i-m-i (simple)', 'p-i-p-m (Travis)', 'pinch p+a on beat 1'),
    ], [{ gen: 'facts-guitar', n: 4 }, { gen: 'chord-shape', n: 2 }], PATH()),
    L('gc9', 'guitar-course', 'guitar', 3, 'The CAGED system', 8, [
      p('The open shapes **C, A, G, E, D** link up the neck to play the same chord in five places. Learn where the root sits in each shape.'),
      fretx('Every C on the neck', { pcs: [0], root: 0 }),
      use('CAGED lets you play a chord in the register that fits the song — high and bright, or low and full.'),
    ], [{ gen: 'fret-find-g', n: 5 }, { gen: 'facts-guitar', n: 2 }, { gen: 'capo-shape', n: 2 }], PATH()),
    L('gc10', 'guitar-course', 'guitar', 3, 'Pentatonic boxes and lead lines', 8, [
      p('The **minor pentatonic** box 1 (A minor at fret 5) is the home of rock, blues and worship leads. Bends, slides and vibrato make it sing.'),
      fing('A minor pentatonic — box 1', [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69]),
      fretx('A minor pentatonic everywhere', { pcs: [9, 0, 2, 4, 7], root: 9 }),
      drill('Pentatonic up and down', [57, 60, 62, 64, 67, 69, 67, 64, 62, 60, 57], { bpm: 80 }),
    ], [{ gen: 'fret-note-g', n: 3 }, { gen: 'scale-formula', n: 2 }, { gen: 'tab-g', n: 3 }], [{ label: 'Improvise in the Studio', go: 'studio' }]),
    L('gc11', 'guitar-course', 'guitar', 3, 'Triads up the neck', 7, [
      p('Three-string triads on the top strings give bright, clean parts that sit above the band — perfect for second guitar.'),
      fing('G triads on G-B-E strings', [55, 59, 62, 59, 62, 67, 62, 67, 71]),
      use('Electric guitarists in worship bands play small triads with delay instead of big open chords.'),
    ], [{ gen: 'triad-spell', n: 4 }, { gen: 'fret-note-g', n: 3 }], PATH()),
    L('gc12', 'guitar-course', 'guitar', 3, 'Modes and melodic soloing', 8, [
      p('Modes are the major scale from different starting notes. **Dorian** (minor with a bright 6th) and **Mixolydian** (major with a ♭7) are the soloist’s favourites.'),
      fing('D Dorian', scaleNotes(50, [0, 2, 3, 5, 7, 9, 10], 1)),
      fing('G Mixolydian', scaleNotes(55, [0, 2, 4, 5, 7, 9, 10], 1)),
    ], [{ gen: 'mode-character', n: 4 }, { gen: 'fret-find-g', n: 3 }], [{ label: 'Improvise in the Studio', go: 'studio' }]),

    // =================================================================== BASS
    L('bc1', 'bass-course', 'bass', 1, 'Strings, posture and plucking (4 or 5 strings)', 6, [
      p('A 4-string bass is tuned **E A D G** (lowest first). A **5-string** adds a **low B** below the E. Choose yours on the Practice page — the fretboards follow it.'),
      fretx('Tap to hear — open strings and the first frets', { pcs: [4, 9, 2, 7, 11] }),
      tip('Alternate index and middle fingers when plucking; rest the thumb on the pickup or the string below.'),
      drill('Open strings', [28, 33, 38, 43], { bpm: 60, beats: 2 }),
    ], [{ gen: 'string-order-b', n: 3 }, { gen: 'fret-note-b', n: 3 }, { gen: 'facts-bass', n: 2 }], PATH([{ label: 'Tuner', go: 'tuner' }])),
    L('bc2', 'bass-course', 'bass', 1, 'Roots on the beat', 6, [
      p('Your first job: play the **root** of each chord exactly on beat 1 — and hold it. G–C–D–G is G, C, D roots.'),
      fing('Roots: G – C – D – G', [31, 36, 38, 31]),
      drill('Roots in time', [31, 31, 36, 36, 38, 38, 31, 31], { bpm: 80, beats: 2 }),
      use('Great bass players in worship play fewer notes with perfect timing.'),
    ], [{ gen: 'bass-root', n: 5 }, { gen: 'facts-bass', n: 3 }], PATH([{ label: 'Play a song with the band', go: 'songs' }])),
    L('bc3', 'bass-course', 'bass', 1, 'Root – fifth patterns', 6, [
      p('The **5th** is one string up and two frets up from the root — the same shape everywhere on the neck.'),
      fing('Root–5th on G, C and D', [31, 38, 36, 43, 38, 45]),
      ex('Root – 5th – octave', { notes: [40, 47, 52, 47] }),
      drill('Root–5th groove on G', [31, 38, 31, 38], { bpm: 80 }),
    ], [{ gen: 'bass-fifth', n: 5 }, { gen: 'fret-note-b', n: 3 }], PATH()),
    L('bc4', 'bass-course', 'bass', 1, 'Locking with the drummer', 6, [
      p('Listen to the **kick drum** and play your notes with it. Leave space where the kick rests.'),
      ex('Kick pattern to lock with', { rhythm: [1, 0.5, 1.5, 1], bpm: 90 }),
      use('Build the kick rhythm in the Beat maker or Click patterns and play roots with it.'),
    ], [{ gen: 'facts-bass', n: 4 }, { gen: 'note-value', n: 3 }], [{ label: 'Beat maker', go: 'metronome' }]),
    L('bc5', 'bass-course', 'bass', 2, 'The major scale with 1-2-4 fingering', 7, [
      p('Low on the neck, frets are wide: use **1-2-4 (Simandl)** fingering — fingers 1, 2 and 4 cover three frets. Higher up, one finger per fret is fine.'),
      fing('G major scale — one octave', scaleNotes(31, MAJOR, 1)),
      drill('G major scale', scaleNotes(31, MAJOR, 1), { bpm: 70 }),
    ], [{ gen: 'fret-find-b', n: 4 }, { gen: 'scale-notes', n: 2 }, { gen: 'facts-bass', n: 2 }], PATH()),
    L('bc6', 'bass-course', 'bass', 2, 'Approach notes and passing tones', 7, [
      p('Lead into the next root with a **chromatic approach** (a half step below or above) or a **scale step**. It makes chord changes feel inevitable.'),
      fing('G → C with approach notes', [31, 33, 35, 36]),
      drill('Walk G to C', [31, 33, 35, 36], { bpm: 80 }),
    ], [{ gen: 'bass-approach', n: 5 }, { gen: 'bass-root', n: 3 }], PATH()),
    L('bc7', 'bass-course', 'bass', 2, 'Octaves and driving grooves', 6, [
      p('Octaves are two strings up and two frets up. Alternating root and octave in 8ths drives disco, pop and fast worship songs.'),
      fing('Octave groove on A', [33, 45, 33, 45, 33, 45, 33, 45]),
      drill('Octave groove', [33, 45, 33, 45, 33, 45, 33, 45], { bpm: 90, beats: 0.5 }),
    ], [{ gen: 'fret-note-b', n: 4 }, { gen: 'facts-bass', n: 3 }], PATH()),
    L('bc8', 'bass-course', 'bass', 2, 'The low B string (5-string bass)', 6, [
      p('A 5-string reaches **B, C, C♯, D and D♯** below the E string — great for keys like D and E♭ where the low root sounds huge. Switch to 5-string to see these on the fretboard.'),
      fing('Low B string: B – C – D – E', [23, 24, 26, 28]),
      tip('Mute the low B with your thumb when you are not playing it — it rings easily.'),
    ], [{ gen: 'low-b', n: 5 }, { gen: 'facts-bass', n: 3 }], PATH()),
    L('bc9', 'bass-course', 'bass', 3, 'Walking bass lines', 8, [
      p('A walking line plays steady quarter notes: **root on beat 1**, chord tones or scale steps on 2 and 3, and an **approach note** on 4.'),
      fing('Walking over C – F', [36, 40, 43, 40, 41, 45, 48, 47]),
      drill('Walk it', [36, 40, 43, 40, 41, 45, 48, 47], { bpm: 90 }),
    ], [{ gen: 'bass-approach', n: 3 }, { gen: 'chord-tone', n: 3 }, { gen: 'bass-root', n: 2 }], PATH()),
    L('bc10', 'bass-course', 'bass', 3, 'Slap and ghost notes', 6, [
      p('Slap the string with the side of the thumb, pop the higher strings with the index. **Ghost notes** — muted plucks — add rhythmic glue.'),
      ex('Slap-pop rhythm', { rhythm: [0.5, 0.5, 0.25, 0.25, 0.5, 0.5, 0.5], bpm: 92 }),
    ], [{ gen: 'facts-bass', n: 5 }, { gen: 'note-value', n: 2 }], [{ label: 'Click patterns: funky 16ths', go: 'metronome' }]),
    L('bc11', 'bass-course', 'bass', 3, 'Arpeggios across the neck', 7, [
      p('Arpeggios outline the chord: root–3rd–5th–7th. Shifting positions smoothly is the key skill — watch the shift hints in the guide.'),
      fing('Cmaj7 arpeggio, two octaves', [36, 40, 43, 47, 48, 52, 55, 59, 60]),
    ], [{ gen: 'chord-tone', n: 4 }, { gen: 'fret-find-b', n: 3 }], PATH()),
    L('bc12', 'bass-course', 'bass', 3, 'Building a bass part for a worship song', 7, [
      p('Plan by section: **verse** — whole notes or sparse roots; **chorus** — 8ths with the kick; **bridge** — build with octaves; **tag** — hold long roots.'),
      list('Follow the dynamics map', 'Use passing notes only between sections', 'Lock with the kick, leave space for the vocal'),
    ], [{ gen: 'band-role', n: 3 }, { gen: 'bass-root', n: 3 }, { gen: 'facts-bass', n: 2 }], [{ label: 'Songs library', go: 'songs' }]),

    // =================================================================== TRUMPET
    L('tc1', 'trumpet-course', 'trumpet', 1, 'Buzzing and your first notes', 6, [
      p('Buzz the lips on the mouthpiece with steady, warm air. Your first notes: **C (open), D (1-3), E (1-2)** — all written pitch.'),
      fing('Written C – D – E – D – C', W([60, 62, 64, 62, 60])),
      drill('C D E', W([60, 62, 64, 62, 60]), { bpm: 66, beats: 2 }),
      tip('Breathe low and let the air do the work — do not press the mouthpiece into your lips.'),
    ], [{ gen: 'valves-for', n: 4 }, { gen: 'facts-trumpet', n: 3 }], PATH([{ label: 'Tuner', go: 'tuner' }])),
    L('tc2', 'trumpet-course', 'trumpet', 1, 'How the valves work', 7, [
      p('Valve **2** lowers a half step, **1** a whole step, **3** a minor 3rd (same as 1+2). Combine them to fill the gaps between the open notes (partials).'),
      valvex('Press the valves, choose a partial, and hear the note'),
      fing('Written C scale (C major)', W(scaleNotes(60, MAJOR, 1))),
    ], [{ gen: 'valves-for', n: 4 }, { gen: 'valve-partial', n: 4 }], PATH()),
    L('tc3', 'trumpet-course', 'trumpet', 1, 'Lip slurs and partials', 6, [
      p('With no valves, change the note by lip and air: **C → G → C → E → G** (the harmonic series). Slurs build strength and flexibility.'),
      ex('Open partials', { notes: W([60, 67, 72, 76, 79]), bpm: 70 }),
      drill('Lip slur C–G–C', W([60, 67, 72, 67, 60]), { bpm: 60, beats: 2 }),
    ], [{ gen: 'valve-partial', n: 5 }, { gen: 'facts-trumpet', n: 3 }], PATH()),
    L('tc4', 'trumpet-course', 'trumpet', 1, 'Transposition: written vs concert pitch', 6, [
      p('B♭ trumpet sounds a **whole step lower** than written. Written C = concert B♭. To read a piano part, write every note a whole step higher.'),
      list('Concert B♭ → written C', 'Concert E♭ → written F', 'Concert F → written G'),
    ], [{ gen: 'trumpet-written', n: 5 }, { gen: 'transpose', n: 3 }], PATH()),
    L('tc5', 'trumpet-course', 'trumpet', 2, 'Concert B♭ and F scales', 7, [
      p('Bands love concert B♭ and F. On trumpet these are written **C** and **G** major.'),
      fing('Concert B♭ (written C) — one octave', W(scaleNotes(60, MAJOR, 1))),
      fing('Concert F (written G)', W(scaleNotes(67, MAJOR, 1))),
      drill('Written G major', W(scaleNotes(67, MAJOR, 1)), { bpm: 72 }),
    ], [{ gen: 'valves-for', n: 5 }, { gen: 'trumpet-written', n: 3 }], PATH()),
    L('tc6', 'trumpet-course', 'trumpet', 2, 'Tonguing and articulation', 6, [
      p('Start notes with a light “**ta**” (or “**da**” for softer). Keep the air flowing between notes; only the tongue interrupts it.'),
      ex('Staccato vs legato', { notes: W([67, 67, 67, 67, 67, 69, 71, 72]), bpm: 120 }),
    ], [{ gen: 'facts-trumpet', n: 4 }, { gen: 'dynamic-term', n: 2 }], PATH()),
    L('tc7', 'trumpet-course', 'trumpet', 2, 'Alternate fingerings and tuning slides', 7, [
      p('Some notes have **alternate valves**: G (open or 1-3), A (1-2 or 3), E (open or 1-2). They help trills and fast passages. Low C♯ and D need the **3rd-valve slide** out.'),
      fing('Notes with alternates: E – G – A', W([76, 79, 81])),
      tip('Step through the guide: each note lists its alternate and why you would use it.'),
    ], [{ gen: 'valves-for', n: 4 }, { gen: 'facts-trumpet', n: 3 }], PATH()),
    L('tc8', 'trumpet-course', 'trumpet', 2, 'Building range safely', 6, [
      p('Range grows from strength and air, not pressure. Daily: long tones, lip slurs, and scales a step higher than comfortable — then rest.'),
      list('Rest as much as you play', 'Keep the corners firm, centre relaxed', 'Stop if the lips feel numb'),
    ], [{ gen: 'facts-trumpet', n: 5 }, { gen: 'practice-skill', n: 2 }], PATH()),
    L('tc9', 'trumpet-course', 'trumpet', 3, 'Double and triple tonguing', 7, [
      p('For fast notes alternate the front and back of the tongue: **Ta-Ka** (double), **Ta-Ta-Ka** (triple). Practise slowly until Ka sounds like Ta.'),
      ex('Double tonguing in 16ths', { rhythm: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25], bpm: 90 }),
    ], [{ gen: 'facts-trumpet', n: 5 }, { gen: 'note-value', n: 2 }], [{ label: 'Click patterns', go: 'metronome' }]),
    L('tc10', 'trumpet-course', 'trumpet', 3, 'Lead playing and the high register', 7, [
      p('Lead lines sit above the band. Aim the air, support from the core, and use alternate fingerings on high notes that sit better on your horn.'),
      fing('High G arpeggio', W([67, 72, 76, 79])),
    ], [{ gen: 'valve-partial', n: 4 }, { gen: 'valves-for', n: 3 }], PATH()),
    L('tc11', 'trumpet-course', 'trumpet', 3, 'Jazz phrasing and improvising', 7, [
      p('Swing the 8ths (long-short), ghost some notes, and build solos from chord tones. Start with the blues scale.'),
      fing('Written C blues scale', W([60, 63, 65, 66, 67, 70, 72])),
    ], [{ gen: 'scale-formula', n: 3 }, { gen: 'chord-tone', n: 3 }], [{ label: 'Improvise in the Studio', go: 'studio' }]),
    L('tc12', 'trumpet-course', 'trumpet', 3, 'Horn lines in a worship band', 6, [
      p('Horns answer the vocal, double a hook, or play pads in the chorus. Play less, phrase together, and watch the dynamics map.'),
      list('Transpose the chart (concert → written)', 'Play the hook in the intro and tag', 'Stay out of the way of the singer'),
    ], [{ gen: 'trumpet-written', n: 3 }, { gen: 'band-role', n: 3 }], [{ label: 'Songs library', go: 'songs' }]),

    // =================================================================== DRUMS
    L('dc1', 'drums-course', 'drums', 1, 'Meet the kit', 6, [
      p('A drum kit is a band in one: the **kick** (right foot) and **snare** make the backbone, the **hi-hat** and **ride** keep time, **toms** play fills and **crash** cymbals mark big moments.'),
      list('Kick = the heartbeat, locks with the bass guitar', 'Snare = the "crack" on 2 and 4', 'Hi-hat = steady 8ths, opened and closed with the left foot', 'Toms & crash = fills and big moments'),
      tip('Open the **Drum Studio** to play every piece with your fingers or keyboard.'),
      drumx('Backbeat (no hi-hat)', 'drums-backbeat', { pattern: { bpb: 4, spb: 1, bars: 2, tracks: { snare: '.x.x.x.x', kick: 'x.x.x.x.' } }, bpm: 76 }),
    ], [{ gen: 'drum-piece', n: 5 }, { gen: 'facts-drums', n: 3 }], [{ label: 'Drum Studio', go: 'drums' }]),
    L('dc2', 'drums-course', 'drums', 1, 'Counting and note lengths', 7, [
      p('Drummers count everything. **Quarters**: "1 2 3 4". **Eighths**: "1 & 2 &". **Sixteenths**: "1 e & a 2 e & a". Saying it out loud builds an inner clock.'),
      ex('Quarters, eighths, then sixteenths', { rhythm: [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25], bpm: 72, accents: 0 }),
      drumx('Eighth notes', 'drums-8ths', { pattern: { bpb: 4, spb: 2, bars: 2, sticking: 'RLRLRLRLRLRLRLRL', tracks: { snare: 'XxXxXxXxXxXxXxXx' } }, bpm: 72 }),
    ], [{ gen: 'drum-count', n: 5 }, { gen: 'drum-note', n: 4 }], [{ label: 'Exercise path', go: 'learn', activity: 'path' }]),
    L('dc3', 'drums-course', 'drums', 1, 'Your first rock beat', 7, [
      p('Right hand on the hi-hat (8ths), left hand on the snare (2 and 4), right foot on the kick (1 and 3). Build it limb by limb: hat alone → add kick → add snare.'),
      drumx('Rock 8ths', 'drums-rock', { pattern: { bpb: 4, spb: 2, bars: 1, tracks: { hhc: 'xxxxxxxx', snare: '..X...X.', kick: 'X...X...' } }, bpm: 84 }),
      use('This one beat fits thousands of pop, rock and worship songs.'),
    ], [{ gen: 'drum-grid', n: 4 }, { gen: 'drum-count', n: 3 }], [{ label: 'Groove library', go: 'drums' }]),
    L('dc4', 'drums-course', 'drums', 1, 'Rests and space', 6, [
      p('Silence is part of the groove. A **rest** is a beat you count but don\'t play. Keep your foot tapping through rests so the time never stops.'),
      drumx('Quarter rests', 'drums-rests', { pattern: { bpb: 4, spb: 1, bars: 2, tracks: { snare: 'x.x.xx.x' } }, bpm: 72 }),
    ], [{ gen: 'drum-note', n: 3 }, { gen: 'facts-drums', n: 3 }], []),
    L('dc5', 'drums-course', 'drums', 2, 'Rudiments: singles, doubles, paradiddles', 8, [
      p('**Rudiments** are the scales of drumming. Singles (R L R L), doubles (R R L L) and paradiddles (R L R R L R L L) build even, controlled hands.'),
      drumx('Single paradiddle', 'drums-para', { pattern: { bpb: 4, spb: 4, bars: 1, sticking: 'RLRRLRLLRLRRLRLL', tracks: { snare: 'XxxxXxxxXxxxXxxx' } }, bpm: 66 }),
    ], [{ gen: 'facts-drums', n: 4 }, { gen: 'drum-count', n: 3 }], [{ label: 'Rudiments', go: 'drums' }]),
    L('dc6', 'drums-course', 'drums', 2, 'Hi-hat openings and kick variations', 7, [
      p('Small changes make a groove sing: an **open hi-hat** on the "&" of 4 pushes into the next bar; an extra **kick** on the "&" of 3 adds bounce.'),
      drumx('Pop with a push', 'drums-push', { pattern: { bpb: 4, spb: 2, bars: 1, tracks: { hho: '.......x', hhc: 'xxxxxxx.', snare: '..X...X.', kick: 'X..xX...' } }, bpm: 92 }),
    ], [{ gen: 'drum-grid', n: 4 }, { gen: 'drum-count', n: 3 }], [{ label: 'Groove remix', go: 'drums' }]),
    L('dc7', 'drums-course', 'drums', 2, 'Your first fills', 7, [
      p('A **fill** is a short break at the end of a phrase. Start simple: snare–snare–tom–tom on beats 3 and 4, then crash + kick on the next 1.'),
      drumx('Around the toms', 'drums-fill8', { pattern: { bpb: 4, spb: 2, bars: 1, tracks: { snare: 'xx......', tomh: '..xx....', tomm: '....xx..', toml: '......xx' } }, bpm: 80 }),
      tip('The Drum Studio makes a **brand-new fill** every time you press the dice.'),
    ], [{ gen: 'facts-drums', n: 4 }, { gen: 'drum-count', n: 3 }], [{ label: 'Fill generator', go: 'drums' }]),
    L('dc8', 'drums-course', 'drums', 2, 'Dynamics in worship drumming', 6, [
      p('Serve the song: **verse** — side-stick or hi-hat, light kick; **pre-chorus** — floor-tom 8ths; **chorus** — ride or open hats, crash on 1; **bridge** — build with toms.'),
      drumx('Worship tom build', 'drums-build', { pattern: { bpb: 4, spb: 4, bars: 1, tracks: { toml: 'x.x.x.x.x.x.x.x.', tomh: '..x...x...x...x.', kick: 'X.......X.......' } }, bpm: 76 }),
    ], [{ gen: 'band-role', n: 3 }, { gen: 'facts-drums', n: 3 }], [{ label: 'Songs library', go: 'songs' }]),
    L('dc9', 'drums-course', 'drums', 3, 'Triplets, shuffle and 6/8', 8, [
      p('Triplets split the beat in **three**: "1-&-a". Leave out the middle note for a **shuffle**; group 6 eighths in two for **6/8**.'),
      drumx('Shuffle', 'drums-shuffle', { pattern: { bpb: 4, spb: 3, bars: 1, tracks: { hhc: 'x.xx.xx.xx.x', snare: '...X.....X..', kick: 'X.....X.....' } }, bpm: 92 }),
    ], [{ gen: 'drum-note', n: 3 }, { gen: 'drum-grid', n: 3 }, { gen: 'facts-drums', n: 2 }], []),
    L('dc10', 'drums-course', 'drums', 3, 'Sixteenth grooves and ghost notes', 8, [
      p('Play 16ths on the hat with both hands, or keep 8ths and add **ghost notes** — tiny snare taps — between the backbeats. That is the secret of funk and gospel feel.'),
      drumx('Funk with ghost notes', 'drums-funk', { pattern: { bpb: 4, spb: 4, bars: 1, tracks: { hhc: 'x.x.x.x.x.x.x.x.', snare: '..o.X..o.o.oX..o', kick: 'X..x..x...X.....' } }, bpm: 80 }),
    ], [{ gen: 'drum-count', n: 4 }, { gen: 'facts-drums', n: 3 }], [{ label: 'Groove library', go: 'drums' }]),
    L('dc11', 'drums-course', 'drums', 3, 'Odd meters: 5/4 and 7/8', 7, [
      p('Odd meters are groups of 2s and 3s. **5/4** = 3 + 2. **7/8** = 2 + 2 + 3. Count the groups and put the kick at the start of each.'),
      drumx('7/8 groove', 'drums-78', { pattern: { bpb: 7, spb: 1, bars: 2, tracks: { hhc: 'xxxxxxxxxxxxxx', snare: '..X.X....X.X..', kick: 'X.X.X..X.X.X..' } }, bpm: 130 }),
    ], [{ gen: 'time-sig', n: 4 }, { gen: 'drum-count', n: 3 }], []),
    L('dc12', 'drums-course', 'drums', 3, 'Create your own grooves', 6, [
      p('Take any groove and change **one thing**: move a kick, swap hats for ride, add a ghost note, open the hat. Record ideas in the loop recorder and keep the best ones.'),
      list('Use the Groove remix to get ideas', 'Record a 2-bar loop and overdub', 'Build it in the Beat maker to save it'),
    ], [{ gen: 'drum-grid', n: 3 }, { gen: 'facts-drums', n: 3 }], [{ label: 'Drum Studio', go: 'drums' }, { label: 'Beat maker', go: 'metronome' }]),

    // =================================================================== VOICE
    L('vc1', 'voice-course', 'voice', 1, 'Breath and posture', 5, [
      p('Stand tall and relaxed. Breathe **low** — belly and ribs expand, shoulders stay down. Let the breath out slowly on “sss” for 15 seconds.'),
      ex('Hum a five-note warm-up', { notes: [60, 62, 64, 65, 67, 65, 64, 62, 60] }),
      drill('Sing 5-4-3-2-1 on “ah”', [67, 65, 64, 62, 60], { bpm: 70 }),
    ], [{ gen: 'facts-voice', n: 4 }, { gen: 'solfege', n: 2 }], PATH()),
    L('vc2', 'voice-course', 'voice', 1, 'Find your range and voice type', 6, [
      p('Slide from your lowest comfortable note to your highest. That **range** tells you your voice type — soprano, alto, tenor or bass — and which keys suit you.'),
      list('Soprano ≈ C4–A5', 'Alto ≈ F3–D5', 'Tenor ≈ C3–A4', 'Bass ≈ E2–E4'),
      use('Insights shows “For your voice” — the best key for any song you load.'),
    ], [{ gen: 'voice-range', n: 5 }, { gen: 'facts-voice', n: 2 }], [{ label: 'Vocal exercise path', go: 'learn', activity: 'path' }]),
    L('vc3', 'voice-course', 'voice', 1, 'Matching pitch', 6, [
      p('Listen, hear the note in your head, then sing it. The pitch trail shows you instantly if you are above or below.'),
      ex('Listen and copy: C – E – G', { notes: [60, 64, 67], bpm: 60 }),
      drill('Match C – E – G', [60, 64, 67, 64, 60], { bpm: 60, beats: 2 }),
    ], [{ gen: 'solfege', n: 4 }, { gen: 'interval-ear', n: 3 }], [{ label: 'Tuner: sing in tune', go: 'tuner' }]),
    L('vc4', 'voice-course', 'voice', 1, 'Vowels and resonance', 5, [
      p('Open vowels (“ah”, “oh”) carry the tone. Feel the buzz in your face — **forward resonance** — instead of the throat.'),
      list('Lip trills to start', 'Hum “mm” then open to “ah”', 'Keep the jaw loose'),
    ], [{ gen: 'facts-voice', n: 5 }], PATH()),
    L('vc5', 'voice-course', 'voice', 2, 'Intervals for singers', 6, [
      p('Remember intervals with songs you know. Sing the first two notes of the song to find the interval.'),
      ex('Perfect 4th', { notes: [60, 65] }), ex('Perfect 5th', { notes: [60, 67] }), ex('Major 6th', { notes: [60, 69] }),
    ], [{ gen: 'interval-song', n: 5 }, { gen: 'interval-ear', n: 3 }], [{ label: 'Ear trainer', go: 'learn' }]),
    L('vc6', 'voice-course', 'voice', 2, 'Singing harmony', 7, [
      p('The easiest harmony is a **3rd above** the melody — two scale steps higher. Then try a 3rd below.'),
      ex('Melody with a 3rd above', { seq: [[60, 64], [62, 65], [64, 67], [65, 69], [67, 71]] }),
      use('The Harmony & parts trainer lets you sing soprano, alto, tenor or bass in famous hymns.'),
    ], [{ gen: 'sing-harmony', n: 5 }, { gen: 'facts-voice', n: 2 }], [{ label: 'Harmony & parts', go: 'harmony' }]),
    L('vc7', 'voice-course', 'voice', 2, 'Chest, head and mix', 6, [
      p('**Chest** voice is full and speech-like, **head** voice light and high. The **mix** blends them so you can sing through the break without flipping.'),
      ex('Siren up and down', { notes: [55, 60, 64, 67, 72, 67, 64, 60, 55], bpm: 150 }),
    ], [{ gen: 'facts-voice', n: 5 }], PATH()),
    L('vc8', 'voice-course', 'voice', 2, 'Diction and phrasing', 5, [
      p('Sing on the **vowel**, place consonants crisply and late. Plan breaths at the ends of phrases so you never run out mid-word.'),
      list('Mark breaths in your chart', 'Lead the phrase to its key word', 'Soft starts on verses, fuller in choruses'),
    ], [{ gen: 'facts-voice', n: 3 }, { gen: 'dynamic-term', n: 2 }], [{ label: 'Songs library', go: 'songs' }]),
    L('vc9', 'voice-course', 'voice', 3, 'Belting safely', 6, [
      p('Belt = a bright, speech-like high sound. Support with the core, keep the throat open and the sound forward. Never push through pain.'),
    ], [{ gen: 'facts-voice', n: 5 }, { gen: 'practice-skill', n: 2 }], PATH()),
    L('vc10', 'voice-course', 'voice', 3, 'Agility and runs', 7, [
      p('Runs are scale fragments sung fast. Learn them **slowly on “ah”**, note by note, then speed up with the metronome.'),
      ex('A pentatonic run', { notes: [72, 69, 67, 64, 62, 60], bpm: 160 }),
      drill('Run, slowly', [72, 69, 67, 64, 62, 60], { bpm: 70 }),
    ], [{ gen: 'solfege', n: 3 }, { gen: 'scale-formula', n: 2 }, { gen: 'facts-voice', n: 2 }], PATH()),
    L('vc11', 'voice-course', 'voice', 3, 'Leading worship with your voice', 6, [
      p('Lead with clarity: sing the melody plainly so people can follow, cue the next line, and pick keys that suit the congregation (usually lower than your solo key).'),
      use('Use “For your voice” and the capo/transposer tools to choose a key the room can sing.'),
    ], [{ gen: 'band-role', n: 2 }, { gen: 'voice-range', n: 2 }, { gen: 'facts-voice', n: 2 }], [{ label: 'Transposer', go: 'toolkit', tab: 'transpose' }]),
    L('vc12', 'voice-course', 'voice', 3, 'Performance and microphone technique', 5, [
      p('Hold the mic a fist away, closer for soft parts, further for loud high notes. Warm up, hydrate, and know the song so you can look at people, not the screen.'),
    ], [{ gen: 'facts-voice', n: 4 }, { gen: 'practice-skill', n: 2 }], [{ label: 'Record yourself', go: 'studio' }]),
  ];

  A.SUBJECTS.unshift(...SUBJECTS);
  const base = A.LESSONS.length;
  LESSONS.forEach((l, i) => { l.n = base + i + 1; A.LESSONS.push(l); });
  A.COURSES = SUBJECTS;
  A.FACTS = FACTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof self !== 'undefined' ? self : globalThis);
