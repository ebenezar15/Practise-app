const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createServer } = require('../server/server.js');
const { mergeProgress } = require('../js/core/syncmerge.js');

async function start() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cadenza-'));
  const server = createServer({ dataDir: dir });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, p, body, token, headers) => {
    const res = await fetch(base + '/api' + p, {
      method, headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}, headers || {}),
      body: body == null ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { data = text; }
    return { status: res.status, data };
  };
  return { server, base, call, dir };
}

test('classroom server: master setup, students, invites, assignments, submissions, sync', async () => {
  const { server, base, call, dir } = await start();
  try {
    assert.strictEqual((await call('GET', '/health')).data.needsSetup, true);
    const setup = await call('POST', '/setup', { username: 'maestro', password: 'supersecret', name: 'Ms. Rivera', schoolName: 'Rivera Music' });
    assert.strictEqual(setup.status, 200);
    const admin = setup.data.token;
    assert.strictEqual((await call('POST', '/setup', { username: 'x', password: 'yyyyyyyy' })).status, 409);

    // add a student directly → temp password
    const add = await call('POST', '/users', { username: 'sam', name: 'Sam', instrument: 'bass' }, admin);
    assert.strictEqual(add.status, 200);
    assert.ok(add.data.password.length > 6);
    const login = await call('POST', '/login', { username: 'sam', password: add.data.password });
    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.data.user.mustChangePassword, true);
    const sam = login.data.token;
    assert.strictEqual((await call('POST', '/me/password', { newPassword: 'my-own-pass' }, sam)).status, 200);
    assert.strictEqual((await call('POST', '/login', { username: 'sam', password: 'my-own-pass' })).status, 200);
    assert.strictEqual((await call('POST', '/login', { username: 'sam', password: 'nope' })).status, 401);

    // invite code flow
    const inv = await call('POST', '/invites', { count: 2, instrument: 'trumpet' }, admin);
    assert.strictEqual(inv.data.codes.length, 2);
    const reg = await call('POST', '/register', { code: inv.data.codes[0].toLowerCase(), username: 'tia', password: 'trumpet1', name: 'Tia' });
    assert.strictEqual(reg.status, 200);
    assert.strictEqual(reg.data.user.instrument, 'trumpet');
    const tia = reg.data.token;
    assert.strictEqual((await call('POST', '/register', { code: inv.data.codes[0], username: 'tia2', password: 'trumpet1' })).status, 400);

    // students cannot manage users
    assert.strictEqual((await call('GET', '/users', null, sam)).status, 403);

    // upload a song and assign it to Sam only
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const up = await call('POST', '/files', bytes, admin, { 'Content-Type': 'audio/midi', 'X-File-Name': encodeURIComponent('Groove.mid') });
    assert.strictEqual(up.status, 200);
    const users = (await call('GET', '/users', null, admin)).data.users;
    const samId = users.find((u) => u.username === 'sam').id;
    const asg = await call('POST', '/assignments', { title: 'Groove in G', instructions: 'Play the bass line with the backing track', instrument: 'bass', mode: 'part', mixPreset: 'backing', targets: { accuracy: 70, minutes: 5 }, assignees: [samId], file: up.data.file }, admin);
    assert.strictEqual(asg.status, 200);
    const aid = asg.data.assignment.id;
    assert.strictEqual((await call('GET', '/assignments', null, sam)).data.assignments.length, 1);
    assert.strictEqual((await call('GET', '/assignments', null, tia)).data.assignments.length, 0);
    const dl = await fetch(base + '/api/files/' + up.data.file.id, { headers: { Authorization: 'Bearer ' + sam } });
    assert.deepStrictEqual(new Uint8Array(await dl.arrayBuffer()), bytes);
    assert.strictEqual((await fetch(base + '/api/files/' + up.data.file.id, { headers: { Authorization: 'Bearer ' + tia } })).status, 404);

    // submission (idempotent by clientId) and teacher review
    const sub = { assignmentId: aid, clientId: 'c1', seconds: 400, accuracy: 0.82, score: 900, stars: 2, insights: ['Right notes 82%'] };
    const s1 = await call('POST', '/submissions', sub, sam);
    assert.strictEqual(s1.data.submission.meetsTarget, true);
    assert.strictEqual((await call('POST', '/submissions', sub, sam)).data.duplicate, true);
    const rev = await call('PATCH', '/submissions/' + s1.data.submission.id, { teacherComment: 'Great groove! Watch bar 9.' }, admin);
    assert.strictEqual(rev.data.submission.status, 'reviewed');
    const mine = (await call('GET', '/assignments', null, sam)).data.assignments[0];
    assert.strictEqual(mine.myDone, true);
    assert.strictEqual(mine.feedback[0].comment, 'Great groove! Watch bar 9.');

    // progress sync merges two devices
    await call('PUT', '/progress', { state: { xp: 50, level: 2, sessions: 3, totalSeconds: 600, badges: { a: '2026-01-01' }, days: { '2026-01-01': 600 }, history: [{ id: 'h1', date: '2026-01-01T10:00:00Z' }] } }, sam);
    const merged = await call('PUT', '/progress', { state: { xp: 10, level: 1, sessions: 5, totalSeconds: 300, badges: { b: '2026-01-02' }, days: { '2026-01-02': 300 }, history: [{ id: 'h2', date: '2026-01-02T10:00:00Z' }] } }, sam);
    const st = merged.data.state;
    assert.strictEqual(st.level, 2);
    assert.strictEqual(st.sessions, 5);
    assert.deepStrictEqual(Object.keys(st.badges).sort(), ['a', 'b']);
    assert.strictEqual(st.history.length, 2);
    const overview = (await call('GET', '/users', null, admin)).data.users.find((u) => u.id === samId);
    assert.strictEqual(overview.assignmentsDone, 1);
    assert.strictEqual(overview.level, 2);

    // deactivate → token stops working; static app served but data folder is not
    await call('PATCH', '/users/' + samId, { active: false }, admin);
    assert.strictEqual((await call('GET', '/me', null, sam)).status, 401);
    assert.strictEqual((await fetch(base + '/index.html')).status, 200);
    assert.strictEqual((await fetch(base + '/server/server.js')).status, 404);
  } finally {
    server.close();
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(fs.existsSync(path.join(dir, 'db.json')));
  }
});

