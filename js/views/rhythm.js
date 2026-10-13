/* Overture — rhythm workstation inside the Metronome page:
 *  • Styles: 40+ keyboard-style rhythms with Intro / Main A / Main B / Fill / Ending and
 *    auto-accompaniment (bass + chords) that follows the chords you type.
 *  • Beat maker: step sequencer & pattern builder (16ths, triplets, 3/4, swing, accents,
 *    ghost notes), save/load patterns, start from any style.
 *  • Rhythm practice: clap/play along with any drum part — every hit is scored for timing,
 *    and Cadi comments. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Drums, Styles } = PM;
  const { icon, esc, $, $$ } = UI;
  const PAT_KEY = 'cadenza.patterns.v1', PREF_KEY = 'cadenza.rhythmPrefs.v1';
  const loadJ = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const saveJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const PROGS = [['Pop', 'C | G | Am | F'], ['Worship', 'G | D | Em | C'], ['I–IV–V', 'C | F | G | C'], ['Ballad', 'C | Am | F | G'], ['Minor', 'Am | F | C | G'], ['Gospel', 'Bb | Eb | F | Bb'], ['Jazz ii–V–I', 'Dm7 | G7 | Cmaj7 | Cmaj7'], ['12-bar blues', 'A7 | D7 | A7 | A7 | D7 | D7 | A7 | A7 | E7 | D7 | A7 | E7'], ['Waltz', 'D | G | A | D']];
  const GRIDS = { '4/4 · 16ths': [4, 4], '4/4 · 8ths': [4, 2], '4/4 · triplets (swing, 12/8)': [4, 3], '3/4 · 16ths': [3, 4], '3/4 · 8ths': [3, 2], '6/8': [2, 3], '2/4 · 16ths': [2, 4], '5/4 · 8ths': [5, 2], '7/8': [7, 1] };
  const nextChar = { '.': 'x', x: 'X', X: 'o', o: '.' };

  function seq(App) { return App.sequencer || (App.sequencer = new Drums.Sequencer()); }

  function render(host, App, tab, tabsHtml) {
    const S = seq(App);
    const prefs = Object.assign({ chords: 'C | G | Am | F', cat: 'All', styleId: 'pop-ballad', accomp: true, autoFill: 4 }, loadJ(PREF_KEY, {}));
    const savePrefs = () => saveJ(PREF_KEY, prefs);
    // arriving from a song tutorial: pick the matching groove, the song's chords and tempo
    if (App.pendingGroove && tab === 'styles') {
      const g = App.pendingGroove;
      App.pendingGroove = null;
      const map = { ballad: 'pop-ballad', mid: 'worship-pop', upbeat: 'gospel-praise', slow68: 'worship-68', waltz: 'slow-waltz', hymn: 'pop-ballad', keharwa: 'keherwa', dadra: 'dadra' };
      prefs.styleId = Styles.get(map[g.feel]) ? map[g.feel] : prefs.styleId;
      if (g.chords && g.chords.length) prefs.chords = g.chords.join(' | ');
      savePrefs();
      if (S.style && S.style.id !== prefs.styleId) S.setStyle(Styles.get(prefs.styleId));
      if (g.bpm) S.bpm = Math.round(g.bpm);
    }
    let cleanup = [];
    host.innerHTML = `<div class="page-head"><div><div class="eyebrow">Metronome & rhythm</div><h1>${tab === 'styles' ? 'Practise with real grooves' : 'Build your own beats'}</h1>
      <p>${tab === 'styles' ? 'Keyboard-style rhythms with Intro, Main A/B, Fill and Ending. Type chords and the bass and piano/guitar follow you.' : 'Tap the grid to program drums. Click once for a hit, again for an accent, again for a ghost note. Then practise along — Overture scores every hit.'}</p></div></div>
      ${tabsHtml}<div id="rBody"></div>`;
    const body = $('#rBody', host);

    // ---------------------------------------------------------------- shared transport bits
    const beatLights = (n) => `<div class="beat-lights" id="rLights">${Array.from({ length: n }, (_, i) => `<i data-b="${i}"></i>`).join('')}</div>`;
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const cur = S.running ? S.now() : null;
      const p = S.current();
      if (!p) return;
      const beat = cur ? Math.floor(cur.step / p.stepsPerBeat) : -1;
      $$('#rLights i', host).forEach((el, i) => el.classList.toggle('on', i === beat));
      $$('.sq-col', host).forEach((el) => el.classList.toggle('now', !!cur && +el.dataset.s === cur.step));
      const sec = $('#rSection', host);
      if (sec) sec.textContent = cur ? ({ A: 'Main A', B: 'Main B', fill: 'Fill', intro: 'Intro', ending: 'Ending' }[cur.section] || '') + ' · bar ' + (cur.bar + 1) : S.style ? 'ready' : '';
      $$('[data-sec]', host).forEach((b) => b.classList.toggle('on', S.running ? (S.pendingSection || S.section) === b.dataset.sec : S.section === b.dataset.sec));
    };
    raf = requestAnimationFrame(animate);
    cleanup.push(() => cancelAnimationFrame(raf));
    const offS = S.on((e) => { if (e.type === 'start' || e.type === 'stop') syncPlay(); });
    cleanup.push(offS);
    function syncPlay() { const b = $('#rPlay', host); if (b) b.innerHTML = `${icon(S.running ? 'stop' : 'play')} ${S.running ? 'Stop' : 'Start'}`; }

    // ---------------------------------------------------------------- rhythm practice (score hits against a drum part)
    const practice = { on: false };
    function practiceBox(voices) {
      return `<section class="card stage" style="margin-top:18px"><div class="card-head"><h3>${icon('target')} Rhythm practice</h3><button class="btn primary sm" id="rpBtn">${icon('mic')} Start</button></div>
        <div class="row"><label class="field">Play / clap along with<select id="rpVoice">${voices.map((v) => `<option value="${v}">${esc((Drums.VOICES.find((x) => x.id === v) || {}).name || v)}</option>`).join('')}<option value="beat">Every beat</option><option value="all">Every drum hit</option></select></label>
        <p class="small" style="flex:1;min-width:200px">Clap, tap, strum or play one note exactly with the chosen part. Each hit is scored (on time ±35 ms), and Cadi tells you if you rush or drag.</p></div>
        <div class="grid g4" style="margin-top:8px"><div><div class="now-label">Hits</div><div class="meter-val" id="rpHits">0</div></div><div><div class="now-label">On time</div><div class="meter-val" id="rpOn">—</div></div><div><div class="now-label">Average</div><div class="meter-val" id="rpAvg">—</div></div><div><div class="now-label">Missed</div><div class="meter-val" id="rpMiss">0</div></div></div>
        <div id="rpGauge" style="margin-top:6px">${UI.gaugeHtml(['early', '−50 ms', 'on the beat', '+50 ms', 'late'])}</div></section>`;
    }
    function wirePractice() {
      const btn = $('#rpBtn', host);
      if (!btn) return;
      let unsub = null, offs = [], hits = 0, missed = 0, judged = new Set(), loop = 0, started = 0;
      const stopP = (report) => {
        if (!unsub) return;
        unsub(); unsub = null; cancelAnimationFrame(loop); App.live.stop();
        btn.className = 'btn primary sm'; btn.innerHTML = `${icon('mic')} Start`;
        if (report && offs.length >= 6) {
          const results = offs.map((o) => ({ result: Math.abs(o) <= 35 ? 'hit' : o < 0 ? 'early' : 'late', offsetMs: o })).concat(Array.from({ length: missed }, () => ({ result: 'miss' })));
          const stats = PM.Agent.takeStats(results, S.bpm);
          App.emit('practice', { type: 'end', stats, prev: practice.prev, exercise: { title: 'Rhythm practice' } });
          practice.prev = stats;
          App.game.recordSession({ mode: 'rhythm', instrument: App.instrument, seconds: (performance.now() - started) / 1000, title: `Rhythm practice · ${(S.style && S.style.name) || (S.pattern && S.pattern.name) || 'beat'} @ ${S.bpm}`, summary: { accuracy: stats.accuracy, score: hits * 10, stars: stats.inTime >= 0.85 ? 3 : stats.inTime >= 0.65 ? 2 : stats.inTime >= 0.4 ? 1 : 0, timingAccuracy: stats.inTime, onsets: offs.length } });
          App.game.progressDaily('rhythmHits', hits);
        }
      };
      cleanup.push(() => stopP(false));
      btn.onclick = async () => {
        if (unsub) { stopP(true); return; }
        try { App.live.latency = App.settings.latency; await App.live.start(App.settings.deviceId); }
        catch (e) { UI.toast('Microphone unavailable: ' + (e.message || e), { icon: '🎤' }); return; }
        if (!S.running) { S.start(); syncPlay(); }
        offs = []; hits = 0; missed = 0; judged = new Set(); started = performance.now();
        btn.className = 'btn live sm'; btn.innerHTML = `${icon('stop')} Stop & score`;
        App.emit('practice', { type: 'start', title: 'Rhythm practice', bpm: S.bpm, tip: 'Listen to the part you chose and land exactly with it.' });
        const isTarget = (q) => {
          const p = S.current(); if (!p) return false;
          const v = $('#rpVoice', host).value;
          if (v === 'beat') return q.step % p.stepsPerBeat === 0;
          if (v === 'all') return Object.values(p.tracks).some((t) => Drums.velOf(t[q.step]) > 0.3);
          return Drums.velOf((p.tracks[v] || '')[q.step]) > 0;
        };
        unsub = App.live.on((f) => {
          if (!f.onset) return;
          let best = null;
          for (const q of S.queue) { if (!isTarget(q) || judged.has(q.time)) continue; const d = f.time - q.time; if (Math.abs(d) < 0.16 && (!best || Math.abs(d) < Math.abs(best.d))) best = { q, d }; }
          if (!best) return;
          judged.add(best.q.time);
          const ms = Math.round(best.d * 1000);
          offs.push(ms);
          if (Math.abs(ms) <= 35) hits++;
          const mean = offs.reduce((a, b) => a + b, 0) / offs.length;
          $('#rpHits', host).textContent = offs.length;
          $('#rpOn', host).textContent = Math.round((hits / offs.length) * 100) + '%';
          $('#rpAvg', host).textContent = (mean > 0 ? '+' : '') + Math.round(mean) + ' ms';
          UI.setGauge($('#rpGauge .gauge', host), ms, 100);
          App.emit('practice', { type: 'note', result: Math.abs(ms) <= 35 ? 'hit' : ms < 0 ? 'early' : 'late', offsetMs: ms });
        });
        const check = () => {
          loop = requestAnimationFrame(check);
          const now = PM.Audio.getCtx().currentTime;
          for (const q of S.queue) if (q.time < now - 0.2 && q.time > now - 0.6 && isTarget(q) && !judged.has(q.time) && (performance.now() - started) > 1500) { judged.add(q.time); missed++; $('#rpMiss', host).textContent = missed; }
        };
        loop = requestAnimationFrame(check);
      };
    }

    // ---------------------------------------------------------------- Styles
    if (tab === 'styles') {
      if (!S.style || S.style.id !== prefs.styleId) S.setStyle(Styles.get(prefs.styleId) || Styles.STYLES[0]);
      S.chords = Styles.parseChords(prefs.chords);
      S.accomp = prefs.accomp; S.autoFill = prefs.autoFill;
      const cats = ['All', ...Styles.CATEGORIES];
      const drawList = () => {
        const list = Styles.STYLES.filter((s) => prefs.cat === 'All' || s.category === prefs.cat);
        $('#stList', host).innerHTML = list.map((s) => `<button class="style-item ${S.style && S.style.id === s.id ? 'on' : ''}" data-st="${s.id}"><b>${esc(s.name)}</b><span class="small">${esc(s.category)} · ${s.meter} · ${s.bpm} BPM</span></button>`).join('');
        $$('[data-st]', host).forEach((b) => (b.onclick = () => {
          const was = S.running;
          if (was) S.stop();
          S.setStyle(Styles.get(b.dataset.st)); prefs.styleId = b.dataset.st; savePrefs();
          drawList(); drawPanel();
          if (was) { S.start(); App.emit('practice', { type: 'groove', style: S.style, bpm: S.bpm }); }
        }));
      };
      const drawPanel = () => {
        const st = S.style;
        const p = st.variations.A;
        $('#stPanel', host).innerHTML = `
          <div class="card-head"><h3 style="color:#fff">🥁 ${esc(st.name)}</h3><span class="chip">${esc(st.meter)}</span></div>
          <p class="small">${esc(st.desc)}</p>
          ${st.tip ? `<div class="pa-tip">💡 ${esc(st.tip)}</div>` : ''}
          ${beatLights(p.beatsPerBar)}
          <div class="row" style="justify-content:center;margin:6px 0"><span class="chip" id="rSection">ready</span></div>
          <div class="arranger">
            <button class="arr-btn" data-act="intro">${icon('play')} Intro</button>
            <button class="arr-btn" data-sec="A">Main A</button>
            <button class="arr-btn" data-sec="B">Main B</button>
            <button class="arr-btn" data-act="fill">Fill in</button>
            <button class="arr-btn" data-act="ending">Ending</button>
          </div>
          <div class="row" style="justify-content:center;margin-top:12px">
            <button class="btn white" id="rPlay" style="min-width:140px">${icon(S.running ? 'stop' : 'play')} ${S.running ? 'Stop' : 'Start'}</button>
            <button class="btn glass" id="rRec">${icon('mic')} Record & send</button>
          </div>
          <div class="grid g2" style="margin-top:14px">
            <label class="field">Tempo <b id="rBpmL">${S.bpm}</b> BPM<input type="range" id="rBpm" min="40" max="220" value="${S.bpm}"></label>
            <label class="field">Volume<input type="range" id="rVol" min="0" max="1" step="0.05" value="${S.volume}"></label>
          </div>`;
        $('#rBpm', host).oninput = (e) => { S.bpm = +e.target.value; $('#rBpmL', host).textContent = S.bpm; };
        $('#rVol', host).oninput = (e) => S.setVolume(+e.target.value);
        $('#rPlay', host).onclick = () => { if (S.running) S.end(); else { S.useIntro = false; S.start(); App.emit('practice', { type: 'groove', style: S.style, bpm: S.bpm }); } syncPlay(); };
        $$('[data-sec]', host).forEach((b) => (b.onclick = () => { S.switchTo(b.dataset.sec); if (!S.running) { S.useIntro = false; S.start(); syncPlay(); } }));
        $$('[data-act]', host).forEach((b) => (b.onclick = () => {
          const a = b.dataset.act;
          if (a === 'intro') { if (S.running) S.stop(); S.useIntro = true; S.start(); App.emit('practice', { type: 'groove', style: S.style, bpm: S.bpm }); }
          else if (a === 'fill') { if (S.running) S.fill(); }
          else if (a === 'ending') { if (S.running) S.end(); }
          syncPlay();
        }));
        $('#rRec', host).onclick = () => PM.RecordPanel.open({ title: `${st.name} groove practice`, mode: 'rhythm', context: 'Start the groove, then record yourself playing along (the microphone hears you and the speakers). Use headphones for a clean recording of just you.' });
      };
      body.innerHTML = `
        <div class="seg" id="stCats" style="margin-bottom:12px">${cats.map((c) => `<button data-c="${esc(c)}" class="${prefs.cat === c ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
        <div class="rhythm-layout">
          <section class="card"><div class="card-head"><h3>${icon('library')} ${Styles.STYLES.length} styles</h3></div><div class="style-list" id="stList"></div></section>
          <div class="stack" style="gap:18px">
            <section class="card stage" id="stPanel"></section>
            <section class="card"><div class="card-head"><h3>${icon('piano')} Auto-accompaniment</h3><label class="switch"><input type="checkbox" id="acOn" ${prefs.accomp ? 'checked' : ''}><span class="track"></span>Bass & chords</label></div>
              <label class="field">Chords, one per bar<input type="text" id="acChords" value="${esc(prefs.chords)}" placeholder="C | G | Am | F"></label>
              <div class="row" style="gap:6px;margin-top:8px">${PROGS.map(([n, c]) => `<button class="mini-btn" data-pg="${esc(c)}">${esc(n)}</button>`).join('')}</div>
              <div class="row" style="margin-top:10px"><label class="field" style="flex-direction:row;align-items:center;gap:8px">Fill every<select id="acFill">${[0, 2, 4, 8].map((n) => `<option value="${n}" ${prefs.autoFill === n ? 'selected' : ''}>${n ? n + ' bars' : 'never (manual)'}</option>`).join('')}</select></label>
              <div class="spacer"></div><div class="row" style="gap:4px">${['kick', 'snare', 'hhc'].map((v) => `<label class="chip"><input type="checkbox" data-mute="${v}" ${S.mute[v] ? '' : 'checked'}> ${esc(Drums.VOICES.find((x) => x.id === v).name)}</label>`).join('')}</div></div>
              <p class="small" style="margin-top:8px">The band plays one chord per bar and loops your progression. Change chords while it plays — it follows on the next bar.</p></section>
          </div>
        </div>
        ${practiceBox(['snare', 'kick', 'hhc', 'clap', 'rim'])}`;
      $$('#stCats button', host).forEach((b) => (b.onclick = () => { prefs.cat = b.dataset.c; savePrefs(); $$('#stCats button', host).forEach((x) => x.classList.toggle('on', x === b)); drawList(); }));
      const setChords = (v) => { prefs.chords = v; savePrefs(); S.chords = Styles.parseChords(v); $('#acChords', host).value = v; };
      $('#acChords', host).onchange = (e) => setChords(e.target.value);
      $$('[data-pg]', host).forEach((b) => (b.onclick = () => setChords(b.dataset.pg)));
      $('#acOn', host).onchange = (e) => { prefs.accomp = S.accomp = e.target.checked; savePrefs(); };
      $('#acFill', host).onchange = (e) => { prefs.autoFill = S.autoFill = +e.target.value; savePrefs(); };
      $$('[data-mute]', host).forEach((c) => (c.onchange = () => { S.mute[c.dataset.mute] = !c.checked; }));
      drawList(); drawPanel(); wirePractice();
      return () => { cleanup.forEach((f) => f()); };
    }

    // ---------------------------------------------------------------- Beat maker
    const saved = loadJ(PAT_KEY, []);
    let pat = S.pattern && !S.style ? S.pattern : (App.beatPattern || Drums.emptyPattern(4, 4));
    if (!App.beatPattern && pat === S.pattern) App.beatPattern = pat;
    if (!App.beatPattern) {
      // a friendly starting groove
      pat.tracks.kick = 'X.......X.x.....'; pat.tracks.snare = '....X.......X...'; pat.tracks.hhc = 'x.x.x.x.x.x.x.x.';
      pat.name = 'My first beat';
      App.beatPattern = pat;
    }
    if (S.style || S.pattern !== pat) { if (S.running) S.stop(); S.setPattern(pat); }
    const visible = () => Object.keys(pat.tracks);
    const drawGrid = () => {
      const n = pat.steps, spb = pat.stepsPerBeat;
      $('#bmGrid', host).innerHTML = `<div class="sq-grid" style="--steps:${n}">
        <div class="sq-row head"><span class="sq-name"></span>${Array.from({ length: n }, (_, s) => `<span class="sq-col ${s % spb === 0 ? 'beat' : ''}" data-s="${s}">${s % spb === 0 ? s / spb + 1 : ''}</span>`).join('')}<span></span></div>
        ${visible().map((v) => `<div class="sq-row" data-v="${v}"><span class="sq-name" title="${esc((Drums.VOICES.find((x) => x.id === v) || {}).name)}">${esc((Drums.VOICES.find((x) => x.id === v) || {}).name || v)}</span>${Array.from({ length: n }, (_, s) => { const c = pat.tracks[v][s]; return `<button class="sq-cell c${c === '.' ? '_' : c} ${s % spb === 0 ? 'beat' : ''} sq-col" data-s="${s}" aria-label="${v} step ${s + 1}"></button>`; }).join('')}<button class="mini-btn sq-del" data-del="${v}" title="Remove row">✕</button></div>`).join('')}
      </div>`;
      $$('.sq-row[data-v] .sq-cell', host).forEach((b) => (b.onclick = () => {
        const v = b.closest('.sq-row').dataset.v, s = +b.dataset.s;
        const cur = pat.tracks[v][s];
        const nx = nextChar[cur] || '.';
        pat.tracks[v] = pat.tracks[v].slice(0, s) + nx + pat.tracks[v].slice(s + 1);
        b.className = `sq-cell c${nx === '.' ? '_' : nx} ${s % spb === 0 ? 'beat' : ''} sq-col`;
        if (!S.running) { const ctx = PM.Audio.getCtx(); const kit = new Drums.DrumKit(ctx); if (nx !== '.') kit.play(v, ctx.currentTime + 0.01, Drums.velOf(nx)); }
      }));
      $$('[data-del]', host).forEach((b) => (b.onclick = () => { delete pat.tracks[b.dataset.del]; drawGrid(); }));
    };
    const resize = (bpb, spb) => {
      const steps = bpb * spb;
      for (const v of Object.keys(pat.tracks)) {
        const old = pat.tracks[v], ospb = pat.stepsPerBeat;
        let nw = '';
        for (let s = 0; s < steps; s++) { const beatPos = s / spb; const os = Math.round(beatPos * ospb); nw += Number.isInteger(beatPos * ospb) && os < old.length ? old[os] : '.'; }
        pat.tracks[v] = nw;
      }
      Object.assign(pat, { steps, stepsPerBeat: spb, beatsPerBar: bpb });
    };
    const gridKey = () => Object.entries(GRIDS).find(([, [b, s]]) => b === pat.beatsPerBar && s === pat.stepsPerBeat);
    body.innerHTML = `
      <section class="card stage">
        <div class="card-head"><h3 style="color:#fff">🎛️ Beat maker</h3><input type="text" id="bmName" value="${esc(pat.name || 'My beat')}" style="max-width:220px"></div>
        <div class="row" style="gap:12px">
          <button class="btn white" id="rPlay" style="min-width:130px">${icon(S.running ? 'stop' : 'play')} ${S.running ? 'Stop' : 'Start'}</button>
          <label class="field">Tempo <b id="rBpmL">${S.bpm}</b><input type="range" id="rBpm" min="40" max="220" value="${S.bpm}"></label>
          <label class="field">Grid<select id="bmGridSel">${Object.keys(GRIDS).map((k) => `<option ${gridKey() && gridKey()[0] === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
          <label class="field">Swing <b id="bmSwL">${Math.round((pat.swing || 0) * 100)}%</b><input type="range" id="bmSwing" min="0" max="0.35" step="0.01" value="${pat.swing || 0}"></label>
        </div>
        ${beatLights(pat.beatsPerBar)}
        <div id="bmGrid" class="sq-wrap"></div>
        <div class="row" style="margin-top:10px;gap:8px">
          <select id="bmAdd"><option value="">+ Add instrument…</option>${Drums.VOICES.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select>
          <button class="btn glass sm" id="bmClear">Clear</button>
          <button class="btn glass sm" id="bmInspire">${icon('sparkle')} Inspire me</button>
          <select id="bmFrom"><option value="">Start from a style…</option>${Styles.STYLES.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
          <div class="spacer"></div>
          <button class="btn primary sm" id="bmSave">${icon('check')} Save pattern</button>
        </div>
        <p class="small" style="margin-top:8px">Tap: hit → accent (big) → ghost (soft) → off. Count the numbers above the grid out loud while it plays.</p>
      </section>
      <section class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('library')} My patterns</h3></div><div class="row" id="bmSaved" style="gap:6px"></div></section>
      ${practiceBox(['snare', 'kick', 'hhc', 'clap'])}`;
    drawGrid();
    const drawSaved = () => {
      const list = loadJ(PAT_KEY, []);
      $('#bmSaved', host).innerHTML = list.length ? list.map((p, i) => `<span class="chip"><button class="mini-btn" data-load="${i}">${esc(p.name)}</button><button class="mini-btn" data-rm="${i}">✕</button></span>`).join('') : '<span class="muted small">Saved patterns appear here.</span>';
      $$('[data-load]', host).forEach((b) => (b.onclick = () => { const p = JSON.parse(JSON.stringify(loadJ(PAT_KEY, [])[+b.dataset.load])); App.beatPattern = p; S.setPattern(p); App.rerender(); }));
      $$('[data-rm]', host).forEach((b) => (b.onclick = () => { const l = loadJ(PAT_KEY, []); l.splice(+b.dataset.rm, 1); saveJ(PAT_KEY, l); drawSaved(); }));
    };
    drawSaved();
    $('#rPlay', host).onclick = () => { if (S.running) S.stop(); else { S.setPattern(pat); S.start(); App.emit('practice', { type: 'groove', bpm: S.bpm }); } syncPlay(); };
    $('#rBpm', host).oninput = (e) => { S.bpm = +e.target.value; $('#rBpmL', host).textContent = S.bpm; };
    $('#bmSwing', host).oninput = (e) => { pat.swing = +e.target.value; $('#bmSwL', host).textContent = Math.round(pat.swing * 100) + '%'; };
    $('#bmName', host).onchange = (e) => { pat.name = e.target.value.trim() || 'My beat'; };
    $('#bmGridSel', host).onchange = (e) => { const [b, s] = GRIDS[e.target.value]; resize(b, s); App.rerender(); };
    $('#bmAdd', host).onchange = (e) => { const v = e.target.value; if (v && !pat.tracks[v]) { pat.tracks[v] = '.'.repeat(pat.steps); drawGrid(); } e.target.value = ''; };
    $('#bmClear', host).onclick = () => { for (const v of Object.keys(pat.tracks)) pat.tracks[v] = '.'.repeat(pat.steps); drawGrid(); };
    $('#bmInspire', host).onclick = () => {
      const n = pat.steps, spb = pat.stepsPerBeat, r = Math.random;
      const line = (fn) => Array.from({ length: n }, (_, s) => fn(s)).join('');
      pat.tracks.kick = line((s) => (s === 0 ? 'X' : s % spb === 0 && r() < 0.35 ? 'x' : s % spb !== 0 && r() < 0.12 ? 'x' : '.'));
      pat.tracks.snare = line((s) => (s % (spb * 2) === spb ? 'X' : r() < 0.06 ? 'o' : '.'));
      pat.tracks.hhc = line((s) => (spb === 4 ? (s % 2 === 0 ? 'x' : r() < 0.3 ? 'o' : '.') : 'x'));
      drawGrid();
    };
    $('#bmFrom', host).onchange = (e) => {
      const st = Styles.get(e.target.value);
      if (!st) return;
      const p = JSON.parse(JSON.stringify(st.variations.A));
      p.name = st.name + ' (my version)'; delete p.bass; delete p.comp;
      App.beatPattern = p; S.setPattern(p); S.bpm = st.bpm; App.rerender();
    };
    $('#bmSave', host).onclick = () => {
      const list = loadJ(PAT_KEY, []);
      const i = list.findIndex((p) => p.name === pat.name);
      const copy = JSON.parse(JSON.stringify(pat));
      if (i >= 0) list[i] = copy; else list.push(copy);
      saveJ(PAT_KEY, list.slice(-40));
      drawSaved();
      UI.toast('Pattern saved', { icon: '🥁' });
    };
    wirePractice();
    return () => { cleanup.forEach((f) => f()); };
  }

  PM.RhythmView = { render, seq };
})(typeof self !== 'undefined' ? self : globalThis);
