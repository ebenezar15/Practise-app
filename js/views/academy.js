/* Overture — Academy: self-paced courses. Subjects → lessons; each lesson has an explanation,
 * examples to hear, real-world uses, an "on your instrument" panel, unlimited generated
 * practice with instant feedback and stars, and links to practise it in the app. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Academy, Instruments, Theory, DSP } = PM;
  const { icon, esc, $, $$ } = UI;
  const param = (k) => { const m = new RegExp('[?&]' + k + '=([^&]+)').exec(location.hash); return m ? decodeURIComponent(m[1]) : null; };
  const SUBJ = Object.fromEntries(Academy.SUBJECTS.map((s) => [s.id, s]));
  const stateOf = (App) => (App.game.state.academy = Object.assign({ best: {}, placement: null, last: null }, App.game.state.academy || {}));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

  // ------------------------------------------------------------------ sound & pictures
  function play(spec) {
    if (!spec) return;
    const LV = PM.LearnView;
    if (spec.notes) LV.playNotes(spec.vol ? spec.notes.map((m, i) => ({ midi: m, start: i * 0.55, dur: 0.5 })) : spec.notes, { bpm: spec.bpm || 110, voice: 'piano' });
    else if (spec.chord) LV.playNotes(spec.chord.map((m) => ({ midi: m, start: 0, dur: 1.4 })), { voice: 'piano' });
    else if (spec.seq) LV.playNotes(spec.seq.flatMap((ch, i) => ch.map((m) => ({ midi: m, start: i * 1.05, dur: 1 }))), { voice: 'piano' });
    else if (spec.rhythm) {
      const c = PM.Audio.getCtx(), beat = 60 / (spec.bpm || 90);
      let t = c.currentTime + 0.1, k = 0;
      for (const d of spec.rhythm) {
        PM.Sound.drum(spec.accents && k % spec.accents === 0 ? 'woodhi' : 'snare', t, spec.accents && k % spec.accents === 0 ? 0.9 : 0.6);
        t += d * beat; k++;
      }
    }
  }
  /** A small two-octave keyboard with highlighted keys. */
  function keysSvg(hl, lo, hi) {
    hl = hl || [];
    lo = lo != null ? lo : hl.length ? 12 * Math.floor(Math.min(...hl) / 12) : 48;
    lo = Math.max(24, Math.min(lo, 48));
    hi = hi || Math.max(lo + 23, hl.length ? 12 * Math.ceil((Math.max(...hl) + 1) / 12) - 1 : 0);
    const whites = [];
    for (let m = lo; m <= hi; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
    const W = 22, H = 86, set = new Set(hl);
    let svg = `<svg class="ak-keys" viewBox="0 0 ${whites.length * W} ${H}" role="img" aria-label="keyboard">`;
    whites.forEach((m, i) => { svg += `<rect x="${i * W}" y="0" width="${W - 1}" height="${H}" rx="3" class="${set.has(m) ? 'on' : 'w'}"/>${m % 12 === 0 ? `<text x="${i * W + W / 2}" y="${H - 6}">C${Math.floor(m / 12) - 1}</text>` : ''}`; });
    whites.forEach((m, i) => { const b = m + 1; if ([1, 3, 6, 8, 10].includes(b % 12) && b <= hi) svg += `<rect x="${i * W + W * 0.66}" y="0" width="${W * 0.66}" height="${H * 0.6}" rx="2" class="${set.has(b) ? 'on b' : 'bk'}"/>`; });
    return svg + '</svg>';
  }

  /** A playable keyboard: every key has data-m so taps can sound it. */
  function playKeys(hl, lo, hi) {
    const set = new Set(hl || []), whites = [];
    for (let m = lo; m <= hi; m++) if (![1, 3, 6, 8, 10].includes(m % 12)) whites.push(m);
    const W = 26, H = 110;
    let svg = `<svg class="ak-keys ak-play" viewBox="0 0 ${whites.length * W} ${H}" role="group" aria-label="playable keyboard">`;
    whites.forEach((m, i) => { svg += `<rect data-m="${m}" x="${i * W}" y="0" width="${W - 1}" height="${H}" rx="3" class="${set.has(m) ? 'on' : 'w'}"/>${m % 12 === 0 ? `<text x="${i * W + W / 2}" y="${H - 6}">C${Math.floor(m / 12) - 1}</text>` : ''}`; });
    whites.forEach((m, i) => { const b = m + 1; if ([1, 3, 6, 8, 10].includes(b % 12) && b <= hi) svg += `<rect data-m="${b}" x="${i * W + W * 0.66}" y="0" width="${W * 0.66}" height="${H * 0.6}" rx="2" class="${set.has(b) ? 'on b' : 'bk'}"/>`; });
    return svg + '</svg>';
  }
  const STR5 = { strings: [23, 28, 33, 38, 43], stringNames: ['B', 'E', 'A', 'D', 'G'] };
  const fretInst = (id) => (id === 'bass5' ? Object.assign({}, Instruments.get('bass'), STR5) : Instruments.get(id));
  /** Small static fretboard (frets 0–12) with an optional dot or a highlighted string. */
  function fretSvg(spec) {
    const I = fretInst(spec.inst), ns = I.strings.length, W = 420, left = 28, top = 14, sh = 24, H = top * 2 + sh * (ns - 1) + 14, fw = (W - left - 8) / 12;
    const y = (s) => top + sh * (ns - 1 - s), x = (f) => (f === 0 ? left - 10 : left + (f - 0.5) * fw);
    let g = `<svg class="ak-fret" viewBox="0 0 ${W} ${H}" role="img" aria-label="fretboard">`;
    g += `<rect x="${left}" y="${top - 6}" width="${W - left - 8}" height="${sh * (ns - 1) + 12}" rx="5" fill="#2a1052"/>`;
    for (let f = 0; f <= 12; f++) g += `<line x1="${left + f * fw}" y1="${top - 6}" x2="${left + f * fw}" y2="${top + sh * (ns - 1) + 6}" stroke="${f ? 'rgba(196,181,253,.45)' : '#ede9fe'}" stroke-width="${f ? 1.5 : 4}"/>`;
    for (const f of [3, 5, 7, 9, 12]) g += `<text x="${left + (f - 0.5) * fw}" y="${H - 1}" font-size="11" text-anchor="middle" fill="#8a7fa8" font-weight="700">${f}</text>`;
    for (let s = 0; s < ns; s++) g += `<line x1="${left}" y1="${y(s)}" x2="${W - 8}" y2="${y(s)}" stroke="${spec.string === s && spec.fret == null ? '#f0abfc' : 'rgba(237,233,254,.6)'}" stroke-width="${spec.string === s && spec.fret == null ? 3.5 : 1.6}"/><text x="${left - 18}" y="${y(s) + 4}" font-size="13" font-weight="800" fill="#a78bfa" text-anchor="middle">${I.stringNames[s]}</text>`;
    if (spec.fret != null) g += `<circle cx="${x(spec.fret)}" cy="${y(spec.string)}" r="10" fill="${spec.fret ? '#d946ef' : 'none'}" stroke="#d946ef" stroke-width="2.5"/>`;
    return g + '</svg>';
  }
  const valveIcons = (v) => { const d = v && v !== '0' ? v.split(' ').map(Number) : []; return `<div class="fp-vrow ak-valves">${[1, 2, 3].map((k) => `<div class="fp-valve ${d.includes(k) ? 'down' : ''}"><i></i><span>${k}</span></div>`).join('')}</div>`; };

  /** "On your instrument" panel for a chord, scale or notes. */
  function instPanel(b, App) {
    const I = Instruments.get(App.instrument);
    if (b.chord) {
      const p = Theory.parseChordName(b.chord);
      const pcs = Theory.chordPcs(p.root, p.type);
      const midis = pcs.map((pc, i) => 60 + ((pc - pcs[0] + 12) % 12) + pcs[0] - (pcs[0] > 5 ? 12 : 0));
      const names = pcs.map((pc) => Theory.spell(pc)).join(' – ');
      if (I.strings && I.chordal) return `<div class="ak-inst">${UI.chordDiagram(b.chord)}<div><b>${esc(b.chord)}</b><span>${names}</span></div></div>`;
      if (I.id === 'bass') return `<div class="ak-inst"><div><b>${esc(b.chord)} on bass</b><span>Root <b>${Theory.spell(pcs[0])}</b> on beat 1 · 5th ${Theory.spell(pcs[2] != null ? pcs[2] : pcs[1])} · octave</span></div></div>`;
      if (I.id === 'trumpet') return `<div class="ak-inst"><div><b>${esc(b.chord)} for B♭ trumpet</b><span>Written arpeggio: ${pcs.map((pc) => Theory.spell(pc + 2)).join(' – ')}</span></div></div>`;
      return `<div class="ak-inst">${keysSvg(midis, 48)}<div><b>${esc(b.chord)}</b><span>${names}${I.id === 'voice' ? ' — sing it as an arpeggio: do-mi-so' : ''}</span></div><button class="btn sm ghost" data-play-chord="${midis.join(',')}">▶</button></div>`;
    }
    if (b.scale) {
      const notes = PM.Learn.scale({ tonic: b.scale.tonic, scale: b.scale.scale, instrument: I.id === 'voice' ? 'piano' : I.id, octaves: 1, direction: 'up' });
      const pos = I.strings ? notes.map((m) => { const fp = Instruments.fretPosition(I.id, m); return fp ? `${I.stringNames[fp.string]}${fp.fret}` : ''; }).join(' · ') : '';
      return `<div class="ak-inst">${keysSvg(notes.map((m) => (m < 48 ? m + 12 : m)), 48)}<div><b>${esc(Theory.spell(b.scale.tonic) + ' ' + PM.Learn.SCALES[b.scale.scale].name)}</b><span>${notes.map((m) => Theory.spell(m)).join(' ')}</span>${pos ? `<span class="small">On ${esc(I.short.toLowerCase())}: ${esc(pos)} (string+fret)</span>` : ''}</div><button class="btn sm ghost" data-play-notes="${notes.join(',')}">▶</button></div>`;
    }
    if (b.staff) return `<div class="ak-inst"><div class="staff-box">${PM.LearnView.staffSvg(b.staff, { clef: b.clef })}</div></div>`;
    if (b.notes) return `<div class="ak-inst">${keysSvg(b.notes, 48)}<button class="btn sm ghost" data-play-notes="${b.notes.join(',')}">▶ Hear</button></div>`;
    return '';
  }

  // ------------------------------------------------------------------ view
  PM.App.register({
    id: 'academy', title: 'Academy', icon: 'library',
    render(host, App) {
      const lid = param('l'), sid = param('s');
      if (param('placement')) return placement(host, App);
      if (lid && Academy.LESSONS.find((l) => l.id === lid)) return lesson(host, App, Academy.LESSONS.find((l) => l.id === lid));
      if (sid && SUBJ[sid]) return subject(host, App, SUBJ[sid]);
      return home(host, App);
    },
  });

  /** A subject's lessons in teaching order: level, then the order they were written. */
  const ordered = (sid) => Academy.LESSONS.filter((l) => l.subject === sid).sort((a, b) => a.level - b.level || a.n - b.n);
  const LV_NAMES = ['All levels', ...Academy.LEVELS.slice(1)];
  /** Next lesson to take: at the chosen level (if any), your instrument's course first. */
  const nextLesson = (App, level) => {
    const st = stateOf(App), lvl = level || (st.placement && st.placement.level) || 1;
    const ok = (l) => !(st.best[l.id] >= 0.75) && (!l.instrument || l.instrument === App.instrument);
    const pool = Academy.SUBJECTS.flatMap((sj) => ordered(sj.id)).sort((a, b) => (b.instrument === App.instrument) - (a.instrument === App.instrument));
    return (level ? pool.find((l) => l.level === level && ok(l)) : pool.find((l) => l.level <= lvl && ok(l))) || pool.find((l) => (!level || l.level === level) && !(st.best[l.id] >= 0.75)) || pool.find((l) => !level || l.level === level) || pool[0];
  };

  function home(host, App) {
    const st = stateOf(App);
    const done = Object.values(st.best).filter((b) => b >= 0.75).length;
    const level = App.academyLevel || 0;
    host.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Academy</div><h1>Learn music, step by step</h1>
        <p>${Academy.LESSONS.length} lessons in ${Academy.SUBJECTS.length} subjects — from your first notes to modes, harmony and arranging. Every lesson has examples to hear, real-world uses and unlimited practice questions.</p></div>
        <div class="row"><span class="chip big">🎓 ${done} / ${Academy.LESSONS.length} mastered</span></div></div>
      <div class="grid g2">
        <section class="card stage ak-next" id="akNext"></section>
        <section class="card"><div class="card-head"><h3>🧭 Where should I start?</h3></div>
          <p>${st.placement ? `Your placement: <b>${esc(st.placement.label)}</b>. Suggested subjects: ${st.placement.start.map((s) => esc(SUBJ[s].name)).join(', ')}.` : 'Take the 2-minute placement quiz — Overture suggests your level and the best first subjects.'}</p>
          <a class="btn ${st.placement ? 'ghost' : 'primary'}" href="#/academy?placement=1">${st.placement ? 'Retake the quiz' : 'Take the placement quiz'}</a></section>
      </div>
      <div class="row" style="margin:18px 0 12px;gap:10px;flex-wrap:wrap"><div class="seg" id="akLvl">${LV_NAMES.map((n, i) => `<button data-l="${i}" class="${i === level ? 'on' : ''}">${n}</button>`).join('')}</div>
        <input type="search" id="akQ" placeholder="Search lessons: chords, capo, modes, rhythm…" style="flex:1 1 220px"></div>
      <div id="akBody"></div>`;
    const draw = () => {
      const level = App.academyLevel || 0;
      const nx = nextLesson(App, level);
      $('#akNext', host).innerHTML = `<div class="now-label">${level ? 'Next ' + Academy.LEVELS[level] + ' lesson' : st.last ? 'Continue learning' : 'Start here'}</div>
          <h2 style="color:#fff;margin:6px 0">${SUBJ[nx.subject].emoji} ${esc(nx.title)}</h2>
          <p style="color:rgba(255,255,255,.8)">${esc(SUBJ[nx.subject].name)} · ${Academy.LEVELS[nx.level]} · ${nx.minutes} min</p>
          <a class="btn white" href="#/academy?l=${nx.id}">${icon('play')} Open lesson</a>`;
      const upNext = (sid) => { const xs = ordered(sid).filter((l) => !level || l.level === level); const n = xs.find((l) => !(st.best[l.id] >= 0.75)) || xs[0]; return n ? `<span class="ak-upnext small"><b>${level ? LV_NAMES[level] : Academy.LEVELS[n.level]}:</b> ${esc(n.title)}</span>` : ''; };
      const q = ($('#akQ', host).value || '').trim().toLowerCase();
      if (q) {
        const hits = Academy.LESSONS.filter((l) => (!level || l.level === level) && (l.title + ' ' + SUBJ[l.subject].name + ' ' + JSON.stringify(l.body)).toLowerCase().includes(q));
        $('#akBody', host).innerHTML = hits.length ? `<div class="ak-list">${hits.map((l) => lessonRow(l, st)).join('')}</div>` : '<div class="empty">No lessons match.</div>';
        return;
      }
      const courses = (Academy.COURSES || []).slice().sort((x, y) => (y.course === App.instrument) - (x.course === App.instrument));
      const courseHtml = courses.length ? `<h3 style="margin:4px 0 10px">🎻 Instrument courses</h3><div class="ak-courses">${courses.map((c) => {
        const ls = Academy.LESSONS.filter((l) => l.subject === c.id && (!level || l.level === level));
        const m = ls.filter((l) => st.best[l.id] >= 0.75).length;
        return `<a class="card ak-course ${c.course === App.instrument ? 'mine' : ''}" href="#/academy?s=${c.id}${level ? '&lv=' + level : ''}" style="--sc:${c.color}"><span class="ak-em">${c.emoji}</span><b>${esc(c.name)}</b>${c.course === App.instrument ? '<span class="tag">Your instrument</span>' : ''}<span class="small">${esc(c.desc)}</span>${upNext(c.id)}<span class="ak-bar"><i style="width:${ls.length ? Math.round((m / ls.length) * 100) : 0}%"></i></span><span class="small muted">${m}/${ls.length} lessons${level ? ' · ' + Academy.LEVELS[level] : ' · 3 levels'}</span></a>`;
      }).join('')}</div><h3 style="margin:22px 0 10px">📚 Subjects</h3>` : '';
      $('#akBody', host).innerHTML = courseHtml + `<div class="ak-subjects">${Academy.SUBJECTS.filter((s) => !s.course).map((s) => {
        const ls = Academy.LESSONS.filter((l) => l.subject === s.id && (!level || l.level === level));
        if (!ls.length) return '';
        const m = ls.filter((l) => st.best[l.id] >= 0.75).length;
        return `<a class="card ak-subject" href="#/academy?s=${s.id}${level ? '&lv=' + level : ''}" style="--sc:${s.color}"><span class="ak-em">${s.emoji}</span><b>${esc(s.name)}</b><span class="small">${esc(s.desc)}</span>${upNext(s.id)}<span class="ak-bar"><i style="width:${Math.round((m / ls.length) * 100)}%"></i></span><span class="small muted">${m}/${ls.length} lessons${level ? ' · ' + Academy.LEVELS[level] : ''}</span></a>`;
      }).join('')}</div>`;
    };
    $('#akQ', host).oninput = draw;
    $$('#akLvl [data-l]', host).forEach((b) => (b.onclick = () => { App.academyLevel = +b.dataset.l; $$('#akLvl [data-l]', host).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
    draw();
  }

  const lessonRow = (l, st) => `<a class="ak-row" href="#/academy?l=${l.id}"><span class="ak-em sm">${SUBJ[l.subject].emoji}</span><span><b>${esc(l.title)}</b><span class="small muted">${esc(SUBJ[l.subject].name)} · ${Academy.LEVELS[l.level]} · ${l.minutes} min</span></span><span class="ak-stars">${'★'.repeat(Academy.stars(st.best[l.id]))}${'☆'.repeat(3 - Academy.stars(st.best[l.id]))}</span></a>`;

  function subject(host, App, s) {
    const st = stateOf(App);
    const lvParam = +param('lv');
    if (lvParam >= 0 && lvParam <= 3 && param('lv') != null) App.academyLevel = lvParam;
    const level = App.academyLevel || 0;
    const ls = ordered(s.id);
    const count = (lv) => ls.filter((l) => !lv || l.level === lv).length;
    host.innerHTML = `<div class="page-head"><div><a href="#/academy" class="eyebrow" style="text-decoration:none">${icon('back')} Academy</a><h1>${s.emoji} ${esc(s.name)}</h1><p>${esc(s.desc)}</p></div></div>
      <div class="seg" id="akSubLvl" style="margin-bottom:8px">${LV_NAMES.map((n, i) => `<button data-l="${i}" class="${i === level ? 'on' : ''}">${n} <span class="small">${count(i)}</span></button>`).join('')}</div>
      ${[1, 2, 3].filter((lv) => !level || lv === level).map((lv) => { const x = ls.filter((l) => l.level === lv); return x.length ? `<h3 style="margin:18px 0 10px">${Academy.LEVELS[lv]} <span class="muted small">· ${x.length} lessons</span></h3><div class="ak-list pop-in">${x.map((l) => lessonRow(l, st)).join('')}</div>` : `<div class="empty">No ${Academy.LEVELS[lv].toLowerCase()} lessons here yet.</div>`; }).join('')}`;
    $$('#akSubLvl [data-l]', host).forEach((b) => (b.onclick = () => { App.academyLevel = +b.dataset.l; location.replace('#/academy?s=' + s.id + '&lv=' + b.dataset.l); }));
  }

  function lesson(host, App, l) {
    const st = stateOf(App);
    st.last = l.id; App.game.save();
    const s = SUBJ[l.subject];
    const sib = ordered(l.subject);
    const i = sib.indexOf(l);
    const prev = sib[i - 1], next = sib[i + 1];
    const I = Instruments.get(App.instrument);
    host.innerHTML = `<div class="page-head"><div><a href="#/academy?s=${s.id}" class="eyebrow" style="text-decoration:none">${icon('back')} ${esc(s.name)}</a><h1>${esc(l.title)}</h1>
        <div class="row" style="gap:6px;margin-top:8px"><span class="chip">${s.emoji} ${esc(s.name)}</span><span class="chip">${Academy.LEVELS[l.level]}</span><span class="chip">⏱ ${l.minutes} min</span><span class="chip">Lesson ${i + 1} of ${sib.length}</span><span class="chip" id="akStars">${'★'.repeat(Academy.stars(st.best[l.id]))}${'☆'.repeat(3 - Academy.stars(st.best[l.id]))}</span></div></div></div>
      <div class="ak-steps"><a href="#ak-learn">1 · Learn</a><a href="#ak-practice" data-jump="practice">2 · Practise</a>${l.try ? '<a href="#ak-try" data-jump="try">3 · Try it for real</a>' : ''}</div>
      ${l.instrument && l.instrument !== App.instrument ? `<div class="notice" style="margin-bottom:14px">${icon(Instruments.get(l.instrument).icon)}<div>This lesson is for <b>${esc(Instruments.get(l.instrument).label)}</b>. Switch so the play-it-now drills listen for the right instrument.</div><button class="btn sm primary" id="akSwitch">Switch to ${esc(Instruments.get(l.instrument).short || Instruments.get(l.instrument).label)}</button></div>` : ''}
      ${l.instrument === 'bass' && App.instrument === 'bass' ? `<div class="row" style="margin-bottom:12px;gap:10px;align-items:center"><span class="small muted">Your bass:</span>${PM.Shared.bassStrings(App)}</div>` : ''}
      <section class="card ak-lesson" id="ak-learn">${l.body.map((b, k) => block(b, App, I, k)).join('')}</section>
      <section class="card" id="ak-practice" style="margin-top:18px"><div class="card-head"><h3>✏️ Practice</h3><span class="muted small">New questions every time · 75% = mastered</span></div><div id="akQuiz"></div></section>
      ${l.try ? `<section class="card" id="ak-try" style="margin-top:18px"><div class="card-head"><h3>🎯 Try it for real</h3></div><div class="row" style="gap:10px;flex-wrap:wrap">${l.try.map((t, k) => `<button class="btn" data-try="${k}">${esc(t.label)} →</button>`).join('')}</div></section>` : ''}
      <div class="row" style="justify-content:space-between;margin-top:18px">${prev ? `<a class="btn ghost" href="#/academy?l=${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn primary" href="#/academy?l=${next.id}">${esc(next.title)} →</a>` : ''}</div>`;
    // the in-page step links scroll instead of changing the route
    $$('.ak-steps a', host).forEach((a) => (a.onclick = (e) => { e.preventDefault(); const t = $(a.getAttribute('href'), host); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    $$('[data-ex]', host).forEach((b) => (b.onclick = () => { play(l.body[+b.dataset.ex].play); UI.bump(b, 'pop-in'); }));
    $$('[data-play-chord]', host).forEach((b) => (b.onclick = () => play({ chord: b.dataset.playChord.split(',').map(Number) })));
    $$('[data-play-notes]', host).forEach((b) => (b.onclick = () => play({ notes: b.dataset.playNotes.split(',').map(Number) })));
    $$('[data-try]', host).forEach((b) => (b.onclick = () => {
      const t = l.try[+b.dataset.try];
      if (t.go === 'learn' && t.activity) App.pendingActivity = t.activity;
      if (t.go === 'toolkit' && t.tab) App.toolkitTab = t.tab;
      App.go(t.go);
    }));
    const sw = $('#akSwitch', host); if (sw) sw.onclick = () => App.setInstrument(l.instrument);
    PM.Shared.wireBassStrings(host, App);
    const cleanups = mountBlocks(host, App, l);
    quiz($('#akQuiz', host), App, l);
    return () => cleanups.forEach((f) => f && f());
  }

  // ------------------------------------------------------------------ interactive blocks
  function mountBlocks(host, App, l) {
    const out = [];
    const instOf = () => l.instrument || App.instrument;
    l.body.forEach((b, k) => {
      if (b.t === 'drumx') {
        const el = $(`[data-drumx="${k}"]`, host); if (!el || !PM.DrumAlong) return;
        const ctl = PM.DrumAlong.mount(el, App, { id: 'academy-' + b.id, title: b.title, level: l.level, cat: 'Academy', pattern: b.pattern, bpm: b.bpm }, { loops: 2 });
        out.push(() => ctl.stop());
      } else if (b.t === 'fing') {
        const el = $(`[data-fing="${k}"]`, host); if (!el || !PM.FingerPanel) return;
        const beats = Array.isArray(b.beats) ? b.beats : b.notes.map(() => b.beats || 1);
        const panel = PM.FingerPanel.mount(el, { inst: instOf(), notes: b.notes, beats, title: false, hand: b.hand });
        const hear = $(`[data-fhear="${k}"]`, host);
        if (hear) hear.onclick = () => { const beat = 60 / 96; PM.LearnView.playNotes(b.notes.map((m, i) => ({ midi: m, start: beats.slice(0, i).reduce((x, y) => x + y, 0) * beat, dur: beats[i] * beat * 0.9 })), { voice: Instruments.get(instOf()).synth }); let i = 0, acc = 0; const step = () => { if (i >= b.notes.length) return; panel.setCurrent(i); acc = beats[i] * beat * 1000; i++; out.push(clearTimeout.bind(null, setTimeout(step, acc))); }; step(); };
      } else if (b.t === 'drill') {
        const btn = $(`[data-drill="${k}"]`, host); if (!btn) return;
        btn.onclick = () => {
          if (l.instrument && App.instrument !== l.instrument) { UI.toast('Switching to ' + Instruments.get(l.instrument).label + ' — press “Play it now” again', { icon: '🎵' }); App.setInstrument(l.instrument); return; }
          const m = UI.modal(`<div class="modal-body stage ak-drillm"><div class="card-head"><h3 style="color:#fff">🎤 ${esc(b.title)}</h3><button class="btn sm glass" data-close>Done</button></div><div id="akDr"></div></div>`, { onClose: () => ctl && ctl.stop() });
          const beats = Array.isArray(b.beats) ? b.beats : b.notes.map(() => b.beats || 1);
          const ctl = PM.PlayAlong.mount($('#akDr', m.el), App, { id: 'academy-' + l.id + '-' + k, title: b.title, notes: b.notes, beats, bpm: b.bpm || 72, level: l.level, cat: 'Academy · ' + l.title, tip: b.tip || '' });
        };
      } else if (b.t === 'fretx') {
        const el = $(`[data-fretx="${k}"]`, host); if (!el) return;
        const I = Instruments.get(Instruments.get(instOf()).strings ? instOf() : 'guitar');
        const fb = new UI.Fretboard(el, { strings: I.strings, names: I.stringNames, frets: 12 });
        const out2 = $(`[data-fxo="${k}"]`, host);
        const pcs = new Set(b.pcs || []);
        const base = () => { let h = ''; for (let s2 = 0; s2 < I.strings.length; s2++) for (let f = 0; f <= 12; f++) { const m = I.strings[s2] + f; if (!pcs.has(m % 12)) continue; const root = b.root != null && m % 12 === b.root; h += `<circle cx="${fb.xOf(f)}" cy="${fb.yOf(s2)}" r="${root ? 10 : 8}" fill="${root ? '#d946ef' : 'rgba(168,85,247,.55)'}"/><text x="${fb.xOf(f)}" y="${fb.yOf(s2) + 3.5}" text-anchor="middle" font-size="9" font-weight="800" fill="#fff">${Theory.spell(m % 12)}</text>`; } return h; };
        fb.dotLayer.innerHTML = base();
        const svg = el.querySelector('svg');
        svg.style.cursor = 'pointer';
        svg.addEventListener('click', (e) => {
          const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
          const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
          let s2 = 0, best = 1e9; for (let i = 0; i < I.strings.length; i++) { const d = Math.abs(fb.yOf(i) - loc.y); if (d < best) { best = d; s2 = i; } }
          let f = 0; if (loc.x > fb.fx(0)) { f = 12; for (let i = 1; i <= 12; i++) if (loc.x < fb.fx(i)) { f = i; break; } }
          const m = I.strings[s2] + f;
          fb.dotLayer.innerHTML = base() + `<circle cx="${fb.xOf(f)}" cy="${fb.yOf(s2)}" r="13" fill="none" stroke="#f0abfc" stroke-width="3" style="filter:drop-shadow(0 0 8px #d946ef)"/>`;
          out2.innerHTML = `<b>${esc(DSP.midiName(m))}</b> · ${esc(I.stringNames[s2])} string, ${f ? 'fret ' + f : 'open'}`;
          PM.LearnView.playNotes([{ midi: m, start: 0, dur: 0.7 }], { voice: I.synth });
        });
      } else if (b.t === 'keyx') {
        const el = $(`[data-keyx="${k}"]`, host); if (!el) return;
        const out2 = $(`[data-kxo="${k}"]`, host);
        el.addEventListener('click', (e) => {
          const r = e.target.closest('[data-m]'); if (!r) return;
          const m = +r.dataset.m;
          $$('.hit', el).forEach((x) => x.classList.remove('hit')); r.classList.add('hit');
          out2.innerHTML = `<b>${esc(DSP.midiName(m))}</b>${[1, 3, 6, 8, 10].includes(m % 12) ? ' — a black key (' + Theory.spell(m % 12, false) + ' / ' + Theory.spell(m % 12, true) + ')' : ''}`;
          PM.LearnView.playNotes([{ midi: m, start: 0, dur: 0.7 }], { voice: 'piano' });
        });
      } else if (b.t === 'valvex') {
        const el = $(`[data-valvex="${k}"]`, host); if (!el) return;
        const st = { v: new Set(), p: 60 };
        const SEM = { 1: 2, 2: 1, 3: 3 };
        const draw = () => {
          const key = [...st.v].sort().join(' ') || '0';
          const w = st.p - [...st.v].reduce((a, x) => a + SEM[x], 0);
          const std = Instruments.TRUMPET_FINGERING[w];
          const alts = PM.Fingering ? PM.Fingering.trumpet(w - 2).map((o) => o.valves) : [];
          $('.vx-out', el).innerHTML = `Written <b>${esc(DSP.midiName(w))}</b> · concert ${esc(DSP.midiName(w - 2))} — ${std === key ? '✅ the standard fingering' : alts.includes(key) ? '🔁 an alternate fingering' : std ? `usually played ${std === '0' ? 'open' : 'with ' + std.replace(/ /g, '-')}` : 'rarely used'}`;
          $$('.vx-valve', el).forEach((x) => x.classList.toggle('down', st.v.has(+x.dataset.v)));
          $$('.vx-p', el).forEach((x) => x.classList.toggle('on', +x.dataset.p === st.p));
          PM.LearnView.playNotes([{ midi: w - 2, start: 0, dur: 0.6 }], { voice: 'trumpet' });
        };
        $$('.vx-valve', el).forEach((x) => (x.onclick = () => { const v = +x.dataset.v; st.v.has(v) ? st.v.delete(v) : st.v.add(v); draw(); }));
        $$('.vx-p', el).forEach((x) => (x.onclick = () => { st.p = +x.dataset.p; draw(); }));
      }
    });
    return out;
  }

  function block(b, App, I, k) {
    switch (b.t) {
      case 'p': return `<p class="ak-p">${md(b.text)}</p>`;
      case 'list': return `<ul class="ak-ul">${b.items.map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
      case 'ex': return `<div class="ak-ex"><button class="btn sm" data-ex="${exIndex(b)}">▶ ${esc(b.label)}</button>${b.caption ? `<span class="small muted">${esc(b.caption)}</span>` : ''}${b.play && (b.play.notes || b.play.chord) ? keysSvg(b.play.notes || b.play.chord) : ''}</div>`;
      case 'use': return `<div class="notice ak-use">🌍<div><b>In real music</b><br>${md(b.text)}</div></div>`;
      case 'tip': return `<div class="notice">💡<div>${md(b.text)}</div></div>`;
      case 'inst': return `<div class="ak-instwrap"><div class="small muted">${icon(I.icon)} On your ${esc(I.short.toLowerCase())}</div>${instPanel(b, App)}</div>`;
      case 'drumx': return `<div class="ak-int stage"><div class="ak-int-head"><b>🥁 ${esc(b.title)}</b></div><div data-drumx="${k}"></div></div>`;
      case 'fing': return `<div class="ak-int stage"><div class="ak-int-head"><b>🖐️ ${esc(b.title)}</b><button class="btn sm glass" data-fhear="${k}">▶ Hear & follow</button></div><div data-fing="${k}"></div></div>`;
      case 'drill': return `<div class="ak-drill pop-in"><span class="ak-drill-em">🎤</span><div><b>${esc(b.title)}</b><span class="small muted">Play it now — Overture listens and scores every note.</span></div><button class="btn primary sm" data-drill="${k}">Play it now</button></div>`;
      case 'fretx': return `<div class="ak-int stage"><div class="ak-int-head"><b>👆 ${esc(b.title)}</b></div><div class="fret-wrap" data-fretx="${k}"></div><div class="small ak-out" data-fxo="${k}">Tap any string and fret.</div></div>`;
      case 'keyx': return `<div class="ak-int"><div class="ak-int-head"><b>👆 ${esc(b.title)}</b></div><div data-keyx="${k}">${playKeys(b.highlight, 48, 83)}</div><div class="small ak-out" data-kxo="${k}">Tap any key.</div></div>`;
      case 'valvex': return `<div class="ak-int stage" data-valvex="${k}"><div class="ak-int-head"><b>🎺 ${esc(b.title)}</b></div>
        <div class="row" style="gap:18px;flex-wrap:wrap;align-items:center"><div class="fp-vrow">${[1, 2, 3].map((v) => `<button class="fp-valve vx-valve" data-v="${v}" aria-label="Valve ${v}"><i></i><span>${v}</span></button>`).join('')}</div>
        <div><div class="small" style="margin-bottom:6px">Lip partial (open note)</div><div class="seg seg-wrap">${[[60, 'C4'], [67, 'G4'], [72, 'C5'], [76, 'E5'], [79, 'G5']].map(([m, n]) => `<button class="vx-p ${m === 60 ? 'on' : ''}" data-p="${m}">${n}</button>`).join('')}</div></div></div>
        <p class="vx-out" style="margin-top:12px">Press valves or pick a partial.</p></div>`;
      default: return '';
    }
  }
  // index of an example block inside its lesson (for the play buttons)
  function exIndex(b) { for (const l of Academy.LESSONS) { const k = l.body.indexOf(b); if (k >= 0) return k; } return -1; }

  // ------------------------------------------------------------------ practice quiz
  function quiz(box, App, l, opts) {
    opts = opts || {};
    const st = stateOf(App);
    const qs = opts.questions || Academy.questions(l.practice, (Date.now() & 0xffff) + l.n);
    let k = 0, right = 0, firstTry = true;
    const started = performance.now();
    const draw = () => {
      if (k >= qs.length) return finish();
      const q = qs[k];
      box.innerHTML = `<div class="ak-q pop-in">
        <div class="ak-qhead"><span class="small muted">Question ${k + 1} of ${qs.length}</span><span class="ak-dots">${qs.map((_, i) => `<i class="${i < k ? 'd' : i === k ? 'n' : ''}"></i>`).join('')}</span></div>
        <p class="ak-prompt">${esc(q.prompt)}</p>
        ${q.show && q.show.keys ? keysSvg(q.show.keys) : ''}${q.show && q.show.staff ? `<div class="staff-box">${PM.LearnView.staffSvg(q.show.staff, { clef: q.show.clef })}</div>` : ''}
        ${q.show && q.show.fret ? `<div class="ak-show">${fretSvg(q.show.fret)}</div>` : ''}${q.show && q.show.diagram ? `<div class="ak-show ak-diag">${UI.chordDiagram(q.show.diagram)}</div>` : ''}
        ${q.show && q.show.tab ? `<pre class="ak-tab">${esc(q.show.tab.join('\n'))}</pre>` : ''}${q.show && q.show.valves ? `<div class="ak-show">${valveIcons(q.show.valves)}</div>` : ''}${q.show && q.show.drumgrid && PM.DrumAlong ? `<div class="ak-show ak-dgrid">${PM.DrumAlong.gridHtml(q.show.drumgrid)}</div>` : ''}
        ${q.play ? `<button class="btn sm" id="akPlay">🔊 ${q.ear ? 'Play' : 'Hear it'}</button>` : ''}
        <div class="ak-opts">${q.options.map((o, i) => `<button class="ak-opt" data-o="${i}">${esc(o)}</button>`).join('')}</div>
        <p class="ak-fb" id="akFb"></p></div>`;
      const pb = $('#akPlay', box);
      if (pb) { pb.onclick = () => play(q.play); if (q.ear) setTimeout(() => play(q.play), 250); }
      firstTry = true;
      $$('.ak-opt', box).forEach((b) => (b.onclick = () => {
        const o = q.options[+b.dataset.o];
        if (o === q.answer) {
          if (firstTry) right++;
          b.classList.add('ok');
          $('#akFb', box).textContent = firstTry ? ['Correct! ✨', 'Yes! 🎉', 'Spot on! 🎯'][k % 3] : 'That\'s it 👍';
          $$('.ak-opt', box).forEach((x) => (x.disabled = true));
          if (q.play && !q.ear) play(q.play);
          setTimeout(() => { k++; draw(); }, 750);
        } else {
          firstTry = false;
          b.classList.add('no'); b.disabled = true;
          $('#akFb', box).textContent = 'Not quite — try another answer.';
        }
      }));
    };
    const finish = () => {
      const score = right / qs.length;
      if (!opts.onDone) {
        st.best[l.id] = Math.max(st.best[l.id] || 0, score);
        App.game.save();
        App.game.recordSession({ mode: 'academy', instrument: App.instrument, seconds: (performance.now() - started) / 1000, title: 'Academy · ' + l.title, summary: { accuracy: score, stars: Academy.stars(score), score: Math.round(score * 100) } });
        const se = $('#akStars');
        if (se) se.textContent = '★'.repeat(Academy.stars(st.best[l.id])) + '☆'.repeat(3 - Academy.stars(st.best[l.id]));
        if (score >= 0.9) UI.confetti();
      }
      box.innerHTML = `<div class="ak-result pop-in"><div class="big-stars">${'★'.repeat(Academy.stars(score))}${'☆'.repeat(3 - Academy.stars(score))}</div><h3>${right} / ${qs.length} first-try correct</h3>
        <p>${score >= 0.75 ? 'Mastered! Move on, or practise again to keep it fresh.' : 'Read the lesson once more and try a new set — every set is different.'}</p>
        ${opts.onDone ? '' : '<button class="btn primary" id="akAgain">↻ New questions</button>'}</div>`;
      const ag = $('#akAgain', box);
      if (ag) ag.onclick = () => quiz(box, App, l);
      if (opts.onDone) opts.onDone(score, right);
    };
    draw();
  }

  // ------------------------------------------------------------------ placement quiz
  function placement(host, App) {
    const st = stateOf(App);
    const qs = Academy.placementQuestions((Date.now() & 0xfff) + 1);
    host.innerHTML = `<div class="page-head"><div><a href="#/academy" class="eyebrow" style="text-decoration:none">${icon('back')} Academy</a><h1>🧭 Placement quiz</h1><p>8 quick questions, from basics to advanced. Skip any you don't know — that tells us where to start.</p></div></div>
      <section class="card"><div id="plQ"></div><button class="btn ghost sm" id="plSkip" style="margin-top:10px">I don't know — skip</button></section>`;
    const answers = [];
    let k = 0;
    const box = $('#plQ', host);
    const done = () => {
      const res = Academy.placementResult(answers);
      st.placement = res; App.game.save();
      $('#plSkip', host).remove();
      box.innerHTML = `<div class="ak-result pop-in"><div style="font-size:48px">🎓</div><h2>Your level: ${esc(res.label)}</h2><p>Start with: ${res.start.map((s) => `<a href="#/academy?s=${s}">${SUBJ[s].emoji} ${esc(SUBJ[s].name)}</a>`).join(' · ')}</p><a class="btn primary" href="#/academy">Go to the Academy</a></div>`;
    };
    const draw = () => {
      if (k >= qs.length) return done();
      const q = qs[k];
      box.innerHTML = `<div class="ak-q pop-in"><div class="ak-qhead"><span class="small muted">Question ${k + 1} of ${qs.length} · ${Academy.LEVELS[Math.min(3, q.stage === 1 ? 1 : q.stage === 2 ? 2 : 3)]}</span></div><p class="ak-prompt">${esc(q.prompt)}</p>
        ${q.show && q.show.keys ? keysSvg(q.show.keys) : ''}${q.play ? '<button class="btn sm" id="akPlay">🔊 Hear it</button>' : ''}
        <div class="ak-opts">${q.options.map((o, i) => `<button class="ak-opt" data-o="${i}">${esc(o)}</button>`).join('')}</div></div>`;
      const pb = $('#akPlay', box); if (pb) pb.onclick = () => play(q.play);
      $$('.ak-opt', box).forEach((b) => (b.onclick = () => { answers.push({ stage: q.stage, correct: q.options[+b.dataset.o] === q.answer }); k++; draw(); }));
    };
    $('#plSkip', host).onclick = () => { answers.push({ stage: qs[k].stage, correct: false }); k++; draw(); };
    draw();
  }

  PM.AcademyView = { keysSvg, playKeys, fretSvg, valveIcons, play, quiz };
})(typeof self !== 'undefined' ? self : globalThis);
