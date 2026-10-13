/* Overture — extra Academy lessons: intervals, chords & harmony, ear training, and melody & songwriting. */
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
  // L(id, subject, level 1|2|3, title, minutes, body[], practice[], try[], instrument?)
  const L = (id, subject, level, title, minutes, body, practice, tryIt, instrument) => Object.assign({ id, subject, level, title, minutes, body, practice, try: tryIt || [] }, instrument ? { instrument } : {});
  const LESSONS = [
    // ===== Intervals — level 1
    L('xb1', 'intervals', 1, 'Counting intervals by letter names', 6, [
      p('To name an interval, count the **letter names** from the bottom note to the top note, **including both**. C up to E is C–D–E = 3 letters, so it is a **3rd**. C up to A is C–D–E–F–G–A = a **6th**.'),
      list('Sharps and flats don\'t change the number: C to E♭ and C to E are both 3rds.', 'On the staff, **line to line** or **space to space** is always an odd interval (3rd, 5th, 7th).', '**Line to space** or space to line is an even interval (2nd, 4th, 6th).'),
      ex('C–E (3rd), then C–A (6th)', { seq: [[60, 64], [60, 69]] }),
      tip('Count on your fingers: thumb is the bottom note, then one finger per letter until you reach the top note.'),
    ], [{ gen: 'interval-name', n: 5 }, { gen: 'staff-note', n: 3 }], [{ label: 'Interval ear training', go: 'learn', activity: 'intervals' }]),
    L('xb2', 'intervals', 1, 'Unisons and octaves', 5, [
      p('A **unison** is two voices on exactly the same note. An **octave** is the same letter name 8 letters (12 half steps) higher — it sounds so similar that we give it the same name.'),
      p('Physically, going up an octave **doubles** the frequency: A = 220 Hz, the next A up = 440 Hz. That is why men and women singing "the same" tune are usually an octave apart.'),
      ex('Unison, then an octave (C4–C5)', { seq: [[60, 60], [60, 72]] }),
      ex('C in three octaves', { notes: [48, 60, 72] }),
      use('Bass players double the keyboard\'s left hand an octave lower; a choir singing "in unison" is often really in octaves.'),
    ], [{ gen: 'interval-semis', n: 3 }, { gen: 'interval-ear', n: 4 }, { gen: 'note-name', n: 2 }]),
    L('xb3', 'intervals', 1, 'Melodic and harmonic intervals', 5, [
      p('A **melodic** interval plays its two notes **one after the other** — that\'s how tunes move. A **harmonic** interval plays them **at the same time** — that\'s the start of harmony and chords.'),
      ex('Perfect 5th, melodic then harmonic', { notes: [60, 67] }),
      ex('…and together', { chord: [60, 67] }),
      ex('Major 3rd, melodic then harmonic', { seq: [[60], [64], [60, 64]] }),
      use('When you sing a harmony line, you are making harmonic intervals with the melody; when you learn the tune itself, you are learning melodic intervals.'),
    ], [{ gen: 'interval-ear', n: 5 }, { gen: 'interval-name', n: 3 }], [{ label: 'Harmony & parts', go: 'harmony' }]),

    // ===== Intervals — level 2
    L('xb4', 'intervals', 2, 'How melodies use intervals', 7, [
      p('Most good melodies move mainly by **step** (2nds), with occasional **skips** (3rds) and a few big **leaps** (4ths and wider) for emphasis.'),
      list('**Gap-fill**: after a big leap, a melody usually steps back the other way to "fill the gap".', 'Leaps **up** sound bold and hopeful; steps **down** sound calm and settled.', 'Repeated notes keep words clear and speech-like.'),
      ex('Leap up a 6th, then step back down', { notes: [60, 69, 67, 65, 64, 62, 60] }),
      ex('Mostly steps — easy to sing', { notes: [60, 62, 64, 65, 64, 62, 64, 60] }),
      use('Hymn tunes are written mostly in steps so a whole congregation can follow them at first hearing.'),
    ], [{ gen: 'interval-ear', n: 5 }, { gen: 'interval-song', n: 3 }], [{ label: 'Interval ear training', go: 'learn', activity: 'intervals' }]),
    L('xb5', 'intervals', 2, 'The tritone and how it resolves', 7, [
      p('The **tritone** is 6 half steps — three whole tones — and splits the octave exactly in half. Spelled as a 4th it is an **augmented 4th** (F–B); spelled as a 5th it is a **diminished 5th** (B–F).'),
      p('Its restless sound is the engine of the **dominant 7th**: G7 contains B and F. They resolve **inward** by half step — B up to C, F down to E — landing on a C chord.'),
      ex('Tritone B–F resolving to C–E', { seq: [[59, 65], [60, 64]] }),
      ex('G7 → C (the tritone inside)', { seq: [[43, 59, 62, 65], [48, 60, 64, 67]] }),
      use('Feel the tension in any V7 → I: the tritone is what makes the dominant want to go home.'),
    ], [{ gen: 'interval-semis', n: 3 }, { gen: 'interval-name', n: 3 }, { gen: 'seventh-quality', n: 2 }]),

    // ===== Intervals — level 3
    L('xb6', 'intervals', 3, 'Compound intervals: 9ths, 11ths and 13ths', 7, [
      p('Intervals bigger than an octave are **compound**. Subtract **7** from the number to find the simple interval underneath: a 9th = 2nd + octave, an 11th = 4th + octave, a 13th = 6th + octave.'),
      list('Major 9th = 14 half steps (C–D an octave higher)', 'Perfect 11th = 17 half steps (C–F)', 'Major 13th = 21 half steps (C–A)'),
      ex('Major 2nd, then major 9th', { seq: [[60, 62], [60, 74]] }),
      ex('11th and 13th above C3', { seq: [[48, 65], [48, 69]] }),
      use('Chord names like C9, F11 and G13 are built from these compound intervals above the root.'),
    ], [{ gen: 'interval-semis', n: 4 }, { gen: 'interval-name', n: 2 }, { gen: 'chord-tone', n: 2 }]),
    L('xb7', 'intervals', 3, 'Augmented, diminished and enharmonic intervals', 7, [
      p('Make a major or perfect interval a half step **larger** and it becomes **augmented**; make a minor or perfect interval a half step **smaller** and it becomes **diminished**.'),
      p('Two intervals can sound the same but be spelled differently — they are **enharmonic**. C–G♯ (augmented 5th) and C–A♭ (minor 6th) are both 8 half steps, but G♯ wants to rise to A while A♭ wants to fall to G.'),
      ex('C–G♯ in C augmented, rising to F (G♯ → A)', { seq: [[60, 64, 68], [60, 65, 69]] }),
      ex('C–A♭ falling to C–G', { seq: [[60, 68], [60, 67]] }),
      use('Correct spelling tells readers where a note is heading — essential when writing parts for horns or choirs.'),
    ], [{ gen: 'interval-name', n: 4 }, { gen: 'interval-semis', n: 2 }, { gen: 'accidental', n: 2 }]),
    L('xb8', 'intervals', 3, 'Suspensions: dissonance that resolves', 7, [
      p('A **suspension** holds a note from the previous chord so it clashes with the new one, then steps down to a chord tone. Musicians name them by the intervals above the bass: **4–3**, **9–8** and **7–6**.'),
      list('**4–3**: the 4th falls to the 3rd (Csus4 → C)', '**9–8**: the 9th falls to the octave', '**Perfect consonances** (unison, 5th, octave) sound hollow; **imperfect** (3rds, 6ths) sound warm — suspensions usually resolve to the warm ones.'),
      ex('4–3 suspension', { seq: [[48, 60, 65, 67], [48, 60, 64, 67]] }),
      ex('9–8 suspension', { seq: [[48, 55, 64, 74], [48, 55, 64, 72]] }),
      use('The sus4 → major "lift" at the end of a worship line is a 4–3 suspension.'),
    ], [{ gen: 'interval-invert', n: 3 }, { gen: 'interval-ear', n: 3 }, { gen: 'interval-name', n: 2 }]),

    // ===== Chords — level 1
    L('xb9', 'chords', 1, 'Power chords', 5, [
      p('A **power chord** is just the **root and 5th** (often with the root doubled an octave up). It has **no 3rd**, so it is neither major nor minor — it sounds strong and neutral.'),
      p('It is written with a **5**: E5 = E + B, A5 = A + E, G5 = G + D.'),
      ex('E5 – G5 – A5', { seq: [[40, 47, 52], [43, 50, 55], [45, 52, 57]] }),
      inst({ chord: 'E5' }),
      use('Rock guitarists use power chords under distortion because full triads with a 3rd can sound muddy.'),
    ], [{ gen: 'interval-semis', n: 3 }, { gen: 'chord-tone', n: 3 }]),
    L('xb10', 'chords', 1, 'Reading chord symbols', 6, [
      p('A **chord symbol** tells you the root and the type. The letter is the **root**; anything after it changes the chord.'),
      list('**C** = C major', '**Cm** = C minor', '**C7** = C major + a minor 7th (dominant)', '**Cmaj7** = C major + a major 7th', '**Csus4** = 4th replaces the 3rd', '**C/E** = C chord with E in the bass'),
      ex('C, Cm, C7, Cmaj7, Csus4, C/E', { seq: [[48, 60, 64, 67], [48, 60, 63, 67], [48, 58, 64, 67], [48, 59, 64, 67], [48, 60, 65, 67], [52, 60, 67, 72]] }),
      inst({ chord: 'Cmaj7' }),
      tip('Read left to right: root first, then quality (m), then any number, then the bass note after the slash.'),
    ], [{ gen: 'triad-spell', n: 4 }, { gen: 'chord-tone', n: 4 }], [{ label: 'Chord library', go: 'toolkit', tab: 'chords' }]),
    L('xb11', 'chords', 1, 'The three primary chords: I, IV and V', 6, [
      p('In every major key, three major chords do most of the work: **I** (home), **IV** (moving away) and **V** (tension). Together they contain every note of the scale.'),
      list('Key of **G**: G – C – D', 'Key of **C**: C – F – G', 'Key of **D**: D – G – A'),
      ex('G – C – D – G', { seq: [[43, 55, 59, 62], [48, 55, 60, 64], [50, 57, 62, 66], [43, 55, 59, 62]] }),
      inst({ chord: 'G' }), inst({ chord: 'D' }),
      use('Many hymns, folk songs and 12-bar blues use only these three chords.'),
    ], [{ gen: 'diatonic-chord', n: 4 }, { gen: 'nashville', n: 3 }], [{ label: 'Progression builder', go: 'learn', activity: 'builder' }]),

    // ===== Chords — level 2
    L('xb12', 'chords', 2, 'Slash chords and pedal points', 7, [
      p('A **slash chord** names a chord and a bass note: **F/G** means an F chord over a G bass. When the bass is a chord tone it is an inversion (C/E); when it isn\'t, you get a new, richer colour.'),
      p('A **pedal point** keeps the same bass note while the chords above change — it builds calm or suspense.'),
      ex('F/G → C (a soft dominant)', { seq: [[43, 57, 60, 65], [48, 55, 60, 64]] }),
      ex('C pedal: C – F/C – G/C – C', { seq: [[36, 60, 64, 67], [36, 60, 65, 69], [36, 59, 62, 67], [36, 60, 64, 67]] }),
      use('Worship intros often hold the tonic in the bass while the keys move between I, IV and V above it.'),
    ], [{ gen: 'inversion', n: 4 }, { gen: 'chord-tone', n: 3 }]),

    // ===== Chords — level 3
    L('xb13', 'chords', 3, 'Extended chords: 6, 9, 11 and 13', 8, [
      p('Keep stacking 3rds past the 7th and you reach the **extensions**: **9** (= 2nd), **11** (= 4th) and **13** (= 6th). A **6** chord adds the 6th without the 7th; **6/9** adds both 6th and 9th.'),
      list('**C9** = C E G B♭ D', '**Cmaj9** = C E G B D', '**C6/9** = C E G A D (no 7th — open and bright)', '**G13** = G B F E (root, 3rd, 7th, 13th)', 'A natural 11 clashes with a major 3rd, so use it on **minor** chords (Dm11) or **sus** chords.'),
      ex('C9, Cmaj9, C6/9', { seq: [[48, 52, 58, 62], [48, 52, 59, 62], [48, 52, 57, 62, 67]] }),
      ex('Dm11 – G13 – Cmaj9', { seq: [[50, 60, 65, 67], [43, 53, 59, 64], [48, 52, 59, 62]] }),
      tip('You can drop the 5th (and even the root if the bass plays it) — the 3rd and 7th define the chord.'),
    ], [{ gen: 'seventh-quality', n: 3 }, { gen: 'chord-tone', n: 3 }, { gen: 'scale-over-chord', n: 2 }]),
    L('xb14', 'chords', 3, 'Diminished 7th and augmented passing chords', 7, [
      p('The **diminished 7th** (stacked minor 3rds: C♯ E G B♭) is perfectly symmetrical, so it can slip between almost any two chords. A common move: **I – ♯I°7 – ii** (C – C♯°7 – Dm).'),
      p('The **augmented** triad works as a passing chord too: **V – V+ – I** pushes the 5th of V up a half step towards the 3rd of I (G – G+ – C: D → D♯ → E).'),
      ex('C – C♯°7 – Dm7 – G7', { seq: [[48, 55, 60, 64], [49, 55, 58, 64], [50, 57, 60, 65], [43, 59, 62, 65]] }),
      ex('G – G+ – C', { seq: [[43, 59, 62, 67], [43, 59, 63, 67], [48, 60, 64, 67]] }),
      use('Hymn and gospel players use these chromatic passing chords to connect diatonic chords smoothly.'),
    ], [{ gen: 'triad-quality', n: 4 }, { gen: 'seventh-quality', n: 3 }]),
    L('xb15', 'chords', 3, 'Voice leading: smooth chord connections', 7, [
      p('**Voice leading** is how each note of one chord moves to the next. Good voice leading sounds smooth and is easier to play and sing.'),
      list('**Keep common tones**: if both chords share a note, hold it.', '**Move by the smallest step**: the other voices move to the nearest note.', '**Contrary motion**: let the bass move one way while the upper voices move the other.', 'Avoid two voices moving in **parallel 5ths or octaves** in four-part writing.'),
      ex('Jumpy: all root positions', { seq: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]] }),
      ex('Smooth: C – F – G – C voice-led', { seq: [[48, 60, 64, 67], [53, 60, 65, 69], [55, 59, 62, 67], [48, 60, 64, 67]] }),
      tip('On piano, try to move each finger no more than a step between chords.'),
    ], [{ gen: 'inversion', n: 4 }, { gen: 'chord-tone', n: 3 }], [{ label: 'Harmony & parts', go: 'harmony' }]),
    L('xb16', 'chords', 3, 'Chord substitutions and gospel passing chords', 8, [
      p('A **substitution** replaces a chord with another that shares notes or function. **Relative substitution**: vi or iii can stand in for I (Am or Em for C). **Tritone substitution**: D♭7 replaces G7 because both contain the tritone F–B (C♭).'),
      ex('Dm7 – G7 – C', { seq: [[50, 53, 57, 60], [43, 53, 59, 62], [48, 52, 55, 64]] }),
      ex('Dm7 – D♭7 – C (tritone sub: chromatic bass)', { seq: [[50, 53, 57, 60], [49, 53, 56, 59], [48, 52, 55, 64]] }),
      p('**Gospel passing chords** walk the bass chromatically: **IV – ♯iv°7 – I/5** (F – F♯°7 – C/G) leads strongly back home.'),
      ex('C – F – F♯°7 – C/G – G7 – C', { seq: [[48, 60, 64, 67], [53, 60, 65, 69], [54, 60, 63, 69], [55, 60, 64, 67], [43, 59, 62, 65], [48, 60, 64, 67]] }),
      use('Reharmonising the last line of a song with a substitution gives a familiar chorus a fresh ending.'),
    ], [{ gen: 'function', n: 3 }, { gen: 'roman', n: 3 }, { gen: 'transpose', n: 2 }]),

    // ===== Ear training — level 1
    L('xb17', 'ear', 1, 'High or low, up or down', 5, [
      p('The first ear skill is **direction**: is the second note higher or lower? Does the tune go up, down or stay the same?'),
      ex('Low, then high', { notes: [48, 72] }),
      ex('Going up', { notes: [60, 62, 64, 65, 67] }),
      ex('Going down', { notes: [67, 65, 64, 62, 60] }),
      tip('Draw the shape in the air with your hand as you listen — up for higher, down for lower.'),
    ], [{ gen: 'solfege', n: 4 }, { gen: 'interval-ear', n: 3 }]),
    L('xb18', 'ear', 1, 'Steps or leaps?', 5, [
      p('Next, listen for **how far** the tune moves. A **step** goes to the very next note (it sounds like a scale). A **leap** jumps over notes.'),
      ex('All steps', { notes: [60, 62, 64, 62, 60] }),
      ex('Leaps', { notes: [60, 67, 64, 72, 60] }),
      list('Steps sound smooth and connected.', 'Small leaps (3rds) sound like a bugle call or a chord.', 'Big leaps (5ths, octaves) sound like a jump.'),
      tip('Sing the notes in between a leap — if you can fit a note in, it wasn\'t a step.'),
    ], [{ gen: 'interval-ear', n: 6 }, { gen: 'half-whole', n: 2 }]),
    L('xb19', 'ear', 1, 'Hearing the home note', 6, [
      p('Every key has a **home note** — the **tonic**, or **Do**. A melody that ends on Do sounds finished; one that ends elsewhere sounds like a question.'),
      ex('Ends on Do — finished', { notes: [67, 69, 71, 72, 74, 72, 71, 69, 67] }),
      ex('Ends away from home — unfinished', { notes: [67, 69, 71, 69, 74] }),
      tip('After any song, hum the note that feels most like "the end". That is almost always the tonic.'),
      use('Finding Do first is the quickest way to work out the key of a song by ear.'),
    ], [{ gen: 'solfege', n: 5 }, { gen: 'cadence-ear', n: 2 }]),

    // ===== Ear training — level 2
    L('xb20', 'ear', 2, 'Scale degrees and tendency tones', 7, [
      p('Each note of the scale has its own **feeling** relative to Do. Some notes are stable (**Do, Mi, So**); others lean strongly towards a neighbour — the **tendency tones**.'),
      list('**Ti → Do**: the leading note, pulls up by half step', '**Fa → Mi**: leans down by half step', '**Re → Do** and **La → So**: gentle steps down'),
      ex('Ti → Do', { notes: [71, 72] }),
      ex('Fa → Mi', { notes: [65, 64] }),
      ex('La → So', { notes: [69, 67] }),
      tip('Sing "Do" quietly in your head as you listen — then name each note by how it relates to it.'),
    ], [{ gen: 'solfege', n: 8 }], [{ label: 'Sight-reading practice', go: 'learn', activity: 'sight' }]),
    L('xb21', 'ear', 2, 'Following the bass line', 7, [
      p('The **bass** usually plays the root of each chord, so following it tells you the progression. Listen for the shape of the bass: does it **leap** (by 4ths and 5ths, as in I–IV–V) or **walk by step**?'),
      ex('Bass alone: C – G – A – F (I – V – vi – IV)', { notes: [48, 43, 45, 41] }),
      ex('Descending bass: C – G/B – Am – G', { seq: [[48, 64, 67, 72], [47, 62, 67, 71], [45, 64, 69, 72], [43, 62, 67, 71]] }),
      tip('Hum along with the lowest notes only. Once you can hum the bass, you can usually name the chords.'),
    ], [{ gen: 'progression-ear', n: 6 }, { gen: 'function', n: 2 }]),
    L('xb22', 'ear', 2, 'Four triad colours by ear', 6, [
      p('Beyond major and minor, two more triads have unmistakable sounds: **diminished** (tight, tense, spooky) and **augmented** (stretched, dreamy, unresolved).'),
      ex('Major, minor, diminished, augmented on A', { seq: [[57, 61, 64], [57, 60, 64], [57, 60, 63], [57, 61, 65]] }),
      list('Major: bright and settled', 'Minor: darker but stable', 'Diminished: both 3rds small — sounds squeezed', 'Augmented: both 3rds big — sounds like it is floating'),
      tip('Listen to the top note: a raised 5th (augmented) or lowered 5th (diminished) is the giveaway.'),
    ], [{ gen: 'triad-quality', n: 8 }]),

    // ===== Ear training — level 3
    L('xb23', 'ear', 3, 'Transcribing a melody', 8, [
      p('**Transcribing** means writing down music you hear. Work in layers rather than note by note.'),
      list('**1. Find Do** — hum the home note.', '**2. Rhythm** — tap and write the rhythm first.', '**3. Contour** — mark up, down or same for each note.', '**4. Scale degrees** — name each note in solfège.', '**5. Check intervals** — confirm big leaps with interval names.'),
      ex('Try it: transcribe this phrase in C', { notes: [60, 64, 67, 65, 64, 62, 60] }),
      tip('Loop just two bars at a time. Slowing the music down helps more than playing it louder.'),
      use('Transcribing parts from recordings is how many band musicians learn their parts for Sunday.'),
    ], [{ gen: 'solfege', n: 5 }, { gen: 'interval-ear', n: 4 }], [{ label: 'Studio tools', go: 'studio' }]),
    L('xb24', 'ear', 3, 'Hearing modulations and key changes', 7, [
      p('A **modulation** moves the music to a new home. Listen for the moment the old Do stops feeling like home.'),
      list('**Direct lift**: the whole song jumps up a half or whole step for the last chorus — instant energy.', '**Pivot chord**: a chord that belongs to both keys smooths the change.', '**New dominant**: the V7 of the new key (A7 before D) announces where you are going.'),
      ex('C – G – C, then A7 leads to D', { seq: [[48, 64, 67, 72], [43, 62, 67, 71], [48, 64, 67, 72], [45, 61, 64, 67], [50, 62, 66, 69]] }),
      tip('When a modulation happens, sing the new Do — then count how far it is from the old one.'),
    ], [{ gen: 'transpose', n: 3 }, { gen: 'cadence-ear', n: 3 }, { gen: 'key-sig', n: 2 }]),
    L('xb25', 'ear', 3, 'Hearing chords from outside the key', 7, [
      p('Non-diatonic chords stand out because they bring in a **note from outside the scale**. Two common types:'),
      list('**Secondary dominants** — a chord you expect to be minor turns major or dominant 7th (E7 instead of Em in C). It has a strong pull to the next chord.', '**Borrowed chords** — a darker or bolder colour from the parallel minor: ♭VII (B♭ in C) or iv (Fm in C).'),
      ex('C – Em – Am, then C – E7 – Am', { seq: [[48, 64, 67, 72], [52, 64, 67, 71], [45, 64, 69, 72], [48, 64, 67, 72], [52, 62, 68, 71], [45, 64, 69, 72]] }),
      ex('C – B♭ – F – C (borrowed ♭VII)', { seq: [[48, 64, 67, 72], [46, 62, 65, 70], [41, 60, 65, 69], [48, 64, 67, 72]] }),
      tip('Listen for the "wrong" note — G♯ in E7, B♭ in B♭ major — and you will spot the outsider.'),
    ], [{ gen: 'progression-ear', n: 3 }, { gen: 'seventh-quality', n: 3 }, { gen: 'triad-quality', n: 2 }]),

    // ===== Songwriting — level 1
    L('xb26', 'songwriting', 1, 'Writing a hook', 6, [
      p('A **hook** is the short, catchy part people remember — often the song\'s title sung to a simple, repeated melody.'),
      list('Keep it **short**: 2–6 words.', 'Make the **rhythm** distinctive.', '**Repeat** it: at least twice in each chorus.', 'Put it on the **highest** or **longest** notes so it stands out.'),
      ex('A hook, repeated with a higher ending', { notes: [67, 67, 69, 67, 64, 67, 67, 69, 67, 72] }),
      tip('Hum hook ideas into your phone while walking — the best ones often arrive away from the instrument.'),
    ], [{ gen: 'form', n: 4 }, { gen: 'rhythm-count', n: 3 }]),
    L('xb27', 'songwriting', 1, 'Melody shape and contour', 6, [
      p('The **contour** is the overall shape of a melody. Common shapes are the **arch** (up then down), the **rising line** (builds energy) and the **falling line** (relaxes).'),
      ex('Arch: up to one high point, then home', { notes: [60, 62, 64, 67, 69, 72, 69, 67, 64, 62, 60] }),
      ex('Falling line: settling down', { notes: [72, 71, 69, 67, 65, 64, 62, 60] }),
      tip('Save the highest note for the most important word — and use it only once or twice per section.'),
      use('Verses often sit low with a gentle shape; choruses climb higher to lift the energy.'),
    ], [{ gen: 'solfege', n: 4 }, { gen: 'interval-name', n: 3 }]),
    L('xb28', 'songwriting', 1, 'Fitting words to rhythm', 6, [
      p('Spoken words have **stressed** and **unstressed** syllables: "to-**MOR**-row", "**MORN**-ing", "a-**GAIN**". Put stressed syllables on **strong beats** (1 and 3 in 4/4) and the words will sound natural.'),
      ex('"SING it a-LOUD now" — stresses on beats 1 and 3', { rhythm: [1, 0.5, 0.5, 1, 1], bpm: 90, accents: 3 }),
      list('Say the line out loud first and clap where the stress falls.', 'Unstressed syllables can go on weak beats or off-beats.', 'If a word sounds odd when sung, it is usually stressed on the wrong beat.'),
      tip('Write your own lines — never copy someone else\'s lyrics into your song.'),
    ], [{ gen: 'rhythm-count', n: 4 }, { gen: 'note-value', n: 2 }, { gen: 'syncopation', n: 2 }], [{ label: 'Metronome', go: 'metronome' }]),

    // ===== Songwriting — level 2
    L('xb29', 'songwriting', 2, 'Rhyme schemes', 6, [
      p('A **rhyme scheme** labels the line endings with letters: lines that rhyme share a letter.'),
      list('**AABB** — pairs of rhymes (light, direct): "day / way, night / light"', '**ABAB** — alternating rhymes (flowing)', '**XAXA** — only lines 2 and 4 rhyme (relaxed, common in hymns and pop)', '**Perfect rhyme** (heart / start) vs **slant rhyme** (heart / hard) — slant rhymes sound less forced.'),
      tip('Choose the meaning first, then the rhyme. If a rhyme twists what you want to say, use a slant rhyme or rewrite the line.'),
      use('Changing the rhyme scheme between verse and chorus helps the chorus feel different.'),
    ], [{ gen: 'form', n: 4 }, { gen: 'rhythm-count', n: 2 }]),
    L('xb30', 'songwriting', 2, 'Choosing chords for a mood', 7, [
      p('Chord choices set the emotional colour before a single word is sung.'),
      list('**Bright and confident**: I – IV – V – I', '**Hopeful and anthemic**: I – V – vi – IV', '**Reflective**: start on vi (vi – IV – I – V)', '**Bold, rock feel**: use ♭VII (C – B♭ – F – C)', '**Moody**: a minor key, or i – ♭VI – ♭VII'),
      ex('Hopeful: C – G – Am – F', { seq: [[48, 64, 67, 72], [43, 62, 67, 71], [45, 64, 69, 72], [41, 60, 65, 69]] }),
      ex('Moody: Am – F – G – Am', { seq: [[45, 60, 64, 69], [41, 60, 65, 69], [43, 59, 62, 67], [45, 60, 64, 69]] }),
      tip('Try the same melody over two different progressions and notice how the meaning changes.'),
    ], [{ gen: 'progression-ear', n: 4 }, { gen: 'diatonic-chord', n: 3 }, { gen: 'mode-character', n: 2 }], [{ label: 'Progression builder', go: 'learn', activity: 'builder' }]),

    // ===== Songwriting — level 3
    L('xb31', 'songwriting', 3, 'Writing a bridge that contrasts', 7, [
      p('The **bridge** gives the listener something new just before the final chorus. Contrast in at least two ways:'),
      list('**Harmony**: start on a chord the chorus avoids — often IV or vi — and end on V to set up the chorus.', '**Melody**: a new range (higher or lower) and different rhythms.', '**Lyrics**: a new angle — a response, a decision, a declaration.', '**Energy**: strip back or build up.'),
      ex('Bridge: F – G – Am – G … ends on V', { seq: [[41, 60, 65, 69], [43, 59, 62, 67], [45, 60, 64, 69], [43, 59, 62, 67]] }),
      tip('Keep the bridge short (4–8 bars) and finish on the V chord so the last chorus feels like arriving home.'),
    ], [{ gen: 'form', n: 3 }, { gen: 'function', n: 3 }, { gen: 'roman', n: 2 }]),
    L('xb32', 'songwriting', 3, 'Arranging the dynamics of a song', 7, [
      p('A good arrangement has a **dynamic shape**. Plan where the song is quiet and where it is full, so the big moments feel big.'),
      list('**Verse 1**: sparse — one instrument, soft (**p**)', '**Chorus 1**: add bass and drums (**mf**)', '**Verse 2**: keep the groove, add a new texture', '**Bridge**: build with a **crescendo**, or drop to almost nothing', '**Final chorus**: everyone in (**f**), then a gentle tag'),
      tip('Changing what each instrument plays (pads instead of strumming, ride instead of hi-hat) builds energy without just getting louder.'),
      use('Worship teams map dynamics on the set list so everyone knows when to build and when to pull back.'),
    ], [{ gen: 'dynamic-term', n: 4 }, { gen: 'band-role', n: 3 }, { gen: 'form', n: 2 }]),
    L('xb33', 'songwriting', 3, 'Writing for congregational singing', 8, [
      p('Songs for a congregation must be easy for **untrained voices** to pick up on first hearing.'),
      list('**Range**: keep the melody within about an octave, roughly B♭3 to D5 — avoid long stretches above D5.', '**Intervals**: mostly steps and small skips; prepare any leap.', '**Rhythm**: predictable and repeated; avoid tricky syncopation on key words.', '**Key**: choose the key for the people, not the lead singer — transpose if needed.', '**Repetition**: a clear chorus everyone can join by the second time.'),
      ex('Singable phrase in D (D4–B4)', { notes: [62, 64, 66, 67, 69, 67, 66, 64, 62] }),
      tip('Test your melody by asking a non-singer friend to sing it back after hearing it twice.'),
    ], [{ gen: 'voice-range', n: 3 }, { gen: 'transpose', n: 3 }, { gen: 'form', n: 2 }], [{ label: 'Transpose tool', go: 'toolkit', tab: 'transpose' }]),
    L('xb34', 'songwriting', 3, 'Developing a motif', 7, [
      p('Strong songs get a lot of music from a few ideas. Take a **motif** and develop it:'),
      list('**Sequence**: repeat it starting on a higher or lower note.', '**Inversion**: flip its direction (up becomes down).', '**Rhythmic change**: same notes, longer or shorter values.', '**Extension**: add a new ending to the motif.'),
      ex('Motif, then a sequence a step higher', { notes: [60, 62, 64, 60, 62, 64, 65, 62] }),
      ex('Motif, then inverted', { notes: [60, 62, 64, 60, 64, 62, 60, 64] }),
      use('A verse built from one motif and its variations sounds unified rather than random.'),
    ], [{ gen: 'interval-invert', n: 3 }, { gen: 'transpose', n: 3 }, { gen: 'solfege', n: 2 }]),
  ];
  const base = A.LESSONS.length;
  LESSONS.forEach((l, i) => { l.n = base + i + 1; A.LESSONS.push(l); });
})(typeof self !== 'undefined' ? self : globalThis);
