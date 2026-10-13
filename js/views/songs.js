/* Cadenza — Songs: a gospel & hymn library (English, Tamil and any language). Chord charts
 * with transpose / capo / auto-scroll, chord diagrams for your instrument, the teacher's
 * chord PDFs, a generated backing band, and "record & send for review". */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Songs, Sync, Theory, Instruments } = PM;
  const { icon, esc, $, $$ } = UI;
  const LOCAL_KEY = 'cadenza.localSongs.v1';
  const PREF_KEY = 'cadenza.songPrefs.v1';
  const LANGS = ['English', 'Tamil', 'Malayalam', 'Telugu', 'Hindi', 'Kannada', 'Other'];

  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch (e) { return []; } };
  const saveLocal = (list) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) { UI.toast('Storage is full', { icon: '⚠️' }); } };
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  function allSongs() {
    const list = [];
    for (const s of Songs.BUILTIN) list.push(Object.assign({ source: 'builtin' }, s));
    for (const s of Sync.connected ? Sync.songs : []) list.push(Object.assign({ source: 'class' }, s));
    for (const s of loadLocal()) list.push(Object.assign({ source: 'mine' }, s));
    return list;
  }
  const findSong = (id) => allSongs().find((s) => s.id === id) || null;
  const colOf = (s) => s.collection || (s.source === 'builtin' ? 'Hymns' : '');
  const langOf = (s) => s.language || (Songs.hasTamil(s.chart) ? 'Tamil' : 'English');
  const srcLabel = { builtin: 'Hymnal', class: 'Classroom', mine: 'My songs' };
  const canEdit = (s) => s.source === 'mine' || (s.source === 'class' && Sync.isStaff);
  const queryId = () => { const m = /[?&]id=([^&]+)/.exec(location.hash); return m ? decodeURIComponent(m[1]) : null; };

  PM.App.register({
    id: 'songs', title: 'Songs', nav: 'Songs', icon: 'library',
    render(host, App) {
      const id = queryId();
      if (id) {
        const song = findSong(id);
        if (song) return renderSong(host, App, song);
      }
      return renderList(host, App);
    },
  });

  // ------------------------------------------------------------------ list
  function renderList(host, App) {
    const st = App.songFilter || (App.songFilter = { q: '', lang: 'all', col: 'all' });
    st.col = st.col || 'all';
    const COLS = ['all'].concat(PM.Worship ? PM.Worship.COLLECTIONS : ['Hymns']);
    const songs = allSongs();
    const langs = ['all', ...new Set(songs.map(langOf).concat(['English', 'Tamil']))];
    const canAdd = !Sync.connected || Sync.isStaff;
    host.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Songs</div><h1>Worship, gospel & hymn library</h1>
        <p>Bethel, Hillsong and contemporary worship chord charts, public-domain hymns with words and Tamil worship patterns — each with a guitar & piano tutorial, strumming pattern and a backing band. ${Sync.connected ? 'Songs and chord PDFs your teacher adds appear here automatically.' : 'Sign in to a classroom to get your teacher\'s songs and chord PDFs.'}</p></div>
        <div class="row">${canAdd ? `<button class="btn primary" id="sgAdd">${icon('plus')} Add a song</button>` : ''}</div></div>
      <section class="card" style="margin-bottom:18px"><div class="row" style="gap:12px">
        <input type="search" id="sgQ" placeholder="Search title, author, words or tag…" value="${esc(st.q)}" style="flex:1 1 200px;min-width:0;max-width:100%">
        <div class="seg seg-wrap" id="sgCol">${COLS.map((c) => `<button data-c="${esc(c)}" class="${st.col === c ? 'on' : ''}">${c === 'all' ? 'All collections' : esc(c)}</button>`).join('')}</div>
        <div class="seg seg-wrap" id="sgLang">${langs.map((l) => `<button data-l="${esc(l)}" class="${st.lang === l ? 'on' : ''}">${l === 'all' ? 'All' : l === 'Tamil' ? 'Tamil · தமிழ்' : esc(l)}</button>`).join('')}</div></div></section>
      <div id="sgList"></div>`;
    const draw = () => {
      const q = st.q.trim().toLowerCase();
      const list = songs.filter((s) => (st.lang === 'all' || langOf(s) === st.lang) && (st.col === 'all' || colOf(s) === st.col) && (!q || [s.title, s.author, s.chart, (s.tags || []).join(' ')].join(' ').toLowerCase().includes(q)));
      const groups = ['class', 'mine'].map((src) => [src, list.filter((s) => s.source === src)])
        .concat(COLS.slice(1).map((c) => ['col:' + c, list.filter((s) => s.source === 'builtin' && colOf(s) === c)]))
        .filter(([, l]) => l.length);
      const GH = { class: '🎓 From your classroom', mine: '⭐ My songs', 'col:Bethel Music': '🔥 Bethel Music · chord charts', 'col:Hillsong': '🌊 Hillsong · chord charts', 'col:Contemporary worship': '🎸 Contemporary worship · chord charts', 'col:Hymns': '📖 Hymns & spirituals · words and chords (public domain)', 'col:Tamil worship': '🪔 Tamil worship · தமிழ் practice patterns' };
      $('#sgList', host).innerHTML = groups.length ? groups.map(([src, l]) => `
        <h3 style="margin:6px 0 12px">${GH[src] || esc(src)}</h3>
        <div class="song-grid">${l.map((s) => `<a class="card song-card" href="#/songs?id=${encodeURIComponent(s.id)}">
          <div class="song-art ${langOf(s) === 'Tamil' ? 'ta' : ''}">${langOf(s) === 'Tamil' ? 'த' : '♪'}</div>
          <div style="min-width:0;flex:1"><b class="${Songs.hasTamil(s.title) ? 'tamil' : ''}">${esc(s.title)}</b><div class="muted small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.author || '')}</div>
          <div class="row" style="gap:6px;margin-top:6px"><span class="tag">${esc(s.key || '?')}</span><span class="tag">${esc(s.timeSig || '4/4')}</span><span class="tag">${esc(langOf(s))}</span>${s.level ? `<span class="tag">L${s.level}</span>` : ''}${s.lyrics === 'chords' ? '<span class="tag">chords</span>' : ''}${(s.attachments || []).length ? `<span class="tag">📄 ${s.attachments.length}</span>` : ''}</div></div></a>`).join('')}</div>`).join('')
        : `<div class="empty">No songs match.${canAdd ? ' Add one with <b>Add a song</b> — paste the chords & lyrics (English, Tamil or any language) and attach a chord PDF.' : ''}</div>`;
    };
    $('#sgQ', host).oninput = (e) => { st.q = e.target.value; draw(); };
    $$('#sgCol button', host).forEach((b) => (b.onclick = () => { st.col = b.dataset.c; $$('#sgCol button', host).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    $$('#sgLang button', host).forEach((b) => (b.onclick = () => { st.lang = b.dataset.l; $$('#sgLang button', host).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    const add = $('#sgAdd', host);
    if (add) add.onclick = () => editSong(null, App);
    draw();
    const sig = () => (Sync.songs || []).map((x) => x.id + ':' + x.updatedAt).join();
    const was = sig();
    const off = Sync.on((t) => { if (t === 'songs' && App.currentView === 'songs' && !queryId() && sig() !== was) setTimeout(() => App.rerender(), 0); });
    return off;
  }

  // ------------------------------------------------------------------ song page
  function renderSong(host, App, song) {
    const inst = App.instrument, I = Instruments.get(inst);
    const p = prefs[song.id] || (prefs[song.id] = { t: 0, capo: 0, size: 18, chords: true });
    const parsed = Songs.parseChart(song.chart || '');
    const key = Songs.parseKey(song.key || parsed.meta.key || '');
    const bpb = Songs.beatsPerBarOf(song.timeSig || parsed.meta.time);
    const asg = App.songAssignment && App.songAssignment.songId === song.id ? App.songAssignment : null;
    const fretted = I.family === 'fretted' && I.chordal;
    const written = inst === 'trumpet' ? 2 : 0; // B♭ trumpet reads chords a tone higher
    let cleanup = [];
    host.innerHTML = `
      <div class="page-head"><div style="min-width:0"><a href="#/songs" class="eyebrow" style="text-decoration:none">${icon('back')} All songs</a>
        <h1 class="${Songs.hasTamil(song.title) ? 'tamil' : ''}">${esc(song.title)}</h1><p>${esc(song.author || '')}</p>
        <div class="row" style="gap:6px;margin-top:8px"><span class="chip" id="kChip"></span><span class="chip">${esc(song.timeSig || parsed.meta.time || '4/4')}</span><span class="chip">${song.bpm || parsed.meta.tempo || 90} BPM</span><span class="chip">${esc(langOf(song))}</span><span class="chip">${esc(song.source === 'builtin' ? colOf(song) : srcLabel[song.source] || 'My songs')}</span></div></div>
        <div class="row">${song.source === 'builtin' ? `<button class="btn ghost sm" id="sgCopy" title="Copy this song to edit the chords, add words or a chord sheet">${icon('plus')} Make my copy</button>` : ''}${canEdit(song) ? `<button class="btn ghost sm" id="sgEdit">${icon('sliders')} Edit</button><button class="btn ghost sm" id="sgDel" style="color:var(--bad)">${icon('trash')} Delete</button>` : ''}${Sync.isStaff ? `<button class="btn sm" id="sgAssign">${icon('clipboard')} Assign</button>` : ''}</div></div>
      ${asg ? `<div class="notice" style="margin-bottom:16px">${icon('clipboard')}<div><b>Assignment: ${esc(asg.title)}</b>${asg.instructions ? '<br>' + esc(asg.instructions) : ''}<br><span class="small">Practise it, then press <b>Record & send</b> when you're ready.</span></div></div>` : ''}
      <div class="song-layout">
        <section class="card song-main">
          <div class="song-tools">
            <div class="tool"><span class="muted small">Transpose</span><button class="mini-btn" data-t="-1">${icon('minus')}</button><b id="tLbl"></b><button class="mini-btn" data-t="1">${icon('plus')}</button></div>
            ${fretted ? `<div class="tool"><span class="muted small">Capo</span><select id="capo">${[0, 1, 2, 3, 4, 5, 6, 7].map((c) => `<option value="${c}" ${p.capo === c ? 'selected' : ''}>${c ? 'Capo ' + c : 'No capo'}</option>`).join('')}</select></div>` : ''}
            <div class="tool"><span class="muted small">Text</span><button class="mini-btn" data-s="-2">A−</button><button class="mini-btn" data-s="2">A+</button></div>
            <label class="switch"><input type="checkbox" id="showCh" ${p.chords ? 'checked' : ''}><span class="track"></span>Chords</label>
            <div class="tool"><button class="mini-btn" id="scrollBtn">${icon('play')} Auto-scroll</button><input type="range" id="scrollSpd" min="5" max="80" value="${p.speed || 25}" style="width:90px" aria-label="Scroll speed"></div>
          </div>
          ${written ? '<p class="muted small" style="margin:0 0 10px">Chords are shown in <b>B♭ trumpet (written) pitch</b>.</p>' : ''}
          <div class="chart ${Songs.hasTamil(song.chart) ? 'tamil' : ''}" id="chart"></div>
          ${song.notes ? `<div class="notice" style="margin-top:16px">${icon('info')}<div style="white-space:pre-wrap">${esc(song.notes)}</div></div>` : ''}
          <div id="tut" style="margin-top:18px"></div>
        </section>
        <aside class="song-side">
          <section class="card"><div class="card-head"><h3>${icon('mic')} Practise</h3></div>
            <div class="stack">
              <button class="btn primary" id="bandBtn">${icon('headphones')} Play with a backing band</button>
              <div id="bandBox" class="hidden"></div>
              <button class="btn" id="recBtn">${icon('mic')} Record & send for review</button>
              <p class="muted small">The band leaves out your ${esc(I.short.toLowerCase())} so you can play your part. Open it in the Studio for live coaching.</p>
            </div></section>
          ${(song.attachments || []).length ? `<section class="card"><div class="card-head"><h3>📄 Chord sheets & files</h3></div><div class="row" id="atts" style="gap:8px">${PM.DocView.chips(song.attachments)}</div></section>` : ''}
          <section class="card"><div class="card-head"><h3>${icon(I.icon)} Chords on ${esc(I.short.toLowerCase())}</h3></div><div class="diagrams" id="diag"></div></section>
          <section class="card hidden" id="revCard"><div class="card-head"><h3>${icon('sparkle')} My recordings & reviews</h3></div><div id="revList" class="stack"></div></section>
        </aside>
      </div>`;

    const chartEl = $('#chart', host);
    const shown = () => p.t + written - (fretted ? p.capo : 0);
    const flats = () => Songs.prefersFlats(key, p.t + written - (fretted ? p.capo : 0));
    const drawChart = () => {
      const n = shown(), fl = flats();
      chartEl.style.fontSize = p.size + 'px';
      chartEl.classList.toggle('no-chords', !p.chords);
      let html = '';
      parsed.lines.forEach((l, li) => {
        if (l.type === 'section') html += `<div class="cp-section ${l.kind}">${esc(l.label)}</div>`;
        else if (l.type === 'comment') html += `<div class="cp-comment">${esc(l.text)}</div>`;
        else if (l.type === 'blank') html += '<div class="cp-gap"></div>';
        else if (l.type === 'lyric' && l.barCells) html += `<div class="cp-line cp-bars${l.section === 'chorus' ? ' chorus' : ''}" data-li="${li}">${l.barCells.map((cell) => `<span class="cp-bar">${cell.map((c) => esc(c === '%' ? '%' : Songs.transposeChord(c, n, fl))).join(' ')}</span>`).join('')}</div>`;
        else if (l.type === 'lyric') html += `<div class="cp-line${l.section === 'chorus' ? ' chorus' : ''}" data-li="${li}">${l.segs.map((s) => `<span class="cp-seg"><span class="cp-ch">${s.chord ? esc(Songs.transposeChord(s.chord, n, fl)) : ''}</span><span class="cp-tx">${esc(s.text) || '&nbsp;'}</span></span>`).join('')}</div>`;
      });
      chartEl.innerHTML = html || '<div class="empty">This song has no chord chart yet — see the attached chord sheet.</div>';
      const kc = $('#kChip', host);
      if (key) kc.textContent = `Key ${Songs.keyName(key, p.t)}${fretted && p.capo ? ` · capo ${p.capo} (${Songs.keyName(key, p.t - p.capo)} shapes)` : ''}${written ? ` · written ${Songs.keyName(key, p.t + 2)}` : ''}`;
      else kc.textContent = 'Key —';
      $('#tLbl', host).textContent = (p.t > 0 ? '+' : '') + p.t;
      drawDiagrams();
      drawTutorial();
    };
    // ---- tutorial (guitar & piano): patterns, capo, voicings, steps and dynamics
    const drawTutorial = () => {
      const box = $('#tut', host);
      if (!box || !PM.Worship || !parsed.lines.some((l) => l.type === 'lyric')) return;
      const n = p.t, fl = Songs.prefersFlats(key, n);
      const shifted = Object.assign({}, song, { key: key ? Songs.keyName(key, n) : song.key, chart: transposedChart(n, fl) });
      const tu = PM.Worship.tutorial(shifted);
      const view = p.tutView || (I.family === 'keys' ? 'piano' : 'guitar');
      const done = p.steps || (p.steps = {});
      const grid = (pat, label) => `<div class="tut-pat"><span class="small muted">${label}</span><div class="tut-grid">${pat.split('').map((c, i) => `<span class="${c === '-' ? 'rest' : ''}${i % (tu.feel.grid === 6 ? 3 : 2) === 0 ? ' beat' : ''}">${c === 'D' ? '↓' : c === 'U' ? '↑' : c === '-' ? '·' : c}</span>`).join('')}</div><div class="tut-count">${pat.split('').map((_, i) => `<span>${tu.feel.grid === 6 ? i + 1 : i % 2 ? '&' : i / 2 + 1}</span>`).join('')}</div></div>`;
      box.innerHTML = `<div class="tutorial">
        <div class="card-head"><h3>🎓 Tutorial · ${esc(tu.feel.name)}</h3><div class="seg" id="tutSeg"><button data-v="guitar" class="${view === 'guitar' ? 'on' : ''}">🎸 Guitar</button><button data-v="piano" class="${view === 'piano' ? 'on' : ''}">🎹 Piano</button></div></div>
        ${view === 'guitar' ? `
          <div class="grid g2">${grid(tu.feel.strum, 'Strumming pattern')}${grid(tu.feel.easy, 'Easier version (start here)')}</div>
          ${grid(tu.feel.pick, 'Finger-picking (B = bass string, 1–3 = top strings) — great for verses')}
          ${tu.capo.length ? `<div class="notice" style="margin-top:12px">🎸<div><b>Capo options</b> (sound in ${esc(shifted.key)}): ${tu.capo.map((c) => `${c.capo ? 'capo ' + c.capo : 'no capo'} → <b>${esc(c.shapes)} shapes</b> (${c.chords.join(' ')})${c.barre ? ` · ${c.barre} barre` : ' · no barre chords'}`).join('; ')}</div></div>` : ''}`
        : `
          <div class="tut-piano">${tu.piano.filter(Boolean).map((v) => `<div class="tut-voicing"><b>${esc(v.chord)}</b><span>RH ${esc(v.names.join(' '))}</span><span class="small muted">${esc(v.inversion)} · LH ${esc(v.bass)}</span></div>`).join('')}</div>
          <p class="small" style="margin-top:8px">These right-hand voicings are <b>voice-led</b>: each chord uses the inversion closest to the one before, so your hand barely moves.</p>
          <div class="grid g2" style="margin-top:10px"><div class="notice">🫲<div><b>Left hand</b><br>${esc(tu.feel.pianoLH)}</div></div><div class="notice">🫱<div><b>Right hand</b><br>${esc(tu.feel.pianoRH)}</div></div></div>`}
        ${tu.hardest ? `<div class="notice" style="margin-top:12px">⏱️<div><b>Hardest change: ${esc(tu.hardest.pair)}</b> — practise it on its own for a minute and count clean changes.</div></div>` : ''}
        <h4 style="margin:16px 0 8px">Step by step</h4>
        <ol class="tut-steps">${tu.steps.map((st, i) => `<li class="${done[i] ? 'done' : ''}"><label><input type="checkbox" data-step="${i}" ${done[i] ? 'checked' : ''}><b>${esc(st.t)}</b></label><span>${esc(st.d)}</span></li>`).join('')}</ol>
        ${tu.roadmap.length ? `<h4 style="margin:16px 0 8px">Dynamics roadmap</h4><div class="tut-road">${tu.roadmap.map((r) => `<div><b>${esc(r.label)}</b><span>${esc(r.plan)}</span></div>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn sm" id="tutMetro">${icon('metronome')} Metronome at ${Math.round(tu.bpm * 0.7)} BPM</button><button class="btn sm ghost" id="tutGroove">${icon('music')} Practise with a ${esc(tu.feel.drums)} groove</button></div>
      </div>`;
      $$('#tutSeg [data-v]', box).forEach((b) => (b.onclick = () => { p.tutView = b.dataset.v; savePrefs(); drawTutorial(); }));
      $$('[data-step]', box).forEach((c) => (c.onchange = () => { done[c.dataset.step] = c.checked; savePrefs(); c.closest('li').classList.toggle('done', c.checked); if (c.checked && Object.values(done).filter(Boolean).length === tu.steps.length) { UI.toast('Tutorial complete — record it for your teacher!', { icon: '🏆' }); UI.confetti(); } }));
      $('#tutMetro', box).onclick = () => { const m = App.metronome; m.setBpm(Math.round(tu.bpm * 0.7)); m.beatsPerBar = bpb; App.go('metronome'); };
      $('#tutGroove', box).onclick = () => { App.pendingGroove = { feel: song.feel || (bpb === 3 ? 'waltz' : 'mid'), bpm: tu.bpm, chords: tu.unique }; App.metroTab = 'styles'; App.go('metronome'); };
    };
    const transposedChart = (n, fl) => (n ? (song.chart || '').replace(/\[([^\]]+)\]/g, (m0, c) => '[' + Songs.transposeChord(c, n, fl) + ']').replace(/^(\s*\|.*)$/gm, (line) => line.replace(/[A-G][#b]?[^\s|]*/g, (c) => Songs.transposeChord(c, n, fl))) : song.chart || '');
    const drawDiagrams = () => {
      const n = shown(), fl = flats();
      const names = Songs.chartChords(parsed);
      $('#diag', host).innerHTML = names.length ? names.map((name) => {
        const c = Songs.splitChord(Songs.transposeChord(name, n, fl));
        const label = Songs.transposeChord(name, n, fl);
        const simple = Theory.spell(c.root, fl) + Songs.simpleType(c.suffix);
        if (fretted) return UI.chordDiagram(simple).replace(/<b>[^<]*<\/b>/, `<b>${esc(label)}</b>`);
        const pcs = Theory.chordPcs(c.root, Songs.simpleType(c.suffix)).map((x) => Theory.spell(x, fl));
        if (inst === 'bass') return `<div class="diag-cell text"><b>${esc(label)}</b><span>root <b>${pcs[0]}</b> · 5th ${pcs[2] || pcs[1]}</span></div>`;
        return `<div class="diag-cell text"><b>${esc(label)}</b><span>${pcs.join(' · ')}</span></div>`;
      }).join('') : '<span class="muted small">No chords in the chart.</span>';
    };
    $$('[data-t]', host).forEach((b) => (b.onclick = () => { p.t = Math.max(-11, Math.min(11, p.t + +b.dataset.t)); savePrefs(); drawChart(); band.reset(); }));
    $$('[data-s]', host).forEach((b) => (b.onclick = () => { p.size = Math.max(12, Math.min(40, p.size + +b.dataset.s)); savePrefs(); drawChart(); }));
    const capo = $('#capo', host);
    if (capo) capo.onchange = () => { p.capo = +capo.value; savePrefs(); drawChart(); };
    $('#showCh', host).onchange = (e) => { p.chords = e.target.checked; savePrefs(); drawChart(); };
    drawChart();
    if ($('#atts', host)) PM.DocView.wire($('#atts', host), song.attachments);
    if ($('#sgCopy', host)) $('#sgCopy', host).onclick = () => editSong(Object.assign({}, song, { source: 'copy', id: null, title: song.title, chart: song.chart, notes: '' }), App);

    // ---- auto-scroll (manual speed, or following the band)
    let scrolling = false, sraf = 0, lastT = 0, acc = 0;
    const stepScroll = (ts) => {
      if (!scrolling) return;
      const dt = lastT ? (ts - lastT) / 1000 : 0; lastT = ts;
      acc += dt * (+$('#scrollSpd', host).value);
      if (acc >= 1) { window.scrollBy(0, Math.floor(acc)); acc -= Math.floor(acc); }
      sraf = requestAnimationFrame(stepScroll);
    };
    const setScroll = (on) => { scrolling = on; lastT = 0; $('#scrollBtn', host).innerHTML = `${icon(on ? 'pause' : 'play')} Auto-scroll`; cancelAnimationFrame(sraf); if (on) sraf = requestAnimationFrame(stepScroll); };
    $('#scrollBtn', host).onclick = () => setScroll(!scrolling);
    $('#scrollSpd', host).onchange = (e) => { p.speed = +e.target.value; savePrefs(); };
    cleanup.push(() => setScroll(false));

    // ---- backing band
    const band = {
      loaded: false,
      reset() { this.loaded = false; $('#bandBox', host).classList.add('hidden'); $('#bandBtn', host).classList.remove('hidden'); },
    };
    const barsOf = () => Songs.spreadBars(parsed, Songs.chartBars(parsed, { bars: song.bars, beatsPerBar: bpb, transpose: p.t }));
    $('#bandBtn', host).onclick = async () => {
      const bars = barsOf();
      if (!bars.length) { UI.toast('This chart has no chords to play', { icon: 'ℹ️' }); return; }
      const box = $('#bandBox', host);
      box.classList.remove('hidden');
      box.innerHTML = '<span class="small an-label">Creating the band…</span><div class="progress" style="margin-top:6px"><i style="width:5%"></i></div>';
      $('#bandBtn', host).classList.add('hidden');
      try {
        const bpm = song.bpm || parsed.meta.tempo || 90;
        const g = PM.Backing.generateChart({ bars: bars.map((b) => b.chords), beatsPerBar: bpb, bpm, exclude: inst, title: song.title, tonic: key ? key.pc + p.t : 0, minor: key && key.minor });
        const buf = PM.Midi.writeMidi(g.notes, { bpm: g.bpm, key: g.key, num: (song.timeSig || '').startsWith('6/8') ? 6 : bpb, den: (song.timeSig || '').startsWith('6/8') ? 8 : 4 });
        const name = `${song.title}${p.t ? ` (${Songs.keyName(key, p.t) || (p.t > 0 ? '+' : '') + p.t})` : ''} — backing`;
        await App.loadFile(new File([buf], name.replace(/[\\/:*?"<>|]+/g, '') + '.mid', { type: 'audio/midi' }), (f, l) => { const i = box.querySelector('i'); if (i) i.style.width = Math.round(f * 100) + '%'; const lb = box.querySelector('.an-label'); if (lb && l) lb.textContent = l; }, { backing: true, songId: song.id, name });
        if (asg) App.track.assignmentId = asg.id;
        band.loaded = true;
        band.bars = bars; band.lead = bpb * 60 / bpm; band.barDur = bpb * 60 / bpm;
        drawBand();
      } catch (e) { console.error(e); box.innerHTML = `<span class="small" style="color:var(--bad)">${esc(e.message)}</span>`; $('#bandBtn', host).classList.remove('hidden'); }
    };
    const drawBand = () => {
      const box = $('#bandBox', host);
      box.innerHTML = `<div class="row"><button class="btn primary sm" id="bPlay">${icon('play')} Play</button><button class="btn sm ghost" id="bStop">${icon('stop')}</button>
        <select id="bRate">${[0.6, 0.7, 0.8, 0.9, 1, 1.1].map((r) => `<option value="${r}" ${App.player.rate === r ? 'selected' : ''}>${Math.round(r * 100)}%</option>`).join('')}</select>
        <label class="switch"><input type="checkbox" id="bFollow" checked><span class="track"></span>Follow</label></div>
        <button class="btn sm ghost" id="bStudio" style="margin-top:8px">${icon('studio')} Open in Studio (live coach)</button>`;
      const playBtn = $('#bPlay', box);
      const sync = () => { playBtn.innerHTML = `${icon(App.player.playing ? 'pause' : 'play')} ${App.player.playing ? 'Pause' : 'Play'}`; };
      playBtn.onclick = async () => {
        const pl = App.player;
        if (pl.playing) { pl.pause(); sync(); return; }
        pl.connect();
        PM.Audio.getCtx();
        // start inside the tap (iOS); if the audio isn't decoded yet, start as soon as it is
        const p = pl.el.play();
        if (p && p.catch) p.catch((e) => {
          if (e && e.name === 'NotAllowedError') { UI.toast('Tap Play again to start the band', { icon: '🔈' }); return; }
          pl.el.addEventListener('canplay', () => pl.el.play().catch(() => {}), { once: true });
        });
        sync();
      };
      $('#bStop', box).onclick = () => { App.player.pause(); App.player.time = 0; sync(); highlight(-1); };
      $('#bRate', box).onchange = (e) => { App.player.rate = +e.target.value; };
      $('#bStudio', box).onclick = () => { App.player.pause(); App.go('studio'); };
      const offP = App.player.on(() => sync());
      cleanup.push(offP);
    };
    let lastLine = -2;
    const highlight = (li) => {
      if (li === lastLine) return;
      lastLine = li;
      $$('.cp-line.now', chartEl).forEach((x) => x.classList.remove('now'));
      if (li < 0) return;
      const el = $(`.cp-line[data-li="${li}"]`, chartEl);
      if (el) { el.classList.add('now'); if ($('#bFollow', host) && $('#bFollow', host).checked) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    };
    const follow = setInterval(() => {
      if (!band.loaded || !App.player.playing || !App.track || App.track.songId !== song.id) return;
      const b = Math.floor((App.player.time - band.lead) / band.barDur);
      const bar = band.bars[b];
      highlight(bar && bar.line >= 0 ? bar.line : -1);
    }, 150);
    cleanup.push(() => clearInterval(follow));
    if (App.track && App.track.songId === song.id) { band.loaded = true; band.bars = barsOf(); const bpm = song.bpm || parsed.meta.tempo || 90; band.lead = band.barDur = bpb * 60 / bpm; $('#bandBox', host).classList.remove('hidden'); $('#bandBtn', host).classList.add('hidden'); drawBand(); }

    // ---- record & send
    $('#recBtn', host).onclick = () => PM.RecordPanel.open({
      title: asg ? asg.title : song.title, songId: song.source === 'builtin' ? song.id : song.id, assignmentId: asg ? asg.id : null, mode: 'song',
      context: Sync.connected ? `Play “${song.title}”${App.player.loaded && App.track && App.track.songId === song.id ? ' with the band' : ''} — your teacher will listen and reply.` : null,
      onSent: () => { App.songAssignment = null; Sync.fetchMySubmissions().then(drawReviews).catch(() => {}); },
    });
    const drawReviews = () => {
      const mine = (Sync.mySubmissions || []).filter((s) => s.songId === song.id && s.recording);
      const pend = Sync.pendingRecordings.filter((o) => o.body.songId === song.id);
      const card = $('#revCard', host);
      if (!card) return;
      card.classList.toggle('hidden', !mine.length && !pend.length);
      $('#revList', host).innerHTML = pend.map(() => `<div class="small">⏳ A recording is waiting to upload…</div>`).join('') + mine.map((s) => reviewHtml(s)).join('');
      PM.Shared.wireRecordingPlayers($('#revList', host), mine);
    };
    if (Sync.connected) { drawReviews(); cleanup.push(Sync.on((t) => { if (t === 'mine' || t === 'outbox') drawReviews(); })); }

    // ---- teacher / owner actions
    const ed = $('#sgEdit', host);
    if (ed) ed.onclick = () => editSong(song, App);
    const del = $('#sgDel', host);
    if (del) del.onclick = () => {
      const m = UI.modal(`<div class="modal-body"><h2>Delete “${esc(song.title)}”?</h2><p style="margin-top:8px">${song.source === 'class' ? 'It is removed for all students.' : 'It is removed from this device.'}</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="cDel">Delete</button></div></div>`);
      $('#cDel', m.el).onclick = async () => {
        try {
          if (song.source === 'class') { await Sync.request('DELETE', '/songs/' + song.id); await Sync.fetchSongs(); }
          else saveLocal(loadLocal().filter((s) => s.id !== song.id));
          m.close(); App.go('songs');
        } catch (e) { UI.toast(e.message, { icon: '⚠️' }); }
      };
    };
    const as = $('#sgAssign', host);
    if (as) as.onclick = () => { App.assignSong = song; App.classTab = 'assignments'; App.go('classroom'); };
    return () => cleanup.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
  }

  function reviewHtml(s) {
    const r = s.rubric || {};
    return `<div class="review ${s.status}" data-sid="${esc(s.id)}">
      <div class="row"><b>${esc(s.title || 'Recording')}</b><span class="muted small">${new Date(s.createdAt).toLocaleDateString()}</span><div class="spacer"></div>
        ${s.status === 'redo' ? '<span class="tag warn">try again</span>' : s.status === 'reviewed' ? '<span class="tag ok">reviewed</span>' : '<span class="tag">waiting for review</span>'}</div>
      ${s.rating ? `<div class="rating-view">${'★'.repeat(s.rating)}${'☆'.repeat(5 - s.rating)}</div>` : ''}
      ${['pitch', 'timing', 'tone', 'expression'].some((k) => r[k]) ? `<div class="rubric-view">${['pitch', 'timing', 'tone', 'expression'].filter((k) => r[k]).map((k) => `<span>${k} <b>${r[k]}/5</b></span>`).join('')}</div>` : ''}
      ${s.teacherComment ? `<p style="margin-top:6px"><b>Teacher:</b> ${esc(s.teacherComment)}</p>` : ''}
      <div class="rec-player" data-rec="${esc(s.id)}"><button class="mini-btn" data-listen="${esc(s.id)}">${icon('play')} Listen to my recording</button></div></div>`;
  }

  // ------------------------------------------------------------------ editor
  function editSong(song, App) {
    const toClass = Sync.connected && Sync.isStaff && (!song || song.source === 'class' || song.source === 'copy');
    const s = song ? Object.assign({}, song) : { title: '', author: '', language: 'English', key: 'G', timeSig: '4/4', bpm: 90, chart: '', bars: '', notes: '', tags: [], attachments: [] };
    let atts = (s.attachments || []).slice();
    const m = UI.modal(`<div class="modal-body">
      <h2>${song && song.source === 'copy' ? 'Make my copy' : song ? 'Edit song' : 'Add a song'}</h2>
      <p class="small" style="margin-top:4px">${toClass ? 'Saved to your classroom — every student sees it.' : 'Saved on this device.'} Lyrics can be in any language (தமிழ் works too).</p>
      <div class="grid g2" style="margin-top:12px">
        <label class="field">Title<input type="text" id="eTitle" value="${esc(s.title)}"></label>
        <label class="field">Author / composer<input type="text" id="eAuthor" value="${esc(s.author || '')}"></label>
        <label class="field">Language<select id="eLang">${LANGS.map((l) => `<option ${l === (s.language || 'English') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field">Key<input type="text" id="eKey" value="${esc(s.key || '')}" placeholder="G, Bb, F#m…"></label>
        <label class="field">Time signature<select id="eTime">${['4/4', '3/4', '6/8', '2/4', '12/8'].map((t) => `<option ${t === (s.timeSig || '4/4') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field">Tempo (BPM)<input type="number" id="eBpm" min="30" max="260" value="${+s.bpm || 90}"></label>
      </div>
      <label class="field" style="margin-top:12px">Chords & lyrics <span class="muted small">— put chords in [brackets] before the syllable, or paste chords on the line above the words</span>
        <textarea id="eChart" class="mono ${Songs.hasTamil(s.chart) ? 'tamil' : ''}" rows="12" placeholder="${esc(Songs.TEMPLATE)}">${esc(s.chart || '')}</textarea></label>
      <div class="row" style="margin-top:6px"><button class="mini-btn" id="eTpl">Insert template</button><button class="mini-btn" id="ePrev">Preview</button></div>
      <div id="ePreview" class="chart hidden" style="margin-top:10px;max-height:240px;overflow:auto;font-size:15px"></div>
      <details style="margin-top:12px"><summary class="small"><b>Advanced:</b> bar-by-bar chords for the backing band</summary>
        <label class="field" style="margin-top:8px">Bars <span class="muted small">e.g. G | G | C G | D7 ( % repeats the last bar)</span><input type="text" id="eBars" value="${esc(s.bars || '')}"></label></details>
      <label class="field" style="margin-top:12px">Notes for students<textarea id="eNotes" rows="2">${esc(s.notes || '')}</textarea></label>
      <label class="field" style="margin-top:12px">Tags<input type="text" id="eTags" value="${esc((s.tags || []).join(', '))}" placeholder="worship, beginner, christmas"></label>
      <label class="field" style="margin-top:12px">Chord sheets (PDF), images or audio</label>
      <div class="row" id="eAtts" style="gap:6px;margin-top:6px"></div>
      <input type="file" id="eFiles" multiple accept=".pdf,application/pdf,image/*,audio/*,.mid,.midi" style="margin-top:8px">
      <p class="small" id="eMsg" style="margin-top:10px;color:var(--bad)"></p>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="eSave">${icon('check')} Save song</button></div></div>`);
    m.el.querySelector('.modal').classList.add('wide');
    const q = (id) => $('#' + id, m.el);
    const drawAtts = () => {
      q('eAtts').innerHTML = atts.map((f, i) => `<span class="chip">${esc(f.name)} <button class="mini-btn" data-rm="${i}" aria-label="Remove">✕</button></span>`).join('') || '<span class="muted small">None yet</span>';
      $$('[data-rm]', m.el).forEach((b) => (b.onclick = () => { atts.splice(+b.dataset.rm, 1); drawAtts(); }));
    };
    drawAtts();
    q('eTpl').onclick = () => { if (!q('eChart').value.trim()) q('eChart').value = Songs.TEMPLATE.replace('{title: }', '{title: ' + q('eTitle').value + '}'); };
    q('eChart').oninput = () => q('eChart').classList.toggle('tamil', Songs.hasTamil(q('eChart').value));
    q('ePrev').onclick = () => {
      const pv = q('ePreview');
      const pp = Songs.parseChart(q('eChart').value);
      pv.classList.remove('hidden');
      pv.classList.toggle('tamil', Songs.hasTamil(q('eChart').value));
      pv.innerHTML = pp.lines.map((l) => l.type === 'lyric' ? `<div class="cp-line">${l.segs.map((x) => `<span class="cp-seg"><span class="cp-ch">${esc(x.chord)}</span><span class="cp-tx">${esc(x.text) || '&nbsp;'}</span></span>`).join('')}</div>` : l.type === 'section' ? `<div class="cp-section">${esc(l.label)}</div>` : l.type === 'blank' ? '<div class="cp-gap"></div>' : '').join('') || '<span class="muted small">Nothing to preview</span>';
    };
    q('eSave').onclick = async () => {
      const btn = q('eSave');
      q('eMsg').textContent = '';
      const title = q('eTitle').value.trim();
      const chart = q('eChart').value;
      if (!title) { q('eMsg').textContent = 'Give the song a title'; return; }
      btn.disabled = true;
      try {
        for (const f of q('eFiles').files) {
          if (f.size > 100 * 1024 * 1024) throw new Error(f.name + ' is larger than 100 MB');
          q('eMsg').style.color = 'var(--ink-2)';
          q('eMsg').textContent = 'Saving ' + f.name + '…';
          atts.push(toClass ? await Sync.uploadFile(f) : await Sync.saveLocalFile(f));
        }
        const pm = Songs.parseChart(chart).meta;
        const data = { title, author: q('eAuthor').value.trim(), language: q('eLang').value, key: q('eKey').value.trim() || pm.key || '', timeSig: q('eTime').value, bpm: +q('eBpm').value || 90, chart, bars: q('eBars').value, notes: q('eNotes').value, tags: q('eTags').value.split(',').map((t) => t.trim()).filter(Boolean), attachments: atts };
        let id;
        if (toClass) {
          const d = song && song.source === 'class' ? await Sync.request('PATCH', '/songs/' + song.id, data) : await Sync.request('POST', '/songs', data);
          id = d.song.id;
          await Sync.fetchSongs();
        } else {
          const list = loadLocal();
          if (song && song.source === 'mine') { const i = list.findIndex((x) => x.id === song.id); list[i] = Object.assign({}, list[i], data); id = song.id; }
          else { id = 'my-' + Date.now().toString(36); list.push(Object.assign({ id, createdAt: Date.now() }, data)); }
          saveLocal(list);
        }
        m.close();
        UI.toast('Song saved', { icon: '🎵' });
        if (location.hash === '#/songs?id=' + encodeURIComponent(id)) App.rerender(); else App.go('songs?id=' + encodeURIComponent(id));
      } catch (e) { q('eMsg').style.color = 'var(--bad)'; q('eMsg').textContent = e.message; btn.disabled = false; }
    };
  }

  PM.SongsView = { allSongs, findSong, reviewHtml, langOf };
})(typeof self !== 'undefined' ? self : globalThis);
