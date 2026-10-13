/* Overture — extra Academy lessons: improvisation, worship band craft and how to practise. */
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
    // ===== Improvisation — level 1
    L('xc1', 'improv', 1, 'Call and response: echo, then answer', 6, [
      p('The friendliest way into improvising is a musical conversation. Someone plays a short **call** (2–4 beats); you **echo** it exactly, then later you **answer** with your own idea of the same length.'),
      ex('A call (up) and an answer (down home)', { notes: [60, 62, 64, 67, 67, 64, 62, 60], bpm: 92 }, 'Call: C D E G · Answer: G E D C'),
      list('**Echo** trains your ear — copy rhythm first, then pitches.', '**Answer** with the same rhythm but different notes, or the same notes in a new rhythm.', 'A good answer often finishes on the **home note** (the key\'s 1).'),
      use('Gospel and worship leaders use call and response all the time: the leader sings a line and the band or congregation answers.'),
      tip('Keep calls short. Two bars you can remember beat eight bars you can\'t.'),
    ], [{ gen: 'interval-ear', n: 4 }, { gen: 'note-name', n: 3 }], [{ label: 'Call & response trainer', go: 'learn', activity: 'callresp' }]),

    L('xc2', 'improv', 1, 'Improvise with just three notes', 5, [
      p('Too many choices freeze beginners. Pick **three notes** and make music with only those. With so little to think about, you can focus on **rhythm, repetition and feel** — which is most of what makes a solo sound good.'),
      ex('Three notes: A C D, played with rhythm', { notes: [57, 57, 60, 62, 60, 57, 60, 60, 62, 60, 57], bpm: 96 }, 'From A minor pentatonic'),
      inst({ scale: { tonic: 9, scale: 'minpent' } }),
      list('Start with three neighbouring notes of the pentatonic scale (A C D over A minor).', 'Over one chord, the **root, 3rd and 5th** are a safe three-note set.', 'When it feels easy, add a fourth note — and only then a fifth.'),
      tip('Set a 2-minute timer. You may only use your three notes — no cheating!'),
    ], [{ gen: 'chord-tone', n: 4 }, { gen: 'triad-spell', n: 3 }], [{ label: 'Improvise in the Studio', go: 'studio' }]),

    L('xc3', 'improv', 1, 'Rhythm first: soloing on one note', 5, [
      p('Rhythm is the secret ingredient of improvising. Try a solo on **one single note** — the root of the key. If it grooves on one note, it will groove on many.'),
      ex('One note, interesting rhythm', { rhythm: [1, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 1, 1, 1], bpm: 92 }),
      list('Mix long and short notes.', 'Play some notes on the **"&"** (off-beat) — that is syncopation.', 'Repeat a rhythm you like, then change only its ending.', 'Use **rests**: a silent beat is part of the rhythm.'),
      use('Drummers and horn players often "speak" a rhythm before they choose notes. Saying "da-da DAH" out loud works too.'),
      tip('Clap your rhythm with the metronome at 80 BPM first, then play it on your note.'),
    ], [{ gen: 'rhythm-count', n: 4 }, { gen: 'syncopation', n: 3 }], [{ label: 'Practise with the metronome', go: 'metronome' }]),

    L('xc4', 'improv', 1, 'The pentatonic box', 7, [
      p('The **minor pentatonic** (1 ♭3 4 5 ♭7) fits neatly under the hand. On guitar, **box 1** in A sits at the 5th fret: two notes on every string, with the root A on the low E string. On piano, A C D E G sits under five fingers with one stretch.'),
      ex('A minor pentatonic box, low to high', { notes: [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72], bpm: 110 }, 'A C D · E G · A C · D E · G A C'),
      inst({ scale: { tonic: 9, scale: 'minpent' } }),
      list('The same five notes are the **C major pentatonic** (C D E G A) — so the box works over A minor *and* C major songs.', 'Mark the **roots** (A) — start and end phrases on them.', 'Move the box: start it on the 3rd fret for G minor, the 7th fret for B minor.'),
      tip('Play the box up and down slowly, then improvise using only two strings at a time.'),
    ], [{ gen: 'scale-formula', n: 4 }, { gen: 'relative-minor', n: 2 }, { gen: 'scale-over-chord', n: 2 }], [{ label: 'See scales in the toolkit', go: 'toolkit', tab: 'scales' }]),

    // ===== Improvisation — level 2
    L('xc5', 'improv', 2, 'Motif development', 7, [
      p('A **motif** is a short idea of 3–5 notes. Great improvisers don\'t play a stream of new ideas — they take one motif and **develop** it, so the listener can follow the story.'),
      ex('Motif, then sequenced up a step twice', { notes: [60, 64, 67, 62, 65, 69, 64, 67, 71, 72], bpm: 100 }, 'C E G → D F A → E G B → C'),
      list('**Repeat** it exactly (people love recognising it).', '**Sequence** it: same shape starting on a higher or lower note.', '**Change the rhythm** but keep the notes.', '**Change the ending**: same start, a new last note.', '**Invert** it: if it went up, make it go down.'),
      use('Over a 4-chord worship loop, play your motif over chord 1, sequence it over chord 2, and change its ending over chord 4.'),
      tip('Record a 30-second solo using only one motif and its variations. It will sound more "composed" than you expect.'),
    ], [{ gen: 'interval-name', n: 3 }, { gen: 'transpose', n: 3 }, { gen: 'interval-ear', n: 2 }], [{ label: 'Improvise in the Studio', go: 'studio' }]),

    L('xc6', 'improv', 2, 'Soloing over a 12-bar blues', 8, [
      p('The **12-bar blues** uses three dominant 7th chords: **I7, IV7 and V7**. In A: 4 bars of A7, 2 of D7, 2 of A7, then E7 – D7 – A7 – E7 (the last bar is the **turnaround** back to the top).'),
      ex('12-bar blues in A (one chord per bar)', { seq: [[57, 61, 64, 67], [57, 61, 64, 67], [57, 61, 64, 67], [57, 61, 64, 67], [50, 54, 57, 60], [50, 54, 57, 60], [57, 61, 64, 67], [57, 61, 64, 67], [52, 56, 59, 62], [50, 54, 57, 60], [57, 61, 64, 67], [52, 56, 59, 62]] }, 'A7 ×4 · D7 ×2 · A7 ×2 · E7 D7 A7 E7'),
      inst({ scale: { tonic: 9, scale: 'blues' } }),
      list('The **A blues scale** (A C D E♭ E G) works over all twelve bars.', 'Bend or slide from the **♭3 (C) to the 3 (C♯)** over A7 — the classic blues sound.', 'Phrase in 4-bar sentences: call (bars 1–4), repeat with a twist (5–8), answer (9–12).'),
      use('Gospel shuffles, many hymn arrangements and old-time revival songs grew out of the blues form.'),
    ], [{ gen: 'roman', n: 3 }, { gen: 'scale-over-chord', n: 3 }, { gen: 'seventh-quality', n: 2 }], [{ label: 'Jam over a style in the Studio', go: 'studio' }]),

    // ===== Improvisation — level 3
    L('xc7', 'improv', 3, 'Guide tones: the 3rds and 7ths', 8, [
      p('The **3rd** and **7th** of each chord are its **guide tones** — they define major vs minor and 7th quality. In a **ii–V–I** they move by tiny steps, making a smooth line that outlines the harmony even with no band playing.'),
      ex('ii–V–I in C: Dm7 → G7 → Cmaj7', { seq: [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59]] }),
      ex('Just the guide tones', { seq: [[65, 72], [65, 71], [64, 71]] }, 'F/C → F/B → E/B — each moves a half step or stays'),
      list('Dm7: 3rd **F**, 7th **C** · G7: 3rd **B**, 7th **F** · Cmaj7: 3rd **E**, 7th **B**.', 'The 7th of one chord often falls a half step to the 3rd of the next (C → B, F → E).', 'Land a guide tone on beat 1 of each chord change, then decorate around it.'),
      tip('Play only guide tones through a song as whole notes. Then add one passing note between each. That is a real solo.'),
    ], [{ gen: 'seventh-quality', n: 3 }, { gen: 'chord-tone', n: 4 }, { gen: 'diatonic-chord', n: 2 }], [{ label: 'Chords in the toolkit', go: 'toolkit', tab: 'chords' }]),

    L('xc8', 'improv', 3, 'Chromatic approach notes and enclosures', 7, [
      p('Once you can target chord tones, decorate the arrival. A **chromatic approach** comes into the target from a half step below or above. An **enclosure** surrounds it: one note above, one below, then the target.'),
      ex('Approaching E (the 3rd of C) three ways', { notes: [63, 64, 65, 64, 65, 63, 64], bpm: 88 }, 'D♯→E · F→E · F D♯ E (enclosure)'),
      list('Put the approach note **off the beat** and the target **on the beat** — the clash resolves instantly.', 'Approach from below sounds bluesy and warm; from above sounds more like jazz and gospel.', 'Use it on the 3rd or root of a new chord, right at the change.'),
      use('Bass players use chromatic approaches to walk into the next chord root; keys players use them in gospel fills.'),
      tip('Never hold the chromatic note — it is a passing guest, not the destination.'),
    ], [{ gen: 'half-whole', n: 3 }, { gen: 'chord-tone', n: 3 }, { gen: 'interval-semis', n: 2 }]),

    L('xc9', 'improv', 3, 'Tension and release', 7, [
      p('Music feels alive when it moves between **tension** (unstable, wanting to move) and **release** (rest, home). An improviser controls this with note choice, rhythm, register and volume.'),
      ex('Suspension resolving: Csus4 → C', { seq: [[60, 65, 67], [60, 64, 67]] }),
      ex('Dominant tension → tonic release: G7 → C', { seq: [[55, 59, 62, 65], [48, 55, 64, 72]] }),
      list('**Notes**: the 4th over a major chord, the 7th or a chromatic note create tension; the root and 3rd release it.', '**Rhythm**: fast, repeated or off-beat notes build; long notes on the beat settle.', '**Register**: climbing higher builds; falling back down releases.', '**Dynamics**: grow louder into the climax, then drop.'),
      use('Plan one big climb per solo — towards the last chorus or bridge — and release into a simple, sung-like phrase.'),
    ], [{ gen: 'function', n: 3 }, { gen: 'cadence-ear', n: 3 }, { gen: 'chord-tone', n: 2 }]),

    L('xc10', 'improv', 3, 'Spontaneous worship: improvising in a service', 8, [
      p('In **spontaneous worship** the band loops a simple progression while the leader sings new lines, prayers or repeats. Your job is to **support**, not to show off: a steady loop, a soft pad, and melodic answers only in the gaps.'),
      ex('A typical loop in D: 1 – 5 – 6- – 4', { seq: [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]] }, 'D A Bm G'),
      inst({ scale: { tonic: 2, scale: 'majpent' } }),
      list('Know the loop by **Nashville number** so the leader can call changes.', 'Use the key\'s **major pentatonic** (D E F♯ A B) for safe, singable answers.', 'Answer only when the singer **breathes** — never over the words.', 'Follow dynamics: soften when the leader goes quiet, build only when they build.'),
      use('A sustained pad or a gentle repeated motif lets the moment breathe; the room should notice the worship, not the solo.'),
      tip('Practise with the Studio looping a 1–5–6–4: sing a short line, then answer it on your instrument.'),
    ], [{ gen: 'nashville', n: 3 }, { gen: 'scale-over-chord', n: 2 }, { gen: 'chord-tone', n: 3 }], [{ label: 'Loop a progression', go: 'learn', activity: 'builder' }]),

    // ===== Band — level 1
    L('xc11', 'band', 1, 'Listening and playing less', 6, [
      p('The best band musicians listen more than they play. Every instrument shares the same **space** — low, middle and high. When two players fill the same space, the sound turns to mud.'),
      ex('Muddy: everything bunched low', { chord: [36, 40, 43, 48, 52, 55] }),
      ex('Clear: bass low, chords up high', { chord: [36, 64, 67, 72] }),
      list('If the keys are playing in the middle, guitar can play **higher** or **simpler**.', 'Leave the lowest notes to the **bass**.', 'Ask: "Does this part help the singer?" If not, leave it out.', 'Rest for a whole verse — your entry then means something.'),
      tip('In rehearsal, take turns dropping out for 8 bars. Notice what the song really needs.'),
    ], [{ gen: 'band-role', n: 4 }, { gen: 'dynamic-term', n: 3 }]),

    L('xc12', 'band', 1, 'Count-ins and starting together', 5, [
      p('A song lives or dies on its first beat. A **count-in** tells everyone the **tempo** and **when** to start. In 4/4 the leader counts "1, 2, 3, 4" — or "1, 2, 1-2-3-4" — and the band enters on the next beat 1.'),
      ex('One bar count-in, then the song starts (72 BPM)', { rhythm: [1, 1, 1, 1, 1, 1, 1, 1], bpm: 72, accents: 4 }),
      list('Count at the **song\'s** tempo, not faster from nerves.', 'For 3/4 count "1, 2, 3"; for 6/8 count the two big beats or all six.', 'Agree who counts: usually the drummer or the worship leader.', 'If there\'s a pickup (a note before beat 1), the singer starts on the "and" of 4.'),
      tip('Before counting, sing the first line in your head at the right tempo — then count from that feel.'),
    ], [{ gen: 'time-sig', n: 3 }, { gen: 'bar-count', n: 3 }, { gen: 'tempo-term', n: 2 }], [{ label: 'Set the tempo on the metronome', go: 'metronome' }]),

    L('xc13', 'band', 1, 'Sound check etiquette', 5, [
      p('A **sound check** is when the sound team balances every instrument and voice. A calm, quick sound check gives everyone a better service — and makes friends with the sound team.'),
      list('**Arrive early**, set up, and tune **before** sound check starts.', 'Stay **quiet** when someone else is being checked — no noodling!', 'When it is your turn, play **at the volume you will really play**, including your loudest part.', 'Ask for monitor changes clearly: "More keys in my wedge, please."', 'Say **thank you** to the sound team.'),
      use('Playing softly in sound check then loudly in the service is the most common cause of a bad mix.'),
      tip('Have a 20-second check passage ready: a soft verse bit and a loud chorus bit.'),
    ], [{ gen: 'band-role', n: 3 }, { gen: 'dynamic-term', n: 3 }]),

    // ===== Band — level 2
    L('xc14', 'band', 2, 'Following a worship leader', 7, [
      p('Worship leaders often change the plan live: repeat a chorus, go back to the bridge, drop to just keys, or end early. The band follows **eyes, hands and words**.'),
      list('**Fingers held up** = Nashville number of the next chord, or the section number.', '**Hand circling** = repeat this section.', '**Palm down / lowering hand** = bring it down softer.', '**Hand rising** = build.', '**Fist** = stop (usually on the next beat 1).', '**"Again!" or "Bridge!"** said into the band mic or in-ears.'),
      use('Agree the signals in rehearsal, then practise a run-through where the leader changes the order on purpose.'),
      tip('Keep your eyes up. If you are buried in the chart, you will miss the cue.'),
    ], [{ gen: 'road-map', n: 3 }, { gen: 'form', n: 3 }, { gen: 'nashville', n: 2 }]),

    L('xc15', 'band', 2, 'Playing to a click and in-ear monitors', 7, [
      p('Many bands use a **click** (metronome) in their **in-ear monitors** so everyone — and any backing tracks — share the same tempo. Playing with a click feels strange at first; it becomes a superpower.'),
      ex('Click with accent on beat 1 (84 BPM)', { rhythm: [1, 1, 1, 1, 1, 1, 1, 1], bpm: 84, accents: 4 }),
      list('Keep the click **loud enough to hear** but below the band in your mix.', 'Lock to the click with the **drummer and bass** — they are your anchor.', 'Don\'t chase it: if you drift, wait for beat 1 and come back in.', 'In-ears: get a clear **mix** (yourself, the leader, the click, the bass), not everything.', 'Keep volumes **low** — protect your hearing.'),
      tip('At home, practise with the click on beats 2 and 4 only. It builds a much stronger inner pulse.'),
    ], [{ gen: 'tempo-term', n: 3 }, { gen: 'rhythm-count', n: 3 }, { gen: 'bar-count', n: 2 }], [{ label: 'Practise with the metronome', go: 'metronome' }]),

    // ===== Band — level 3
    L('xc16', 'band', 3, 'Smooth transitions between songs', 8, [
      p('The moment between songs can feel awkward — or it can carry the room straight into the next song. Plan transitions as carefully as the songs.'),
      list('**Same key**: hold a pad or keep the groove going and start straight in.', '**Neighbour keys on the circle** (G → D, or G → C) share most chords — move through a common chord.', '**Up a step** (G → A): play the **V7 of the new key** (E7) as a bridge chord.', '**Tempo change**: drop to a pad with no rhythm, then count in the new tempo.'),
      ex('Ending in G, then E7 leads into A', { seq: [[48, 52, 55], [50, 54, 57], [55, 59, 62], [52, 56, 59, 62], [57, 61, 64]] }, 'C D G → E7 → A'),
      use('Write transitions on the set list: "Pad in G, leader prays, E7, count new song in A at 76."'),
      tip('Rehearse the last 4 bars of each song *into* the first 4 bars of the next — not each song on its own.'),
    ], [{ gen: 'circle-next', n: 3 }, { gen: 'transpose', n: 3 }, { gen: 'function', n: 2 }], [{ label: 'Circle of fifths', go: 'toolkit', tab: 'circle' }]),

    L('xc17', 'band', 3, 'Playing with a choir', 7, [
      p('A choir is a whole harmony section. With **four voice parts** — soprano, alto, tenor, bass (SATB) — the chords are already being sung, so the band\'s job changes: **support, don\'t duplicate**.'),
      ex('SATB-style voicing: C → F → G → C', { seq: [[48, 55, 64, 72], [41, 57, 65, 72], [43, 59, 67, 74], [48, 55, 64, 72]] }),
      list('Give the choir a clear **starting note or chord** and a strong count-in.', 'Keys: play the harmony **lightly** in rehearsal; in the service, often less.', 'Keep the bass **below** the choir\'s bass section.', 'Watch the **conductor** for breaths, holds and endings.', 'Choose keys that suit the choir\'s ranges, not just the soloist.'),
      use('In Tamil and Indian churches, choirs often sing in unison with harmony only on refrains — keep the band simple and rhythmic under them.'),
    ], [{ gen: 'sing-harmony', n: 3 }, { gen: 'voice-range', n: 3 }, { gen: 'band-role', n: 2 }]),

    L('xc18', 'band', 3, 'Planning a great rehearsal', 7, [
      p('A rehearsal without a plan becomes a run-through of everything, badly. A good plan gets the hard parts right and leaves time to play the set through.'),
      list('**Before**: send charts, keys, recordings and the order at least a few days ahead.', '**Start**: tune, a quick line check, and pray or set the vision.', '**Fix the hard bits first**: intros, endings, transitions, the bridge build.', '**Then run the set** in order, without stopping, like the real service.', '**Finish**: write notes on charts and agree any changes.'),
      use('Spend time where mistakes happen: starts, stops and changes — not the middle of a chorus everyone knows.'),
      tip('Give each problem a time limit (say 5 minutes). If it\'s still not right, simplify the part.'),
    ], [{ gen: 'form', n: 3 }, { gen: 'road-map', n: 3 }, { gen: 'practice-skill', n: 2 }]),

    L('xc19', 'band', 3, 'Leading the band as music director', 8, [
      p('The **music director** (MD) is the band\'s leader on stage — often the keys player, drummer or worship leader. The MD makes musical decisions so everyone else can relax and play.'),
      list('**Chooses** keys, tempos, arrangements and transitions.', '**Calls** cues in the band mix: "Chorus, all in", "Down to keys", "Last time".', '**Counts in** every song at the right tempo.', '**Watches** the worship leader and passes their signals to the band.', '**Encourages**: clear, kind, specific feedback after rehearsal.'),
      p('Call cues **one or two bars early**, in short words, using section names or **Nashville numbers** ("Going to the 4!").'),
      use('A confident MD lets the worship leader focus on leading people instead of managing musicians.'),
    ], [{ gen: 'nashville', n: 3 }, { gen: 'band-role', n: 3 }, { gen: 'road-map', n: 2 }]),

    // ===== How to practise — level 1
    L('xc20', 'practice', 1, 'Setting practice goals', 5, [
      p('"Get better at guitar" is a wish. "Play the G–C–D change at 80 BPM with no stops by Friday" is a **goal**. Clear goals make every practice session count.'),
      list('**Specific** — one song, one passage, one skill.', '**Measurable** — a tempo, a number of clean repeats, a date.', '**Small** — something you can reach this week.', 'Write a **big goal** (play at church next month) and break it into weekly steps.'),
      use('Start each session by saying what you will improve today, and finish by checking whether you did.'),
      tip('Three clean repeats in a row is a great "done" test.'),
    ], [{ gen: 'practice-skill', n: 4 }, { gen: 'tempo-term', n: 2 }], [{ label: 'Practise with the metronome', go: 'metronome' }]),

    L('xc21', 'practice', 1, 'Warming up well', 5, [
      p('A warm-up wakes up your hands, breath and ears before you ask them for anything difficult. Five minutes is enough.'),
      list('**Body**: roll shoulders, stretch fingers and wrists gently, relax the jaw.', '**Long notes**: singers and wind players hold steady, relaxed notes.', '**Slow scale**: one scale, slow and even, listening to the tone.', '**Ears**: sing or play a few intervals and check them.'),
      ex('A slow, even warm-up scale', { notes: [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60], bpm: 66 }),
      tip('Warm up softly first. Volume and speed come at the end, not the start.'),
    ], [{ gen: 'scale-notes', n: 3 }, { gen: 'interval-ear', n: 2 }, { gen: 'practice-skill', n: 2 }], [{ label: 'Scales with feedback', go: 'learn', activity: 'scales' }]),

    // ===== How to practise — level 2
    L('xc22', 'practice', 2, 'Metronome strategies', 7, [
      p('The metronome is more than a speed setting. Change **where** the click falls and you train a stronger inner pulse.'),
      ex('Speed ladder: same bar at 70, then 75 BPM', { rhythm: [1, 1, 1, 1, 1, 1, 1, 1], bpm: 70, accents: 4 }),
      list('**Speed ladder**: perfect at a slow tempo, then +4 BPM. If it breaks, go back two steps.', '**Click on 2 and 4**: set the metronome at half speed and feel it as the backbeat.', '**Half-time click**: one click per bar — you supply the other beats.', '**Gap click**: the click plays a bar, then goes silent a bar. Are you still together when it returns?', '**Subdivide**: set 8th-note clicks for slow ballads so you don\'t rush.'),
      tip('Note today\'s best clean tempo in your journal. Tomorrow, start 8 BPM below it.'),
    ], [{ gen: 'rhythm-count', n: 3 }, { gen: 'tempo-term', n: 2 }, { gen: 'swing', n: 2 }], [{ label: 'Open the metronome', go: 'metronome' }]),

    L('xc23', 'practice', 2, 'Memorising music', 7, [
      p('Memory is stronger when you understand **what** you are playing, not just which fingers move. Use several kinds of memory together.'),
      list('**Structure**: map the form (Intro, Verse, Chorus, Bridge) and the road signs.', '**Harmony**: learn the chords as **numbers** (1 – 5 – 6- – 4) and spot repeats.', '**Ear**: sing the melody and bass line away from the instrument.', '**Hands**: muscle memory — useful, but it fails under nerves if it is the only one.', '**Eyes**: picture the chart or the keyboard/fretboard shapes.'),
      ex('Memorise this as "1 – 5 – 6- – 4" in G', { seq: [[55, 59, 62], [50, 54, 57], [52, 55, 59], [48, 52, 55]] }, 'G D Em C'),
      tip('Test yourself: start from the middle of the song, e.g. the second chorus. If you can, you really know it.'),
    ], [{ gen: 'form', n: 3 }, { gen: 'nashville', n: 3 }, { gen: 'road-map', n: 2 }]),

    L('xc24', 'practice', 2, 'Keeping a practice journal', 5, [
      p('A short journal turns practice into progress you can **see**. Two minutes of writing at the end of a session saves you guessing next time.'),
      list('**Date and time** spent.', '**What** you worked on (song, bars, exercise).', '**Best clean tempo** reached.', '**One thing that improved**, one thing still hard.', '**Next step** for tomorrow.'),
      use('Looking back after a month is hugely motivating — and shows a teacher exactly where to help.'),
      tip('Write tomorrow\'s first task at the end of today\'s session. Starting becomes easy.'),
    ], [{ gen: 'practice-skill', n: 3 }, { gen: 'tempo-term', n: 3 }]),

    // ===== How to practise — level 3
    L('xc25', 'practice', 3, 'Deliberate practice', 7, [
      p('Playing through songs you already know feels good but changes little. **Deliberate practice** means working at the **edge** of your ability, on one precise weakness, with instant feedback.'),
      list('**Isolate**: a single bar, a single change, a single interval.', '**Define success** exactly: "the B note in tune, 5 times in a row".', '**Feedback** every repeat: tuner, metronome, recording or a teacher.', '**Adjust** something each time — slower, different fingering, more relaxed.', '**Stop** when quality drops; focus is limited, so short intense blocks win.'),
      use('Twenty deliberate minutes on the hard bridge beats an hour of playing the whole song again.'),
      tip('Mix things up: after you nail a passage, switch to something else and come back later. Spaced, varied practice sticks better.'),
    ], [{ gen: 'practice-skill', n: 4 }, { gen: 'interval-ear', n: 3 }]),

    L('xc26', 'practice', 3, 'Recording and assessing yourself', 7, [
      p('While you play, your brain is busy. Listening back to a **recording** shows what the audience really hears — timing, tone, balance and dynamics.'),
      list('Record with a metronome or backing track, then check: did I **rush** or **drag**?', 'Listen for **dynamics**: are verses really softer than choruses?', 'Check **tone and tuning** on long notes.', 'Listen once just as a listener: is it **musical**? Does it tell a story?', 'Pick only **one or two fixes**, practise them, record again.'),
      use('The Studio\'s timing and dynamics feedback is like a recording with a coach attached.'),
      tip('Keep old recordings. Comparing this month with three months ago is the best motivation there is.'),
    ], [{ gen: 'practice-skill', n: 3 }, { gen: 'dynamic-term', n: 3 }, { gen: 'tempo-term', n: 2 }], [{ label: 'Record in the Studio', go: 'studio' }]),

    L('xc27', 'practice', 3, 'Performing under pressure', 7, [
      p('Nerves are normal — even professionals feel them. A racing heart is energy; the aim is to **channel** it, not get rid of it. The best cure is to **practise performing**, not just practising.'),
      list('**Run-throughs**: play the whole piece without stopping, whatever happens.', '**Practise recovering**: deliberately jump back in at the next chord or section.', '**Simulate pressure**: play for a friend, record a "one take only" video.', '**Breathe**: slow breaths out before you start, and in your rests.', '**Focus outward**: on the song, the words and the people — not on yourself.'),
      use('In worship, mistakes matter less than you think. Keep going with confidence and the congregation will follow.'),
      tip('Know your first four bars perfectly. A confident start calms the rest of the performance.'),
    ], [{ gen: 'practice-skill', n: 3 }, { gen: 'road-map', n: 3 }]),

    L('xc28', 'practice', 3, 'Practising with teachers and friends', 6, [
      p('Practising alone builds skill; practising **with others** builds musicianship. A teacher sees what you can\'t, and friends make you listen, adapt and keep time together.'),
      list('**Lessons**: bring specific questions and a recording of your problem spot.', '**Duets**: one plays chords, one plays melody — then swap.', '**Call and response**: take turns making up 2-bar phrases.', '**Timing**: play together with a metronome and stay locked for 16 bars.', '**Feedback**: give one thing that was great and one thing to try.'),
      use('A weekly jam with one friend often teaches more about band playing than hours alone.'),
    ], [{ gen: 'practice-skill', n: 3 }, { gen: 'rhythm-count', n: 3 }, { gen: 'band-role', n: 2 }], [{ label: 'Call & response trainer', go: 'learn', activity: 'callresp' }]),
  ];
  const base = A.LESSONS.length;
  LESSONS.forEach((l, i) => { l.n = base + i + 1; A.LESSONS.push(l); });
})(typeof self !== 'undefined' ? self : globalThis);
