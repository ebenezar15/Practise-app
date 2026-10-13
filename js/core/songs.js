/* Cadenza — song charts: ChordPro parsing, transposition, capo, bar extraction for backing
 * tracks, and a starter library of public-domain hymns & spirituals. Teachers add more
 * (English, Tamil or any language) with chord PDFs from the Classroom server. */
(function (root) {
  'use strict';
  const PM = (root.PM = root.PM || {});
  const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const NOTE_RE = /^([A-G])([#b♯♭]?)/;
  // keys usually written with flats
  const FLAT_KEYS = new Set([5, 10, 3, 8, 1]);

  function notePc(s) {
    const m = NOTE_RE.exec(s || '');
    if (!m) return null;
    let pc = SHARPS.indexOf(m[1]);
    if (m[2] === '#' || m[2] === '♯') pc++;
    if (m[2] === 'b' || m[2] === '♭') pc--;
    return { pc: mod12(pc), len: m[0].length };
  }

  /** Split a chord symbol: "F#m7/C#" → {root: 6, suffix: 'm7', bass: 1} (null if not a chord). */
  function splitChord(name) {
    name = String(name || '').trim();
    const r = notePc(name);
    if (!r) return null;
    const rest = name.slice(r.len);
    const slash = rest.lastIndexOf('/');
    let suffix = rest, bass = null;
    if (slash >= 0) {
      const b = notePc(rest.slice(slash + 1));
      if (b && rest.slice(slash + 1).length === b.len) { bass = b.pc; suffix = rest.slice(0, slash); }
    }
    if (!/^[a-zA-Z0-9#b+°ø()\-,.]*$/.test(suffix)) return null;
    return { root: r.pc, suffix, bass };
  }

  /** Map any chord suffix onto the chord types the coach & backing generator understand. */
  function simpleType(suffix) {
    const s = String(suffix || '').replace(/[()]/g, '');
    if (/^(m7b5|ø|ø7|m7-5)$/.test(s)) return 'dim';
    if (/^(dim|°|dim7|°7|o|o7)$/.test(s)) return 'dim';
    if (/^(aug|\+|\+5|#5)/.test(s)) return 'aug';
    if (/^(maj7|M7|Δ|maj9|M9|maj13|Δ7)/.test(s)) return 'maj7';
    if (/^(m|min|-)(7|9|11|13)/.test(s)) return 'm7';
    if (/^(m|min|-)(?!aj)/.test(s)) return 'm';
    if (/^sus2/.test(s)) return 'sus2';
    if (/^sus/.test(s)) return 'sus4';
    if (/^5$/.test(s)) return '5';
    if (/^(7|9|11|13)/.test(s)) return '7';
    return '';
  }

  function spellPc(pc, flats) { return (flats ? FLATS : SHARPS)[mod12(pc)]; }

  /** Transpose a chord symbol by n semitones (keeps the suffix, spells for the target key). */
  function transposeChord(name, n, flats) {
    const c = splitChord(name);
    if (!c) return name;
    return spellPc(c.root + n, flats) + c.suffix + (c.bass != null ? '/' + spellPc(c.bass + n, flats) : '');
  }

  /** Key text ("G", "Bb", "F#m", "E minor") → {pc, minor}. */
  function parseKey(k) {
    const r = notePc(String(k || '').trim());
    if (!r) return null;
    const rest = String(k).trim().slice(r.len);
    return { pc: r.pc, minor: /^\s*(m(?!aj)|min)/i.test(rest) };
  }
  function keyName(key, n) {
    if (!key) return '';
    const pc = mod12(key.pc + (n || 0));
    const rel = key.minor ? mod12(pc + 3) : pc;
    return spellPc(pc, FLAT_KEYS.has(rel)) + (key.minor ? 'm' : '');
  }
  function prefersFlats(key, n) {
    if (!key) return false;
    const pc = mod12(key.pc + (n || 0));
    return FLAT_KEYS.has(key.minor ? mod12(pc + 3) : pc);
  }

  const hasTamil = (s) => /[஀-௿]/.test(s || '');

  /**
   * Parse ChordPro: {title: …}, {artist: …}, {key: …}, {time: 3/4}, {tempo: 80},
   * {start_of_chorus}/{soc} … {end_of_chorus}/{eoc}, {start_of_verse: Verse 1}/{sov},
   * {comment: …}/{c: …}, and lyric lines with [Chord] markers. Plain "chords over lyrics"
   * text (a chord-only line above a lyric line) is converted too.
   */
  function parseChart(text) {
    const meta = {};
    const lines = [];
    let section = null;
    const raw = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const isChordLine = (l) => {
      const toks = l.trim().split(/\s+/).filter(Boolean);
      return toks.length > 0 && toks.every((t) => splitChord(t) || /^[|/%x\-.]+$/.test(t)) && toks.some((t) => splitChord(t));
    };
    for (let i = 0; i < raw.length; i++) {
      const line = raw[i];
      const dir = /^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i.exec(line);
      if (dir) {
        const k = dir[1].toLowerCase(), v = dir[2] || '';
        if (['title', 't'].includes(k)) meta.title = v;
        else if (['subtitle', 'st', 'artist', 'composer', 'lyricist'].includes(k)) meta.author = meta.author || v;
        else if (k === 'key') meta.key = v;
        else if (k === 'time') meta.time = v;
        else if (k === 'tempo') meta.tempo = +v || undefined;
        else if (k === 'capo') meta.capo = +v || 0;
        else if (['start_of_chorus', 'soc'].includes(k)) { section = 'chorus'; lines.push({ type: 'section', label: v || 'Chorus', kind: 'chorus' }); }
        else if (['start_of_verse', 'sov'].includes(k)) { section = 'verse'; lines.push({ type: 'section', label: v || 'Verse', kind: 'verse' }); }
        else if (['start_of_bridge', 'sob'].includes(k)) { section = 'bridge'; lines.push({ type: 'section', label: v || 'Bridge', kind: 'bridge' }); }
        else if (/^end_of_|^eo[cvb]$/.test(k)) { section = null; lines.push({ type: 'end' }); }
        else if (['comment', 'c', 'ci', 'comment_italic'].includes(k)) lines.push({ type: 'comment', text: v });
        continue;
      }
      if (/^\s*#/.test(line)) continue; // ChordPro comment
      if (!line.trim()) { lines.push({ type: 'blank' }); continue; }
      const label = /^\s*(verse|chorus|bridge|refrain|intro|outro|pre-?chorus|tag|ending|pallavi|anupallavi|charanam|சரணம்|பல்லவி)\b[^:]{0,20}:?\s*$/i.exec(line);
      if (label) { lines.push({ type: 'section', label: line.trim().replace(/:$/, ''), kind: /chorus|refrain|pallavi|பல்லவி/i.test(line) ? 'chorus' : 'verse' }); continue; }
      // "chords over lyrics" → inline segments
      if (!/\[/.test(line) && isChordLine(line)) {
        const next = raw[i + 1];
        const chords = [];
        const re = /\S+/g;
        let m;
        while ((m = re.exec(line))) if (splitChord(m[0])) chords.push({ pos: m.index, chord: m[0] });
        if (next != null && next.trim() && !isChordLine(next) && !/^\s*\{/.test(next)) {
          i++;
          const segs = [];
          let prev = 0;
          if (chords.length && chords[0].pos > 0) segs.push({ chord: '', text: next.slice(0, chords[0].pos) });
          chords.forEach((c, k) => {
            const end = k + 1 < chords.length ? chords[k + 1].pos : Math.max(next.length, c.pos + c.chord.length);
            segs.push({ chord: c.chord, text: next.slice(c.pos, end) || ' ' });
            prev = end;
          });
          if (prev < next.length) segs[segs.length - 1].text += next.slice(prev);
          lines.push({ type: 'lyric', segs, section });
        } else {
          const entry = { type: 'lyric', segs: chords.map((c) => ({ chord: c.chord, text: ' ' })), section, chordsOnly: true };
          // "| G | C D | Em |" — explicit bars (one cell per bar, several chords share it)
          if (/\|/.test(line)) entry.barCells = line.split('|').map((c) => c.trim().split(/\s+/).filter((t) => splitChord(t) || t === '%')).filter((c) => c.length);
          lines.push(entry);
        }
        continue;
      }
      const segs = [];
      const re = /\[([^\]]*)\]/g;
      let last = 0, chord = '', m;
      while ((m = re.exec(line))) {
        const txt = line.slice(last, m.index);
        if (txt || chord) segs.push({ chord, text: txt });
        chord = m[1].trim();
        last = m.index + m[0].length;
      }
      segs.push({ chord, text: line.slice(last) });
      const cleaned = segs.filter((s, k) => s.chord || s.text || k === 0);
      lines.push({ type: 'lyric', segs: cleaned, section, chordsOnly: cleaned.every((s) => !s.text.trim()) });
    }
    while (lines.length && lines[lines.length - 1].type === 'blank') lines.pop();
    return { meta, lines };
  }

  /** Unique chords in order of appearance. */
  function chartChords(parsed) {
    const seen = [];
    for (const l of parsed.lines) if (l.type === 'lyric') for (const s of l.segs) if (s.chord && splitChord(s.chord) && !seen.includes(s.chord)) seen.push(s.chord);
    return seen;
  }

  function beatsPerBarOf(time) {
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(time || '').trim());
    if (!m) return 4;
    const num = +m[1], den = +m[2];
    if (den === 8 && num % 3 === 0) return num / 3 === 2 ? 2 : num / 3; // 6/8 → 2 dotted beats; 9/8 → 3; 12/8 → 4
    return Math.max(2, Math.min(12, num));
  }

  /**
   * Bars for the backing track. Explicit bar text wins ("G | C G | D7 | %", "%" repeats);
   * otherwise each lyric line spreads its chords over `barsPerLine` bars in proportion to
   * where they sit in the words. Returns [{chords: [{root, type, beats, name}], line}].
   */
  function chartBars(parsed, opts) {
    opts = opts || {};
    const bpb = opts.beatsPerBar || beatsPerBarOf(parsed.meta.time);
    const shift = opts.transpose || 0;
    const mk = (name, beats) => {
      const c = splitChord(name);
      return c ? { root: mod12(c.root + shift), type: simpleType(c.suffix), beats, name } : null;
    };
    if (opts.bars && String(opts.bars).trim()) {
      const out = [];
      let prev = null;
      for (const cell of String(opts.bars).split(/[|\n]+/)) {
        const toks = cell.trim().split(/\s+/).filter(Boolean);
        if (!toks.length) continue;
        let names = toks.map((t) => (t === '%' || t === '-' || t === '/' ? prev : t)).filter(Boolean);
        if (!names.length) continue;
        const chords = names.map((n) => mk(n, bpb / names.length)).filter(Boolean);
        if (!chords.length) continue;
        prev = names[names.length - 1];
        out.push({ chords, line: -1 });
      }
      return out;
    }
    const barsPerLine = opts.barsPerLine || (bpb === 3 ? 4 : 2);
    const slots = bpb === 3 ? 1 : 2; // chord changes on the bar (3/4) or half bar
    const out = [];
    let carry = null;
    parsed.lines.forEach((l, li) => {
      if (l.type !== 'lyric') return;
      if (l.barCells) {
        for (const cell of l.barCells) {
          const names = cell.map((t) => (t === '%' ? carry : t)).filter(Boolean);
          if (!names.length) continue;
          carry = names[names.length - 1];
          out.push({ chords: names.map((n) => mk(n, bpb / names.length)).filter(Boolean), line: li });
        }
        return;
      }
      const len = l.segs.reduce((n, s) => n + Math.max(1, s.text.length), 0);
      const nCh = l.segs.filter((s) => s.chord && splitChord(s.chord)).length;
      const lineBars = Math.max(barsPerLine, Math.ceil(nCh / slots));
      const total = lineBars * slots;
      const grid = new Array(total).fill(null);
      let pos = 0;
      for (const s of l.segs) {
        if (s.chord && splitChord(s.chord)) {
          let k = Math.min(total - 1, Math.floor((pos / len) * total));
          while (k < total - 1 && grid[k]) k++;
          grid[k] = s.chord;
        }
        pos += Math.max(1, s.text.length);
      }
      if (!grid.some(Boolean) && !carry) return;
      for (let k = 0; k < total; k++) { if (grid[k]) carry = grid[k]; else grid[k] = carry; }
      for (let b = 0; b < lineBars; b++) {
        const cells = grid.slice(b * slots, (b + 1) * slots).filter(Boolean);
        if (!cells.length) continue;
        const names = cells.length === 2 && cells[0] === cells[1] ? [cells[0]] : cells;
        out.push({ chords: names.map((n) => mk(n, bpb / names.length)).filter(Boolean), line: li });
      }
    });
    return out;
  }

  /**
   * Explicit bars describe one verse: repeat them for every verse/chorus block of the chart
   * and point each bar at the lyric line it accompanies (so the page can follow along).
   */
  function spreadBars(parsed, bars) {
    if (!bars.length || bars.some((b) => b.line >= 0)) return bars;
    const blocks = [];
    let cur = null;
    parsed.lines.forEach((l, i) => {
      if (l.type === 'section' || l.type === 'end' || (l.type === 'blank' && cur && cur.length)) { if (cur && cur.length) blocks.push(cur); cur = null; }
      if (l.type === 'lyric') (cur = cur || []).push(i);
    });
    if (cur && cur.length) blocks.push(cur);
    if (!blocks.length) return bars;
    const out = [];
    for (const lines of blocks) bars.forEach((b, i) => out.push({ chords: b.chords, line: lines[Math.floor((i * lines.length) / bars.length)] }));
    return out;
  }

  // ------------------------------------------------------------------ built-in library
  // Public-domain hymns and traditional spirituals (verses as originally published).
  const BUILTIN = [
    {
      id: 'pd-amazing-grace', title: 'Amazing Grace', author: 'John Newton (1779) · tune NEW BRITAIN', language: 'English', key: 'G', timeSig: '3/4', bpm: 84, tags: ['hymn', 'beginner'],
      bars: 'G | G | G7 | C G | G | G Em | D | D7 | G | G | G7 | C G | G Em | D7 | G | G',
      chart: `{start_of_verse: Verse 1}
A[G]mazing grace! How [G7]sweet the [C]sound
That [G]saved a wretch like [D]me! [D7]
I [G]once was lost, but [G7]now am [C]found;
Was [G]blind, but [D7]now I [G]see.
{end_of_verse}

{start_of_verse: Verse 2}
'Twas [G]grace that taught my [G7]heart to [C]fear,
And [G]grace my fears re[D]lieved; [D7]
How [G]precious did that [G7]grace ap[C]pear
The [G]hour I [D7]first be[G]lieved!
{end_of_verse}

{start_of_verse: Verse 3}
Through [G]many dangers, [G7]toils and [C]snares,
I [G]have already [D]come; [D7]
'Tis [G]grace hath brought me [G7]safe thus [C]far,
And [G]grace will [D7]lead me [G]home.
{end_of_verse}`,
    },
    {
      id: 'pd-what-a-friend', title: 'What a Friend We Have in Jesus', author: 'Joseph M. Scriven (1855) · Charles C. Converse (1868)', language: 'English', key: 'G', timeSig: '4/4', bpm: 92, tags: ['hymn', 'beginner'],
      bars: 'G | C G | G | D | G | C G | G D | G | D | G | D | G A7 D | G | C G | G D | G',
      chart: `{start_of_verse: Verse 1}
[G]What a friend we [C]have in [G]Jesus,
All our sins and [D]griefs to bear!
[G]What a privilege to [C]carry [G]
Every[G]thing to [D]God in [G]prayer!
[D]O what peace we often forfeit,
[G]O what needless pain we bear,
[G]All because we [C]do not [G]carry
Every[G]thing to [D]God in [G]prayer!
{end_of_verse}`,
    },
    {
      id: 'pd-it-is-well', title: 'It Is Well with My Soul', author: 'Horatio G. Spafford (1873) · Philip P. Bliss (1876)', language: 'English', key: 'C', timeSig: '4/4', bpm: 76, tags: ['hymn'],
      chart: `{start_of_verse: Verse 1}
When [C]peace like a [F]river at[C]tendeth my way,
When [Am]sorrows like [D7]sea billows [G]roll;
What[C]ever my [F]lot, Thou hast [C]taught me to [Am]say,
It is [C]well, it is [G7]well with my [C]soul.
{end_of_verse}

{start_of_chorus}
It is [G]well (it is well) with my [C]soul (with my soul),
It is [F]well, it is [C]well with my [G7]soul. [C]
{end_of_chorus}`,
    },
    {
      id: 'pd-holy-holy-holy', title: 'Holy, Holy, Holy', author: 'Reginald Heber (1826) · John B. Dykes (1861)', language: 'English', key: 'D', timeSig: '4/4', bpm: 80, tags: ['hymn', 'worship'],
      chart: `{start_of_verse: Verse 1}
[D]Holy, holy, [Bm]holy! [G]Lord God Al[D]mighty!
[D]Early in the [G]morning our [D]song shall [A]rise to [D]Thee; [A]
[D]Holy, holy, [Bm]holy, [G]merciful and [D]mighty!
[G]God in three [D]Persons, [A]blessed Trini[D]ty!
{end_of_verse}`,
    },
    {
      id: 'pd-leaning', title: 'Leaning on the Everlasting Arms', author: 'Elisha A. Hoffman & Anthony J. Showalter (1887)', language: 'English', key: 'G', timeSig: '4/4', bpm: 100, tags: ['hymn', 'gospel'],
      chart: `{start_of_verse: Verse 1}
[G]What a fellowship, [C]what a joy di[G]vine,
Leaning on the [A7]everlasting [D]arms;
[G]What a blessedness, [C]what a peace is [G]mine,
Leaning [D]on the everlasting [G]arms.
{end_of_verse}

{start_of_chorus}
[G]Leaning, [C]leaning,
[G]Safe and secure from all a[D]larms;
[G]Leaning, [C]leaning,
[G]Leaning on the [D]everlasting [G]arms.
{end_of_chorus}`,
    },
    {
      id: 'pd-nothing-but-the-blood', title: 'Nothing but the Blood', author: 'Robert Lowry (1876)', language: 'English', key: 'G', timeSig: '4/4', bpm: 96, tags: ['hymn', 'gospel'],
      chart: `{start_of_verse: Verse 1}
[G]What can wash away my sin?
[G]Nothing but the [D]blood of [G]Jesus;
[G]What can make me whole again?
[G]Nothing but the [D]blood of [G]Jesus.
{end_of_verse}

{start_of_chorus}
[G]Oh! precious is the [C]flow
That [G]makes me white as [D]snow;
[G]No other fount I [C]know,
[G]Nothing but the [D]blood of [G]Jesus.
{end_of_chorus}`,
    },
    {
      id: 'pd-i-surrender-all', title: 'I Surrender All', author: 'Judson W. Van DeVenter (1896) · Winfield S. Weeden', language: 'English', key: 'D', timeSig: '4/4', bpm: 84, tags: ['hymn', 'worship'],
      chart: `{start_of_verse: Verse 1}
[D]All to Jesus [G]I sur[D]render,
[D]All to Him I [A]freely give;
[D]I will ever [G]love and [D]trust Him,
In His [A]presence daily [D]live.
{end_of_verse}

{start_of_chorus}
I sur[D]render all, I sur[G]render [D]all,
All to [D]Thee, my blessed [G]Saviour,
I sur[D]render [A]all. [D]
{end_of_chorus}`,
    },
    {
      id: 'pd-silent-night', title: 'Silent Night', author: 'Joseph Mohr (1818) · Franz X. Gruber · English: John F. Young (1859)', language: 'English', key: 'C', timeSig: '3/4', bpm: 72, tags: ['carol', 'beginner'],
      bars: 'C | C | C | C | G | G | C | C | F | F | C | C | F | F | C | C | G | G | C | C | C G | G | C | C',
      chart: `{start_of_verse: Verse 1}
[C]Silent night, holy night,
[G]All is calm, [C]all is bright
[F]Round yon Virgin [C]Mother and Child.
[F]Holy Infant so [C]tender and mild,
[G]Sleep in heavenly [C]peace,
[C]Sleep in [G]heavenly [C]peace.
{end_of_verse}`,
    },
    {
      id: 'pd-saints', title: 'When the Saints Go Marching In', author: 'Traditional spiritual', language: 'English', key: 'G', timeSig: '4/4', bpm: 112, tags: ['spiritual', 'gospel', 'beginner'],
      bars: 'G | G | G | G | G | G | D | D | G | G7 | C | C | G | D | G | G',
      chart: `{start_of_chorus}
Oh, when the [G]saints go marching in,
Oh, when the saints go marching [D]in,
O [G]Lord, I [G7]want to be [C]in that number,
When the [G]saints go [D]marching [G]in.
{end_of_chorus}`,
    },
    {
      id: 'pd-swing-low', title: 'Swing Low, Sweet Chariot', author: 'Traditional spiritual', language: 'English', key: 'G', timeSig: '4/4', bpm: 76, tags: ['spiritual', 'gospel'],
      chart: `{start_of_chorus}
[G]Swing low, sweet [C]chari[G]ot,
Coming for to carry me [D]home;
[G]Swing low, sweet [C]chari[G]ot,
Coming for to [D]carry me [G]home.
{end_of_chorus}

{start_of_verse: Verse 1}
I [G]looked over Jordan, and [C]what did I [G]see,
Coming for to carry me [D]home?
A [G]band of angels [C]coming after [G]me,
Coming for to [D]carry me [G]home.
{end_of_verse}`,
    },
    {
      id: 'pd-this-little-light', title: 'This Little Light of Mine', author: 'Traditional spiritual', language: 'English', key: 'G', timeSig: '4/4', bpm: 108, tags: ['spiritual', 'gospel', 'kids', 'beginner'],
      chart: `{start_of_chorus}
[G]This little light of mine, I'm gonna let it shine;
[C]This little light of mine, I'm gonna let it [G]shine;
[G]This little light of mine, I'm gonna let it [Em]shine;
[G]Let it shine, let it [D]shine, let it [G]shine.
{end_of_chorus}`,
    },
  ];

  /** A blank chart a teacher can fill in — works for Tamil (or any script) lyrics. */
  const TEMPLATE = `{title: }
{key: G}
{time: 4/4}

{start_of_verse: Pallavi / Verse 1}
[G]Type the first lyric line here and put [C]chords in [G]brackets
[G]before the syllable where they [D]change
{end_of_verse}

{start_of_chorus}
[C]Chorus line [G]one
[D]Chorus line [G]two
{end_of_chorus}`;

  PM.Songs = { parseChart, chartChords, chartBars, spreadBars, splitChord, simpleType, transposeChord, parseKey, keyName, prefersFlats, beatsPerBarOf, hasTamil, BUILTIN, TEMPLATE };
  if (typeof module !== 'undefined' && module.exports) module.exports = PM.Songs;
})(typeof self !== 'undefined' ? self : globalThis);
