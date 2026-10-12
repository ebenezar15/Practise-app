/* Cadenza — Classroom: accounts, assignments and teacher dashboard (synced via the
 * Cadenza Classroom Server; everything keeps working offline). */
(function (root) {
  'use strict';
  const PM = root.PM;
  const { UI, Sync, Instruments } = PM;
  const { icon, esc, $, $$ } = UI;

  const MODES = { custom: 'Custom task (record & send)', song: 'Song from the library', learn: 'Learn activity', part: 'Play the part', improv: 'Improvise', challenge: 'Challenge game', free: 'Free practice' };
  const LEARN_ACTS = { scales: 'Scales', arpeggios: 'Arpeggios', technique: 'Technique exercises', sight: 'Sight-reading', notes: 'Note names', chords: 'Chords & one-minute changes', intervals: 'Interval ear training', callresp: 'Call & response', builder: 'Progression builder' };
  const MODE_ICON = { improv: '🎷', challenge: '🎮', custom: '🎙️', song: '🎤', learn: '📚' };
  const PRESETS = { full: 'Full song', backing: 'Backing track (no own instrument)', part: 'Own part only', rhythm: 'Drums & bass only' };
  const CHALLENGES = { 'chord-quest': 'Chord Quest', 'rhythm-hero': 'Rhythm Hero', 'note-hunter': 'Note Hunter', 'long-tones': 'Long Tones', 'ear-trainer': 'Ear Trainer' };
  const fmtDate = (t) => (t ? new Date(t).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');
  const ago = (t) => {
    if (!t) return 'never';
    const m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
  };
  const instLabel = (id) => (id && id !== 'any' ? Instruments.get(id).emoji + ' ' + Instruments.get(id).short : 'Any instrument');
  const desktop = () => root.cadenzaDesktop || null;

  function syncPill() {
    const s = Sync.status;
    const label = { local: 'Not connected', online: 'Synced', offline: 'Offline — will sync later', pending: 'Changes waiting to sync', error: 'Sync problem' }[s];
    return `<span class="chip">${icon('cloud')} ${label}${Sync.lastSync ? ' · ' + ago(Sync.lastSync) : ''}</span>`;
  }

  /** Load an assignment into the Studio / Challenges with its settings. */
  async function startAssignment(a, App, onProgress) {
    onProgress = onProgress || (() => {});
    if (a.instrument && a.instrument !== 'any' && a.instrument !== App.instrument) App.setInstrument(a.instrument);
    App.activeAssignment = a;
    App.settings.studioMode = a.mode === 'improv' ? 'improv' : 'part';
    App.saveSettings();
    if (a.mode === 'challenge') { App.pendingAssignment = a; App.go('games'); return; }
    if (a.mode === 'learn') { App.pendingLearn = a; App.go('learn'); return; }
    if (a.mode === 'song') {
      if (!PM.SongsView.findSong(a.songId)) { await Sync.fetchSongs().catch(() => {}); }
      if (!PM.SongsView.findSong(a.songId)) throw new Error('The song for this assignment is not in your library yet — sync and try again.');
      App.songAssignment = a; App.go('songs?id=' + encodeURIComponent(a.songId)); return;
    }
    if (a.mode === 'custom' && !a.file && !a.backing) { recordFor(a); return; }
    if (a.file) {
      onProgress(0.05, 'Downloading the song…');
      const { file, cached } = await Sync.assignmentFile(a);
      if (cached) { cached.assignmentId = a.id; await App.openFromLibrary(cached); }
      else await App.loadFile(file, onProgress, { id: 'asg-' + a.file.id, assignmentId: a.id, name: a.title });
    } else if (a.backing) {
      await App.loadBacking(Object.assign({}, a.backing), onProgress);
      App.track.assignmentId = a.id;
    } else App.setTrack(null);
    const t = App.track;
    if (t) {
      t.assignmentId = a.id;
      if (a.speed && a.speed !== 1) App.player.rate = a.speed;
      if (a.mixPreset && a.mixPreset !== 'full') {
        if (!t.stemsReady) { onProgress(0.5, 'Separating instruments…'); await App.separateStems(onProgress); }
        const g = PM.Shared.presetGains(t, a.mixPreset);
        if (g) { t.mixPreset = a.mixPreset; App.applyMix(g); }
      }
    }
    App.go('studio');
  }

  function recordFor(a) {
    PM.RecordPanel.open({ title: a.title, assignmentId: a.id, mode: a.mode, context: a.instructions ? a.instructions.slice(0, 220) : 'Record your assignment — your teacher will listen and reply.', onSent: () => Sync.syncNow().catch(() => {}) });
  }
  const starsOf = (n) => `<span class="rating-view">${'★'.repeat(n || 0)}${'☆'.repeat(5 - (n || 0))}</span>`;

  PM.App.register({
    id: 'classroom', title: 'Classroom', nav: 'Classroom', icon: 'users',
    render(host, App) {
      const off = Sync.on((type) => { if (type === 'status') { const p = $('#syncPill', host); if (p) p.outerHTML = `<span id="syncPill">${syncPill()}</span>`; } });
      if (!Sync.connected) renderJoin(host, App);
      else if (Sync.isStaff) renderTeacher(host, App);
      else renderStudent(host, App);
      return off;
    },
  });

  // ------------------------------------------------------------------ join / sign in
  async function renderJoin(host, App) {
    const d = desktop();
    // the app is served by the classroom server itself — except on static hosting (GitHub Pages)
    const staticHost = /\.github\.io$/i.test(location.hostname);
    const guess = localStorage.getItem('cadenza.lastServer') || (location.protocol.startsWith('http') && !staticHost ? location.origin : '');
    host.innerHTML = `
      <div class="page-head"><div><div class="eyebrow">Classroom</div><h1>Connect with your teacher</h1>
        <p>Sign in to your music school's Cadenza server to receive assignments, send your results and keep your progress synced across devices. Practising always works offline — results upload when you're back online.</p></div></div>
      <div id="installHint" class="hidden"></div>
      <div class="grid g2">
        <section class="card">
          <div class="card-head"><h3>${icon('users')} Sign in or join</h3><span class="tag" id="srvState">server not checked</span></div>
          <label class="field">Classroom server address<input type="text" id="srv" placeholder="e.g. 192.168.1.20:8787 or https://music.myschool.org" value="${esc(guess)}"></label>
          <div class="seg" id="joinSeg" style="margin-top:14px"><button data-t="login" class="on">Sign in</button><button data-t="invite">I have an invite code</button><button data-t="setup" class="hidden">Set up as master teacher</button></div>
          <div id="joinForm" style="margin-top:14px"></div>
          <p class="small" id="joinMsg" style="margin-top:10px;color:var(--bad)"></p>
        </section>
        <section class="card">
          <div class="card-head"><h3>${icon('info')} How it works</h3></div>
          <ol style="color:var(--ink-2);line-height:1.75;margin:0;padding-left:20px">
            <li><b>The teacher</b> runs the Cadenza Classroom Server — from the desktop app (<i>Host classroom</i>, below) or on any computer/cloud host with <span class="code">node server/server.js</span>.</li>
            <li>The first person to connect becomes the <b>master teacher</b> and can add students, other teachers and assignments.</li>
            <li><b>Students</b> install Cadenza, enter the server address and sign in with the username & password the teacher gives them — or register with an <b>invite code</b>.</li>
            <li>Assignments (with songs, backing tracks, targets and due dates) appear here. Results and progress sync automatically.</li>
          </ol>
          ${d ? `<div id="hostBox" style="margin-top:16px"></div>` : `<div class="notice" style="margin-top:16px">${icon('download')}<div>Want to host a class from this computer? Use the <b>Cadenza desktop app</b> and click <i>Host classroom</i> — or run the server from the project folder.</div></div>`}
        </section>
      </div>`;
    if (d) renderHostBox($('#hostBox', host), App);
    PM.Install.render($('#installHint', host));
    const srv = $('#srv', host), form = $('#joinForm', host), msg = $('#joinMsg', host);
    let tab = 'login', health = null;
    const draw = () => {
      $$('#joinSeg button', host).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
      const instSel = `<select id="jInst">${Instruments.list().map((I) => `<option value="${I.id}" ${I.id === App.instrument ? 'selected' : ''}>${I.emoji} ${esc(I.label)}</option>`).join('')}</select>`;
      form.innerHTML = tab === 'login' ? `
          <div class="grid g2"><label class="field">Username<input type="text" id="jUser" autocomplete="username"></label><label class="field">Password<input type="password" id="jPass" autocomplete="current-password" style="border:1px solid var(--line);border-radius:12px;padding:9px 12px"></label></div>
          <button class="btn primary" id="jGo" style="margin-top:12px">${icon('users')} Sign in</button>` : tab === 'invite' ? `
          <div class="grid g2"><label class="field">Invite code<input type="text" id="jCode" placeholder="ABC123" style="text-transform:uppercase"></label><label class="field">Your name<input type="text" id="jName"></label>
          <label class="field">Choose a username<input type="text" id="jUser"></label><label class="field">Choose a password<input type="password" id="jPass" style="border:1px solid var(--line);border-radius:12px;padding:9px 12px"></label>
          <label class="field">Instrument${instSel}</label></div>
          <button class="btn primary" id="jGo" style="margin-top:12px">${icon('plus')} Join the class</button>` : `
          <div class="notice" style="margin-bottom:12px">${icon('star')}<div>This server has no accounts yet. Create the <b>master teacher</b> account — it can manage everyone else.</div></div>
          <div class="grid g2"><label class="field">School / studio name<input type="text" id="jSchool" placeholder="Rivera Music Studio"></label><label class="field">Your name<input type="text" id="jName"></label>
          <label class="field">Username<input type="text" id="jUser"></label><label class="field">Password (8+ characters)<input type="password" id="jPass" style="border:1px solid var(--line);border-radius:12px;padding:9px 12px"></label>
          <label class="field">Your instrument${instSel}</label></div>
          <button class="btn primary" id="jGo" style="margin-top:12px">${icon('star')} Create master account</button>`;
      $('#jGo', host).onclick = submit;
    };
    const check = async () => {
      const st = $('#srvState', host);
      if (!srv.value.trim()) { st.textContent = 'enter an address'; return; }
      st.textContent = 'checking…'; st.className = 'tag';
      try {
        health = await Sync.probe(srv.value);
        st.textContent = `✓ ${health.schoolName || 'Cadenza server'}`; st.className = 'tag ok';
        const setupBtn = $('#joinSeg [data-t="setup"]', host);
        setupBtn.classList.toggle('hidden', !health.needsSetup);
        if (health.needsSetup) { tab = 'setup'; draw(); }
      } catch (e) { health = null; st.textContent = 'not reachable'; st.className = 'tag bad'; }
    };
    const submit = async (e) => {
      msg.textContent = '';
      const btn = e.currentTarget;
      btn.disabled = true;
      const v = (id) => ($('#' + id, host) || {}).value || '';
      try {
        localStorage.setItem('cadenza.lastServer', srv.value.trim());
        if (tab === 'login') await Sync.signIn(srv.value, v('jUser').trim(), v('jPass'));
        else if (tab === 'invite') await Sync.register(srv.value, v('jCode').trim(), v('jUser').trim(), v('jPass'), v('jName').trim(), v('jInst'));
        else await Sync.setup(srv.value, { username: v('jUser').trim(), password: v('jPass'), name: v('jName').trim(), schoolName: v('jSchool').trim(), instrument: v('jInst') });
        UI.toast(`Welcome, ${Sync.account.user.name}!`, { icon: '🎓' });
        App.rerender();
      } catch (err) { msg.textContent = err.message; btn.disabled = false; }
    };
    $$('#joinSeg button', host).forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
    srv.onchange = check;
    draw();
    if (srv.value) check();
  }

  // Desktop: host the classroom server on this computer
  async function renderHostBox(box, App) {
    const d = desktop();
    const st = await d.serverStatus();
    box.innerHTML = `
      <div class="card-head" style="margin-bottom:8px"><h3>${icon('cloud')} Host classroom on this computer</h3><span class="tag ${st.running ? 'ok' : ''}">${st.running ? 'running' : 'stopped'}</span></div>
      ${st.running ? `<p class="small">Students on the same network connect to:</p><div class="stack" style="margin-top:6px">${st.urls.map((u) => `<span class="code">${esc(u)}</span>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn sm" id="useLocal">${icon('users')} Use this server here</button><button class="btn sm danger" id="stopSrv">${icon('stop')} Stop server</button></div>
        <div id="tunBox" class="tunnel-box"></div>` :
        `<p class="small">Turns this computer into your class server. Your data stays on this machine.</p>
         <div class="row" style="margin-top:10px"><label class="field" style="flex-direction:row;align-items:center;gap:8px">Port<input type="number" id="srvPort" value="${+localStorage.getItem('cadenza.hostPort') || 8787}" min="1024" max="65535" style="width:96px"></label>
         <button class="btn primary sm" id="startSrv">${icon('play')} Start classroom server</button></div><p class="small" id="srvErr" style="color:var(--bad);margin-top:6px"></p>`}`;
    const sb = $('#startSrv', box);
    if (sb) sb.onclick = async () => {
      const port = +$('#srvPort', box).value || 8787;
      try { await d.startServer({ port }); localStorage.setItem('cadenza.hostPort', port); renderHostBox(box, App); }
      catch (e) { $('#srvErr', box).textContent = /EADDRINUSE/.test(String(e.message)) ? `Port ${port} is already in use — pick another port (e.g. ${port + 1}).` : 'Could not start the server: ' + e.message; }
    };
    const stp = $('#stopSrv', box);
    if (stp) stp.onclick = async () => { await d.stopServer(); renderHostBox(box, App); };
    const tb = $('#tunBox', box);
    if (tb && d.startTunnel) renderTunnel(tb, d, st.port);
    const ul = $('#useLocal', box);
    if (ul) ul.onclick = () => { const srv = document.getElementById('srv'); if (srv) { srv.value = st.urls[0].replace(/\/\/[^:/]+/, '//localhost'); srv.dispatchEvent(new Event('change')); } };
  }

  /** Free online access from this computer (Cloudflare Tunnel). */
  async function renderTunnel(box, d, port) {
    let st = Object.assign(await d.tunnelStatus(), { port });
    let mode = st.mode || (st.hasToken ? 'named' : 'quick');
    if (box._off) box._off();
    box._off = d.onTunnel((s) => { st = Object.assign(st, s); draw(); });
    const draw = () => {
      const on = st.state && !['stopped', 'error'].includes(st.state);
      box.innerHTML = `<div class="card-head" style="margin:14px 0 8px"><h3>🌍 Students at home (free)</h3><span class="tag ${st.state === 'online' ? 'ok' : st.state === 'error' ? 'bad' : ''}">${st.state === 'online' ? 'online' : on ? 'connecting' : 'off'}</span></div>
        ${on || st.url ? '' : `<div class="seg" id="tMode"><button data-m="quick" class="${mode === 'quick' ? 'on' : ''}">Quick address</button><button data-m="named" class="${mode === 'named' ? 'on' : ''}">My own address</button></div>`}
        ${!on && mode === 'quick' ? '<p class="small" style="margin-top:8px">Gives this server a free <b>https://…trycloudflare.com</b> address through Cloudflare Tunnel — no account needed. iPads can install the app from it. The address <b>changes each time</b> you start it.</p>' : ''}
        ${!on && mode === 'named' ? `<p class="small" style="margin-top:8px">A permanent address like <b>https://music.yourschool.com</b> (free Cloudflare account + your domain). In Cloudflare: <i>Zero Trust → Networks → Tunnels → Create tunnel</i>, add a public hostname pointing to <span class="code">http://localhost:${esc(String((st.port) || 8787))}</span>, then copy the token. See docs/HOSTING.md, option C.</p>
          <div class="grid g2" style="margin-top:8px"><label class="field">Your address<input type="text" id="tHost" placeholder="music.yourschool.com" value="${esc(st.hostname || '')}"></label><label class="field">Tunnel token<input type="password" id="tTok" placeholder="${st.hasToken ? 'saved — paste to replace' : 'eyJhIjoi…'}" style="border:1px solid var(--line);border-radius:12px;padding:9px 12px"></label></div>` : ''}
        ${st.url ? `<p class="small" style="margin-top:8px">Students and iPads use:</p><div class="row" style="margin-top:4px"><span class="code" style="font-size:15px">${esc(st.url)}</span><button class="mini-btn" id="tCopy">${icon('clipboard')} Copy</button></div>` : ''}
        ${st.message && st.state !== 'stopped' ? `<p class="small" style="margin-top:6px;${st.state === 'error' ? 'color:var(--bad)' : ''}">${esc(st.message)}</p>` : ''}
        <div class="row" style="margin-top:10px">${on ? `<button class="btn sm danger" id="tStop">${icon('stop')} Take offline</button>` : `<button class="btn sm primary" id="tStart">${icon('cloud')} Put online</button>`}</div>
        <p class="small muted" style="margin-top:6px">Keep this computer on and awake while students use Cadenza.</p>`;
      $$('#tMode button', box).forEach((b) => (b.onclick = () => { mode = b.dataset.m; draw(); }));
      const sb = $('#tStart', box);
      if (sb) sb.onclick = async () => {
        sb.disabled = true;
        try { st = Object.assign(st, { url: null, message: '' }, await d.startTunnel({ mode, token: ($('#tTok', box) || {}).value, hostname: ($('#tHost', box) || {}).value })); }
        catch (e) { st.state = 'error'; st.message = String(e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''); }
        draw();
      };
      const sp = $('#tStop', box);
      if (sp) sp.onclick = async () => { await d.stopTunnel(); st = Object.assign(await d.tunnelStatus(), { url: null }); draw(); };
      const cp = $('#tCopy', box);
      if (cp) cp.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(st.url); UI.toast('Copied', { icon: '📋' }); };
    };
    draw();
  }

  function accountHeader(App) {
    const u = Sync.account.user;
    return `
      <div class="page-head"><div><div class="eyebrow">Classroom · ${esc(Sync.account.schoolName || 'Cadenza')}</div><h1>${Sync.isStaff ? 'Teacher dashboard' : 'My assignments'}</h1>
        <p>Signed in as <b>${esc(u.name)}</b> (${esc(u.username)} · ${u.role === 'admin' ? 'master teacher' : u.role}) on <span class="code">${esc(Sync.account.server)}</span></p></div>
        <div class="row"><span id="syncPill">${syncPill()}</span><button class="btn sm ghost" id="syncNow">${icon('loop')} Sync now</button><button class="btn sm ghost" id="signOut">Sign out</button></div></div>
      ${u.mustChangePassword ? `<section class="card" style="margin-bottom:18px;border-color:var(--warn)"><div class="card-head"><h3>🔑 Choose your own password</h3></div>
        <div class="row"><input type="password" id="newPw" placeholder="New password (6+ characters)" style="border:1px solid var(--line);border-radius:12px;padding:9px 12px;flex:1;min-width:200px"><button class="btn primary" id="setPw">Save password</button></div></section>` : ''}`;
  }
  function wireHeader(host, App) {
    $('#syncNow', host).onclick = async () => { try { await Sync.syncNow(); UI.toast('Synced', { icon: '☁️' }); App.rerender(); } catch (e) { UI.toast(e.message, { icon: '⚠️' }); } };
    $('#signOut', host).onclick = () => { Sync.signOut(); App.rerender(); };
    const sp = $('#setPw', host);
    if (sp) sp.onclick = async () => {
      try { await Sync.request('POST', '/me/password', { newPassword: $('#newPw', host).value }); Sync.account.user.mustChangePassword = false; Sync.setAccount(Sync.account); UI.toast('Password saved', { icon: '🔑' }); App.rerender(); }
      catch (e) { UI.toast(e.message, { icon: '⚠️' }); }
    };
  }

  // ------------------------------------------------------------------ student
  function renderStudent(host, App) {
    const list = Sync.assignments;
    const now = Date.now();
    host.innerHTML = accountHeader(App) + `
      <section class="card"><div class="card-head"><h3>${icon('clipboard')} Assignments</h3><span class="muted small">${list.filter((a) => a.myDone).length}/${list.length} complete</span></div>
        <div class="stack" id="asgList">${list.length ? list.map((a) => {
          const due = a.dueDate ? new Date(a.dueDate).getTime() : null;
          const pend = Sync.pendingRecordings.some((o) => o.body.assignmentId === a.id);
          const status = a.redo ? '<span class="tag warn">try again</span>' : a.myDone ? '<span class="tag ok">complete</span>' : pend ? '<span class="tag">recording waiting to upload</span>' : due && due < now ? '<span class="tag bad">overdue</span>' : a.myBest ? '<span class="tag warn">in progress</span>' : '<span class="tag">new</span>';
          const needsRec = a.requireRecording || a.mode === 'custom' || a.mode === 'song';
          const t = a.targets || {};
          return `<div class="card assign-card" style="box-shadow:none">
            <div class="a-ic">${MODE_ICON[a.mode] || (a.file || a.backing ? '🎵' : '⏱️')}</div>
            <div style="flex:1;min-width:0">
              <div class="row"><b style="font-size:16px">${esc(a.title)}</b>${status}</div>
              <p class="small" style="margin-top:4px">${esc(instLabel(a.instrument))} · ${esc(MODES[a.mode] || a.mode)}${a.mode === 'challenge' && a.challenge ? ' — ' + esc(CHALLENGES[a.challenge] || a.challenge) : ''}${a.mode === 'learn' && a.learn ? ' — ' + esc(LEARN_ACTS[a.learn.activity] || '') : ''}${a.mode === 'song' && a.songId ? ' — ' + esc((PM.SongsView.findSong(a.songId) || {}).title || 'song') : ''}${a.mixPreset && a.mixPreset !== 'full' ? ' · ' + esc(PRESETS[a.mixPreset]) : ''}${a.speed && a.speed !== 1 ? ' · ' + Math.round(a.speed * 100) + '% speed' : ''} · due ${fmtDate(a.dueDate)} · from ${esc(a.createdByName || 'teacher')}</p>
              ${a.instructions ? `<p style="margin-top:8px;white-space:pre-wrap">${esc(a.instructions)}</p>` : ''}
              ${(a.attachments || []).length ? `<div class="row atts" data-atts="${esc(a.id)}" style="gap:6px;margin-top:8px">${PM.DocView.chips(a.attachments)}</div>` : ''}
              <p class="small" style="margin-top:8px">🎯 Target: ${a.requireRecording ? 'send a recording for your teacher to review' : [t.accuracy ? `${t.accuracy}% accuracy` : '', t.minutes ? `${t.minutes} min practice` : '', t.stars ? `${t.stars}★` : ''].filter(Boolean).join(' · ') || 'practise and submit'}${a.myBest && !a.requireRecording ? ` · your best: ${a.myBest.accuracy != null ? Math.round(a.myBest.accuracy * 100) + '%' : '—'} ${'★'.repeat(a.myBest.stars || 0)}` : ''}</p>
              ${(a.feedback || []).map((f) => `<div class="notice ${f.status === 'redo' ? 'warn' : ''}" style="margin-top:8px">${icon('sparkle')}<div><b>${f.status === 'redo' ? 'Please try again' : 'Teacher feedback'}:</b> ${f.rating ? starsOf(f.rating) + ' ' : ''}${esc(f.comment)}${f.rubric && Object.values(f.rubric).some(Boolean) ? `<div class="rubric-view">${['pitch', 'timing', 'tone', 'expression'].filter((k) => f.rubric[k]).map((k) => `<span>${k} <b>${f.rubric[k]}/5</b></span>`).join('')}</div>` : ''}</div></div>`).join('')}
            </div>
            <div class="stack" style="flex:none">
              ${a.mode !== 'custom' || a.file || a.backing ? `<button class="btn primary" data-start="${esc(a.id)}">${icon('play')} ${a.mode === 'song' ? 'Open song' : 'Start'}</button>` : ''}
              ${needsRec ? `<button class="btn ${a.mode === 'custom' && !a.file && !a.backing ? 'primary' : ''}" data-rec="${esc(a.id)}">${icon('mic')} Record & send</button>` : ''}
            </div>
          </div>`;
        }).join('') : '<div class="empty">No assignments yet — your teacher will add some soon. Keep practising in the Studio meanwhile! 🎶</div>'}</div>
        <div id="asgProg" class="hidden" style="margin-top:12px"><span class="small an-label">Preparing…</span><div class="progress" style="margin-top:6px"><i style="width:0"></i></div></div>
      </section>
      <section class="card" style="margin-top:18px" id="myRecs"><div class="card-head"><h3>${icon('mic')} My recordings & reviews</h3><a class="btn sm ghost" href="#/songs">${icon('library')} Songs</a></div>
        <div class="stack" id="myRecList">${Sync.pendingRecordings.length ? `<div class="small">⏳ ${Sync.pendingRecordings.length} recording${Sync.pendingRecordings.length > 1 ? 's' : ''} waiting to upload</div>` : ''}${(Sync.mySubmissions || []).filter((x) => x.recording).slice(0, 30).map((x) => PM.SongsView.reviewHtml(x)).join('') || '<div class="empty">Recordings you send (assignments and songs) appear here with your teacher\'s review.</div>'}</div></section>
      <section class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('cloud')} Synced progress</h3></div>
        <p>Your XP, level, streak, badges and practice history are merged with the server, so you can practise on any computer. Results of assignment sessions are sent to your teacher automatically${Sync.outbox.length ? ` (<b>${Sync.outbox.length}</b> waiting to upload)` : ''}.</p></section>`;
    wireHeader(host, App);
    wireStudentExtras(host, list);
    $$('[data-start]', host).forEach((b) => (b.onclick = async () => {
      const a = list.find((x) => x.id === b.dataset.start);
      const prog = $('#asgProg', host);
      prog.classList.remove('hidden');
      b.disabled = true;
      try { await startAssignment(a, App, (p, l) => { prog.querySelector('i').style.width = Math.round(p * 100) + '%'; if (l) prog.querySelector('.an-label').textContent = l; }); }
      catch (e) { console.error(e); UI.toast('Could not open the assignment: ' + e.message, { icon: '⚠️' }); b.disabled = false; prog.classList.add('hidden'); }
    }));
  }

  function wireStudentExtras(host, list) {
    $$('[data-atts]', host).forEach((row) => { const a = list.find((x) => x.id === row.dataset.atts); if (a) PM.DocView.wire(row, a.attachments); });
    $$('[data-rec]', host).forEach((b) => (b.onclick = () => { const a = list.find((x) => x.id === b.dataset.rec); if (a) recordFor(a); }));
    const rl = $('#myRecList', host);
    if (rl) PM.Shared.wireRecordingPlayers(rl, Sync.mySubmissions || []);
  }

  // ------------------------------------------------------------------ teacher
  function renderTeacher(host, App) {
    const tab = App.classTab || 'students';
    host.innerHTML = accountHeader(App) + `
      <div class="seg" id="tTabs" style="margin-bottom:18px">${[['students', 'users', 'Students'], ['assignments', 'clipboard', 'Assignments'], ['submissions', 'check', 'Results'], ['invites', 'plus', desktop() ? 'Invite & host' : 'Invite codes'], ['mine', 'music', 'My practice']].map(([k, ic, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${icon(ic)} ${l}</button>`).join('')}</div>
      <div id="tBody"><div class="empty">Loading…</div></div>`;
    wireHeader(host, App);
    $$('#tTabs button', host).forEach((b) => (b.onclick = () => { App.classTab = b.dataset.t; App.rerender(); }));
    const body = $('#tBody', host);
    const fn = { students: tStudents, assignments: tAssignments, submissions: tSubmissions, invites: tInvites, mine: (b) => renderStudentInto(b, App) }[tab];
    Promise.resolve().then(() => fn(body, App)).catch((e) => (body.innerHTML = `<div class="empty">${esc(e.message)}</div>`));
  }

  async function renderStudentInto(body, App) {
    const tmp = document.createElement('div');
    renderStudent(tmp, App);
    body.innerHTML = '';
    const cards = $$('section.card', tmp);
    cards.forEach((c) => body.appendChild(c));
    wireStudentExtras(body, Sync.assignments);
    $$('[data-start]', body).forEach((b) => (b.onclick = async () => {
      const a = Sync.assignments.find((x) => x.id === b.dataset.start);
      b.disabled = true;
      try { await startAssignment(a, App); } catch (e) { UI.toast(e.message, { icon: '⚠️' }); b.disabled = false; }
    }));
  }

  async function tStudents(body, App) {
    const { users } = await Sync.request('GET', '/users');
    const admin = Sync.account.user.role === 'admin';
    body.innerHTML = `
      <section class="card"><div class="card-head"><h3>${icon('plus')} Add a ${admin ? 'user' : 'student'}</h3></div>
        <div class="grid g4" style="align-items:end">
          <label class="field">Full name<input type="text" id="nName" placeholder="Sam Lee"></label>
          <label class="field">Username<input type="text" id="nUser" placeholder="sam.lee"></label>
          <label class="field">Instrument<select id="nInst">${Instruments.list().map((I) => `<option value="${I.id}">${I.emoji} ${esc(I.label)}</option>`).join('')}</select></label>
          ${admin ? `<label class="field">Role<select id="nRole"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Master teacher</option></select></label>` : '<span></span>'}
        </div>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="addUser">${icon('plus')} Create account</button><span class="muted small">A temporary password is generated — the student chooses their own at first sign-in.</span></div>
      </section>
      <section class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('users')} ${users.length} account${users.length === 1 ? '' : 's'}</h3></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Instrument</th><th>Level</th><th>Streak</th><th>This week</th><th>Assignments</th><th>Last active</th><th></th></tr></thead><tbody>
        ${users.map((u) => `<tr data-id="${esc(u.id)}" style="${u.active ? '' : 'opacity:.5'}">
          <td><b>${esc(u.name)}</b><div class="muted small">${esc(u.username)}${u.role !== 'student' ? ' · ' + (u.role === 'admin' ? 'master' : 'teacher') : ''}${u.active ? '' : ' · deactivated'}</div></td>
          <td>${esc(instLabel(u.instrument))}</td><td>Lv ${u.level}</td><td>${u.streak}🔥</td><td>${Math.round(u.weekSeconds / 60)} min</td>
          <td>${u.assignmentsDone}/${u.assignmentsTotal}</td><td>${ago(u.lastActive)}</td>
          <td><div class="row" style="flex-wrap:nowrap"><button class="mini-btn" data-a="view">View</button><button class="mini-btn" data-a="reset">Reset password</button><button class="mini-btn" data-a="toggle">${u.active ? 'Deactivate' : 'Activate'}</button><button class="mini-btn" data-a="del" style="color:var(--bad)">Delete</button></div></td></tr>`).join('')}
        </tbody></table></div></section>`;
    $('#addUser', body).onclick = async () => {
      try {
        const d = await Sync.request('POST', '/users', { name: $('#nName', body).value.trim(), username: $('#nUser', body).value.trim(), instrument: $('#nInst', body).value, role: ($('#nRole', body) || {}).value });
        credentialsModal(d.user, d.password);
        tStudents(body, App);
      } catch (e) { UI.toast(e.message, { icon: '⚠️' }); }
    };
    $$('tr[data-id] [data-a]', body).forEach((b) => (b.onclick = async () => {
      const uid = b.closest('tr').dataset.id, u = users.find((x) => x.id === uid), act = b.dataset.a;
      try {
        if (act === 'reset') { const d = await Sync.request('PATCH', '/users/' + uid, { resetPassword: true }); credentialsModal(d.user, d.password); }
        else if (act === 'toggle') { await Sync.request('PATCH', '/users/' + uid, { active: !u.active }); tStudents(body, App); }
        else if (act === 'del') {
          const m = UI.modal(`<div class="modal-body"><h2>Delete ${esc(u.name)}?</h2><p style="margin-top:8px">Their account, progress and results are removed from the server. This cannot be undone.</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="cDel">Delete</button></div></div>`);
          $('#cDel', m.el).onclick = async () => { await Sync.request('DELETE', '/users/' + uid); m.close(); tStudents(body, App); };
        } else if (act === 'view') studentModal(uid);
      } catch (e) { UI.toast(e.message, { icon: '⚠️' }); }
    }));
  }

  function credentialsModal(user, password) {
    const server = Sync.account.server;
    const text = `Cadenza classroom login\nServer: ${server}\nUsername: ${user.username}\nPassword: ${password}\n(Install Cadenza, open Classroom, enter these details. You'll choose your own password after signing in.)`;
    const m = UI.modal(`<div class="modal-top"><div style="font-size:42px">🎓</div><h2 style="color:#fff;margin-top:6px">Login for ${esc(user.name)}</h2><p style="margin-top:6px">Give these details to your student. The password is shown only once.</p></div>
      <div class="modal-body"><div class="stack">
        <div>Server: <span class="code">${esc(server)}</span></div><div>Username: <span class="code">${esc(user.username)}</span></div><div>Temporary password: <span class="code">${esc(password)}</span></div></div>
        <div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn ghost" id="copyCred">${icon('clipboard')} Copy</button><button class="btn primary" data-close>Done</button></div></div>`);
    $('#copyCred', m.el).onclick = () => { navigator.clipboard && navigator.clipboard.writeText(text); UI.toast('Copied', { icon: '📋' }); };
  }

  async function studentModal(uid) {
    const d = await Sync.request('GET', '/users/' + uid);
    const u = d.user, p = d.progress || {};
    UI.modal(`<div class="modal-top"><h2 style="color:#fff">${esc(u.name)}</h2><p>${esc(instLabel(u.instrument))} · Level ${u.level} · ${u.streak}🔥 streak · ${Math.round(u.totalSeconds / 60)} min total · ${u.badges} badges</p></div>
      <div class="modal-body"><h3>Recent practice</h3><div class="list">${(p.history || []).slice(0, 12).map((h) => `<div class="list-item"><div class="li-ic">${Instruments.get(h.instrument).emoji}</div><div class="li-main"><b>${esc(h.title || h.mode)}</b><span>${new Date(h.date).toLocaleString()} · ${Math.max(1, Math.round(h.seconds / 60))} min${h.accuracy != null ? ' · ' + Math.round(h.accuracy * 100) + '%' : ''}</span></div><span class="stars">${PM.Shared.stars(h.stars || 0)}</span></div>`).join('') || '<div class="empty">No synced sessions yet</div>'}</div>
      <h3 style="margin-top:14px">Assignment results</h3><div class="list">${d.submissions.slice(0, 12).map((s) => `<div class="list-item"><div class="li-ic">${s.meetsTarget ? '✅' : '📝'}</div><div class="li-main"><b>${esc((Sync.assignments.find((a) => a.id === s.assignmentId) || {}).title || 'Assignment')}</b><span>${fmtDate(s.createdAt)} · ${s.accuracy != null ? Math.round(s.accuracy * 100) + '%' : '—'} · ${Math.round(s.seconds / 60)} min</span></div></div>`).join('') || '<div class="empty">No results yet</div>'}</div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn primary" data-close>Close</button></div></div>`);
  }

  async function tAssignments(body, App) {
    await Sync.fetchAssignments();
    const { users } = await Sync.request('GET', '/users');
    const students = users.filter((u) => u.role === 'student' && u.active);
    const list = Sync.assignments;
    const t = App.track;
    await Sync.fetchSongs().catch(() => {});
    const songs = PM.SongsView.allSongs().filter((x) => x.source !== 'mine');
    const preSong = App.assignSong && App.assignSong.source !== 'mine' ? App.assignSong : null;
    App.assignSong = null;
    body.innerHTML = `
      <section class="card"><div class="card-head"><h3>${icon('plus')} New assignment</h3></div>
        <div class="grid g2">
          <label class="field">Title<input type="text" id="aTitle" placeholder="Week 3: Groove in G" value="${preSong ? esc('Play: ' + preSong.title) : ''}"></label>
          <label class="field">Due date<input type="date" id="aDue" style="border:1px solid var(--line);border-radius:12px;padding:8px 12px"></label>
        </div>
        <label class="field" style="margin-top:12px">Instructions<textarea id="aText" placeholder="What should the student focus on?"></textarea></label>
        <div class="grid g4" style="margin-top:12px">
          <label class="field">Instrument<select id="aInst"><option value="any">Any instrument</option>${Instruments.list().map((I) => `<option value="${I.id}">${I.emoji} ${esc(I.label)}</option>`).join('')}</select></label>
          <label class="field">Practice mode<select id="aMode">${Object.entries(MODES).map(([k, v]) => `<option value="${k}" ${k === (preSong ? 'song' : 'part') ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field">Mix<select id="aMix">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field">Challenge<select id="aChal">${Object.entries(CHALLENGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field">Speed %<input type="number" id="aSpeed" value="100" min="50" max="125"></label>
          <label class="field">Target accuracy %<input type="number" id="aAcc" value="70" min="0" max="100"></label>
          <label class="field">Minimum minutes<input type="number" id="aMin" value="5" min="0" max="240"></label>
          <label class="field">Minimum stars<input type="number" id="aStars" value="0" min="0" max="3"></label>
        </div>
        <div id="aModeBox" style="margin-top:12px"></div>
        <label class="field" style="margin-top:12px">Attachments <span class="muted small">— chord PDFs, sheet music, images or example audio (students open them on any device)</span><input type="file" id="aAtt" multiple accept=".pdf,application/pdf,image/*,audio/*,.mid,.midi"></label>
        <label class="switch" style="margin-top:12px"><input type="checkbox" id="aRec"><span class="track"></span>Student must send a recording (you listen and review it)</label>
        <div id="aSongWrap"><label class="field" style="margin-top:12px">Play-along track</label>
        <div class="seg" id="aSrc" style="margin-top:6px"><button data-s="none" class="on">None</button><button data-s="file">Upload file</button>${t ? `<button data-s="current">Current track: ${esc(t.name.slice(0, 28))}</button>` : ''}<button data-s="backing">Generate backing track</button></div>
        <div id="aSrcBody" style="margin-top:10px"></div></div>
        <label class="field" style="margin-top:12px">Assign to</label>
        <div class="row" style="margin-top:6px"><label class="switch"><input type="checkbox" id="aAll" checked><span class="track"></span>All students</label>
          <div id="aWho" class="row hidden">${students.map((u) => `<label class="chip"><input type="checkbox" value="${esc(u.id)}"> ${esc(u.name)}</label>`).join('') || '<span class="muted small">No students yet</span>'}</div></div>
        <div class="row" style="margin-top:16px"><button class="btn primary" id="aCreate">${icon('clipboard')} Publish assignment</button><span class="muted small" id="aMsg"></span></div>
      </section>
      <section class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('clipboard')} Published</h3></div>
        ${list.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Assignment</th><th>For</th><th>Due</th><th>Completed</th><th>Results</th><th></th></tr></thead><tbody>${list.map((a) => `<tr data-id="${esc(a.id)}">
          <td><b>${esc(a.title)}</b><div class="muted small">${esc(instLabel(a.instrument))} · ${esc(MODES[a.mode] || a.mode)}${a.file ? ' · 🎵 ' + esc(a.file.name) : a.backing ? ' · 🥁 backing track' : ''}${a.mode === 'song' ? ' · 🎤 ' + esc((songs.find((x) => x.id === a.songId) || {}).title || 'song') : ''}${a.mode === 'learn' && a.learn ? ' · ' + esc(LEARN_ACTS[a.learn.activity] || '') : ''}${(a.attachments || []).length ? ' · 📄 ' + a.attachments.length : ''}${a.requireRecording ? ' · 🎙️ recording' : ''}</div></td>
          <td>${a.assignees === 'all' ? 'Everyone' : (a.assignees || []).map((id) => esc((users.find((u) => u.id === id) || {}).name || '?')).join(', ')}</td>
          <td>${fmtDate(a.dueDate)}</td><td>${a.completedBy || 0}</td><td>${a.submissionCount}</td>
          <td><div class="row" style="flex-wrap:nowrap"><button class="mini-btn" data-a="results">Results</button><button class="mini-btn" data-a="try">Try it</button><button class="mini-btn" data-a="del" style="color:var(--bad)">Delete</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No assignments yet.</div>'}
      </section>`;
    let src = 'none';
    const srcBody = $('#aSrcBody', body);
    const drawSrc = () => {
      $$('#aSrc button', body).forEach((b) => b.classList.toggle('on', b.dataset.s === src));
      srcBody.innerHTML = src === 'file' ? '<input type="file" id="aFile" accept="audio/*,.mid,.midi,.kar,.mp3,.wav,.m4a,.ogg,.flac">'
        : src === 'backing' ? `<div class="grid g4"><label class="field">Key<select id="bKey">${PM.Theory.FLATS.map((n, i) => `<option value="${i}" ${i === 7 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field">Progression<select id="bProg">${Object.entries(PM.Backing.PROGRESSIONS).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select></label>
            <label class="field">Style<select id="bStyle">${Object.entries(PM.Backing.STYLES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
            <label class="field">BPM<input type="number" id="bBpm" value="96" min="40" max="220"></label></div><p class="small" style="margin-top:6px">Each student gets the backing track <b>without their own instrument</b>.</p>`
        : src === 'current' ? `<p class="small">The current Studio track (<b>${esc(t.name)}</b>) will be uploaded to the server.</p>` : '';
    };
    $$('#aSrc button', body).forEach((b) => (b.onclick = () => { src = b.dataset.s; drawSrc(); }));
    drawSrc();
    const keyOpts = (sel) => PM.Theory.FLATS.map((n, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${n}</option>`).join('');
    const drawMode = () => {
      const mode = $('#aMode', body).value, box = $('#aModeBox', body);
      $('#aSongWrap', body).classList.toggle('hidden', ['song', 'learn', 'challenge'].includes(mode));
      $('#aChal', body).closest('label').classList.toggle('hidden', mode !== 'challenge');
      $('#aMix', body).closest('label').classList.toggle('hidden', !['part', 'improv', 'free', 'custom'].includes(mode));
      if (['custom', 'song'].includes(mode)) { $('#aRec', body).checked = true; $('#aAcc', body).value = 0; $('#aMin', body).value = 0; }
      if (mode === 'song') box.innerHTML = songs.length ? `<label class="field">Song<select id="aSong">${songs.map((x) => `<option value="${esc(x.id)}" ${preSong && preSong.id === x.id ? 'selected' : ''}>${esc(x.title)}${x.language && x.language !== 'English' ? ' (' + esc(x.language) + ')' : ''}${x.source === 'class' ? ' · classroom' : ''}</option>`).join('')}</select></label><p class="small" style="margin-top:6px">Students open the chord chart (and its PDFs), practise with the backing band and send a recording. Add your own songs — English, Tamil or any language — in <a href="#/songs">Songs → Add a song</a>.</p>` : '<p class="small">No songs yet — add one in <a href="#/songs">Songs</a>.</p>';
      else if (mode === 'learn') {
        box.innerHTML = `<div class="grid g4"><label class="field">Activity<select id="lAct">${Object.entries(LEARN_ACTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field">Key<select id="lKey">${keyOpts(0)}</select></label>
          <label class="field">Scale<select id="lScale">${Object.entries(PM.Learn.SCALES).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('')}</select></label>
          <label class="field">Octaves / level<select id="lOct"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label></div>
          <p class="small" style="margin-top:6px">The activity opens set up with these options. Results (accuracy, time, slips) come back to you automatically.</p>`;
      } else if (mode === 'custom') box.innerHTML = '<p class="small">Describe the task in the instructions (e.g. “Play the C major scale hands together and the first page of the attached piece”). Attach PDFs or audio. Students read/listen, practise, then record and send — you review by listening in <b>Results</b>.</p>';
      else box.innerHTML = '';
    };
    $('#aMode', body).onchange = drawMode;
    drawMode();
    $('#aAll', body).onchange = (e) => $('#aWho', body).classList.toggle('hidden', e.target.checked);
    $('#aCreate', body).onclick = async (e) => {
      const btn = e.currentTarget, msg = $('#aMsg', body);
      btn.disabled = true;
      try {
        let file = null, backing = null;
        if (src === 'file' || src === 'current') {
          const f = src === 'file' ? $('#aFile', body).files[0] : t.blob;
          if (!f) throw new Error('Choose a file to upload');
          msg.textContent = 'Uploading song…';
          file = (await Sync.request('POST', '/files', f, { type: f.type || 'application/octet-stream', fileName: f.name || t.name + (t.kind === 'midi' ? '.mid' : ''), timeout: 300000 })).file;
        } else if (src === 'backing') {
          backing = { tonic: +$('#bKey', body).value, progression: $('#bProg', body).value, style: $('#bStyle', body).value, bpm: +$('#bBpm', body).value };
          backing.choruses = Math.max(2, Math.ceil(48 / PM.Backing.PROGRESSIONS[backing.progression].bars.length));
        }
        const assignees = $('#aAll', body).checked ? 'all' : $$('#aWho input:checked', body).map((x) => x.value);
        const mode = $('#aMode', body).value;
        if (['song', 'learn', 'challenge'].includes(mode)) { file = null; backing = null; }
        const attachments = [];
        for (const f of $('#aAtt', body).files) { msg.textContent = 'Uploading ' + f.name + '…'; attachments.push(await Sync.uploadFile(f)); }
        let songId = null, learn = null;
        if (mode === 'song') { songId = ($('#aSong', body) || {}).value; if (!songId) throw new Error('Choose a song'); }
        if (mode === 'learn') { const lv = +$('#lOct', body).value; learn = { activity: $('#lAct', body).value, tonic: +$('#lKey', body).value, scale: $('#lScale', body).value, octaves: Math.min(2, lv), level: lv }; }
        msg.textContent = 'Publishing…';
        await Sync.request('POST', '/assignments', {
          attachments, songId, learn, requireRecording: $('#aRec', body).checked,
          title: $('#aTitle', body).value.trim(), instructions: $('#aText', body).value, instrument: $('#aInst', body).value, mode,
          mixPreset: $('#aMix', body).value, challenge: $('#aChal', body).value, speed: (+$('#aSpeed', body).value || 100) / 100,
          targets: { accuracy: +$('#aAcc', body).value, minutes: +$('#aMin', body).value, stars: +$('#aStars', body).value },
          dueDate: $('#aDue', body).value || null, assignees, file, backing,
        });
        UI.toast('Assignment published', { icon: '📝' });
        tAssignments(body, App);
      } catch (err) { msg.textContent = err.message; btn.disabled = false; }
    };
    $$('tr[data-id] [data-a]', body).forEach((b) => (b.onclick = async () => {
      const id = b.closest('tr').dataset.id, a = list.find((x) => x.id === id);
      if (b.dataset.a === 'del') { await Sync.request('DELETE', '/assignments/' + id); tAssignments(body, App); }
      else if (b.dataset.a === 'try') { try { await startAssignment(a, App); } catch (e) { UI.toast(e.message, { icon: '⚠️' }); } }
      else { App.classTab = 'submissions'; App.classFilter = id; App.rerender(); }
    }));
  }

  async function tSubmissions(body, App) {
    await Sync.fetchAssignments();
    const filter = App.classFilter || '';
    const status = App.classStatus || '';
    const qs = [];
    if (filter && filter !== '__songs') qs.push('assignmentId=' + encodeURIComponent(filter));
    if (status) qs.push('status=' + encodeURIComponent(status));
    let { submissions } = await Sync.request('GET', '/submissions' + (qs.length ? '?' + qs.join('&') : ''));
    if (filter === '__songs') submissions = submissions.filter((x) => !x.assignmentId);
    const asg = (id) => Sync.assignments.find((a) => a.id === id) || {};
    const songTitle = (id) => ((PM.SongsView.findSong(id) || {}).title || 'Song');
    const toReview = submissions.filter((x) => x.recording && x.status === 'submitted').length;
    body.innerHTML = `<section class="card"><div class="card-head"><h3>${icon('check')} Results & recordings</h3>${toReview ? `<span class="tag warn">${toReview} recording${toReview > 1 ? 's' : ''} to review</span>` : ''}</div>
        <div class="row" style="margin-bottom:14px"><select id="sFilter"><option value="">All results</option><option value="__songs" ${filter === '__songs' ? 'selected' : ''}>Song review requests</option>${Sync.assignments.map((a) => `<option value="${esc(a.id)}" ${a.id === filter ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select>
          <select id="sStatus">${[['', 'Any status'], ['submitted', 'Waiting for review'], ['reviewed', 'Reviewed'], ['redo', 'Sent back to redo']].map(([k, v]) => `<option value="${k}" ${k === status ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      ${submissions.length ? `<div class="stack">${submissions.map((s) => {
        const r = s.rubric || {};
        const what = s.assignmentId ? asg(s.assignmentId).title || 'Assignment' : s.songId ? '🎤 ' + songTitle(s.songId) : s.title;
        return `<div class="card review-card ${s.recording && s.status === 'submitted' ? 'todo' : ''}" style="box-shadow:none" data-id="${esc(s.id)}">
        <div class="row"><b>${esc(s.userName)}</b><span class="muted small">${esc(what)} · ${new Date(s.createdAt).toLocaleString()}</span><div class="spacer"></div>
          ${s.assignmentId && !s.recording ? (s.meetsTarget ? '<span class="tag ok">target met</span>' : '<span class="tag warn">below target</span>') : ''}${s.status === 'reviewed' ? '<span class="tag ok">reviewed</span>' : s.status === 'redo' ? '<span class="tag warn">sent back</span>' : s.recording ? '<span class="tag">needs review</span>' : ''}</div>
        ${s.recording ? `<div class="rec-player" style="margin-top:10px"><button class="btn sm primary" data-listen="${esc(s.id)}">${icon('headphones')} Listen to the recording (${Math.floor((s.seconds || 0) / 60)}:${String((s.seconds || 0) % 60).padStart(2, '0')})</button></div>` : `<div class="row" style="margin-top:8px;gap:18px"><span><b>${s.accuracy != null ? Math.round(s.accuracy * 100) + '%' : '—'}</b> <span class="muted small">accuracy</span></span><span><b>${Math.round(s.seconds / 60)}</b> <span class="muted small">min</span></span><span class="stars">${PM.Shared.stars(s.stars || 0)}</span><span><b>${s.score}</b> <span class="muted small">pts</span></span><span class="muted small">${esc(instLabel(s.instrument))} · ${esc(s.mode)}</span></div>`}
        ${s.note ? `<p style="margin-top:8px"><b>Student's note:</b> ${esc(s.note)}</p>` : ''}
        ${s.insights && s.insights.length ? `<ul class="small" style="margin:8px 0 0;padding-left:18px;color:var(--ink-2)">${s.insights.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
        <div class="review-form">
          <div class="row"><span class="small muted">Overall</span><span class="star-input" data-v="${s.rating || 0}">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" class="${n <= (s.rating || 0) ? 'on' : ''}" aria-label="${n} stars">★</button>`).join('')}</span></div>
          ${s.recording ? `<div class="rubric-in">${['pitch', 'timing', 'tone', 'expression'].map((k) => `<label class="small">${k[0].toUpperCase() + k.slice(1)} <input type="range" min="0" max="5" step="1" data-rb="${k}" value="${r[k] || 0}"><b>${r[k] || 0}</b></label>`).join('')}</div>` : ''}
          <textarea class="cmt" rows="2" placeholder="Feedback for the student — what went well, what to fix next…">${esc(s.teacherComment || '')}</textarea>
          <div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-a="redo">${icon('loop')} Ask to try again</button><button class="btn sm primary" data-a="save">${icon('check')} ${s.status === 'reviewed' ? 'Update review' : 'Send review'}</button></div>
        </div>
      </div>`;
      }).join('')}</div>` : '<div class="empty">No results yet. They appear here when students finish practice on an assignment or send a recording.</div>'}</section>`;
    $('#sFilter', body).onchange = (e) => { App.classFilter = e.target.value; tSubmissions(body, App); };
    $('#sStatus', body).onchange = (e) => { App.classStatus = e.target.value; tSubmissions(body, App); };
    PM.Shared.wireRecordingPlayers(body, submissions);
    $$('.star-input', body).forEach((box) => $$('[data-star]', box).forEach((b) => (b.onclick = () => {
      const v = +b.dataset.star === +box.dataset.v ? 0 : +b.dataset.star;
      box.dataset.v = v;
      $$('[data-star]', box).forEach((x) => x.classList.toggle('on', +x.dataset.star <= v));
    })));
    $$('[data-rb]', body).forEach((r) => (r.oninput = () => { r.nextElementSibling.textContent = r.value; }));
    $$('[data-a="save"], [data-a="redo"]', body).forEach((b) => (b.onclick = async () => {
      const card = b.closest('[data-id]');
      const rubric = {};
      $$('[data-rb]', card).forEach((r) => (rubric[r.dataset.rb] = +r.value));
      const payload = { teacherComment: card.querySelector('.cmt').value, rating: +card.querySelector('.star-input').dataset.v, status: b.dataset.a === 'redo' ? 'redo' : 'reviewed' };
      if (Object.keys(rubric).length) payload.rubric = rubric;
      try { await Sync.request('PATCH', '/submissions/' + card.dataset.id, payload); UI.toast(b.dataset.a === 'redo' ? 'Sent back to try again' : 'Review sent', { icon: '💬' }); tSubmissions(body, App); }
      catch (e) { UI.toast(e.message, { icon: '⚠️' }); }
    }));
  }

  async function tInvites(body, App) {
    const { invites } = await Sync.request('GET', '/invites');
    const d = desktop();
    const tun = d && d.tunnelStatus ? await d.tunnelStatus().catch(() => null) : null;
    const shareServer = tun && tun.url && tun.state === 'online' ? tun.url : Sync.account.server;
    const admin = Sync.account.user.role === 'admin';
    body.innerHTML = `<section class="card"><div class="card-head"><h3>${icon('plus')} Invite codes</h3></div>
        <p>Share a code with each student: they install Cadenza, open <b>Classroom → I have an invite code</b>, enter the server address <span class="code">${esc(shareServer)}</span> and the code, then choose their own username & password. Codes work once and expire after 30 days.</p>
        <div class="row" style="margin-top:12px"><label class="field" style="flex-direction:row;align-items:center;gap:8px">How many<input type="number" id="iCount" value="5" min="1" max="50" style="width:80px"></label>
          <select id="iInst"><option value="">Student picks instrument</option>${Instruments.list().map((I) => `<option value="${I.id}">${I.emoji} ${esc(I.label)}</option>`).join('')}</select>
          ${admin ? '<select id="iRole"><option value="student">Students</option><option value="teacher">Teachers</option></select>' : ''}
          <button class="btn primary" id="iGen">${icon('plus')} Generate</button></div>
      </section>
      ${d ? `<section class="card" style="margin-top:18px"><div id="hostBox"></div></section>` : ''}
      <section class="card" style="margin-top:18px"><div class="card-head"><h3>${icon('clipboard')} Unused codes (${invites.length})</h3>${invites.length ? `<button class="btn sm ghost" id="iCopy">${icon('clipboard')} Copy all</button>` : ''}</div>
        ${invites.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Code</th><th>For</th><th>Instrument</th><th>Expires</th><th></th></tr></thead><tbody>${invites.map((i) => `<tr><td><span class="code" style="font-size:16px">${esc(i.code)}</span></td><td>${esc(i.role)}</td><td>${esc(i.instrument ? instLabel(i.instrument) : 'any')}</td><td>${fmtDate(i.expiresAt)}</td><td><button class="mini-btn" data-del="${esc(i.code)}" style="color:var(--bad)">Revoke</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No unused codes.</div>'}</section>`;
    if (d) renderHostBox($('#hostBox', body), App);
    $('#iGen', body).onclick = async () => {
      try { await Sync.request('POST', '/invites', { count: +$('#iCount', body).value, instrument: $('#iInst', body).value, role: ($('#iRole', body) || {}).value }); tInvites(body, App); }
      catch (e) { UI.toast(e.message, { icon: '⚠️' }); }
    };
    const cp = $('#iCopy', body);
    if (cp) cp.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(`Join my Cadenza class!\nServer: ${shareServer}\nCodes:\n` + invites.map((i) => i.code).join('\n')); UI.toast('Copied', { icon: '📋' }); };
    $$('[data-del]', body).forEach((b) => (b.onclick = async () => { await Sync.request('DELETE', '/invites/' + b.dataset.del); tInvites(body, App); }));
  }

  PM.Classroom = { startAssignment };
})(typeof self !== 'undefined' ? self : globalThis);
