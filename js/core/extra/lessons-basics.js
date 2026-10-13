/* Overture — extra Academy lessons: fundamentals, reading music, rhythm & groove, and scales & keys
 * (fills levels 1–3 of each of these subjects). */
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
  const T3 = 1 / 3, T23 = 2 / 3;
  // L(id, subject, level 1|2|3, title, minutes, body[], practice[], try[], instrument?)
  const L = (id, subject, level, title, minutes, body, practice, tryIt, instrument) => Object.assign({ id, subject, level, title, minutes, body, practice, try: tryIt || [] }, instrument ? { instrument } : {});

  const LESSONS = [
    // ================================================================ Music fundamentals
    L('xa1', 'fundamentals', 1, 'Octaves, registers and octave numbers', 6, [
      p('Every time you go up an **octave** the note keeps its letter name but its frequency **doubles**: A4 is 440 Hz, A5 is 880 Hz, A3 is 220 Hz. Musicians number octaves so they can say exactly which C they mean.'),
      list('**Middle C is C4** — the C nearest the middle of the piano.', 'The number goes up at every **C**: B3 is just below C4, D4 just above.', 'A full piano runs from **A0 to C8**.', '**Register** means a region of pitch: low (bass), middle, high (treble).'),
      ex('C3, C4 (middle C), C5 — same letter, three registers', { notes: [48, 60, 72], bpm: 70 }),
      use('A band sounds clear when instruments sit in different registers: bass low, keys and guitar in the middle, melody on top.'),
      inst({ notes: [48, 60, 72] }),
      tip('Find every C on your instrument and say its number out loud: "C3, C4, C5".'),
    ], [{ gen: 'note-name', n: 3 }, { gen: 'white-keys', n: 3 }, { gen: 'interval-semis', n: 2 }], [{ label: 'Note finder', go: 'learn', activity: 'notes' }]),

    L('xa2', 'fundamentals', 2, 'Enharmonic notes and correct spelling', 6, [
      p('**Enharmonic** notes sound the same but are written differently: F♯ = G♭, C♯ = D♭, and even E♯ = F and C♭ = B. Which name you use depends on the **key** and the **job** the note is doing.'),
      list('Each scale uses **every letter once**: D major is D E **F♯** G A B C♯ — not G♭, which would repeat the letter G.', 'Rising chromatic lines usually use sharps; falling lines use flats.', '**Double sharp 𝄪** raises two half steps (F𝄪 = G); **double flat 𝄫** lowers two (B𝄫 = A).', 'Chords spell in letter-skips: E major is E G♯ B, never E A♭ B.'),
      ex('F♯ and G♭: one key, two names', { notes: [66, 66], bpm: 60 }),
      use('Correct spelling makes charts readable — a B♭ trumpet or a sight-reading pianist expects the notes the key signature predicts.'),
      tip('When unsure, write the letters first (one each), then add the sharps or flats the scale needs.'),
    ], [{ gen: 'accidental', n: 3 }, { gen: 'note-name', n: 2 }, { gen: 'scale-notes', n: 3 }]),

    L('xa3', 'fundamentals', 2, 'Articulation and expression marks', 6, [
      p('Beyond loud and soft, composers mark **how each note is shaped**. These small signs above or below the notes change the character of a phrase completely.'),
      list('**Staccato** (dot) — short, detached. **Staccatissimo** (wedge) — very short.', '**Tenuto** (line) — hold for full value, slight weight.', '**Accent >** — start strongly. **Marcato ^** — even stronger, punchy.', '**Slur** (curve over different notes) — play legato, one bow or one breath.', '**sfz / fp** — sudden accent / loud then immediately soft.', '**Hairpins < >** — crescendo and diminuendo over a span of notes.'),
      ex('Even notes, then accents on every third', { rhythm: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], bpm: 96, accents: 3 }),
      use('A pianist playing a hymn legato with a slight tenuto on the melody notes sounds like a choir; the same notes staccato sound like a march.'),
      tip('Play one scale four times: legato, staccato, all accented, then crescendo up and diminuendo down.'),
    ], [{ gen: 'dynamic-term', n: 5 }, { gen: 'tempo-term', n: 3 }]),

    L('xa4', 'fundamentals', 2, 'Musical texture: monophony, homophony, polyphony', 7, [
      p('**Texture** describes how many musical lines are happening and how they relate. It is why a solo voice and a full choir can sing the same tune and feel so different.'),
      list('**Monophony** — one line, no accompaniment (a solo chant, unison singing).', '**Homophony** — one melody with chords underneath (a singer with guitar; most worship songs).', '**Polyphony** — several independent melodies at once (a round, a Bach fugue, a gospel choir answering the lead).', '**Heterophony** — one tune played by several people with their own small variations (common in Indian, Arabic and folk music).'),
      ex('Monophony: a melody alone', { notes: [60, 62, 64, 65, 67, 65, 64, 62, 60], bpm: 100 }),
      ex('Homophony: a melody on top of chords', { seq: [[48, 52, 55, 60], [53, 57, 60, 65], [55, 59, 62, 67], [48, 52, 55, 60]] }),
      use('Arrangers change texture to build a song: verse 1 thin (voice + keys), chorus full and homophonic, bridge with a counter-melody (polyphony).'),
    ], [{ gen: 'band-role', n: 4 }, { gen: 'form', n: 3 }]),

    L('xa5', 'fundamentals', 2, 'Form vocabulary: motif, phrase and section', 6, [
      p('**Form** is the shape of a piece over time. Musicians label sections with letters — **A** for the first idea, **B** for something contrasting, **A** again when it returns.'),
      list('**Motif** — a short, recognisable idea (a few notes).', '**Phrase** — a musical sentence, often 4 bars, ending with a cadence.', '**Strophic (AAA)** — same music, new verses: most hymns.', '**Binary (AB)** and **ternary (ABA)** — contrast, and contrast with return.', '**AABA (32-bar)** — classic jazz standards and show tunes.', '**Verse–chorus** — modern pop and worship, often with pre-chorus and bridge.', '**12-bar blues** — a 12-bar chord cycle repeated.'),
      ex('A motif, then the motif moved up a step (sequence)', { notes: [60, 62, 64, 60, 62, 64, 65, 62], bpm: 110 }),
      use('Writing "V1 – PC – C – V2 – PC – C – B – C ×2" at the top of a chart is form vocabulary in action.'),
      tip('Listen to a favourite song and write its form in letters while it plays.'),
    ], [{ gen: 'form', n: 5 }, { gen: 'road-map', n: 3 }], [{ label: 'Song library', go: 'songs' }]),

    L('xa6', 'fundamentals', 3, 'The overtone series', 7, [
      p('A single plucked string or blown note is really a **stack of pitches**: the **fundamental** plus quieter **overtones** (harmonics) at 2×, 3×, 4×… its frequency. Their balance is what makes a trumpet sound different from a flute on the same note.'),
      list('From C2 the series runs: C2 · C3 (octave) · G3 (5th) · C4 · E4 (major 3rd) · G4 · B♭4 (slightly flat) · C5 …', 'The first intervals are the most consonant: octave, 5th, 4th, major 3rd.', 'A major triad is literally hidden in harmonics 4, 5 and 6.', 'Brass players change notes on one valve setting by moving between these harmonics.'),
      ex('Harmonics 1–8 of C2', { notes: [36, 48, 55, 60, 64, 67, 70, 72], bpm: 90 }),
      use('Guitar "harmonics" at the 12th, 7th and 5th frets ring the 2nd, 3rd and 4th harmonics of the open string.'),
      tip('On a piano, silently hold down low C (C2), then strike and release C3, G3 and C4 — the held string rings in sympathy with its own harmonics.'),
    ], [{ gen: 'interval-name', n: 3 }, { gen: 'interval-semis', n: 3 }, { gen: 'interval-ear', n: 2 }], [{ label: 'Interval trainer', go: 'learn', activity: 'intervals' }]),

    L('xa7', 'fundamentals', 3, 'Tuning and temperament', 7, [
      p('Pure intervals from the overtone series don\'t quite fit together: twelve perfect 5ths overshoot seven octaves by about a quarter of a semitone (the **Pythagorean comma**). **Temperament** is how we share out that error.'),
      list('**Equal temperament** — every semitone exactly the same (100 **cents**). All keys sound equally in tune; used by pianos, guitars and nearly all modern music.', '**Just intonation** — intervals tuned pure to the overtone series. A just major 3rd is about 14 cents lower than an equal one.', '**Historical temperaments** (meantone, well-tempered) favour some keys over others — part of why old pieces have "key colours".', '**A = 440 Hz** is today\'s standard reference; some orchestras use 442.'),
      ex('Equal-tempered major 3rd C–E', { chord: [60, 64] }),
      use('Choirs, string quartets and good horn sections naturally lower the 3rd of a held major chord so it rings — that is just intonation by ear.'),
      tip('When singing or playing a held major chord, try leaning the 3rd very slightly flat and listen for the "beating" to stop.'),
    ], [{ gen: 'interval-semis', n: 3 }, { gen: 'interval-name', n: 2 }, { gen: 'half-whole', n: 2 }]),

    L('xa8', 'fundamentals', 3, 'Phrase structure: periods and sentences', 7, [
      p('Melodies are built from phrases that ask and answer. A **period** is a pair: an **antecedent** phrase that ends inconclusively (often a **half cadence** on V) and a **consequent** that starts the same way but ends firmly (**perfect cadence** V → I).'),
      list('**Parallel period** — both phrases begin alike.', '**Contrasting period** — the answer starts with new material.', '**Sentence** — a short idea, its repetition, then a longer phrase that drives to a cadence (2 + 2 + 4 bars).', '**Phrase extension** — lengthening a phrase to delay the cadence and build tension.'),
      ex('Question (ends on V) …', { seq: [[48, 52, 55, 60], [53, 57, 60, 65], [55, 59, 62, 67]] }),
      ex('… and answer (ends on I)', { seq: [[48, 52, 55, 60], [53, 57, 60, 65], [55, 59, 62, 65], [48, 52, 55, 60]] }),
      use('Songwriters use the question-and-answer shape so a verse feels complete; delaying the final cadence is how a last chorus "tags" and lifts.'),
    ], [{ gen: 'cadence-name', n: 3 }, { gen: 'cadence-ear', n: 3 }, { gen: 'form', n: 2 }]),

    L('xa9', 'fundamentals', 3, 'Classical forms: rondo, variations and sonata', 8, [
      p('Larger pieces extend simple letter forms into complete journeys. Recognising the form tells you where you are and what is coming next.'),
      list('**Rondo (ABACA…)** — a catchy refrain that keeps returning between episodes.', '**Theme and variations (A A¹ A² …)** — one tune dressed up in new rhythms, harmonies and textures.', '**Sonata form** — **exposition** (two themes, in contrasting keys), **development** (themes broken up and moved through keys), **recapitulation** (both themes return in the home key).', '**Fugue** — one subject imitated in turn by every voice.'),
      ex('A theme …', { notes: [60, 60, 67, 67, 69, 69, 67], bpm: 110 }),
      ex('… and a variation of it', { notes: [60, 64, 67, 72, 67, 64, 69, 72, 69, 67], bpm: 150 }),
      use('Hymn arrangements often work as theme and variations: each verse gets a new texture, key or rhythm while the tune stays the same.'),
    ], [{ gen: 'form', n: 4 }, { gen: 'cadence-name', n: 2 }, { gen: 'road-map', n: 2 }]),

    // ================================================================ Reading music
    L('xa10', 'reading', 1, 'Rests: reading the silences', 5, [
      p('Every note value has a matching **rest** — a written silence of the same length. Rests are counted exactly like notes: the beat keeps going.'),
      list('**Whole rest** — a block hanging **below** the 4th line; also means "rest the whole bar" in any time signature.', '**Half rest** — a block sitting **on** the 3rd line (think: a hat).', '**Quarter rest** — a squiggly vertical sign (1 beat).', '**Eighth rest** — like a "7" with one flag (½ beat); a sixteenth rest has two flags.', 'A **dot** after a rest adds half its value, just like a note.'),
      ex('Clap on 1 and 3, rest on 2 and 4', { rhythm: [2, 2, 2, 2], bpm: 90 }),
      use('In band charts, a number over a thick bar (e.g. "8") means rest for 8 bars — count them so you come in on time.'),
      tip('Say "rest" out loud on silent beats at first, then whisper it, then just think it.'),
    ], [{ gen: 'rhythm-count', n: 4 }, { gen: 'note-value', n: 3 }, { gen: 'bar-count', n: 2 }], [{ label: 'Count with the metronome', go: 'metronome' }]),

    L('xa11', 'reading', 1, 'Stems, flags and beams', 5, [
      p('A note has a **head**, and usually a **stem**. Flags and beams on the stem show shorter values, and the way notes are beamed shows you where the beats are.'),
      list('Notes **below the middle line**: stem **up**, on the right of the head.', 'Notes **on or above the middle line**: stem **down**, on the left.', 'One flag = eighth note; two flags = sixteenth.', '**Beams** join flagged notes, usually **one beat at a time** in 4/4 — so a beamed group = one beat.'),
      ex('Two eighths (one beam) then four sixteenths (two beams)', { rhythm: [0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 1], bpm: 80 }),
      inst({ staff: [62, 64, 71, 74], clef: 'treble' }),
      use('Beaming makes rhythms readable at a glance — you see beats, not just notes.'),
    ], [{ gen: 'note-value', n: 3 }, { gen: 'rhythm-count', n: 3 }, { gen: 'staff-note', n: 2 }]),

    L('xa12', 'reading', 2, 'Dotted notes, ties and slurs', 6, [
      p('A **dot** adds half the note\'s value: dotted half = 3 beats, dotted quarter = 1½. A **tie** is a curve joining two notes of the **same pitch** — play once and hold for both values. A **slur** looks similar but joins **different** pitches and means "play smoothly".'),
      list('Dotted quarter + eighth = "1 – (&) 2 &" — a long-short pattern.', 'Ties let a note cross a bar line, where a dot can\'t.', 'Tie = same note, held. Slur = different notes, connected.', 'Singers: a slur over one syllable means several notes on one vowel.'),
      ex('Dotted quarter + eighth, twice', { rhythm: [1.5, 0.5, 1.5, 0.5], bpm: 84 }),
      use('Countless melodies begin with a dotted-quarter-and-eighth figure — reading it smoothly is a big step in sight-reading.'),
      tip('Count the dotted quarter as "1 & 2" with the next note landing on the "&" of 2.'),
    ], [{ gen: 'bar-count', n: 3 }, { gen: 'note-value', n: 3 }, { gen: 'rhythm-count', n: 2 }]),

    L('xa13', 'reading', 2, 'Chord charts and lead sheets', 7, [
      p('A **lead sheet** shows the melody on a staff with **chord symbols** above it; a **chord chart** shows only the chords and form. Most band and worship music is played from these rather than full scores.'),
      list('**C** = C major, **Cm** = minor, **C7** = dominant 7th, **Cmaj7** = major 7th, **Cm7** = minor 7th, **Csus4**, **Cdim**, **C+** (augmented).', '**Slash chords**: **C/E** = C chord with E in the bass.', 'Slashes **/ / / /** mean "strum or comp a beat"; a chord over bar 1 lasts until the next symbol.', '**N.C.** = no chord (everyone stops or only the melody plays).'),
      ex('C – Am7 – F/A – G', { seq: [[48, 52, 55, 60], [45, 52, 55, 60], [45, 53, 57, 60], [43, 50, 55, 59]] }),
      inst({ chord: 'Am7' }),
      use('A one-page chord chart with the form written at the top lets a whole band play a new song in minutes.'),
    ], [{ gen: 'triad-quality', n: 3 }, { gen: 'seventh-quality', n: 2 }, { gen: 'inversion', n: 2 }], [{ label: 'Chord library', go: 'toolkit', tab: 'chords' }]),

    L('xa14', 'reading', 2, 'The grand staff and octave signs', 6, [
      p('Piano music uses the **grand staff**: treble and bass staves joined by a **brace**. **Middle C** sits on a ledger line exactly between them, so the two staves form one continuous ladder of notes.'),
      list('**8va** over notes — play an octave **higher** than written.', '**8vb** (or 8va below) — an octave **lower**.', '**15ma** — two octaves higher. **loco** — back to normal.', 'Guitar music is written in treble clef but **sounds an octave lower** (sometimes shown with a small 8 under the clef).'),
      ex('Written C5, then the same note under 8va (sounds C6)', { notes: [72, 84], bpm: 60 }),
      inst({ staff: [57, 60, 64], clef: 'treble' }),
      use('8va signs save players from reading five or six ledger lines in high piano and flute parts.'),
    ], [{ gen: 'staff-note', n: 5 }, { gen: 'note-name', n: 3 }]),

    L('xa15', 'reading', 3, 'Alto and tenor clefs', 7, [
      p('The **C clef** (𝄡) can sit on any line: wherever its centre points is **middle C**. Two positions are still in daily use, and reading them is a sign of a fluent, versatile reader.'),
      list('**Alto clef** — middle C on the **middle (3rd) line**. Used by viola.', '**Tenor clef** — middle C on the **4th line**. Used by cello, bassoon and trombone in their higher range.', 'Alto clef lines from the bottom: F A C E G.', 'Trick: alto clef reads one note **above** the treble-clef position, then down an octave.'),
      ex('Middle C, then the alto-clef lines F3 A3 C4 E4 G4', { notes: [60, 53, 57, 60, 64, 67], bpm: 90 }),
      use('Orchestral players, arrangers and conductors read C clefs; transcribing a viola part for violin or guitar starts here.'),
      tip('Learn the anchor note (middle C) for each clef first, then read everything by step and skip from it.'),
    ], [{ gen: 'staff-note', n: 4 }, { gen: 'note-name', n: 2 }, { gen: 'interval-name', n: 2 }]),

    L('xa16', 'reading', 3, 'Reading compound meters on the page', 7, [
      p('In **6/8, 9/8 and 12/8** the felt beat is the **dotted quarter**, and eighths are beamed in **groups of three**. Seeing the beam groups instantly is the key to reading these meters fluently.'),
      list('Count 6/8 as **"1 & a 2 & a"** (or "1-la-li 2-la-li").', 'A dotted quarter = one beat; a quarter + eighth = a long-short "swing" inside one beat.', 'A **duplet** (two notes marked "2") squeezes two even notes into one compound beat.', '**12/8** — four big beats: the slow gospel and soul ballad feel.'),
      ex('6/8: two groups of three', { rhythm: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], bpm: 160, accents: 3 }),
      ex('6/8 quarter–eighth pattern (long-short)', { rhythm: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5], bpm: 160 }),
      use('Many folk songs and hymn tunes are printed in 6/8: count six slow beats and they drag; feel two big beats and they dance.'),
    ], [{ gen: 'time-sig', n: 3 }, { gen: 'swing', n: 3 }, { gen: 'bar-count', n: 2 }]),

    L('xa17', 'reading', 3, 'Transposing instruments on the page', 7, [
      p('Some instruments read notes that are **different from the pitch they sound**. The written part is transposed so players keep the same fingerings across a family of instruments. The note a piano would play is called **concert pitch**.'),
      list('**B♭ trumpet, clarinet, soprano sax** — sound a major 2nd **lower** than written (so parts are written a tone up).', '**Tenor sax** — sounds a major 9th lower.', '**E♭ alto sax** — sounds a major 6th lower.', '**F horn** — sounds a perfect 5th lower.', '**Guitar, bass guitar** — sound an octave lower than written.'),
      ex('Written C for B♭ trumpet sounds concert B♭', { notes: [72, 70], bpm: 60 }),
      use('If the band plays in concert E♭, the trumpet part is written in F and the alto sax part in C.'),
      tip('Always ask "concert or written?" when someone calls out a key in a mixed band.'),
    ], [{ gen: 'trumpet-written', n: 4 }, { gen: 'transpose', n: 2 }, { gen: 'interval-semis', n: 2 }], [{ label: 'Transpose tool', go: 'toolkit', tab: 'transpose' }]),

    L('xa18', 'reading', 3, 'Sixteenth patterns and tuplets', 7, [
      p('Advanced rhythm reading means recognising whole **beat-shapes** at a glance instead of counting every note. In 4/4, each beat with sixteenths has a handful of common shapes.'),
      list('**1 e & a** — four sixteenths.', '**1 & a** — eighth + two sixteenths; **1 e &** — two sixteenths + eighth.', '**1 . . a** — dotted eighth + sixteenth (the "gallop" or "dotted" feel).', '**1 e . a** — sixteenth, eighth, sixteenth (syncopated).', '**Tuplets** — a number over a group: 3 in the time of 2 (triplet), 5 in the time of 4 (quintuplet).'),
      ex('1 e & a · 1 & a · 1 e & · dotted 8th + 16th', { rhythm: [0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.75, 0.25], bpm: 72 }),
      use('Funk, gospel and modern worship guitar and drum charts are full of sixteenth shapes.'),
      tip('Make flash cards of the beat-shapes and practise naming them in one second each.'),
    ], [{ gen: 'rhythm-count', n: 3 }, { gen: 'syncopation', n: 3 }, { gen: 'swing', n: 2 }]),

    L('xa19', 'reading', 3, 'Reading a full score', 8, [
      p('A **score** shows every part stacked vertically, one **system** per line of music. A conductor or arranger reads down (what sounds together) and across (how each line moves).'),
      list('**Orchestral order** from top: woodwind, brass, percussion, (piano/harp), voices, strings.', '**Brackets** group families; **braces** join one player\'s staves (piano).', '**Rehearsal marks** (A, B, C or bar numbers) let everyone restart at the same place.', '**SATB choir**: open score (four staves) or close score (two staves, two voices each).', 'Transposing instruments are written transposed in most scores — check the heading.'),
      ex('SATB: soprano, alto, tenor and bass together', { seq: [[48, 55, 64, 72], [53, 57, 65, 72], [55, 59, 62, 71], [48, 55, 64, 72]] }),
      use('Choir directors and worship leaders read SATB hymn scores to teach each section its part.'),
      tip('Follow a recording with a score: track just the top line first, then just the bass, then try both.'),
    ], [{ gen: 'staff-note', n: 3 }, { gen: 'road-map', n: 3 }, { gen: 'band-role', n: 2 }]),

    // ================================================================ Rhythm & groove
    L('xa20', 'rhythm', 1, 'Pulse versus rhythm', 5, [
      p('The **pulse** (beat) is the steady, unchanging tick underneath the music. **Rhythm** is the pattern of long and short sounds laid over it. You need both: feel the pulse, play the rhythm.'),
      list('Pulse stays the same all song; rhythm changes every bar.', 'Your foot taps the pulse; your hands or voice play the rhythm.', 'Losing the pulse is why rhythms "fall apart" in the tricky bits.'),
      ex('Just the pulse', { rhythm: [1, 1, 1, 1, 1, 1, 1, 1], bpm: 90 }),
      ex('A rhythm over the same pulse', { rhythm: [1, 0.5, 0.5, 1.5, 0.5, 1, 1, 2], bpm: 90 }),
      tip('Tap your foot to the metronome and clap the rhythm of a song you know. Keep the foot going no matter what.'),
    ], [{ gen: 'rhythm-count', n: 4 }, { gen: 'note-value', n: 3 }], [{ label: 'Metronome', go: 'metronome' }]),

    L('xa21', 'rhythm', 1, 'Strong and weak beats', 5, [
      p('Beats are not all equal. In every meter, **beat 1 is strongest**. In 4/4 beat 3 is medium-strong and 2 and 4 are weaker; in 3/4 it is **strong-weak-weak**. This pattern of stress is called **meter**.'),
      list('**4/4**: STRONG – weak – medium – weak.', '**3/4**: STRONG – weak – weak (waltz).', '**2/4**: STRONG – weak (march).', 'Rock, pop and gospel put the **snare on 2 and 4** — the backbeat plays against the natural stress.'),
      ex('4/4 with beat 1 accented', { rhythm: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], bpm: 100, accents: 4 }),
      ex('3/4 with beat 1 accented', { rhythm: [1, 1, 1, 1, 1, 1, 1, 1, 1], bpm: 120, accents: 3 }),
      use('Clap on 2 and 4 in a gospel or pop song — clapping on 1 and 3 feels stiff.'),
    ], [{ gen: 'time-sig', n: 4 }, { gen: 'rhythm-count', n: 3 }]),

    L('xa22', 'rhythm', 1, 'Rests and long notes: keeping time in silence', 5, [
      p('The hardest beats to play are the ones where you play **nothing** — or hold a note while the beat keeps going. Rests and long notes test whether you really feel the pulse.'),
      list('Hold a half note for exactly two beats — release on beat 3, not "about then".', 'A rest is an active beat: count it, breathe on it, prepare the next note.', 'Ends of notes matter as much as starts in tight bands.'),
      ex('Long notes: whole, half, half, quarters', { rhythm: [4, 2, 2, 1, 1, 1, 1], bpm: 100 }),
      use('Big band and worship "stabs" — short hits then silence — only sound tight when everyone counts the rests together.'),
      tip('Play a note and count aloud while it rings; stop it exactly on the count where it ends.'),
    ], [{ gen: 'rhythm-count', n: 3 }, { gen: 'bar-count', n: 3 }, { gen: 'note-value', n: 2 }], [{ label: 'Metronome', go: 'metronome' }]),

    L('xa23', 'rhythm', 1, 'Pickups (anacrusis)', 5, [
      p('Many tunes start **before beat 1** with one or more lead-in notes called a **pickup** or **anacrusis**. The first full bar starts on the strong beat after them.'),
      list('A pickup bar is shorter than a full bar.', 'Often the last bar of the piece is short too, so pickup + last bar = one full bar.', 'Count in so the pickup lands on the right beat: in 3/4 with a one-beat pickup, count "1, 2," and sing on 3.'),
      ex('"Happy Birthday" opening: the two short Gs are the pickup', { notes: [55, 55, 57, 55, 60, 59], bpm: 100 }),
      use('"Happy Birthday" and "Amazing Grace" both start with pickups — that\'s why a count-in matters for the congregation.'),
    ], [{ gen: 'time-sig', n: 3 }, { gen: 'rhythm-count', n: 3 }]),

    L('xa24', 'rhythm', 2, 'Sixteenth patterns and dotted rhythms', 6, [
      p('Once eighths feel easy, split each beat into **four sixteenths: "1 e & a"**. Leaving some out creates the most common groove shapes — especially the **dotted eighth + sixteenth**, which sounds like a gallop or a skip.'),
      list('**1 e & a** — all four.', '**1 & a** — eighth + two sixteenths (the "gallop").', '**1 . . a** — dotted eighth + sixteenth (the "skip").', 'Keep your hand moving in sixteenths even when you only play some of them.'),
      ex('Straight sixteenths, then dotted eighth + sixteenth', { rhythm: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.75, 0.25, 0.75, 0.25], bpm: 76 }),
      use('Funk guitar, hi-hat grooves and many worship strumming patterns live in sixteenths.'),
      tip('Say "1 e & a" slowly with the metronome, then clap only the syllables a pattern uses.'),
    ], [{ gen: 'rhythm-count', n: 3 }, { gen: 'syncopation', n: 3 }, { gen: 'bar-count', n: 2 }]),

    L('xa25', 'rhythm', 2, '6/8 and 12/8 grooves', 6, [
      p('In **6/8** and **12/8** each beat divides into **three**. 6/8 feels like a gentle two (ONE-two-three FOUR-five-six); 12/8 feels like four slow beats, each a triplet.'),
      list('6/8: folk ballads, Irish jigs, many Tamil and Indian folk songs.', '12/8: slow soul, gospel and blues ballads ("triplet ballad").', 'The kick and snare usually mark the big beats; hi-hat or piano plays all the small ones.'),
      ex('12/8: four big beats of three', { rhythm: Array(12).fill(0.5), bpm: 110, accents: 3 }),
      use('A slow gospel ballad in 12/8 lets the piano roll triplets while the drums lay back on 2 and 4 of the big beats.'),
      tip('Count 12/8 as "1-la-li 2-la-li 3-la-li 4-la-li" and tap only on the numbers.'),
    ], [{ gen: 'time-sig', n: 3 }, { gen: 'swing', n: 3 }, { gen: 'rhythm-count', n: 2 }], [{ label: 'Drum grooves', go: 'drums' }]),

    L('xa26', 'rhythm', 2, 'Groove and feel: playing in the pocket', 6, [
      p('**Groove** is how rhythm feels, not just which notes are played. Two players can play the same rhythm perfectly in time and one will feel better — because of **placement**, **dynamics** and **consistency**.'),
      list('**On top** of the beat — slightly early, urgent (punk, fast praise).', '**Behind** the beat — slightly late, relaxed (soul, gospel, slow R&B).', '**In the pocket** — locked with the drummer, especially kick and bass.', '**Ghost notes** and accents give the groove its shape.'),
      ex('Same rhythm, accents shape the feel', { rhythm: Array(16).fill(0.5), bpm: 92, accents: 4 }),
      use('Bass players lock their notes to the kick drum; that unison is the heart of a band\'s groove.'),
      tip('Record yourself with a drum loop, then listen only for whether you feel early, late or locked.'),
    ], [{ gen: 'syncopation', n: 3 }, { gen: 'band-role', n: 3 }, { gen: 'swing', n: 2 }], [{ label: 'Play with a drum groove', go: 'drums' }]),

    L('xa27', 'rhythm', 3, 'Polyrhythm: 3 against 2 and 4 against 3', 7, [
      p('A **polyrhythm** plays two different even divisions at the same time. In **3:2**, one part plays three evenly while the other plays two in the same span. Together they make a fixed composite pattern you can learn as one rhythm.'),
      list('**3:2** composite — say "**nice cup of tea**": both parts on "nice", the 3-part on "cup" and "tea", the 2-part on "of".', '**4:3** composite — trickier, common in West African, Afro-Cuban and modern jazz drumming.', 'Hemiola is a related idea: 3 groups of 2 in place of 2 groups of 3.'),
      ex('3:2 composite pattern (twice)', { rhythm: [T23, T3, T3, T23, T23, T3, T3, T23], bpm: 70 }),
      use('Afro-Cuban bell patterns, gospel piano left hands and Carnatic korvais all layer threes against twos.'),
      tip('Tap 2 with one hand and 3 with the other on your lap; start very slowly and say the composite out loud.'),
    ], [{ gen: 'swing', n: 3 }, { gen: 'syncopation', n: 3 }, { gen: 'rhythm-count', n: 2 }]),

    L('xa28', 'rhythm', 3, 'Hemiola and cross-rhythm', 6, [
      p('A **hemiola** regroups six pulses: instead of **two groups of three** (6/8 feel) you hear **three groups of two** (3/4 feel) — without changing the speed of the pulses. It throws the ear off balance, then snaps back.'),
      list('6/8: **1** 2 3 **4** 5 6.  Hemiola: **1** 2 **3** 4 **5** 6.', 'Baroque and Classical composers loved hemiolas just before a cadence.', 'In Latin music, the switch between 6/8 and 3/4 feel is the basis of many grooves.'),
      ex('Six pulses grouped 3 + 3', { rhythm: Array(12).fill(0.5), bpm: 140, accents: 3 }),
      ex('The same pulses grouped 2 + 2 + 2', { rhythm: Array(12).fill(0.5), bpm: 140, accents: 2 }),
      use('A well-placed hemiola makes the final line of a song feel broader just before it resolves.'),
    ], [{ gen: 'time-sig', n: 3 }, { gen: 'swing', n: 3 }, { gen: 'syncopation', n: 2 }]),

    L('xa29', 'rhythm', 3, 'Odd-meter grooves and additive rhythm', 7, [
      p('Odd meters become easy when you think of them as **groups of 2s and 3s** added together. The grouping is the groove: 7/8 can be 2+2+3, 3+2+2 or 2+3+2, and each feels different.'),
      list('**5/8** = 3+2 or 2+3.', '**7/8** = 2+2+3 (Balkan "rachenitsa"-style), 3+2+2, 2+3+2.', '**9/8** aksak = 2+2+2+3 (Turkish and Balkan music).', 'Carnatic music builds talas from groups too: **Misra Chapu** = 3+2+2 (7), **Khanda Chapu** = 2+3 (5).'),
      ex('7/8 grouped 2+2+3 (group starts only)', { rhythm: [1, 1, 1.5, 1, 1, 1.5, 1, 1, 1.5], bpm: 110 }),
      use('Songs like Pink Floyd\'s "Money" (7/4) and Dave Brubeck\'s "Take Five" (5/4) are built on clear groupings.'),
      tip('Count in syllables: "ta-ka ta-ka ta-ki-ta" for 2+2+3 — the Carnatic way.'),
    ], [{ gen: 'time-sig', n: 3 }, { gen: 'bar-count', n: 3 }, { gen: 'rhythm-count', n: 2 }], [{ label: 'Metronome', go: 'metronome' }]),

    L('xa30', 'rhythm', 3, 'Tempo changes, rubato and metric modulation', 7, [
      p('Tempo isn\'t always fixed. Musicians shape time on purpose — gradually, freely, or by a precise switch in which note gets the beat.'),
      list('**rit. / rall.** — slow down gradually; **accel.** — speed up; **a tempo** — return.', '**Rubato** — "stolen time": stretch some notes and make it up elsewhere, while the accompaniment stays steady-ish.', '**Metric modulation** — a note value in the old tempo becomes the beat in the new one (e.g. triplet eighths become straight eighths, so the tempo rises by half).', '**Half-time / double-time feel** — the pulse feels halved or doubled while chords move at the same speed.'),
      ex('Quarters, then triplets heard as the new beat', { rhythm: [1, 1, 1, 1, T23, T23, T23, T23, T23, T23], bpm: 80 }),
      ex('A ritardando', { rhythm: [1, 1, 1, 1, 1.1, 1.25, 1.45, 1.7, 2], bpm: 110 }),
      use('Worship bridges often drop to a half-time feel, then return to full groove for the last chorus.'),
    ], [{ gen: 'tempo-term', n: 4 }, { gen: 'swing', n: 2 }, { gen: 'rhythm-count', n: 2 }]),

    // ================================================================ Scales & keys
    L('xa31', 'scales', 1, 'Scale degrees and solfège', 6, [
      p('Every note of a scale has a **number** and a **name** describing its job. Numbers and solfège let you think about any key at once: "5 to 1" means the same move in C as in E♭.'),
      list('**1 Do — tonic** (home)', '**2 Re — supertonic**', '**3 Mi — mediant**', '**4 Fa — subdominant**', '**5 So — dominant** (strongest pull back to 1)', '**6 La — submediant**', '**7 Ti — leading note** (leans up to Do)'),
      ex('Do re mi fa so la ti do in G', { notes: [55, 57, 59, 60, 62, 64, 66, 67], bpm: 100 }),
      inst({ scale: { tonic: 7, scale: 'major' } }),
      use('Choirs learn parts in solfège; bands use degree numbers (the Nashville system) to change key instantly.'),
      tip('Sing "do – so – do" and "ti – do" in several keys until the pull of each degree is automatic.'),
    ], [{ gen: 'solfege', n: 4 }, { gen: 'scale-notes', n: 3 }, { gen: 'nashville', n: 2 }], [{ label: 'Scales practice', go: 'learn', activity: 'scales' }]),

    L('xa32', 'scales', 2, 'Building any major scale with tetrachords', 6, [
      p('A major scale is two identical four-note shapes called **tetrachords** — **W W H** — joined by a whole step. C major = **C D E F** + **G A B C**.'),
      list('The **upper** tetrachord of one key becomes the **lower** tetrachord of the key a 5th up.', 'G major = G A B C + D E **F♯** G: a new sharp appears on the 7th.', 'Going the other way, F major = F G A **B♭** + C D E F: a new flat appears on the 4th.', 'This is why the circle of fifths adds one sharp (or flat) at a time.'),
      ex('C D E F | G A B C', { notes: [60, 62, 64, 65, 67, 69, 71, 72], bpm: 110 }),
      ex('G A B C | D E F♯ G', { notes: [55, 57, 59, 60, 62, 64, 66, 67], bpm: 110 }),
      inst({ scale: { tonic: 2, scale: 'major' } }),
      tip('Build D, A and E major yourself from tetrachords before checking them on the instrument.'),
    ], [{ gen: 'scale-notes', n: 3 }, { gen: 'key-sig', n: 3 }, { gen: 'circle-next', n: 2 }], [{ label: 'Circle of fifths', go: 'toolkit', tab: 'circle' }]),

    L('xa33', 'scales', 2, 'Harmonic and melodic minor in practice', 7, [
      p('Natural minor has no **leading note** — its 7th is a whole step below the tonic, so the V chord is minor and the music doesn\'t pull home as strongly. Raising the 7th fixes this.'),
      list('**Harmonic minor**: raise the 7th (A B C D E F **G♯** A). Gives a major **V (E)** or **V7 (E7)** and a distinctive augmented 2nd (F–G♯).', '**Melodic minor**: raise the 6th and 7th going **up** (F♯ G♯), traditionally return to natural minor going **down**. Smooth for melodies.', 'In jazz, melodic minor is used the same both ways.'),
      ex('A harmonic minor', { notes: [57, 59, 60, 62, 64, 65, 68, 69], bpm: 110 }),
      ex('Am – E7 – Am: the raised 7th in the chord', { seq: [[57, 60, 64], [52, 56, 59, 62], [57, 60, 64]] }),
      inst({ scale: { tonic: 9, scale: 'melodic' } }),
      use('Minor-key worship songs nearly always use E (not Em) as the V chord in A minor — that G♯ comes from harmonic minor.'),
    ], [{ gen: 'scale-formula', n: 3 }, { gen: 'relative-minor', n: 2 }, { gen: 'diatonic-chord', n: 2 }]),

    L('xa34', 'scales', 2, 'The chromatic scale', 5, [
      p('The **chromatic scale** uses all **12 notes**, each a half step apart. It has no home note of its own — it\'s the raw material every other scale is chosen from.'),
      list('Usually spelled with **sharps going up** (C C♯ D D♯…) and **flats going down** (C B B♭ A A♭…).', 'Chromatic **passing notes** connect scale notes smoothly (C – C♯ – D).', 'Chromatic **approach notes** lead into chord tones from a half step below or above.'),
      ex('C chromatic up and down', { notes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60], bpm: 160 }),
      inst({ scale: { tonic: 0, scale: 'chromatic' } }),
      use('Bass walk-ups, gospel piano runs and jazz lines all borrow chromatic notes between chords.'),
      tip('Practise the chromatic scale slowly with a metronome — it is the best evenness exercise for fingers.'),
    ], [{ gen: 'half-whole', n: 3 }, { gen: 'accidental', n: 2 }, { gen: 'note-name', n: 2 }], [{ label: 'Technique', go: 'learn', activity: 'technique' }]),

    L('xa35', 'scales', 2, 'Key relationships: relative, parallel and related keys', 6, [
      p('Keys have family relationships. Knowing them tells you where a song might **modulate** (change key) and which borrowed chords will sound natural.'),
      list('**Relative** keys share a key signature: C major and **A minor**.', '**Parallel** keys share a tonic: C major and **C minor** (3 flats).', '**Dominant / subdominant** keys are a 5th up or down: G and F — one sharp or flat away.', '**Closely related** keys of C: Dm, Em, F, G, Am — the keys of its other diatonic triads.'),
      ex('C major chord, then C minor (parallel)', { seq: [[48, 52, 55, 60], [48, 51, 55, 60]] }),
      ex('C major chord, then A minor (relative)', { seq: [[48, 52, 55, 60], [45, 52, 57, 60]] }),
      use('A last-chorus "truck-driver" key change usually jumps up a half or whole step; a smoother modulation moves to a closely related key.'),
    ], [{ gen: 'relative-minor', n: 3 }, { gen: 'circle-next', n: 2 }, { gen: 'key-from-sig', n: 2 }], [{ label: 'Circle of fifths', go: 'toolkit', tab: 'circle' }]),

    L('xa36', 'scales', 3, 'Symmetrical scales: whole-tone and diminished', 7, [
      p('**Symmetrical scales** repeat the same interval pattern, so they have no single obvious home — perfect for tension, dreamlike colour and suspense.'),
      list('**Whole-tone** — six notes, all whole steps (C D E F♯ G♯ A♯). Only **two** different whole-tone scales exist. Sounds floating; fits augmented and 7♯5 chords.', '**Diminished (half-whole)** — H W H W… (C D♭ E♭ E F♯ G A B♭). Fits dominant 7♭9 chords.', '**Diminished (whole-half)** — W H W H… Fits diminished 7th chords.', 'Only three different diminished scales exist; each repeats every minor 3rd.'),
      ex('C whole-tone', { notes: [60, 62, 64, 66, 68, 70, 72], bpm: 110 }),
      ex('C half-whole diminished', { notes: [60, 61, 63, 64, 66, 67, 69, 70, 72], bpm: 110 }),
      use('Film composers use whole-tone runs for dream sequences; jazz players use the half-whole scale over G7♭9 resolving to C.'),
    ], [{ gen: 'half-whole', n: 2 }, { gen: 'scale-over-chord', n: 3 }, { gen: 'seventh-quality', n: 2 }]),

    L('xa37', 'scales', 3, 'Modes of melodic minor', 8, [
      p('Just as the major scale has seven modes, so does **melodic minor** (ascending form: 1 2 ♭3 4 5 6 7). Two of its modes are essential in jazz and fusion.'),
      list('**Lydian dominant** (4th mode): 1 2 3 ♯4 5 6 ♭7 — a bright, "Simpsons"-like dominant colour. Fits 7♯11 chords.', '**Altered scale** (7th mode): 1 ♭9 ♯9 3 ♭5 ♯5 ♭7 — every possible tension on a dominant chord. Fits G7alt resolving to C.', '**Melodic minor itself** fits minor-major 7th chords (CmMaj7).', '**Locrian ♮2** (6th mode) fits half-diminished chords.'),
      ex('C melodic minor', { notes: [60, 62, 63, 65, 67, 69, 71, 72], bpm: 110 }),
      ex('F Lydian dominant (4th mode of C melodic minor)', { notes: [65, 67, 69, 71, 72, 74, 75, 77], bpm: 110 }),
      ex('G altered (7th mode of A♭ melodic minor)', { notes: [55, 56, 58, 59, 61, 63, 65, 67], bpm: 110 }),
      use('Gospel and jazz keyboardists use the altered scale for those tense dominant runs right before a resolution.'),
    ], [{ gen: 'mode-character', n: 3 }, { gen: 'scale-over-chord', n: 3 }, { gen: 'seventh-quality', n: 2 }]),

    L('xa38', 'scales', 3, 'Scales from around the world', 7, [
      p('Many traditions use scales outside the major/minor system. Each brings its own colour — and often its own rules about ornaments and which notes to emphasise.'),
      list('**Phrygian dominant** (5th mode of harmonic minor): 1 ♭2 3 4 5 ♭6 ♭7 — flamenco, Middle Eastern and klezmer sounds.', '**Double harmonic**: 1 ♭2 3 4 5 ♭6 7 — the Arabic Hijaz-kar colour.', '**Hirajoshi** (Japan): a five-note scale with half steps, e.g. A B C E F.', '**Hungarian minor**: harmonic minor with a ♯4.'),
      ex('E Phrygian dominant', { notes: [64, 65, 68, 69, 71, 72, 74, 76], bpm: 110 }),
      ex('A Hirajoshi', { notes: [57, 59, 60, 64, 65, 69], bpm: 100 }),
      use('A Phrygian dominant line over an E major chord in A minor gives an instant Spanish flavour.'),
      tip('Play each scale slowly over a drone of its tonic — the drone reveals each note\'s colour.'),
    ], [{ gen: 'mode-character', n: 3 }, { gen: 'scale-formula', n: 3 }, { gen: 'interval-semis', n: 2 }], [{ label: 'Harmony explorer', go: 'harmony' }]),

    L('xa39', 'scales', 3, 'Ragas: Mayamalavagowla and the melakarta system', 8, [
      p('In Carnatic (South Indian) music a **raga** is more than a scale: it has an ascending form (**arohanam**), a descending form (**avarohanam**), characteristic phrases and ornaments (**gamakas**). Carnatic theory organises seven-note parent scales into **72 melakartas**.'),
      list('Notes: **Sa Ri Ga Ma Pa Dha Ni** — Sa and Pa are fixed; the others have variants.', '**Mayamalavagowla** (melakarta 15): Sa Ri1 Ga3 Ma1 Pa Dha1 Ni3 = C D♭ E F G A♭ B on C.', 'It is the first raga taught to Carnatic students; the same notes as the double harmonic scale.', '**Shankarabharanam** (29) has the same notes as the Western major scale; **Kalyani** (65) matches Lydian.'),
      ex('Mayamalavagowla on C: arohanam and avarohanam', { notes: [60, 61, 64, 65, 67, 68, 71, 72, 71, 68, 67, 65, 64, 61, 60], bpm: 100 }),
      use('Many Tamil film and devotional songs are built on ragas — knowing the raga tells you which notes and phrases will sound "right".'),
      tip('Sing the raga with a Sa–Pa drone, slowly, before trying any fast phrases.'),
    ], [{ gen: 'solfege', n: 2 }, { gen: 'half-whole', n: 3 }, { gen: 'mode-character', n: 2 }]),
  ];

  const base = A.LESSONS.length;
  LESSONS.forEach((l, i) => { l.n = base + i + 1; A.LESSONS.push(l); });
})(typeof self !== 'undefined' ? self : globalThis);
