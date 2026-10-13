/* Cadenza — worship song library: public-domain hymns (with words) and practice arrangements
 * of well-known contemporary worship songs (Bethel Music, Hillsong and others) plus Tamil
 * worship practice patterns. Every song gets a generated tutorial for guitar and piano:
 * capo options, the hardest chord change, a strumming / picking pattern, smooth piano
 * voicings (voice-led inversions), a left-hand pattern and a section-by-section plan.
 *
 * Copyright note: lyrics of contemporary songs are protected, so those songs are chord charts
 * only (sections and bars). Their charts are simplified practice arrangements in a
 * playable key — check the official chart from the publisher / CCLI SongSelect for the
 * exact arrangement and the words. Hymns are public domain and include their words. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const mod12 = (x) => ((x % 12) + 12) % 12;

  // ------------------------------------------------------------------ playing patterns
  /** Strumming & picking patterns per feel. Grids: D down, U up, - rest; picking: B bass, 1-3 strings. */
  const FEELS = {
    ballad: { name: 'Worship ballad', grid: 8, strum: 'D-DU-UDU', easy: 'D-D-D-D-', pick: 'B3231323', pianoLH: 'Root + 5th + octave, held for the bar (or broken: 1-5-8 on beats 1, 2, 3)', pianoRH: 'Triads on beats 1 and 3; add a passing suspension (sus4 → 3) on the last beat of a phrase', drums: 'Pop ballad' },
    mid: { name: 'Mid-tempo pop worship', grid: 8, strum: 'D-DU-UDU', easy: 'D-D-DUDU', pick: 'B323B323', pianoLH: 'Root octaves on beats 1 and 3, a passing note into each new chord', pianoRH: 'Steady eighth-note chords, accent beats 2 and 4 lightly', drums: '8-beat pop' },
    upbeat: { name: 'Upbeat praise', grid: 8, strum: 'DUDUDUDU', easy: 'D-DUD-DU', pick: 'BUBUBUBU', pianoLH: 'Driving eighth-note octaves on the root', pianoRH: 'Syncopated chords: 1, the "&" of 2, and 4 (push into the next chord)', drums: 'Pop rock / disco praise' },
    slow68: { name: '6/8 worship', grid: 6, strum: 'D--DUD', easy: 'D--D--', pick: 'B32123', pianoLH: 'Broken chord 1-5-8-10-8-5 across the bar', pianoRH: 'Chord on beats 1 and 4 (the two big pulses)', drums: '6/8 ballad' },
    waltz: { name: 'Hymn waltz (3/4)', grid: 6, strum: 'D-DUDU', easy: 'D-D-D-', pick: 'B32323', pianoLH: 'Root on beat 1, chord on beats 2 and 3 ("oom-pah-pah")', pianoRH: 'Melody on top of the chord (hymn style)', drums: 'Waltz' },
    hymn: { name: 'Hymn (4/4)', grid: 8, strum: 'D-D-D-D-', easy: 'D---D---', pick: 'B3231323', pianoLH: 'Root and 5th in half notes, walking between chords', pianoRH: 'Four-part block chords, one per beat, with the melody on top', drums: 'Hymn / none' },
    keharwa: { name: 'Keharwa 4/4 (Tamil / Indian praise)', grid: 8, strum: 'D-DUD-DU', easy: 'D-D-D-D-', pick: 'B3B2B3B2', pianoLH: 'Root on 1, octave on the "&" of 2, root on 4', pianoRH: 'Short chords on the off-beats ("&") like the dholak', drums: 'Keharwa' },
    dadra: { name: 'Dadra / Thappu 6/8 (Tamil folk praise)', grid: 6, strum: 'D-UDU-', easy: 'D--D--', pick: 'B3B2B3', pianoLH: 'Root on 1, 5th on 4', pianoRH: 'Chords on 3 and 6 (the bounce)', drums: 'Dadra' },
  };

  const SHAPES = ['G', 'C', 'D', 'A', 'E', 'Em', 'Am', 'Dm']; // open-position friendly keys
  const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // ------------------------------------------------------------------ chart helpers
  const bars = (row) => row.trim();
  /** Build a chords-only ChordPro chart from sections [[label, kind, rows…]]. */
  function chordChart(sections) {
    return sections.map(([label, kind, ...rows]) => {
      const tag = kind === 'chorus' ? 'chorus' : kind === 'bridge' ? 'bridge' : 'verse';
      return `{start_of_${tag}: ${label}}\n${rows.map(bars).join('\n')}\n{end_of_${tag}}`;
    }).join('\n\n');
  }

  const NOTE = 'Practice arrangement — simplified chords in a guitar-friendly key. Check the official chart (publisher / CCLI SongSelect) for the exact arrangement and the words, and use your church\'s CCLI licence when projecting lyrics.';

  // ------------------------------------------------------------------ the library
  const LIBRARY = [
    // ---------- Bethel Music (chord charts only)
    { id: 'wl-goodness-of-god', title: 'Goodness of God', author: 'Bethel Music · Jenn Johnson', collection: 'Bethel Music', key: 'G', timeSig: '4/4', bpm: 63, feel: 'ballad', level: 1, tags: ['bethel', 'ballad', 'beginner'],
      chart: chordChart([['Verse', 'verse', '| G | C | G | D |', '| G | C | G | D |'], ['Chorus', 'chorus', '| C | G | D | Em |', '| C | G | D | D |'], ['Bridge', 'bridge', '| C | G/B | D | Em |', '| C | G/B | D | D |']]) },
    { id: 'wl-reckless-love', title: 'Reckless Love', author: 'Bethel Music · Cory Asbury', collection: 'Bethel Music', key: 'C', timeSig: '4/4', bpm: 83, feel: 'ballad', level: 2, tags: ['bethel', 'minor colour'],
      chart: chordChart([['Verse', 'verse', '| Am | F | C | G |', '| Am | F | C | G |'], ['Chorus', 'chorus', '| F | C | G | Am |', '| F | C | G | G |'], ['Bridge', 'bridge', '| Am | F | C | G |', '| Am | F | C | G |']]) },
    { id: 'wl-king-of-my-heart', title: 'King of My Heart', author: 'Bethel Music · Steffany Gretzinger', collection: 'Bethel Music', key: 'G', timeSig: '4/4', bpm: 68, feel: 'ballad', level: 1, tags: ['bethel', 'beginner'],
      chart: chordChart([['Verse', 'verse', '| G | C | Em | D |', '| G | C | Em | D |'], ['Chorus', 'chorus', '| C | G | D | Em |', '| C | G | D | D |'], ['Bridge', 'bridge', '| C | Em | D | G |', '| C | Em | D | D |']]) },
    { id: 'wl-one-thing-remains', title: 'One Thing Remains (Your Love Never Fails)', author: 'Bethel Music / Jesus Culture', collection: 'Bethel Music', key: 'A', timeSig: '4/4', bpm: 140, feel: 'upbeat', level: 2, tags: ['bethel', 'upbeat'],
      chart: chordChart([['Verse', 'verse', '| A | E | F#m | D |', '| A | E | F#m | D |'], ['Chorus', 'chorus', '| A | E | F#m | D |', '| A | E | D | D |'], ['Bridge', 'bridge', '| D | A | E | F#m |', '| D | A | E | E |']]) },

    // ---------- Hillsong (chord charts only)
    { id: 'wl-what-a-beautiful-name', title: 'What a Beautiful Name', author: 'Hillsong Worship', collection: 'Hillsong', key: 'D', timeSig: '4/4', bpm: 68, feel: 'ballad', level: 2, tags: ['hillsong', 'ballad'],
      chart: chordChart([['Verse', 'verse', '| D | A | Bm | A |', '| G | D | A | A |'], ['Chorus', 'chorus', '| D | A | Bm | A |', '| G | D | A | D |'], ['Bridge', 'bridge', '| G | A | Bm | Bm |', '| G | A | D | D |']]) },
    { id: 'wl-oceans', title: 'Oceans (Where Feet May Fail)', author: 'Hillsong UNITED', collection: 'Hillsong', key: 'D', timeSig: '4/4', bpm: 66, feel: 'ballad', level: 2, tags: ['hillsong', 'atmospheric'],
      chart: chordChart([['Verse', 'verse', '| Bm | A | D | D |', '| Bm | A | G | G |'], ['Chorus', 'chorus', '| G | D | A | A |', '| G | D | A | A |'], ['Bridge', 'bridge', '| Bm | G | D | A |', '| Bm | G | D | A |']]) },
    { id: 'wl-mighty-to-save', title: 'Mighty to Save', author: 'Hillsong Worship', collection: 'Hillsong', key: 'A', timeSig: '4/4', bpm: 73, feel: 'mid', level: 1, tags: ['hillsong', 'beginner'],
      chart: chordChart([['Verse', 'verse', '| A | E | F#m | D |', '| A | E | F#m | D |'], ['Chorus', 'chorus', '| A | E | F#m | D |', '| A | E | D | D |'], ['Bridge', 'bridge', '| F#m | D | A | E |', '| F#m | D | A | E |']]) },
    { id: 'wl-cornerstone', title: 'Cornerstone', author: 'Hillsong Worship', collection: 'Hillsong', key: 'C', timeSig: '4/4', bpm: 72, feel: 'ballad', level: 1, tags: ['hillsong', 'hymn-based'],
      chart: chordChart([['Verse', 'verse', '| C | F | C | G |', '| C | F | C G | C |'], ['Chorus', 'chorus', '| F | C | G | Am |', '| F | C | G | C |']]) },
    { id: 'wl-king-of-kings', title: 'King of Kings', author: 'Hillsong Worship', collection: 'Hillsong', key: 'D', timeSig: '4/4', bpm: 68, feel: 'ballad', level: 2, tags: ['hillsong', 'creed'],
      chart: chordChart([['Verse', 'verse', '| D | A | Bm | G |', '| D | A | G | G |'], ['Chorus', 'chorus', '| G | D | A | Bm |', '| G | D | A | D |']]) },
    { id: 'wl-shout-to-the-lord', title: 'Shout to the Lord', author: 'Hillsong · Darlene Zschech', collection: 'Hillsong', key: 'A', timeSig: '4/4', bpm: 74, feel: 'ballad', level: 2, tags: ['hillsong', 'classic'],
      chart: chordChart([['Verse', 'verse', '| A | F#m | D | E |', '| A | F#m | D | E |'], ['Chorus', 'chorus', '| A | F#m | D | E |', '| A | F#m | Bm | E |', '| C#m | D | E | A |']]) },

    // ---------- other contemporary worship (chord charts only)
    { id: 'wl-10000-reasons', title: '10,000 Reasons (Bless the Lord)', author: 'Matt Redman', collection: 'Contemporary worship', key: 'G', timeSig: '4/4', bpm: 73, feel: 'ballad', level: 1, tags: ['contemporary', 'beginner'],
      chart: chordChart([['Chorus', 'chorus', '| C | G | D | Em |', '| C | G | D | G |'], ['Verse', 'verse', '| C | G | D | Em |', '| C | G | D | G |']]) },
    { id: 'wl-how-great-is-our-god', title: 'How Great Is Our God', author: 'Chris Tomlin', collection: 'Contemporary worship', key: 'C', timeSig: '4/4', bpm: 78, feel: 'mid', level: 1, tags: ['contemporary', 'beginner'],
      chart: chordChart([['Verse', 'verse', '| C | Am | F | C |', '| C | Am | F | G |'], ['Chorus', 'chorus', '| C | Am | F | G |', '| C | Am | F | G |'], ['Bridge', 'bridge', '| C | Am | F | G |']]) },
    { id: 'wl-way-maker', title: 'Way Maker', author: 'Sinach', collection: 'Contemporary worship', key: 'E', timeSig: '4/4', bpm: 68, feel: 'ballad', level: 1, tags: ['contemporary', 'four chords', 'beginner'],
      chart: chordChart([['Verse', 'verse', '| E | B | C#m | A |', '| E | B | C#m | A |'], ['Chorus', 'chorus', '| E | B | C#m | A |', '| E | B | C#m | A |']]) },
    { id: 'wl-blessed-be-your-name', title: 'Blessed Be Your Name', author: 'Matt Redman', collection: 'Contemporary worship', key: 'A', timeSig: '4/4', bpm: 120, feel: 'upbeat', level: 1, tags: ['contemporary', 'upbeat'],
      chart: chordChart([['Verse', 'verse', '| A | E | F#m | D |', '| A | E | D | D |'], ['Chorus', 'chorus', '| A | E | F#m | D |', '| A | E | D | D |'], ['Bridge', 'bridge', '| A | E | F#m | D |']]) },
    { id: 'wl-here-i-am-to-worship', title: 'Here I Am to Worship', author: 'Tim Hughes', collection: 'Contemporary worship', key: 'E', timeSig: '4/4', bpm: 74, feel: 'ballad', level: 1, tags: ['contemporary', 'beginner'],
      chart: chordChart([['Verse', 'verse', '| E | B | A | A |', '| E | B | A | A |'], ['Chorus', 'chorus', '| E | B/D# | A | A |', '| E | B/D# | A | A |']]) },
    { id: 'wl-build-my-life', title: 'Build My Life', author: 'Housefires · Pat Barrett', collection: 'Contemporary worship', key: 'G', timeSig: '4/4', bpm: 68, feel: 'ballad', level: 1, tags: ['contemporary'],
      chart: chordChart([['Verse', 'verse', '| G | Em | C | D |', '| G | Em | C | D |'], ['Chorus', 'chorus', '| C | G | D | Em |', '| C | G | D | D |'], ['Bridge', 'bridge', '| C | G | D | Em |', '| C | G | D | D |']]) },
    { id: 'wl-holy-spirit', title: 'Holy Spirit (You Are Welcome Here)', author: 'Francesca Battistelli · Jesus Culture', collection: 'Contemporary worship', key: 'D', timeSig: '4/4', bpm: 68, feel: 'ballad', level: 1, tags: ['contemporary'],
      chart: chordChart([['Verse', 'verse', '| D | A | Bm | G |', '| D | A | G | G |'], ['Chorus', 'chorus', '| G | D | A | Bm |', '| G | D | A | A |']]) },
    { id: 'wl-chains-are-gone', title: 'Amazing Grace (My Chains Are Gone)', author: 'Chris Tomlin · verses John Newton (public domain)', collection: 'Contemporary worship', key: 'G', timeSig: '3/4', bpm: 76, feel: 'waltz', level: 1, tags: ['contemporary', 'hymn-based', 'beginner'],
      notes: 'The verses are the public-domain hymn — the words are on the "Amazing Grace" hymn page. The chorus words are copyrighted.',
      chart: chordChart([['Verse (Amazing Grace)', 'verse', '| G | G | C | G |', '| G | G | D | D |', '| G | G | C | G |', '| G | D | G | G |'], ['Chorus', 'chorus', '| C | G | Em | D |', '| C | G | D | G |']]) },

    // ---------- public-domain hymns (with words)
    { id: 'pd-be-thou-my-vision', title: 'Be Thou My Vision', author: 'Irish, tr. Mary Byrne (1905), v. Eleanor Hull (1912) · tune SLANE', collection: 'Hymns', key: 'D', timeSig: '3/4', bpm: 96, feel: 'waltz', level: 1, tags: ['hymn', 'celtic'],
      chart: `{start_of_verse: Verse 1}
[D]Be Thou my [G]Vi[D]sion, O [G]Lord of my [A]heart;
[Bm]Naught be all [G]else to me, [D]save that Thou [A]art.
[D]Thou my best [G]Thought, by [A]day or by [Bm]night,
[G]Waking or [D]sleeping, Thy [A]presence my [D]light.
{end_of_verse}` },
    { id: 'pd-blessed-assurance', title: 'Blessed Assurance', author: 'Fanny Crosby (1873) · Phoebe P. Knapp', collection: 'Hymns', key: 'D', timeSig: '3/4', bpm: 100, feel: 'waltz', level: 1, tags: ['hymn', 'gospel'],
      chart: `{start_of_verse: Verse 1}
[D]Blessed as[G]surance, [D]Jesus is mine!
O what a [E]foretaste of [A]glory divine!
[D]Heir of sal[G]vation, [D]purchase of God,
[G]Born of His [D]Spirit, [A]washed in His [D]blood.
{end_of_verse}

{start_of_chorus}
[D]This is my story, [G]this is my [D]song,
Praising my Savior [A]all the day long;
[D]This is my [G]story, [D]this is my song,
[G]Praising my [D]Savior [A]all the day [D]long.
{end_of_chorus}` },
    { id: 'pd-come-thou-fount', title: 'Come, Thou Fount of Every Blessing', author: 'Robert Robinson (1758) · tune NETTLETON', collection: 'Hymns', key: 'D', timeSig: '3/4', bpm: 100, feel: 'waltz', level: 1, tags: ['hymn'],
      chart: `{start_of_verse: Verse 1}
[D]Come, Thou Fount of [G]every [D]blessing,
Tune my heart to [A]sing Thy [D]grace;
Streams of mercy, [G]never [D]ceasing,
Call for songs of [A]loudest [D]praise.
Teach me some me[A]lodious [D]sonnet,
Sung by flaming [A]tongues a[D]bove;
Praise the mount! I'm [G]fixed up[D]on it,
Mount of Thy re[A]deeming [D]love.
{end_of_verse}` },
    { id: 'pd-to-god-be-the-glory', title: 'To God Be the Glory', author: 'Fanny Crosby (1875) · William H. Doane', collection: 'Hymns', key: 'G', timeSig: '4/4', bpm: 104, feel: 'hymn', level: 2, tags: ['hymn', 'praise'],
      chart: `{start_of_verse: Verse 1}
[G]To God be the glory, [C]great things He hath [G]done!
So loved He the world that He [A7]gave us His [D]Son,
Who [G]yielded His life an a[C]tonement for [G]sin,
And [C]opened the [G]life gate that [D7]all may go [G]in.
{end_of_verse}

{start_of_chorus}
[D]Praise the Lord, praise the Lord, let the [G]earth hear His voice!
[D]Praise the Lord, praise the Lord, let the [G]people rejoice!
O [G]come to the Father, through [C]Jesus the [G]Son,
And [C]give Him the [G]glory, great [D7]things He hath [G]done!
{end_of_chorus}` },
    { id: 'pd-old-rugged-cross', title: 'The Old Rugged Cross', author: 'George Bennard (1912)', collection: 'Hymns', key: 'G', timeSig: '3/4', bpm: 88, feel: 'waltz', level: 1, tags: ['hymn', 'gospel'],
      chart: `{start_of_verse: Verse 1}
[G]On a hill far away stood an [G7]old rugged [C]cross,
The [D7]emblem of suff'ring and [G]shame;
And I love that old cross where the [G7]dearest and [C]best
For a [D7]world of lost sinners was [G]slain.
{end_of_verse}

{start_of_chorus}
So I'll [D7]cherish the old rugged [G]cross,
Till my [D7]trophies at last I lay [G]down;
I will [G7]cling to the old rugged [C]cross,
And ex[G]change it some [D7]day for a [G]crown.
{end_of_chorus}` },
    { id: 'pd-doxology', title: 'Doxology (Praise God, from Whom All Blessings Flow)', author: 'Thomas Ken (1674) · tune OLD HUNDREDTH', collection: 'Hymns', key: 'G', timeSig: '4/4', bpm: 80, feel: 'hymn', level: 1, tags: ['hymn', 'beginner', 'kids'],
      chart: `{start_of_verse: Doxology}
[G]Praise God, from [Em]whom all [C]blessings [D]flow;
[G]Praise Him, all [Em]creatures [D]here be[G]low;
[G]Praise Him a[D]bove, ye [Em]heavenly [Bm]host;
[C]Praise Father, [G]Son, and [D]Holy [G]Ghost.
[C]A[G]men.
{end_of_verse}` },
    { id: 'pd-joyful-joyful', title: 'Joyful, Joyful, We Adore Thee', author: 'Henry van Dyke (1907) · Ludwig van Beethoven', collection: 'Hymns', key: 'G', timeSig: '4/4', bpm: 100, feel: 'hymn', level: 1, tags: ['hymn', 'kids', 'praise'],
      chart: `{start_of_verse: Verse 1}
[G]Joyful, joyful, [D]we a[G]dore Thee,
God of [Em]glory, [D]Lord of [G]love;
Hearts un[C]fold like [G]flowers be[D]fore Thee,
[G]Opening [Em]to the [D]sun a[G]bove.
[D]Melt the clouds of [G]sin and sadness;
[D]Drive the dark of [G]doubt away;
[G]Giver of im[C]mortal [G]gladness,
[G]Fill us [D]with the [D7]light of [G]day!
{end_of_verse}` },

    // ---------- Tamil worship practice patterns (rhythms & progressions used in Tamil praise)
    { id: 'ta-keharwa-praise', title: 'துதி பாடல் பயிற்சி — Keharwa praise in D', author: 'Practice pattern · Tamil praise (துதி) style', collection: 'Tamil worship', language: 'Tamil', key: 'D', timeSig: '4/4', bpm: 112, feel: 'keharwa', level: 1, tags: ['tamil', 'praise', 'keharwa'],
      notes: 'The Keharwa groove and I–IV–V progression behind many fast Tamil praise songs. Add your song\'s words with "Make my copy" (Tamil script works), or ask your teacher to add the song with its chord sheet.',
      chart: chordChart([['பல்லவி (Pallavi)', 'chorus', '| D | D | G | A |', '| D | G | A | D |'], ['அனுபல்லவி (Anupallavi)', 'verse', '| G | G | D | D |', '| Em | A | D | D |'], ['சரணம் (Charanam)', 'verse', '| D | Bm | G | A |', '| D | Bm | A | D |']]) },
    { id: 'ta-thappu-68', title: 'தப்பு தாளம் — 6/8 folk praise in E', author: 'Practice pattern · Tamil folk / Thappu groove', collection: 'Tamil worship', language: 'Tamil', key: 'E', timeSig: '6/8', bpm: 96, feel: 'dadra', level: 2, tags: ['tamil', 'folk', '6/8'],
      notes: 'The bouncy 6/8 (Dadra / Thappu) feel of Tamil folk-style praise and Christmas songs. Keep the bass on beats 1 and 4.',
      chart: chordChart([['பல்லவி (Pallavi)', 'chorus', '| E | E | A | B |', '| E | A | B | E |'], ['சரணம் (Charanam)', 'verse', '| C#m | A | E | B |', '| C#m | A | B | E |']]) },
    { id: 'ta-aaradhanai-ballad', title: 'ஆராதனை — slow worship in G', author: 'Practice pattern · Tamil worship (ஆராதனை) ballad', collection: 'Tamil worship', language: 'Tamil', key: 'G', timeSig: '4/4', bpm: 66, feel: 'ballad', level: 1, tags: ['tamil', 'worship', 'ballad'],
      notes: 'A slow ஆராதனை (worship) progression with the minor vi and relative-minor colour common in Tamil worship songs.',
      chart: chordChart([['பல்லவி (Pallavi)', 'chorus', '| G | D | Em | C |', '| G | D | C | D |'], ['சரணம் (Charanam)', 'verse', '| Em | C | G | D |', '| Em | C | D | G |']]) },
    { id: 'ta-minor-lament', title: 'ஜெப பாடல் — prayer song in A minor', author: 'Practice pattern · Tamil prayer song (ஜெபம்)', collection: 'Tamil worship', language: 'Tamil', key: 'Am', timeSig: '3/4', bpm: 84, feel: 'waltz', level: 2, tags: ['tamil', 'prayer', 'minor'],
      notes: 'A minor-key 3/4 pattern used for prayer and devotional songs; the E (major) chord gives the classic "pull" back to A minor.',
      chart: chordChart([['பல்லவி (Pallavi)', 'chorus', '| Am | Dm | E | Am |', '| Am | Dm | E | Am |'], ['சரணம் (Charanam)', 'verse', '| C | G | Am | Am |', '| F | G | E | E |']]) },
    { id: 'ta-christmas-carol', title: 'கிறிஸ்துமஸ் பாடல் — carol pattern in C', author: 'Practice pattern · Tamil Christmas carol style', collection: 'Tamil worship', language: 'Tamil', key: 'C', timeSig: '4/4', bpm: 120, feel: 'keharwa', level: 1, tags: ['tamil', 'christmas', 'kids'],
      notes: 'Bright I–IV–V–I carol pattern with a Keharwa beat — the shape of many Tamil Christmas carols.',
      chart: chordChart([['பல்லவி (Pallavi)', 'chorus', '| C | F | G | C |', '| C | F | G | C |'], ['சரணம் (Charanam)', 'verse', '| Am | F | C | G |', '| Am | F | G | C |']]) },
    { id: 'ta-mayamalavagowla', title: 'மாயாமாளவகௌளை — Carnatic-colour worship in C', author: 'Practice pattern · raga Mayamalavagowla colour', collection: 'Tamil worship', language: 'Tamil', key: 'C', timeSig: '4/4', bpm: 72, feel: 'ballad', level: 3, tags: ['tamil', 'carnatic', 'raga'],
      notes: 'Chords from the Mayamalavagowla raga (S R1 G3 M1 P D1 N3): C, Db, Fm and G give the devotional Carnatic flavour. Sing the Sarali varisai exercise in Learn first.',
      chart: chordChart([['பல்லவி (Pallavi)', 'chorus', '| C | Db | C | C |', '| Fm | Db | G | C |'], ['சரணம் (Charanam)', 'verse', '| Fm | C | Db | C |', '| Fm | G | Db | C |']]) },
  ];
  for (const s of LIBRARY) {
    s.language = s.language || 'English';
    s.lyrics = s.collection === 'Hymns' ? 'full' : 'chords';
    if (s.collection !== 'Hymns' && !s.notes) s.notes = NOTE;
    else if (s.collection !== 'Hymns' && s.collection !== 'Tamil worship') s.notes += '\n\n' + NOTE;
    s.tags = (s.tags || []).concat([s.collection.toLowerCase()]);
  }

  // ------------------------------------------------------------------ tutorial generation
  const T = () => PM.Theory, S = () => PM.Songs;

  /** Unique chords of a chart in order, and all chord changes with counts. */
  function chordStats(song) {
    const parsed = S().parseChart(song.chart || '');
    const seq = [];
    for (const l of parsed.lines) if (l.type === 'lyric') for (const s of l.segs) if (s.chord && S().splitChord(s.chord)) seq.push(s.chord);
    const unique = [...new Set(seq)];
    const pairs = {};
    for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) { const k = seq[i - 1] + ' → ' + seq[i]; pairs[k] = (pairs[k] || 0) + 1; }
    return { parsed, seq, unique, pairs };
  }

  const isBarre = (name) => { const c = S().splitChord(name); if (!c) return false; const sh = T().guitarShape(c.root, S().simpleType(c.suffix)); return !!(sh && sh.barre); };

  /** Capo options that turn the song into open-chord shapes. */
  function capoOptions(song) {
    const key = S().parseKey(song.key || '');
    if (!key) return [];
    const minor = key.minor;
    const out = [];
    for (let capo = 0; capo <= 7; capo++) {
      const pc = mod12(key.pc - capo);
      const name = NAMES[pc] + (minor ? 'm' : '');
      if (SHAPES.includes(name)) {
        const shifted = chordStats(song).unique.map((c) => S().transposeChord(c, -capo, false));
        const barre = shifted.filter(isBarre).length;
        out.push({ capo, shapes: name, barre, chords: shifted });
      }
    }
    return out.sort((a, b) => a.barre - b.barre || a.capo - b.capo).slice(0, 3);
  }

  /** Right-hand piano voicings with the least movement between chords (C4–C5 area). */
  function voiceLead(chords) {
    const out = [];
    let prev = null;
    for (const name of chords) {
      const c = S().splitChord(name);
      if (!c) { out.push(null); continue; }
      const pcs = T().chordPcs(c.root, S().simpleType(c.suffix)).slice(0, 4);
      const cands = [];
      for (let inv = 0; inv < pcs.length; inv++) {
        const order = pcs.slice(inv).concat(pcs.slice(0, inv));
        for (const base of [55, 60, 64]) {
          const notes = [];
          let cur = base;
          for (const pc of order) { let m = cur + mod12(pc - cur); if (notes.length && m <= notes[notes.length - 1]) m += 12; notes.push(m); cur = m; }
          if (notes[0] >= 52 && notes[notes.length - 1] <= 79) cands.push({ notes, inv });
        }
      }
      const centre = (n) => n.reduce((a, b) => a + b, 0) / n.length;
      let best = null, bestCost = Infinity;
      for (const cd of cands) {
        // total movement from the previous voicing (first chord: stay near middle C–E)
        const cost = prev ? cd.notes.reduce((a, m, i) => a + Math.abs(m - (prev[i] != null ? prev[i] : prev[prev.length - 1])), 0) : Math.abs(centre(cd.notes) - 64);
        if (cost < bestCost) { best = cd; bestCost = cost; }
      }
      prev = best.notes;
      const invName = ['root position', '1st inversion', '2nd inversion', '3rd inversion'][best.inv];
      out.push({ chord: name, notes: best.notes, names: best.notes.map((m) => PM.DSP.midiName(m)), inversion: invName, bass: PM.DSP.pcName(c.bass != null ? c.bass : c.root) });
    }
    return out;
  }

  /** Section-by-section dynamics plan. */
  function roadmap(parsed) {
    const secs = parsed.lines.filter((l) => l.type === 'section');
    return secs.map((s, i) => {
      const k = s.kind, last = i === secs.length - 1;
      return { label: s.label, plan: k === 'chorus' ? (last ? 'Full and joyful — strum the full pattern, piano both hands with octaves' : 'Lift: full strumming pattern / piano right hand an octave higher') : k === 'bridge' ? 'Build: start soft with single strums on beat 1, add strums every 4 bars, finish big' : i === 0 ? 'Gentle: let chords ring (one strum per bar) or finger-pick; piano left hand + soft triads' : 'Steady: easy strumming pattern, piano triads on beats 1 and 3' };
    });
  }

  /** A full tutorial for guitar and piano. */
  function tutorial(song) {
    const feel = FEELS[song.feel] || (song.timeSig === '3/4' ? FEELS.waltz : song.timeSig === '6/8' ? FEELS.slow68 : FEELS.mid);
    const st = chordStats(song);
    const hardest = Object.entries(st.pairs).map(([k, n]) => {
      const [a, b] = k.split(' → ');
      const diff = (isBarre(a) ? 1 : 0) + (isBarre(b) ? 1 : 0);
      return { pair: k, n, diff };
    }).sort((x, y) => y.diff - x.diff || y.n - x.n)[0] || null;
    const capo = capoOptions(song);
    const piano = voiceLead(st.unique);
    const bpm = song.bpm || 80;
    const steps = [
      { t: 'Listen & map', d: `The song has ${st.parsed.lines.filter((l) => l.type === 'section').map((s) => s.label).join(', ') || 'one section'}. Count the bars of each part while the backing band plays.` },
      { t: `Learn the ${st.unique.length} chords`, d: `${st.unique.join(' · ')} — say each name as you form it, then play each one 4 times.` },
      hardest ? { t: 'Drill the hardest change', d: `${hardest.pair} (${hardest.n}× in the song). One-minute changes: switch back and forth for 60 seconds and count the clean changes; try to beat it tomorrow.` } : null,
      { t: 'Rhythm alone', d: `Strum "${pattern(feel.easy)}" with the metronome at ${Math.round(bpm * 0.7)} BPM, muting the strings. Then the full pattern "${pattern(feel.strum)}".` },
      { t: 'Section by section', d: 'Loop each section with the backing band at 75% speed. Only move on when it feels easy.' },
      { t: 'Shape the song', d: 'Follow the dynamics roadmap below: soft verses, lifted choruses, a bridge that builds.' },
      { t: 'Play it through & record', d: `Full speed (${bpm} BPM) with the band, then press "Record & send" for your teacher.` },
    ].filter(Boolean);
    return { feel, unique: st.unique, hardest, capo, piano, steps, roadmap: roadmap(st.parsed), bpm };
  }

  /** "D-DU-UDU" → "↓ · ↓ ↑ · ↑ ↓ ↑" */
  function pattern(p) { return String(p || '').split('').map((c) => (c === 'D' ? '↓' : c === 'U' ? '↑' : c === 'B' ? 'B' : /[123]/.test(c) ? c : '·')).join(' '); }

  // the library joins the built-in song list (hymns already there are not duplicated)
  if (PM.Songs) { const have = new Set(PM.Songs.BUILTIN.map((x) => x.id)); for (const s of LIBRARY) if (!have.has(s.id)) PM.Songs.BUILTIN.push(s); }

  const COLLECTIONS = ['Bethel Music', 'Hillsong', 'Contemporary worship', 'Hymns', 'Tamil worship'];

  PM.Worship = { LIBRARY, FEELS, COLLECTIONS, tutorial, voiceLead, capoOptions, chordStats, pattern, chordChart, NOTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Worship;
})(typeof self !== 'undefined' ? self : globalThis);
