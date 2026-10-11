/* Cadenza — Home dashboard */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc } = UI;

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Late-night session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
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
            <p class="hero-sub">Upload any song or MIDI clip, plug in or open your mic, and play along. Your on-device coach listens in real time and tells you exactly what to fix — no internet needed.</p>
            <div class="row" style="margin-top:20px">
              <a class="btn white" href="#/studio">${icon('mic')} Start practising</a>
              <a class="btn glass" href="#/insights">${icon('upload')} Analyse a song</a>
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

        <h2 style="margin:28px 0 14px">Jump in</h2>
        <div class="tiles">
          <a class="card tile feature" href="#/studio"><div class="tile-ic">${icon('mic')}</div><h3>Live Studio</h3><p>Play over a track with real-time chord, timing, intonation & dynamics coaching.</p></a>
          <a class="card tile" href="#/insights"><div class="tile-ic">${icon('insights')}</div><h3>Song Insights</h3><p>Key, chords, tempo, meter${PM.Instruments.get(inst).strum ? ', strumming' : ''} & dynamics — plus instrument separation.</p></a>
          <a class="card tile" href="#/games"><div class="tile-ic">${icon('games')}</div><h3>Challenges</h3><p>Chord Quest, Rhythm Hero, Note Hunter & Ear Trainer.</p></a>
          <a class="card tile" href="#/metronome"><div class="tile-ic">${icon('metronome')}</div><h3>Metronome</h3><p>Accents, subdivisions, speed trainer & timing check.</p></a>
        </div>

        <div class="grid g2" style="margin-top:18px">
          <div class="card">
            <div class="card-head"><h3>${icon('progress')} Recent sessions</h3><a class="btn sm ghost" href="#/progress">History</a></div>
            ${recent.length ? `<div class="list">${recent.map((r) => `
              <div class="list-item"><div class="li-ic">${PM.Instruments.get(r.instrument).emoji}</div>
              <div class="li-main"><b>${esc(r.title || r.mode)}</b><span>${new Date(r.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · ${Math.max(1, Math.round(r.seconds / 60))} min${r.accuracy != null ? ' · ' + Math.round(r.accuracy * 100) + '%' : ''}</span></div>
              <span class="stars">${PM.Shared.stars(r.stars || 0)}</span></div>`).join('')}</div>` : '<div class="empty">No sessions yet — your first one earns the <b>First Note</b> badge 🎵</div>'}
          </div>
          <div class="card">
            <div class="card-head"><h3>${icon('sparkle')} Coach's tip of the day</h3></div>
            <p style="font-size:15px">${esc(PM.Instruments.get(inst).tips[new Date().getDate() % PM.Instruments.get(inst).tips.length])}</p>
            <div class="notice" style="margin-top:16px">${icon('headphones')}<div><b>Best results:</b> wear headphones while playing along so the coach hears only <i>you</i>, not the backing track. Using an audio interface? Pick it as the input in the Studio.</div></div>
          </div>
        </div>`;
      PM.Install.render(host.querySelector('#installHint'));
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
