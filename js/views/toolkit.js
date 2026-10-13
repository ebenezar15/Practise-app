/* Overture — Music Toolkit: quick reference tools for students and worship teams.
 * Chord dictionary · scale finder · interactive circle of fifths · transposer & capo
 * calculator · glossary of musical terms. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Theory, Instruments, Songs } = PM;
  const { icon, esc, $, $$ } = UI;
  const mod12 = (x) => ((x % 12) + 12) % 12;
  const NAMES = ['C', 'C♯/D♭', 'D', 'E♭', 'E', 'F', 'F♯/G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
  const FLATKEY = (pc) => [5, 10, 3, 8, 1].includes(mod12(pc));

  const GLOSSARY = [
    ['Accidental', 'A sharp ♯, flat ♭ or natural ♮ that changes a note.'], ['Arpeggio', 'The notes of a chord played one at a time.'], ['Bar (measure)', 'A group of beats between two bar lines.'],
    ['Beat', 'The steady pulse of the music.'], ['BPM', 'Beats per minute — the tempo.'], ['Bridge', 'A contrasting section of a song, usually before the last chorus.'],
    ['Cadence', 'A chord pattern that ends a phrase (perfect V–I, plagal IV–I, half →V, deceptive V–vi).'], ['Capo', 'A clamp on the guitar neck that raises every string.'], ['Chord', 'Three or more notes played together.'],
    ['Chord progression', 'A sequence of chords, e.g. I–V–vi–IV.'], ['Chorus', 'The repeated main section of a song with the hook.'], ['Chromatic', 'Moving by half steps; notes outside the key.'],
    ['Circle of fifths', 'All 12 keys arranged by fifths; neighbours share most notes.'], ['Coda 𝄌', 'An ending section you jump to.'], ['Crescendo', 'Gradually louder.'],
    ['D.C. (da capo)', 'Go back to the beginning.'], ['D.S. (dal segno)', 'Go back to the sign 𝄋.'], ['Decrescendo / diminuendo', 'Gradually softer.'],
    ['Diatonic', 'Using only the notes of the key.'], ['Dominant', 'The 5th degree (V) and its chord — tension that wants to resolve home.'], ['Downbeat', 'Beat 1 of a bar.'],
    ['Dynamics', 'How loud or soft the music is (pp, p, mp, mf, f, ff).'], ['Enharmonic', 'Two names for the same pitch (C♯ = D♭).'], ['Fermata 𝄐', 'Hold the note longer than written.'],
    ['Fill', 'A short drum or instrumental phrase that leads into the next section.'], ['Groove', 'The rhythmic feel of a song.'], ['Half step', 'The smallest distance in Western music (one key or one fret).'],
    ['Harmony', 'Notes sounding together; the chords under a melody.'], ['Hook', 'The catchiest, most memorable part of a song.'], ['Interval', 'The distance between two notes.'],
    ['Inversion', 'A chord with a note other than the root in the bass (C/E).'], ['Key', 'The home scale and chord of a piece.'], ['Key signature', 'The sharps or flats at the start of each line.'],
    ['Legato', 'Smooth and connected.'], ['Major', 'A bright-sounding scale, chord or key.'], ['Melody', 'The tune — a line of single notes.'],
    ['Meter', 'How beats are grouped (time signature).'], ['Minor', 'A darker-sounding scale, chord or key.'], ['Mode', 'A scale built on a degree of the major scale (Dorian, Mixolydian…).'],
    ['Motif', 'A short musical idea that is repeated and developed.'], ['Nashville numbers', 'Chords written as numbers of the key (1 4 5 6-).'], ['Octave', 'The same note 8 letters higher or lower.'],
    ['Pad', 'A long sustained sound that fills the background.'], ['Pentatonic', 'A five-note scale.'], ['Phrase', 'A musical sentence, often 2 or 4 bars.'],
    ['Pickup (anacrusis)', 'Notes before the first full bar.'], ['Pre-chorus', 'A short build into the chorus.'], ['Relative minor', 'The minor key sharing the key signature of a major key (C → Am).'],
    ['Rest', 'A silent beat.'], ['Riff', 'A short repeated instrumental pattern.'], ['Root', 'The note a chord is built on and named after.'],
    ['Scale', 'An ordered set of notes (major, minor, pentatonic…).'], ['Slash chord', 'A chord over a specific bass note (G/B).'], ['Staccato', 'Short and detached.'],
    ['Strumming pattern', 'The rhythm of down and up strums.'], ['Subdominant', 'The 4th degree (IV) and its chord.'], ['Sus chord', 'A chord with the 2nd or 4th instead of the 3rd.'],
    ['Swing', 'Playing pairs of eighth notes long-short.'], ['Syncopation', 'Accents on off-beats or between beats.'], ['Tag', 'A repeated last line at the end of a song.'],
    ['Tempo', 'The speed of the beat.'], ['Tie', 'A curved line joining two notes into one longer note.'], ['Time signature', 'Numbers showing beats per bar and the beat unit.'],
    ['Tonic', 'The home note and chord of a key (I).'], ['Transpose', 'Move music up or down to a different key.'], ['Triad', 'A three-note chord: root, 3rd, 5th.'],
    ['Triplet', 'Three notes in the time of two.'], ['Upbeat', 'The beat before the downbeat; the "&".'], ['Verse', 'The story section of a song, with new words each time.'],
    ['Voice leading', 'Moving each note of one chord smoothly to the next.'], ['Voicing', 'How the notes of a chord are arranged.'], ['Whole step', 'Two half steps.'],
    ['Pallavi / பல்லவி', 'The refrain of a Carnatic or Tamil song, like a chorus.'], ['Anupallavi / அனுபல்லவி', 'The second section of a Carnatic song that answers the pallavi.'], ['Charanam / சரணம்', 'The verse sections of a Carnatic or Tamil song.'],
    ['Raga', 'An Indian melodic framework: a scale plus characteristic phrases and mood.'], ['Tala', 'An Indian rhythmic cycle (Adi tala = 8 beats).'], ['Sruti / Shruti', 'The reference pitch (drone) a singer tunes to.'],
  ];

  PM.App.register({
    id: 'toolkit', title: 'Music Toolkit', icon: 'sliders',
    render(host, App) {
      let tab = App.toolkitTab || 'chords';
      const TABS = [['chords', '🎸 Chord dictionary'], ['scales', '🪜 Scale finder'], ['circle', '⭕ Circle of fifths'], ['transpose', '🔁 Transpose & capo'], ['glossary', '📚 Glossary']];
      host.innerHTML = `<div class="page-head"><div><div class="eyebrow">Music Toolkit</div><h1>Quick reference tools</h1><p>Look up any chord or scale, explore keys on the circle of fifths, transpose a chord chart, find the right capo and look up musical words.</p></div></div>
        <div class="seg seg-wrap big-tabs" id="tkTabs">${TABS.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <section class="card" id="tkBody" style="margin-top:16px"></section>`;
      const body = $('#tkBody', host);
      const I = Instruments.get(App.instrument);
      const keys = (hl, lo) => PM.AcademyView.keysSvg(hl, lo);
      const play = (spec) => PM.AcademyView.play(spec);
      const draw = () => {
        $$('#tkTabs [data-t]', host).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
        if (tab === 'chords') {
          const root = App.tkRoot != null ? App.tkRoot : 0, type = App.tkType != null ? App.tkType : '';
          const T = Theory.TYPE_BY_ID[type], pcs = Theory.chordPcs(root, type), fl = FLATKEY(root) || type === 'm';
          const name = Theory.chordName(root, type, fl);
          const midis = pcs.map((pc) => 60 + mod12(pc - root) + root - (root > 5 ? 12 : 0));
          body.innerHTML = `<div class="row" style="gap:10px;flex-wrap:wrap"><label class="field">Root<select id="tkR">${NAMES.map((n, i) => `<option value="${i}" ${i === root ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field">Type<select id="tkT">${Theory.CHORD_TYPES.map((t) => `<option value="${t.id}" ${t.id === type ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label></div>
            <div class="tk-chord pop-in"><h2>${esc(name)} <small>${esc(T.label)}</small></h2>
              <p>Notes: <b>${pcs.map((pc) => Theory.spell(pc, fl)).join(' – ')}</b> · formula: ${T.iv.map((iv) => ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♯5', '6', '♭7', '7'][iv]).join(' ')}</p>
              <div class="row" style="gap:20px;align-items:center;flex-wrap:wrap"><div>${UI.chordDiagram(name)}<div class="small muted" style="text-align:center">guitar</div></div><div>${keys(midis, 48)}<div class="small muted">piano</div></div></div>
              <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="tkPlay">▶ Hear it</button><button class="btn ghost" id="tkArp">▶ Arpeggio</button></div>
              <h4 style="margin:16px 0 6px">Same root, every type</h4><div class="tk-chips">${Theory.CHORD_TYPES.map((t) => `<button class="chip" data-type="${t.id}">${esc(Theory.chordName(root, t.id, fl))}</button>`).join('')}</div>
              <h4 style="margin:16px 0 6px">Keys this chord belongs to</h4><p class="small">${keysContaining(root, type).map((k) => esc(k)).join(' · ') || '—'}</p></div>`;
          $('#tkR', body).onchange = (e) => { App.tkRoot = +e.target.value; draw(); };
          $('#tkT', body).onchange = (e) => { App.tkType = e.target.value; draw(); };
          $$('[data-type]', body).forEach((b) => (b.onclick = () => { App.tkType = b.dataset.type; draw(); }));
          $('#tkPlay', body).onclick = () => play({ chord: midis });
          $('#tkArp', body).onclick = () => play({ notes: midis.concat([midis[0] + 12]) });
        } else if (tab === 'scales') {
          const tonic = App.tkSRoot != null ? App.tkSRoot : 0, sc = App.tkScale || 'major';
          const S = PM.Learn.SCALES[sc];
          const notes = S.iv.map((iv) => 60 + tonic + iv - (tonic > 6 ? 12 : 0)).concat([72 + tonic - (tonic > 6 ? 12 : 0)]);
          const fl = FLATKEY(tonic) || /minor|dorian|minpent|blues|harmonic|melodic/.test(sc);
          const steps = S.iv.slice(1).concat(12).map((v, i) => v - S.iv[i]).map((d) => (d === 1 ? 'H' : d === 2 ? 'W' : d === 3 ? 'W+H' : d));
          const frets = I.strings ? notes.slice(0, -1).map((m) => { let x = m; while (x > 76) x -= 12; const fp = Instruments.fretPosition(I.id === 'voice' ? 'guitar' : I.id, x); return fp ? `${I.stringNames[fp.string]} fret ${fp.fret}` : ''; }) : [];
          body.innerHTML = `<div class="row" style="gap:10px;flex-wrap:wrap"><label class="field">Key<select id="tkSR">${NAMES.map((n, i) => `<option value="${i}" ${i === tonic ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field">Scale<select id="tkSS">${Object.entries(PM.Learn.SCALES).map(([k, v]) => `<option value="${k}" ${k === sc ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label></div>
            <div class="tk-chord pop-in"><h2>${esc(Theory.spell(tonic, fl))} ${esc(S.name)}</h2>
            <p>Notes: <b>${notes.slice(0, -1).map((m) => Theory.spell(m, fl)).join(' ')}</b> · steps: ${steps.join(' ')}</p>
            ${keys(notes, 48)}
            ${frets.length ? `<p class="small">On ${esc(I.short.toLowerCase())}: ${frets.map(esc).join(' · ')}</p>` : ''}
            <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="tkPlayS">▶ Up</button><button class="btn ghost" id="tkPlayS2">▶ Up & down</button><button class="btn ghost" id="tkPractise">Practise it with feedback →</button></div>
            ${sc === 'major' || sc === 'minor' ? `<h4 style="margin:16px 0 6px">Chords in this key</h4><div class="tk-chips">${Theory.diatonicChords(tonic, sc === 'major' ? 'major' : 'minor', fl).map((c) => `<span class="chip"><b>${esc(c.roman)}</b> ${esc(c.name)}</span>`).join('')}</div>` : ''}</div>`;
          $('#tkSR', body).onchange = (e) => { App.tkSRoot = +e.target.value; draw(); };
          $('#tkSS', body).onchange = (e) => { App.tkScale = e.target.value; draw(); };
          $('#tkPlayS', body).onclick = () => play({ notes });
          $('#tkPlayS2', body).onclick = () => play({ notes: notes.concat(notes.slice(0, -1).reverse()) });
          $('#tkPractise', body).onclick = () => { App.pendingActivity = 'scales'; App.go('learn'); };
        } else if (tab === 'circle') {
          const sel = App.tkCircle != null ? App.tkCircle : 0;
          const order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
          const R = 140, cx = 170, cy = 170;
          const sharps = (pc) => { const i = order.indexOf(pc); return i <= 6 ? i : i - 12; };
          const fl = FLATKEY(sel);
          const svg = `<svg viewBox="0 0 340 340" class="tk-circle">${order.map((pc, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, xi = cx + Math.cos(a) * (R - 52), yi = cy + Math.sin(a) * (R - 52);
            const on = pc === sel, near = pc === mod12(sel + 7) || pc === mod12(sel + 5);
            return `<g class="tk-node ${on ? 'on' : near ? 'near' : ''}" data-pc="${pc}" tabindex="0"><circle cx="${x}" cy="${y}" r="25"/><text x="${x}" y="${y + 5}">${esc(Theory.spell(pc, FLATKEY(pc)))}</text><text class="mi" x="${xi}" y="${yi + 4}">${esc(Theory.spell(pc + 9, FLATKEY(pc)))}m</text></g>`;
          }).join('')}<text x="${cx}" y="${cy - 6}" class="tk-center">${esc(Theory.spell(sel, fl))}</text><text x="${cx}" y="${cy + 16}" class="tk-center-sub">${Math.abs(sharps(sel))} ${sharps(sel) >= 0 ? 'sharp' : 'flat'}${Math.abs(sharps(sel)) === 1 ? '' : 's'}</text></svg>`;
          const dia = Theory.diatonicChords(sel, 'major', fl);
          body.innerHTML = `<div class="tk-circle-wrap">${svg}<div><h2>${esc(Theory.spell(sel, fl))} major</h2>
            <p>Relative minor: <b>${esc(Theory.spell(sel + 9, fl))}m</b> · neighbours: <b>${esc(Theory.spell(sel + 5, FLATKEY(sel + 5)))}</b> (IV) and <b>${esc(Theory.spell(sel + 7, FLATKEY(sel + 7)))}</b> (V)</p>
            <div class="tk-chips">${dia.map((c) => `<button class="chip" data-chord="${c.root}:${c.type}"><b>${esc(c.roman)}</b> ${esc(c.name)}</button>`).join('')}</div>
            <div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="tkCad">▶ I – IV – V – I</button><button class="btn ghost" id="tkPop">▶ I – V – vi – IV</button></div>
            <p class="small muted" style="margin-top:12px">Tap a key on the circle. Clockwise adds a sharp; anticlockwise adds a flat. The highlighted neighbours are the IV and V chords.</p></div></div>`;
          $$('.tk-node', body).forEach((g) => (g.onclick = () => { App.tkCircle = +g.dataset.pc; draw(); }));
          const tri = (root, type) => Theory.chordPcs(root, type).map((pc) => 48 + mod12(pc - sel) + sel - (sel > 5 ? 12 : 0));
          $$('[data-chord]', body).forEach((b) => (b.onclick = () => { const [r, t] = b.dataset.chord.split(':'); play({ chord: tri(+r, t) }); }));
          $('#tkCad', body).onclick = () => play({ seq: [0, 3, 4, 0].map((d) => tri(dia[d].root, dia[d].type)) });
          $('#tkPop', body).onclick = () => play({ seq: [0, 4, 5, 3].map((d) => tri(dia[d].root, dia[d].type)) });
        } else if (tab === 'transpose') {
          const text = App.tkText || 'G  D/F#  Em  C\nAm7  D  G';
          const st = App.tkSemis || 0;
          body.innerHTML = `<div class="grid g2"><div><h3>🔁 Transpose a chord chart</h3>
              <textarea id="tkTx" rows="6" class="mono">${esc(text)}</textarea>
              <div class="row" style="gap:8px;margin-top:8px"><button class="mini-btn" id="tkDn">−1</button><b id="tkSt">${st > 0 ? '+' : ''}${st}</b><button class="mini-btn" id="tkUp">+1</button><span class="muted small">semitones</span></div>
              <pre class="tk-out" id="tkOut"></pre></div>
            <div><h3>🎸 Capo calculator</h3>
              <label class="field">The song is in<select id="tkKey">${NAMES.map((n, i) => `<option value="${i}" ${i === (App.tkKey || 9) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
              <div id="tkCapo" style="margin-top:10px"></div></div></div>`;
          const out = () => {
            const n = App.tkSemis || 0, fl = n < 0;
            $('#tkOut', body).textContent = ($('#tkTx', body).value || '').split('\n').map((line) => line.replace(/\S+/g, (tok) => (Songs.splitChord(tok) ? Songs.transposeChord(tok, n, fl) : tok))).join('\n');
            $('#tkSt', body).textContent = (n > 0 ? '+' : '') + n;
            const k = +$('#tkKey', body).value;
            const opts = [];
            for (let capo = 0; capo <= 7; capo++) { const shape = mod12(k - capo); const nm = ['C', null, 'D', null, 'E', null, null, 'G', null, 'A', null, null][shape]; if (nm) opts.push(`<li>${capo ? `<b>Capo ${capo}</b>` : '<b>No capo</b>'} → play <b>${nm}</b>-shape chords</li>`); }
            $('#tkCapo', body).innerHTML = `<ul class="ak-ul">${opts.join('')}</ul><p class="small muted">Lower capo positions sound fuller; higher ones brighter.</p>`;
          };
          $('#tkTx', body).oninput = (e) => { App.tkText = e.target.value; out(); };
          $('#tkUp', body).onclick = () => { App.tkSemis = Math.min(11, (App.tkSemis || 0) + 1); out(); };
          $('#tkDn', body).onclick = () => { App.tkSemis = Math.max(-11, (App.tkSemis || 0) - 1); out(); };
          $('#tkKey', body).onchange = (e) => { App.tkKey = +e.target.value; out(); };
          out();
        } else {
          body.innerHTML = `<input type="search" id="tkG" placeholder="Search ${GLOSSARY.length} terms…" style="width:100%"><dl class="tk-gloss" id="tkGl"></dl>`;
          const g = () => { const q = ($('#tkG', body).value || '').toLowerCase(); $('#tkGl', body).innerHTML = GLOSSARY.filter(([t, d]) => !q || (t + ' ' + d).toLowerCase().includes(q)).map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('') || '<p class="muted">No matches.</p>'; };
          $('#tkG', body).oninput = g; g();
        }
      };
      $$('#tkTabs [data-t]', host).forEach((b) => (b.onclick = () => { tab = App.toolkitTab = b.dataset.t; draw(); }));
      draw();
    },
  });

  /** Major/minor keys whose diatonic chords include this chord. */
  function keysContaining(root, type) {
    const out = [];
    const simple = type === 'm7' ? 'm' : type === 'maj7' || type === '7' ? '' : type;
    for (let k = 0; k < 12; k++) for (const mode of ['major', 'minor']) {
      const fl = FLATKEY(mode === 'major' ? k : k + 3);
      if (Theory.diatonicChords(k, mode, fl).some((c) => c.root === root && c.type === simple)) out.push(Theory.spell(k, fl) + (mode === 'major' ? ' major' : ' minor'));
    }
    return out;
  }

  PM.Toolkit = { GLOSSARY, keysContaining };
})(typeof self !== 'undefined' ? self : globalThis);
