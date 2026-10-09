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