test('progress merge is commutative and idempotent', () => {
  const a = { xp: 5, level: 3, sessions: 2, streak: 4, lastDay: '2026-02-02', badges: { x: '1' }, days: { d: 1 }, history: [{ id: 'a', date: '2' }] };
  const b = { xp: 99, level: 2, sessions: 7, streak: 1, lastDay: '2026-02-03', badges: { y: '2' }, days: { d: 5 }, history: [{ id: 'b', date: '3' }] };
  const ab = mergeProgress(a, b), ba = mergeProgress(b, a);
  assert.deepStrictEqual([ab.level, ab.sessions, ab.streak, ab.days.d], [3, 7, 1, 5]);
  assert.deepStrictEqual([ba.level, ba.sessions, ba.streak, ba.days.d], [3, 7, 1, 5]);
  assert.deepStrictEqual(mergeProgress(ab, ab).history, ab.history);
});

test('recordings, custom assignments with PDFs, song library and teacher review', async () => {
  const { server, base, call } = await start();
  try {
    const admin = (await call('POST', '/setup', { username: 'maestro', password: 'supersecret', name: 'Teacher' })).data.token;
    const add = await call('POST', '/users', { username: 'ana', name: 'Ana', instrument: 'piano', password: 'anapass1' }, admin);
    const ana = (await call('POST', '/login', { username: 'ana', password: 'anapass1' })).data.token;
    await call('POST', '/users', { username: 'ben', name: 'Ben', password: 'benpass1' }, admin);
    const ben = (await call('POST', '/login', { username: 'ben', password: 'benpass1' })).data.token;

    // teacher uploads a chord PDF and creates a song + a custom assignment that needs a recording
    const pdf = await call('POST', '/files', new Uint8Array([37, 80, 68, 70]), admin, { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent('Amazing Grace chords.pdf') });
    const song = await call('POST', '/songs', { title: 'Amazing Grace', language: 'English', key: 'G', bpm: 80, chart: '[G]Amazing [C]grace', bars: 'G | G | C | G', attachments: [pdf.data.file] }, admin);
    assert.strictEqual(song.status, 200);
    const tamil = await call('POST', '/songs', { title: 'என் இயேசு', language: 'Tamil', chart: '[G]இயேசு' }, admin);
    assert.strictEqual(tamil.data.song.title, 'என் இயேசு');
    assert.strictEqual((await call('POST', '/songs', { title: 'x' }, ana)).status, 403);
    assert.strictEqual((await call('GET', '/songs', null, ana)).data.songs.length, 2);
    const pdfRes = await fetch(base + '/api/files/' + pdf.data.file.id, { headers: { Authorization: 'Bearer ' + ana } });
    assert.strictEqual(pdfRes.status, 200);

    const asg = (await call('POST', '/assignments', { title: 'Record Amazing Grace', mode: 'song', songId: song.data.song.id, requireRecording: true, attachments: [pdf.data.file], assignees: [add.data.user.id] }, admin)).data.assignment;
    assert.strictEqual(asg.requireRecording, true);
    assert.strictEqual(asg.attachments.length, 1);

    // student uploads a recording and submits; Ben cannot fetch it
    const rec = await call('POST', '/files', new Uint8Array(2000).fill(7), ana, { 'Content-Type': 'audio/webm', 'X-File-Name': 'take1.webm' });
    assert.strictEqual(rec.status, 200);
    const noRec = await call('POST', '/submissions', { assignmentId: asg.id, clientId: 'r0', seconds: 120 }, ana);
    assert.strictEqual(noRec.data.submission.meetsTarget, false);
    const sub = await call('POST', '/submissions', { assignmentId: asg.id, clientId: 'r1', seconds: 120, recording: rec.data.file, note: 'Verse 2 was hard' }, ana);
    assert.strictEqual(sub.data.submission.meetsTarget, true);
    assert.strictEqual((await call('POST', '/submissions', { assignmentId: asg.id, clientId: 'r2', recording: { id: pdf.data.file.id } }, ben)).status, 404);
    assert.strictEqual((await fetch(base + '/api/files/' + rec.data.file.id, { headers: { Authorization: 'Bearer ' + ben } })).status, 404);
    // teacher streams it with a byte range (iPad/Safari playback)
    const part = await fetch(base + '/api/files/' + rec.data.file.id, { headers: { Authorization: 'Bearer ' + admin, Range: 'bytes=0-99' } });
    assert.strictEqual(part.status, 206);
    assert.strictEqual((await part.arrayBuffer()).byteLength, 100);

    // free review request for a song (no assignment)
    const free = await call('POST', '/submissions', { songId: tamil.data.song.id, clientId: 'r3', recording: rec.data.file, title: 'என் இயேசு — please check' }, ana);
    assert.strictEqual(free.status, 200);
    assert.strictEqual(free.data.submission.assignmentId, null);

    // review: rating + rubric + "try again"
    const rv = await call('PATCH', '/submissions/' + sub.data.submission.id, { teacherComment: 'Lovely tone. Slow down in bar 9.', rating: 4, rubric: { pitch: 4, timing: 3, tone: 5, expression: 4 }, status: 'redo' }, admin);
    assert.strictEqual(rv.data.submission.status, 'redo');
    const mine = (await call('GET', '/assignments', null, ana)).data.assignments[0];
    assert.strictEqual(mine.redo, true);
    assert.strictEqual(mine.feedback.find((f) => f.rating === 4).rubric.tone, 5);
  } finally { server.close(); }
});
