/* Overture — Home dashboard */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc } = UI;

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Late-night session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  /** Instrument-specific quick starts (the pages themselves are all in the menu). */
  function quickStarts(App) {
    const inst = App.instrument, k = PM.Groove && PM.Groove.kindFor(inst);
    const G = { strum: ['🎸', 'Strumming patterns', 'All patterns in every time signature with a metronome, dynamics and live AI feedback.'], comp: ['🎹', 'Comping patterns', 'Accompaniment rhythms for both hands with live feedback on timing and touch.'], bass: ['🎸', 'Bass grooves', 'Lock in with the click on real chord changes, from root–fifth to funk.'], line: ['🎺', 'Long tones & articulation', 'Breath, tonguing, crescendos and sustain with live feedback.'] };
    const out = [];
    if (k) out.push({ art: G[k][0], name: G[k][1], desc: G[k][2], act: 'groove', go: 'learn', feature: true });
    if (inst === 'drums') out.push({ art: '🥁', name: 'Groove library', desc: 'Rock, worship, shuffle, 6/8, funk and odd meters — scored hit by hit.', go: 'drums', feature: true });
    out.push({ art: '🧭', name: 'Next on your exercise path', desc: 'Pick up where you left off, with a click and live feedback on every note.', act: 'path', go: 'learn' });
    if (inst !== 'drums') out.push({ art: '💪', name: 'Technique warm-up', desc: 'Five minutes of warm-ups made for your instrument.', act: 'technique', go: 'learn' });
    out.push({ art: '👂', name: 'Ear training', desc: 'Hear two notes and name the distance — a few minutes a day goes a long way.', act: 'intervals', go: 'learn' });
    return out;
  }

  PM.App.register({
    id: 'home', title: 'Home', icon: 'home',
    render(host, App) {
      const g = App.game, s = g.state, lp = g.levelProgress();
      const today = g.todaySeconds() / 60;
      const goal = App.settings.dailyGoal || 15;
      const daily = g.ensureDaily();
      const inst = App.instrument;
      const recent = s.history.slice(0, 5);
      const nextBadge = PM.GameData.BADGES.find((b) => !s.badges[b.id]);
      host.innerHTML = `<div id="installHint" class="hidden"></div>
        <section class="card stage hero">
          <div>
            <div class="now-label">${greeting()}${s.name ? ', ' + esc(s.name) : ''} · ${PM.Instruments.get(inst).emoji} ${esc(PM.Instruments.get(inst).label)} mode</div>
            <h1 style="margin-top:10px">Ready to make music, ${esc(g.title)}?</h1>
            <p class="hero-sub">Learn music from the very basics to advanced harmony at your own pace: lessons, practice with live feedback, songs with tutorials and a coach that listens — all on your device, no internet needed.</p>
            <div class="row" style="margin-top:20px">
              <a class="btn white" href="#/planner">${icon('play')} Start today's routine</a>
              <a class="btn glass" href="#/academy">${icon('library')} Continue learning</a>
              <a class="btn glass" href="#/studio">${icon('mic')} Play along</a>
            </div>
            <div class="hero-stats">
              <div class="hero-stat"><b>${s.streak} 🔥</b><span>Day streak</span></div>
              <div class="hero-stat"><b>${Math.round(s.totalSeconds / 60)}</b><span>Minutes practised</span></div>
              <div class="hero-stat"><b>${s.chordsNailed}</b><span>Chords nailed</span></div>
              <div class="hero-stat"><b>${Object.keys(s.badges).length}/${PM.GameData.BADGES.length}</b><span>Badges</span></div>
            </div>
          </div>
          <div class="row" style="gap:22px;justify-content:center">
            <div class="ring">${UI.ringSvg(lp.pct, 168, 14)}<div class="ring-label"><span>Level</span><b>${lp.level}</b><span>${lp.xp}/${lp.need} XP</span></div></div>
            <div class="ring">${UI.ringSvg(today / goal, 128, 12, '#34d399', '#a7f3d0')}<div class="ring-label"><span>Today</span><b style="font-size:22px">${Math.round(today)}<small style="font-size:12px">/${goal}m</small></b></div></div>
          </div>
        </section>

        <div class="grid g2" style="margin-top:18px">
          <div class="card">
            <div class="card-head"><h3>${icon('target')} Daily challenge</h3><span class="tag ${daily.done ? 'ok' : 'warn'}">${daily.done ? 'Complete' : '+100 XP'}</span></div>
            <div class="daily">
              <div class="daily-ic">${daily.done ? '🏅' : '🎯'}</div>
              <div style="flex:1">
                <b>${esc(daily.text)}</b>
                <div class="progress" style="margin-top:10px"><i style="width:${Math.min(100, (daily.progress / daily.goal) * 100)}%"></i></div>
                <div class="muted small" style="margin-top:6px">${Math.floor(daily.progress)} / ${daily.goal}</div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>${icon('star')} Next badge</h3><a class="btn sm ghost" href="#/progress">All badges</a></div>
            ${nextBadge ? `<div class="daily"><div class="daily-ic" style="background:var(--v-50)">${nextBadge.icon}</div><div><b>${esc(nextBadge.name)}</b><p class="small">${esc(nextBadge.desc)}</p></div></div>` : '<p>You have unlocked every badge. Legendary! 👑</p>'}
          </div>
        </div>

        <div class="grid g2 daily-pair" style="margin-top:18px">
          <div class="card daily-card tip"><div class="card-head"><h3>💡 Tip of the day</h3><button class="btn sm ghost" id="tipNext" aria-label="Another tip">Another →</button></div><p class="daily-text" id="tipText"></p><span class="small muted" id="tipAbout"></span></div>
          <div class="card daily-card fact"><div class="card-head"><h3>🤓 Did you know?</h3><button class="btn sm ghost" id="factNext" aria-label="Another fact">Another →</button></div><p class="daily-text" id="factText"></p></div>
        </div>

        <h2 style="margin:28px 0 14px">Practise your ${esc(PM.Instruments.get(inst).label.toLowerCase())} today</h2>
        <div class="tiles">${quickStarts(App).map((t) => `<button class="card tile ${t.feature ? 'feature' : ''}" data-qs="${t.act || ''}" data-go="${t.go}"><div class="tile-ic">${t.art}</div><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p></button>`).join('')}</div>

        <div class="grid g2" style="margin-top:18px">
          <div class="card">
            <div class="card-head"><h3>${icon('progress')} Recent sessions</h3><a class="btn sm ghost" href="#/progress">History</a></div>
            ${recent.length ? `<div class="list">${recent.map((r) => `
              <div class="list-item"><div class="li-ic">${PM.Instruments.get(r.instrument).emoji}</div>
              <div class="li-main"><b>${esc(r.title || r.mode)}</b><span>${new Date(r.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · ${Math.max(1, Math.round(r.seconds / 60))} min${r.accuracy != null ? ' · ' + Math.round(r.accuracy * 100) + '%' : ''}</span></div>
              <span class="stars">${PM.Shared.stars(r.stars || 0)}</span></div>`).join('')}</div>` : '<div class="empty">No sessions yet — your first one earns the <b>First Note</b> badge 🎵</div>'}
          </div>
          <div class="card">
            <div class="card-head"><h3>${icon('headphones')} Getting the best results</h3></div>
            <div class="notice">${icon('headphones')}<div><b>Best results:</b> wear headphones while playing along so the coach hears only <i>you</i>, not the backing track. Using an audio interface? Pick it as the input in the Studio.</div></div>
          </div>
        </div>`;
      let tipOff = 0, factOff = 0;
      const showTip = () => { const t = PM.Daily.tip(inst, tipOff); host.querySelector('#tipText').textContent = t.text; host.querySelector('#tipAbout').textContent = t.about === 'Practice' ? 'Practice habit' : 'For ' + t.about; };
      const showFact = () => { host.querySelector('#factText').textContent = PM.Daily.fact(factOff); };
      showTip(); showFact();
      host.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { if (b.dataset.qs) App.pendingActivity = b.dataset.qs; if (b.dataset.tab) App.drumTab = b.dataset.tab; App.go(b.dataset.go); }));
      host.querySelector('#tipNext').onclick = () => { tipOff++; showTip(); UI.bump(host.querySelector('#tipText'), 'pop-in'); };
      host.querySelector('#factNext').onclick = () => { factOff++; showFact(); UI.bump(host.querySelector('#factText'), 'pop-in'); };
      PM.Install.render(host.querySelector('#installHint'));
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
