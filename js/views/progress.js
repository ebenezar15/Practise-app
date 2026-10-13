/* Cadenza — Progress: levels, stats, practice chart, badges, history & settings. */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI } = PM;
  const { icon, esc, $ } = UI;

  PM.App.register({
    id: 'progress', title: 'Progress', icon: 'progress',
    render(host, App) {
      const g = App.game, s = g.state, lp = g.levelProgress();
      const days = g.lastDays(14);
      const startLvl = Math.max(1, lp.level - 3);
      let path = '';
      for (let l = startLvl; l < startLvl + 9; l++) {
        if (l > startLvl) path += `<div class="level-link ${l <= lp.level ? 'done' : ''}"></div>`;
        path += `<div class="level-node ${l < lp.level ? 'done' : l === lp.level ? 'cur' : ''}" title="Level ${l}">${l}</div>`;
      }
      const hours = s.totalSeconds / 3600;
      host.innerHTML = `
        <div class="page-head"><div><div class="eyebrow">Progress</div><h1>Your musical journey</h1><p>Every minute you practise earns XP. Keep your streak alive, collect badges and watch yourself level up.</p></div></div>
        <section class="card stage">
          <div class="row" style="gap:24px;align-items:center">
            <div class="ring">${UI.ringSvg(lp.pct, 132, 12)}<div class="ring-label"><span>Level</span><b>${lp.level}</b></div></div>
            <div style="flex:1;min-width:240px">
              <div class="now-label">${esc(g.title)}</div>
              <h2 style="margin:6px 0 10px;color:#fff">${lp.xp} / ${lp.need} XP to level ${lp.level + 1}</h2>
              <div class="level-path">${path}</div>
            </div>
          </div>
        </section>
        <div class="grid g4" style="margin-top:18px">
          <section class="card"><div class="now-label" style="color:var(--v-600)">Streak</div><div class="stat-big">${s.streak}<small>days 🔥</small></div><p class="small">Best: ${s.bestStreak} days</p></section>
          <section class="card"><div class="now-label" style="color:var(--v-600)">Practice time</div><div class="stat-big">${hours >= 1 ? hours.toFixed(1) : Math.round(s.totalSeconds / 60)}<small>${hours >= 1 ? 'hours' : 'min'}</small></div><p class="small">${s.sessions} sessions</p></section>
          <section class="card"><div class="now-label" style="color:var(--v-600)">Chords nailed</div><div class="stat-big">${s.chordsNailed}</div><p class="small">Best combo ${s.bestCombo}×</p></section>
          <section class="card"><div class="now-label" style="color:var(--v-600)">Songs analysed</div><div class="stat-big">${s.songsAnalyzed}</div><p class="small">${s.challengesDone} challenges done</p></section>
        </div>
        <div class="grid g2" style="margin-top:18px">
          <section class="card"><div class="card-head"><h3>${icon('insights')} Last 14 days</h3><span class="muted small">minutes per day</span></div><canvas class="bar-chart" id="chart"></canvas></section>
          <section class="card"><div class="card-head"><h3>${icon('progress')} History</h3></div>
            ${s.history.length ? `<div class="list" style="max-height:220px;overflow:auto">${s.history.slice(0, 30).map((r) => `<div class="list-item"><div class="li-ic">${PM.Instruments.get(r.instrument).emoji}</div><div class="li-main"><b>${esc(r.title || r.mode)}</b><span>${new Date(r.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · ${Math.max(1, Math.round(r.seconds / 60))} min · ${r.score || 0} pts</span></div><span class="stars">${PM.Shared.stars(r.stars || 0)}</span></div>`).join('')}</div>` : '<div class="empty">Your sessions will appear here.</div>'}
          </section>
        </div>
        <section class="card" style="margin-top:18px">
          <div class="card-head"><h3>${icon('star')} Badges</h3><span class="tag">${Object.keys(s.badges).length} / ${PM.GameData.BADGES.length}</span></div>
          <div class="badge-grid">${PM.GameData.BADGES.map((b) => `<div class="badge ${s.badges[b.id] ? 'got' : 'locked'}"><div class="b-ic">${b.icon}</div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join('')}</div>
        </section>
        <section class="card" style="margin-top:18px">
          <div class="card-head"><h3>${icon('sliders')} Settings</h3></div>
          <div class="grid g3">
            <label class="field">Your name<input type="text" id="name" value="${esc(s.name || '')}" placeholder="Optional"></label>
            <label class="field">Daily goal (minutes)<input type="number" id="goal" min="5" max="240" value="${App.settings.dailyGoal}"></label>
            <label class="field"><span>Input latency compensation: <b id="latV">${Math.round(App.settings.latency * 1000)} ms</b></span><input type="range" id="lat" min="0" max="0.2" step="0.005" value="${App.settings.latency}"></label>
          </div>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="calib">${icon('target')} Auto-calibrate latency</button><span class="muted small" id="calibMsg">Uses your speakers + mic: turn the volume up and stay quiet for 6 seconds.</span></div>
          <p class="small" style="margin-top:8px">Latency: if the coach consistently says you're “dragging” while you feel on time, raise this value until timing reads centred. Bluetooth headphones usually need 150–200 ms.</p>
          <div class="row" style="margin-top:14px"><button class="btn danger sm" id="reset">${icon('trash')} Reset all progress</button></div>
        </section>
        <section class="card" id="appearance" style="margin-top:18px"></section>`;
      PM.Theme.panel($('#appearance', host), App);
      const draw = () => UI.barChart($('#chart', host), days.map((d) => ({ label: d.label.slice(0, 2), value: Math.round(d.seconds / 60) })), { goal: App.settings.dailyGoal });
      draw();
      addEventListener('resize', draw);
      $('#name', host).onchange = (e) => { s.name = e.target.value.trim(); g.save(); };
      $('#goal', host).onchange = (e) => { App.settings.dailyGoal = Math.max(5, +e.target.value || 15); App.saveSettings(); draw(); };
      $('#lat', host).oninput = (e) => { App.settings.latency = +e.target.value; App.live.latency = App.settings.latency; $('#latV', host).textContent = Math.round(App.settings.latency * 1000) + ' ms'; App.saveSettings(); };
      $('#calib', host).onclick = async (e) => {
        const btn = e.currentTarget, msg = $('#calibMsg', host);
        btn.disabled = true;
        try {
          const lat = await PM.Shared.calibrateLatency((t) => (msg.textContent = t));
          if (lat == null) msg.textContent = 'Could not hear the clicks — raise the volume, unplug headphones and try again.';
          else {
            App.settings.latency = lat; App.live.latency = lat; App.saveSettings();
            $('#lat', host).value = lat; $('#latV', host).textContent = Math.round(lat * 1000) + ' ms';
            msg.textContent = `Measured ${Math.round(lat * 1000)} ms — saved.`;
          }
        } catch (err) { msg.textContent = 'Microphone unavailable: ' + (err.message || err); }
        btn.disabled = false;
      };
      $('#reset', host).onclick = () => {
        const m = UI.modal(`<div class="modal-body"><h2>Reset all progress?</h2><p style="margin-top:8px">This clears XP, levels, streaks, badges and history on this device. Your song library is kept.</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="confirmReset">Reset</button></div></div>`);
        $('#confirmReset', m.el).onclick = () => { g.reset(); m.close(); App.rerender(); };
      };
      return () => removeEventListener('resize', draw);
    },
  });
})(typeof self !== 'undefined' ? self : globalThis);
