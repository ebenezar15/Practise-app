/* Overture — extra Academy lessons: two more lessons per level for each instrument course
 * (piano, guitar, bass, trumpet, drums, voice), taking every course from 4 to 6 lessons per level. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const A = PM.Academy;
  if (!A) return;
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
  const drumx = (title, id, o) => Object.assign({ t: 'drumx', title, id }, o || {});
  const W = (written) => written.map((m) => m - 2); // trumpet: written → concert
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const scale = (tonic, ivs) => ivs.map((iv) => tonic + iv).concat([tonic + 12]);
  // L(id, subject, level 1|2|3, title, minutes, body[], practice[], try[], instrument?)
  const L = (id, subject, level, title, minutes, body, practice, tryIt, instrument) => Object.assign({ id, subject, level, title, minutes, body, practice, try: tryIt || [] }, instrument ? { instrument } : {});
  const PATH = (i) => [{ label: 'Exercise path', go: 'learn', activity: 'path' }].concat(i || []);

  const BLACK = [66, 68, 70, 73, 75];
  const MARY = [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67];

  const LESSONS = [
    // =================================================================== PIANO
    L('xd1', 'piano-course', 1, 'Black-key melodies', 6, [
      p('The five black keys make a **pentatonic scale** (F♯ G♯ A♯ C♯ D♯). Any order sounds good, so it is the perfect place to play freely without wrong notes.'),
      keyx('Tap the black keys — groups of 2 and 3', { highlight: BLACK }),
      fing('Right hand: F♯ G♯ A♯ C♯ D♯ and back', BLACK.concat([73, 70, 68, 66])),
      tip('Play black keys with the fingertips a little further into the key, and keep the thumb for the lower white-key edge only when needed.'),
      drill('Black-key climb', [66, 68, 70, 73, 75, 73, 70, 68, 66], { bpm: 72 }),
    ], [{ gen: 'accidental', n: 3 }, { gen: 'half-whole', n: 2 }, { gen: 'note-name', n: 2 }, { gen: 'facts-piano', n: 1 }], PATH([{ label: 'Scale trainer', go: 'learn', activity: 'scales' }]), 'piano'),
    L('xd2', 'piano-course', 1, 'Playing by ear: your first tune', 6, [
      p('To pick out a tune by ear: **find the first note**, then ask of each next note — **same, up or down? step or leap?** Most melodies move mainly by step.'),
      ex('Listen: “Mary Had a Little Lamb” (traditional)', { notes: MARY, bpm: 110 }),
      list('It starts on E and steps down to C', 'Then it climbs back and repeats E three times', 'The only leap is up to G near the end'),
      drill('Play it back by ear', MARY, { bpm: 80 }),
      use('Playing by ear lets you join in when a song is started without a chart.'),
    ], [{ gen: 'interval-ear', n: 4 }, { gen: 'half-whole', n: 2 }, { gen: 'white-keys', n: 2 }], [{ label: 'Call and response', go: 'learn', activity: 'callresp' }], 'piano'),
    L('xd3', 'piano-course', 2, 'Scales in contrary motion', 7, [
      p('In **contrary motion** both hands start on the same note and move **away** from each other. The fingering mirrors itself, so both thumbs tuck under at the same moment — easier than parallel scales!'),
      fing('C major — right hand going up', scale(60, MAJOR)),
      fing('C major — left hand going down', scale(48, MAJOR).reverse(), { hand: 'L' }),
      ex('Both hands together, outward from middle C', { seq: [[60, 60], [59, 62], [57, 64], [55, 65], [53, 67], [52, 69], [50, 71], [48, 72]] }),
      tip('Say the finger numbers aloud: “1-2-3, tuck, 1-2-3-4-5” — both hands use the same numbers.'),
      drill('Right hand C major, then go back down', scale(60, MAJOR).concat([71, 69, 67, 65, 64, 62, 60]), { bpm: 76, beats: 0.5 }),
    ], [{ gen: 'piano-finger', n: 5 }, { gen: 'scale-notes', n: 2 }, { gen: 'facts-piano', n: 1 }], PATH([{ label: 'Scale trainer', go: 'learn', activity: 'scales' }]), 'piano'),
    L('xd4', 'piano-course', 2, 'Left-hand inversions and slash chords', 7, [
      p('A **slash chord** like G/B means “G chord, B in the bass”. Using inversions in the left hand makes the bass **walk by step** instead of jumping.'),
      ex('C – G/B – Am – F/A: a bass line stepping down C B A A', { seq: [[48, 60, 64, 67], [47, 59, 62, 67], [45, 60, 64, 69], [45, 60, 65, 69]] }),
      fing('Left-hand bass line: C – B – A – G', [48, 47, 45, 43], { hand: 'L' }),
      keyx('Find G/B: B in the left hand, G-B-D in the right', { highlight: [47, 55, 59, 62] }),
      use('Hymns and ballads love the descending bass (C – G/B – Am – G); now you can see why it sounds so smooth.'),
    ], [{ gen: 'piano-inversion', n: 4 }, { gen: 'inversion', n: 3 }, { gen: 'piano-chord-keys', n: 2 }], [{ label: 'Chord dictionary', go: 'toolkit', tab: 'chords' }], 'piano'),
    L('xd5', 'piano-course', 3, 'Gospel colours: sus, IV/V and passing chords', 8, [
      p('Gospel and worship keys use a few signature moves: **sus4 → major** resolutions, the **IV/V** chord (F/G in C) instead of plain G7, and **passing diminished** chords between I and ii.'),
      ex('Csus4 → C', { seq: [[48, 60, 65, 67], [48, 60, 64, 67]] }),
      ex('F/G → C: a soft, open dominant', { seq: [[43, 57, 60, 65], [48, 55, 60, 64]] }),
      ex('C – C♯dim7 – Dm7: the passing diminished', { seq: [[48, 60, 64, 67], [49, 58, 64, 67], [50, 60, 65, 69]] }),
      tip('The passing chord lasts one beat or less — it is a bridge, not a destination.'),
    ], [{ gen: 'seventh-quality', n: 3 }, { gen: 'function', n: 2 }, { gen: 'cadence-name', n: 2 }, { gen: 'facts-piano', n: 1 }], [{ label: 'Chord dictionary', go: 'toolkit', tab: 'chords' }, { label: 'Harmony & parts', go: 'harmony' }], 'piano'),
    L('xd6', 'piano-course', 3, 'Playing chords by ear', 8, [
      p('To find chords by ear, listen to the **bass line first** — it usually plays the roots. Then decide major or minor from the mood. In a major key, most songs use **I, IV, V and vi**.'),
      ex('Guess the progression (in C)', { seq: [[48, 52, 55], [43, 50, 55, 59], [45, 52, 57, 60], [41, 53, 57, 60]] }),
      list('Bass goes up a 4th or down a 5th: probably I → IV or V → I', 'A sad-sounding chord in a major key: probably vi', 'The chord that “wants to go home”: V'),
      keyx('Test your guesses — tap roots in C major', { highlight: [48, 53, 55, 57] }),
      use('Worship teams often play songs “off the radio” — hearing I–V–vi–IV instantly saves rehearsal time.'),
    ], [{ gen: 'progression-ear', n: 4 }, { gen: 'roman', n: 2 }, { gen: 'cadence-ear', n: 2 }], [{ label: 'Chord builder', go: 'learn', activity: 'builder' }], 'piano'),

    // =================================================================== GUITAR
    L('xd7', 'guitar-course', 1, 'More open chords: Am, E, A and Dm', 7, [
      p('Add four shapes and you can play in **C, G, D, A and E**. Am and E use the same finger shape, just moved across one string — learn one, get two!'),
      inst({ chord: 'Am' }), inst({ chord: 'E' }), inst({ chord: 'A' }), inst({ chord: 'Dm' }),
      tip('Practise “one-minute changes”: switch Am ↔ E as many times as you can in a minute and try to beat your score each day.'),
      use('Am – F – C – G and A – D – E are everywhere in pop and worship songs.'),
    ], [{ gen: 'chord-shape', n: 5 }, { gen: 'triad-quality', n: 2 }, { gen: 'facts-guitar', n: 1 }], [{ label: 'Chord dictionary', go: 'toolkit', tab: 'chords' }], 'guitar'),
    L('xd8', 'guitar-course', 1, 'Hammer-ons and pull-offs', 6, [
      p('A **hammer-on** sounds a higher note by tapping a finger down firmly without picking. A **pull-off** flicks the finger off the string to sound a lower note. Pick once, play two notes!'),
      fing('High E string: open → 1 → 3 (hammer-ons)', [64, 65, 67]),
      ex('Hammer-on then pull-off', { notes: [64, 67, 64, 65, 64], bpm: 100 }),
      tip('Hammer with the fingertip from a small height, right behind the fret. For pull-offs, pull slightly downwards rather than straight up.'),
      drill('Pick, hammer, pull', [64, 67, 64, 65, 64], { bpm: 70 }),
    ], [{ gen: 'tab-g', n: 4 }, { gen: 'fret-note-g', n: 3 }, { gen: 'facts-guitar', n: 1 }], PATH(), 'guitar'),
    L('xd9', 'guitar-course', 2, 'Slides and vibrato', 7, [
      p('A **slide** keeps pressure on the string while moving to a new fret, so you hear the glide. **Vibrato** rocks the pitch slightly to make long notes sing.'),
      fing('Slide on the G string: fret 2 → 4 → 5', [57, 59, 60]),
      ex('Slide up, hold, slide down', { notes: [57, 59, 60, 59, 57], bpm: 90 }),
      list('Vibrato from the wrist, not the finger alone', 'Wider and slower for blues, narrow and fast for ballads', 'Add vibrato after the note starts, not at once'),
      drill('Slide melody on the G string', [57, 59, 60, 59, 57], { bpm: 70 }),
    ], [{ gen: 'fret-find-g', n: 4 }, { gen: 'tab-g', n: 3 }, { gen: 'facts-guitar', n: 1 }], PATH(), 'guitar'),
    L('xd10', 'guitar-course', 2, 'Using a capo creatively', 7, [
      p('A capo does two jobs: it moves easy shapes into **any key**, and it lets a second guitarist play the **same chords in a different register** — e.g. guitar 1 plays open D shapes, guitar 2 plays G shapes with capo on 7.'),
      ex('Open D chord vs. C shape with capo 2 (both sound D)', { seq: [[50, 57, 62, 66], [50, 54, 57, 62, 66]] }),
      list('Capo 2, G shapes → key of A', 'Capo 5, D shapes → key of G (bright and sparkly)', 'Capo 7, G shapes → key of D (high “mandolin” sound)'),
      tip('Clip the capo just behind the fret and re-tune after placing it — it can pull the strings sharp.'),
    ], [{ gen: 'capo-shape', n: 5 }, { gen: 'capo', n: 3 }], [{ label: 'Transposer & capo tool', go: 'toolkit', tab: 'transpose' }], 'guitar'),
    L('xd11', 'guitar-course', 3, 'Chord melody basics', 8, [
      p('In **chord melody** the melody note is the **highest note of each chord**. Play the tune on the top strings and add one or two chord tones underneath on the beats where the harmony changes.'),
      ex('Melody E-D-C with chords C – G – C under it', { seq: [[48, 55, 64], [43, 59, 62], [48, 55, 60]] }),
      fing('The melody alone on the B and high E strings', [64, 62, 60, 62, 64, 64, 64]),
      list('Find the melody note first', 'Choose a chord shape with that note on top', 'Drop extra strings — two or three notes are enough'),
      use('Solo guitar at weddings, services and quiet intros is mostly chord melody.'),
    ], [{ gen: 'triad-spell', n: 3 }, { gen: 'fret-note-g', n: 3 }, { gen: 'chord-tone', n: 2 }], PATH(), 'guitar'),
    L('xd12', 'guitar-course', 3, 'Dotted-eighth delay and ambient leads', 8, [
      p('The signature worship lead sound is a **dotted-eighth delay**: each note repeats ¾ of a beat later, so straight 8ths become a shimmering 16th-note pattern. Set the delay time to the song tempo.'),
      ex('Dotted-eighth echo rhythm', { rhythm: [0.75, 0.75, 0.5, 0.75, 0.75, 0.5], bpm: 76 }),
      fing('Simple 8th-note riff in D (B and high E strings)', [62, 66, 69, 66, 62, 66, 69, 66]),
      list('Delay time (ms) = 45000 ÷ BPM', 'Pick steady 8ths — let the delay fill the gaps', 'Use small triad shapes and open strings that ring'),
      drill('Steady 8ths for the delay', [62, 66, 69, 66, 62, 66, 69, 66], { bpm: 76, beats: 0.5 }),
    ], [{ gen: 'tab-g', n: 3 }, { gen: 'fret-find-g', n: 3 }, { gen: 'note-value', n: 2 }], [{ label: 'Play-Along studio', go: 'studio' }], 'guitar'),

    // =================================================================== BASS
    L('xd13', 'bass-course', 1, 'Muting: keeping the bass clean', 6, [
      p('Bass strings ring for a long time, so clean playing is about **stopping** notes. The fretting hand lifts slightly to end a note; the plucking hand rests on the strings you are not playing.'),
      list('Release pressure (don’t lift off) to stop a fretted note', 'Rest the plucking thumb on the string below the one you play', 'Touch an open string with a spare finger to stop it'),
      ex('Short notes with clear gaps', { rhythm: [0.5, 0.5, 1, 0.5, 0.5, 1], bpm: 90 }),
      drill('Short roots: E E A — stop each one', [28, 28, 33, 28, 28, 33], { bpm: 80 }),
    ], [{ gen: 'facts-bass', n: 3 }, { gen: 'fret-note-b', n: 3 }, { gen: 'string-order-b', n: 2 }], PATH(), 'bass'),
    L('xd14', 'bass-course', 1, 'Reading the bass clef', 7, [
      p('Bass music uses the **bass clef**. Lines from the bottom: **G B D F A** (“Good Boys Do Fine Always”); spaces: **A C E G** (“All Cows Eat Grass”). Bass sounds an octave lower than written.'),
      fing('Notes on the bass-clef lines (as played)', [31, 35, 38, 41, 45]),
      ex('The lines G B D F A', { notes: [43, 47, 50, 53, 57], bpm: 80 }),
      tip('The two dots of the bass clef sit either side of the F line — that is why it is also called the F clef.'),
    ], [{ gen: 'staff-note', n: 4 }, { gen: 'fret-note-b', n: 3 }, { gen: 'facts-bass', n: 1 }], [{ label: 'Note-names quiz', go: 'learn', activity: 'notes' }], 'bass'),
    L('xd15', 'bass-course', 2, 'Playing with a pick', 6, [
      p('A pick gives a punchy, bright attack — great for rock and driving worship. Use **alternate picking** (down-up) for 8ths, or all **downstrokes** for a heavier sound. Mute lightly with the side of the picking hand.'),
      fing('8th notes on the E string', [28, 28, 28, 28, 33, 33, 35, 35]),
      ex('Driving 8ths (heard an octave up)', { notes: [40, 40, 40, 40, 45, 45, 47, 47], bpm: 120 }),
      tip('Keep the pick movements small and close to the string — the wrist does the work.'),
      drill('Driving 8ths: E E E E A A B B', [28, 28, 28, 28, 33, 33, 35, 35], { bpm: 100, beats: 0.5 }),
    ], [{ gen: 'tab-b', n: 3 }, { gen: 'fret-find-b', n: 3 }, { gen: 'facts-bass', n: 2 }], PATH(), 'bass'),
    L('xd16', 'bass-course', 2, 'Syncopated grooves and anticipations', 7, [
      p('A **syncopated** line plays on the “&” instead of the beat. An **anticipation** arrives at the next chord’s root an 8th early — on the “&” of 4 — and ties over the bar line.'),
      ex('Root, then “& of 2” and an anticipation', { rhythm: [1, 0.5, 1, 1, 0.5], bpm: 90 }),
      fing('G – G – C (anticipated)', [31, 31, 36]),
      drill('Syncopated G to C', [31, 31, 38, 36], { bpm: 80, beats: [1.5, 1, 1, 0.5] }),
      use('Pop and funk bass lines push the change early to create forward motion.'),
    ], [{ gen: 'syncopation', n: 4 }, { gen: 'rhythm-count', n: 2 }, { gen: 'bass-root', n: 2 }], [{ label: 'Click patterns', go: 'metronome' }], 'bass'),
    L('xd17', 'bass-course', 3, 'Chord tones over ii–V–I', 8, [
      p('Jazz and gospel lean on the **ii–V–I** (Dm7 – G7 – Cmaj7 in C). Outline each chord with **1-3-5-7**, then connect them by landing on the nearest chord tone of the next chord.'),
      fing('Dm7 – G7 – Cmaj7 arpeggios', [38, 41, 45, 48, 43, 47, 50, 53, 36, 40, 43, 47]),
      ex('ii–V–I', { seq: [[38, 53, 57, 60], [43, 53, 59, 62], [36, 52, 55, 59]] }),
      tip('Notice the 7th of G7 (F) falls to the 3rd of Cmaj7 (E) — the strongest pull in the progression.'),
      drill('Arpeggiate the ii–V–I', [38, 41, 45, 48, 43, 47, 50, 53, 36, 40, 43, 47], { bpm: 80 }),
    ], [{ gen: 'chord-tone', n: 4 }, { gen: 'seventh-quality', n: 2 }, { gen: 'bass-approach', n: 2 }], PATH(), 'bass'),
    L('xd18', 'bass-course', 3, 'Bass fills and melodic motifs', 7, [
      p('A **fill** is a short melodic phrase at the end of a section, usually in the last beat or two. Use the **minor pentatonic** of the key — and always land back on the root on beat 1.'),
      fretx('G minor pentatonic for fills', { pcs: [7, 10, 0, 2, 5], root: 7 }),
      fing('Fill: G B♭ C D F G', [31, 34, 36, 38, 41, 43]),
      list('Fill once every 4 or 8 bars, not every bar', 'Keep the groove steady right up to the fill', 'Repeat a motif so it feels intentional'),
      drill('Pentatonic fill', [31, 34, 36, 38, 41, 43, 31], { bpm: 80, beats: 0.5 }),
    ], [{ gen: 'fret-find-b', n: 3 }, { gen: 'tab-b', n: 3 }, { gen: 'scale-formula', n: 2 }], [{ label: 'Play a song with the band', go: 'songs' }], 'bass'),

    // =================================================================== TRUMPET
    L('xd19', 'trumpet-course', 1, 'Breathing and long tones', 6, [
      p('A good tone starts with breath: breathe **low and relaxed**, then blow a steady, warm stream. **Long tones** — holding one note for 4–8 counts — are the trumpeter’s daily bread.'),
      list('Breathe in for 4, blow on “hoo” for 8', 'Keep the sound the same from start to end', 'Rest as long as you played'),
      ex('Long tones: written G – F♯ – G', { notes: W([67, 66, 67]), bpm: 40 }),
      drill('Hold written G for 4 beats, twice', W([67, 67]), { bpm: 60, beats: 4 }),
      tip('Watch the pitch trail: a straight line means steady air.'),
    ], [{ gen: 'facts-trumpet', n: 4 }, { gen: 'valves-for', n: 2 }, { gen: 'note-value', n: 2 }], PATH(), 'trumpet'),
    L('xd20', 'trumpet-course', 1, 'Five notes: C to G', 6, [
      p('Add **F (valve 1)** and **G (open)** to C, D and E and you have five notes — enough for many first tunes. G uses the same open valves as C, but faster air and firmer lips.'),
      valvex('Try written C, D, E, F and G'),
      fing('Written C – D – E – F – G', W([60, 62, 64, 65, 67])),
      drill('Up and down the five notes', W([60, 62, 64, 65, 67, 65, 64, 62, 60]), { bpm: 66 }),
    ], [{ gen: 'valves-for', n: 5 }, { gen: 'valve-partial', n: 2 }, { gen: 'facts-trumpet', n: 1 }], PATH(), 'trumpet'),
    L('xd21', 'trumpet-course', 2, 'Articulation patterns', 7, [
      p('Mixing slurs and tongued notes gives music its shape. Practise each scale with patterns: **all tongued**, **all slurred**, **slur two – tongue two**, and **tongue one – slur three**.'),
      ex('Slur two, tongue two', { notes: W([67, 69, 71, 72, 74, 72, 71, 69]), bpm: 100 }),
      list('Keep the air moving through slurs', 'Accents (>) = stronger tongue, not more pressure', 'Staccato = short notes, still full air'),
      drill('Written G major, top half', W([67, 69, 71, 72, 74, 72, 71, 69, 67]), { bpm: 80, beats: 0.5 }),
    ], [{ gen: 'facts-trumpet', n: 3 }, { gen: 'dynamic-term', n: 2 }, { gen: 'valves-for', n: 3 }], [{ label: 'Click patterns', go: 'metronome' }], 'trumpet'),
    L('xd22', 'trumpet-course', 2, 'Flat keys: concert E♭ and A♭', 7, [
      p('Church and concert bands often play in **concert E♭ and A♭**. On B♭ trumpet these are written **F major** (one flat, B♭) and **B♭ major** (two flats, B♭ and E♭).'),
      fing('Concert E♭ (written F) — one octave', W(scale(65, MAJOR))),
      fing('Concert A♭ (written B♭)', W(scale(58, MAJOR))),
      tip('Written B♭ is valve 1, E♭ is valves 2-3 — learn them first and the flat keys open up.'),
      drill('Written F major', W(scale(65, MAJOR)), { bpm: 72 }),
    ], [{ gen: 'trumpet-written', n: 4 }, { gen: 'valves-for', n: 3 }, { gen: 'key-sig', n: 1 }], PATH(), 'trumpet'),
    L('xd23', 'trumpet-course', 3, 'Advanced flexibility: lip slurs on every valve', 8, [
      p('Take the open slur (C–G–C–E–G) through all seven valve combinations: **open, 2, 1, 1-2, 2-3, 1-3, 1-2-3**. Each step is a half step lower; the lips do the same job each time.'),
      ex('Open: C – G – C – E', { notes: W([60, 67, 72, 76]), bpm: 80 }),
      ex('Valve 2: B – F♯ – B – D♯', { notes: W([59, 66, 71, 75]), bpm: 80 }),
      valvex('Pick a valve combination and step through the partials'),
      tip('Slur up with faster air and a slightly smaller aperture — not by pressing harder.'),
    ], [{ gen: 'valve-partial', n: 5 }, { gen: 'facts-trumpet', n: 2 }], PATH(), 'trumpet'),
    L('xd24', 'trumpet-course', 3, 'Reading concert chord charts on the fly', 7, [
      p('Rhythm-section charts are in **concert pitch**. Read every chord a **whole step higher**: concert B♭ → think C; concert E♭ → think F. Then play chord tones and fills from the written chord.'),
      list('Concert G → written A', 'Concert D → written E', 'Concert F7 → written G7 (G Mixolydian)'),
      fing('Over concert F7, written G7 arpeggio', W([67, 71, 74, 77])),
      use('Playing fills from a chord chart lets you join a worship set without a written horn part.'),
    ], [{ gen: 'trumpet-written', n: 3 }, { gen: 'transpose', n: 3 }, { gen: 'scale-over-chord', n: 2 }], [{ label: 'Transposer', go: 'toolkit', tab: 'transpose' }], 'trumpet'),

    // =================================================================== DRUMS
    L('xd25', 'drums-course', 1, 'Four on the floor', 6, [
      p('In a **four-on-the-floor** beat the kick plays **every beat**. Add the snare on 2 and 4 and 8ths on the hi-hat — it is the engine of dance, disco and upbeat worship.'),
      drumx('Four on the floor', 'xd-four-1', { pattern: { bpb: 4, spb: 2, bars: 1, tracks: { hhc: 'xxxxxxxx', snare: '..X...X.', kick: 'X.x.X.x.' } }, bpm: 100 }),
      list('Start with kick alone — four even beats', 'Add the snare on 2 and 4', 'Add the hi-hat 8ths last'),
      tip('Keep the heel up and let the beater bounce back off the head so the kick stays light and even.'),
    ], [{ gen: 'drum-grid', n: 3 }, { gen: 'drum-piece', n: 3 }, { gen: 'drum-count', n: 2 }], [{ label: 'Groove library', go: 'drums' }], 'drums'),
    L('xd26', 'drums-course', 1, 'Grip, rebound and accents', 7, [
      p('Hold the stick about a third of the way up, between thumb and index (the **fulcrum**), other fingers wrapped loosely. Let the stick **rebound** — the drum does half the work.'),
      list('**Full stroke**: high → high (rebounds)', '**Down stroke**: high → low (stop it near the head)', '**Tap**: low → low', '**Up stroke**: low → high'),
      drumx('Accent on every beat', 'xd-accent-1', { pattern: { bpb: 4, spb: 2, bars: 2, sticking: 'RLRLRLRLRLRLRLRL', tracks: { snare: 'XxXxXxXxXxXxXxXx' } }, bpm: 70 }),
      tip('Accents are louder because the stick starts higher, not because you squeeze harder.'),
    ], [{ gen: 'facts-drums', n: 3 }, { gen: 'drum-count', n: 2 }, { gen: 'drum-note', n: 2 }], [{ label: 'Rudiments', go: 'drums' }], 'drums'),
    L('xd27', 'drums-course', 2, 'Ride cymbal and crash grooves', 7, [
      p('For bigger sections, move the right hand from the hi-hat to the **ride cymbal** and mark each new section with a **crash + kick** on beat 1. The groove stays the same; only the colour changes.'),
      drumx('Ride groove with a crash on 1', 'xd-ride-1', { pattern: { bpb: 4, spb: 2, bars: 2, tracks: { crash: 'X...............', ride: '.xxxxxxxxxxxxxxx', snare: '..X...X...X...X.', kick: 'X...X...X..xX...' } }, bpm: 90 }),
      list('Play the ride on its “bow” for clean pings', 'Hit the bell for a cutting chorus sound', 'Crash and kick land together'),
    ], [{ gen: 'drum-piece', n: 3 }, { gen: 'drum-grid', n: 3 }, { gen: 'facts-drums', n: 2 }], [{ label: 'Drum Studio', go: 'drums' }], 'drums'),
    L('xd28', 'drums-course', 2, 'Half-time feel', 6, [
      p('In **half-time** the snare moves to **beat 3** only, so the groove feels twice as slow while the tempo stays the same. It is perfect for bridges and big, spacious choruses.'),
      drumx('Half-time groove', 'xd-half-1', { pattern: { bpb: 4, spb: 2, bars: 2, tracks: { hhc: 'xxxxxxxxxxxxxxxx', snare: '....X.......X...', kick: 'X......xX.....x.' } }, bpm: 80 }),
      tip('Count “1 & 2 & **3** & 4 &” out loud — the snare on 3 is your landmark.'),
      use('Switching from a normal beat to half-time is a classic way to make a bridge feel huge without speeding up.'),
    ], [{ gen: 'facts-drums', n: 3 }, { gen: 'drum-count', n: 3 }, { gen: 'drum-grid', n: 2 }], [{ label: 'Groove library', go: 'drums' }], 'drums'),
    L('xd29', 'drums-course', 3, 'Brushes, side-stick and soft playing', 7, [
      p('Playing softly is harder than playing loudly. Use **side-stick** (rim click) instead of the snare, play the hats with the tips of the sticks, or switch to **brushes** — swish on 1 and 3, tap on 2 and 4.'),
      drumx('Side-stick ballad', 'xd-soft-1', { pattern: { bpb: 4, spb: 2, bars: 2, tracks: { hhc: 'x.x.x.x.x.x.x.x.', rim: '..x...x...x...x.', kick: 'x.....x.x.......' } }, bpm: 68 }),
      list('Lower stick heights = softer, even sound', 'Keep the kick feathered, not pounded', 'Time still matters most at low volume'),
      use('Quiet verses, acoustic sets and prayer times all need a drummer who can whisper.'),
    ], [{ gen: 'facts-drums', n: 3 }, { gen: 'dynamic-term', n: 2 }, { gen: 'drum-piece', n: 2 }], [{ label: 'Drum Studio', go: 'drums' }], 'drums'),
    L('xd30', 'drums-course', 3, 'Sixteenth-note fills', 8, [
      p('Fill a whole bar of **16ths** around the kit — snare, high tom, mid tom, floor tom — and land with **crash + kick on 1**. Keep every note even and the tempo locked.'),
      drumx('Groove bar, then a 16th-note fill', 'xd-fill-1', { pattern: { bpb: 4, spb: 4, bars: 2, sticking: '................RLRLRLRLRLRLRLRL', tracks: { hhc: 'x.x.x.x.x.x.x.x.................', snare: '....X.......X...XxxX............', tomh: '....................XxxX........', tomm: '........................XxxX....', toml: '............................XxxX', kick: 'X.....x.X.......................' } }, bpm: 76 }),
      tip('Practise the fill alone, then 3 bars of groove + 1 bar of fill — and always come back on beat 1.'),
      use('Shorter versions (just beat 4) work for small transitions; save the full-bar fill for big section changes.'),
    ], [{ gen: 'drum-count', n: 4 }, { gen: 'drum-note', n: 2 }, { gen: 'facts-drums', n: 2 }], [{ label: 'Fill generator', go: 'drums' }], 'drums'),

    // =================================================================== VOICE
    L('xd31', 'voice-course', 1, 'Warming up your voice', 5, [
      p('A good warm-up takes five minutes: **lip trills**, **humming**, gentle **sirens** and a few easy scales. It wakes up the breath and the muscles before you sing full songs.'),
      list('Lip trill (“brrr”) on a slide up and down', 'Hum “mm” on five notes', 'Sigh from high to low on “oo”', 'Finish with an easy song phrase'),
      ex('Five-note hum: C D E F G F E D C', { notes: [60, 62, 64, 65, 67, 65, 64, 62, 60], bpm: 90 }),
      drill('Hum the five-note scale', [60, 62, 64, 65, 67, 65, 64, 62, 60], { bpm: 70 }),
      tip('Start in the middle of your range and move higher and lower only as it feels easy.'),
    ], [{ gen: 'facts-voice', n: 3 }, { gen: 'solfege', n: 3 }], PATH(), 'voice'),
    L('xd32', 'voice-course', 1, 'Do–Re–Mi: singing with solfège', 6, [
      p('**Solfège** gives every scale step a name: **Do Re Mi Fa So La Ti Do**. Do is home. Singing the names trains your ear to know where each note sits in the key.'),
      ex('The major scale in solfège', { notes: [60, 62, 64, 65, 67, 69, 71, 72], bpm: 90 }),
      list('Do – Mi – So = the major chord', 'Ti leans up to Do', 'Fa leans down to Mi'),
      drill('Sing Do – Mi – So – Mi – Do', [60, 64, 67, 64, 60], { bpm: 66, beats: 2 }),
    ], [{ gen: 'solfege', n: 5 }, { gen: 'scale-notes', n: 2 }], [{ label: 'Vocal exercise path', go: 'learn', activity: 'path' }], 'voice'),
    L('xd33', 'voice-course', 2, 'Breath support for long phrases', 7, [
      p('**Support** means controlling how quickly the breath leaves. Keep the ribs gently expanded while you sing, so the air comes out slow and steady — like a slow leak, not a burst.'),
      list('Breathe low, then hiss “sss” for 20 counts', 'Keep the ribs open as you hiss', 'Now sing one note for 8 counts at the same steadiness'),
      ex('Sustain: G for 8 beats', { notes: [67], bpm: 60 }),
      drill('Hold G, then F, for 4 beats each', [67, 65], { bpm: 60, beats: 4 }),
      tip('Plan breaths at punctuation in the words — never break a word to breathe.'),
    ], [{ gen: 'facts-voice', n: 4 }, { gen: 'note-value', n: 2 }, { gen: 'dynamic-term', n: 1 }], PATH(), 'voice'),
    L('xd34', 'voice-course', 2, 'Sight-singing simple melodies', 7, [
      p('To sing a melody from the page: find **Do**, then read **steps** (next note) and **leaps** (skips). Think the next note before you sing it, and tap the beat.'),
      ex('Steps and a leap: Do Re Mi So Mi Re Do', { notes: [60, 62, 64, 67, 64, 62, 60], bpm: 80 }),
      list('Steps: neighbouring lines and spaces', 'Leaps of a 3rd: line to line or space to space', 'Bigger leaps: use a song to remember the interval'),
      drill('Sing the melody', [60, 62, 64, 67, 64, 62, 60], { bpm: 72 }),
    ], [{ gen: 'solfege', n: 3 }, { gen: 'interval-ear', n: 3 }, { gen: 'interval-song', n: 2 }], [{ label: 'Sight-reading', go: 'learn', activity: 'sight' }], 'voice'),
    L('xd35', 'voice-course', 3, 'Vibrato, straight tone and onsets', 7, [
      p('Style comes from small choices: a **straight tone** (no vibrato) blends in choirs and harmonies; a **relaxed vibrato** adds warmth on long notes. How you start a note — the **onset** — matters too.'),
      list('**Balanced onset**: air and sound start together (the default)', '**Breathy onset**: an “h” before the vowel, soft and intimate', '**Glottal onset**: a hard start — use sparingly for emphasis'),
      ex('Straight tone into a late vibrato', { notes: [67, 67], bpm: 50 }),
      drill('Hold E: straight first, then let it relax', [64, 64], { bpm: 60, beats: 4 }),
      tip('Never force vibrato — it appears naturally when the breath is supported and the throat is free.'),
    ], [{ gen: 'facts-voice', n: 3 }, { gen: 'practice-skill', n: 2 }, { gen: 'dynamic-term', n: 2 }], PATH(), 'voice'),
    L('xd36', 'voice-course', 3, 'Three-part harmony and blend', 8, [
      p('With three singers, each takes one note of the **triad**: melody, a 3rd above or below, and a 5th or 6th. **Blend** by matching vowels and volume, and letting the melody sit slightly on top.'),
      ex('Three parts moving together', { seq: [[60, 64, 67], [62, 65, 69], [64, 67, 72], [60, 64, 67]] }),
      list('Low part: often the 3rd below the melody', 'High part: the 3rd above, or the next chord tone up', 'Match the lead’s vowel and vibrato'),
      drill('Sing the top line', [67, 69, 72, 67], { bpm: 60, beats: 2 }),
      use('The Harmony & parts trainer lets you practise one part while the others play.'),
    ], [{ gen: 'sing-harmony', n: 4 }, { gen: 'triad-spell', n: 3 }, { gen: 'facts-voice', n: 1 }], [{ label: 'Harmony & parts', go: 'harmony' }], 'voice'),
  ];
  const base = A.LESSONS.length;
  LESSONS.forEach((l, i) => { l.n = base + i + 1; A.LESSONS.push(l); });
})(typeof self !== 'undefined' ? self : globalThis);
