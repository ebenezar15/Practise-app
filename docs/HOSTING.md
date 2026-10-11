# Putting Cadenza online (for iPads, phones and students at home)

Your classroom server does two jobs: it **hosts the Cadenza app** (so iPads, iPhones, Android
devices and any browser can install it from a link) and it **stores accounts, assignments,
results and synced progress**.

For iPads and phones it **must have an `https://` address** — without HTTPS, browsers block the
microphone, offline mode and "Add to Home Screen" as an app.

Pick **one** of the three options below.

| | Option | Cost | Skill needed | Best for |
|---|---|---|---|---|
| **A** | **Render.com** (cloud, a few clicks) | about US$7–8 / month | none | Most teachers |
| **B** | **Your own small cloud server** with Docker | about US$5 / month + optional domain | copy-paste commands | Lowest cost, full control |
| **C** | **Your own computer + Cloudflare Tunnel** | free (domain optional) | a little | Trying it out; small studios |

---

## Option A — Render.com (easiest)

1. **Put the code on GitHub** (it already is: `ebenezar15/Practise-app`). Merge the
   `claude/quirky-knuth-ugwj5h` branch into your main branch, or pick that branch in step 4.
2. Create a free account at **render.com** and connect your GitHub account.
3. In Render click **New +** → **Blueprint** and select the **Practise-app** repository.
4. Render reads `render.yaml` and shows one service called **cadenza** with a 1 GB disk.
   Click **Apply**. (The disk needs the *Starter* plan — the free plan deletes data.)
5. Wait for the build (2–4 minutes). Your address appears at the top, e.g.
   **`https://cadenza-abcd.onrender.com`**.
6. Open that address → **Classroom** → create the **master teacher** account (first person only).

*Your own address (optional):* in Render → cadenza → **Settings → Custom Domains** → add
`music.yourschool.com`, then add the DNS record Render shows you at your domain provider.
HTTPS is automatic.

*Updates:* every time the branch on GitHub changes, Render rebuilds automatically.
*Backups:* Render → cadenza → **Disks** → snapshots are taken daily.

---

## Option B — your own cloud server with Docker (cheapest long-term)

You need: a small Linux server (DigitalOcean, Hetzner, Linode, AWS Lightsail… 1 GB RAM is plenty)
and a domain name (about US$10/year).

1. **Create the server** (Ubuntu 24.04). Note its IP address.
2. **Point your domain at it:** at your domain provider add an **A record**
   `music` → *your server's IP* (gives `music.yourschool.com`). Wait a few minutes.
3. **Log in to the server** (the provider's web console or `ssh root@IP`) and run:

   ```bash
   curl -fsSL https://get.docker.com | sh
   git clone https://github.com/ebenezar15/Practise-app.git cadenza
   cd cadenza && git checkout claude/quirky-knuth-ugwj5h
   cd deploy
   DOMAIN=music.yourschool.com docker compose up -d --build
   ```

4. Open **`https://music.yourschool.com`** → **Classroom** → create the master teacher account.
   Caddy obtains and renews the HTTPS certificate automatically.

**Update to a new version:**
```bash
cd ~/cadenza && git pull && cd deploy && DOMAIN=music.yourschool.com docker compose up -d --build
```

**Back up** (all accounts, assignments, songs and results live in one volume):
```bash
docker run --rm -v deploy_cadenza-data:/data -v $PWD:/backup alpine tar czf /backup/cadenza-backup-$(date +%F).tgz -C /data .
```
Restore by extracting that file back into the volume while the app is stopped.

---

## Option C — your own computer + Cloudflare Tunnel (free)

Keeps everything on your computer and gives it a public `https://` address. The computer must be
on and awake while students use Cadenza.

1. Start the classroom server: in the **Cadenza desktop app** go to **Classroom → Host classroom on
   this computer → Start** (or run `node server/server.js` in the project folder).
2. Install **cloudflared**: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
3. **Quick test (no account):**
   ```bash
   cloudflared tunnel --url http://localhost:8787
   ```
   It prints an address like `https://random-words.trycloudflare.com` — share it with students.
   ⚠️ This address **changes every time** you restart it, so students would have to re-add the app.
4. **Permanent address (recommended):** add your domain to a free Cloudflare account, then:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create cadenza
   cloudflared tunnel route dns cadenza music.yourschool.com
   cloudflared tunnel run --url http://localhost:8787 cadenza
   ```
   To start it automatically with your computer: `cloudflared service install` (see Cloudflare's docs).
5. If you started the server from the command line, use `TRUST_PROXY=1 node server/server.js`
   so login protection sees each student's real address (the desktop app does this already).

Data lives in `server-data/` (command line) or in the desktop app's settings folder
(`Classroom → Host classroom` shows the path). Copy that folder to back up.

---

## After it's online

### First steps for you (the master teacher)
1. Open your `https://` address → **Classroom** → **Set up as master teacher**.
2. **Students → Add a student** (gives a temporary password) or **Invite codes → Generate**.
3. **Assignments → New assignment** to set work.

### What to send your students
> Open **https://music.yourschool.com** on your iPad in **Safari** → tap **Share** → **Add to Home Screen** → **Add**.
> Open Cadenza from the new icon → **Classroom** → sign in with the username and password I gave you
> (or choose *I have an invite code*). Allow the microphone when asked.

Students on Windows, Mac or Linux can use the desktop installers instead, and enter the same
address in **Classroom**.

### How sync, sign-in and updates behave
* **Sign-in is remembered** until the student signs out (or you deactivate the account).
  On iPad the Home Screen app keeps its own sign-in, separate from Safari.
* **Progress and results sync** whenever there's internet; practice done offline uploads later.
* **Updates:** when you update the server, browsers and Home Screen apps pick up the new version
  automatically (it appears the *second* time the app is opened after the update).
  Desktop apps are updated by installing the new version from the Releases page.

### Security checklist
* Use a strong master-teacher password (8+ characters; it can't be recovered — create a second
  master teacher as a backup).
* Keep the address `https://` only (Options A–C all do this for you).
* Deactivate students who leave (**Students → Deactivate**) — their sign-in stops immediately.
* Back up the data regularly (see your option above).

### Troubleshooting
| Problem | Fix |
|---|---|
| "Microphone only works over https" | You opened an `http://` address. Use the `https://` one. |
| iPad: progress missing / signed out | Open Cadenza from the **Home Screen icon**, not a Safari tab, and sign in there once. |
| iPad: no sound from the speaker | Turn the volume up; with the mic on, iPhones play quietly — use headphones. |
| iPad: MIDI keyboard not detected | Safari on iPad doesn't support MIDI. Use the microphone, or the desktop app on a computer. |
| Students can't reach the server | Check the address in a normal browser; on Option C make sure your computer and the tunnel are running. |
| Too many login attempts | Wait one minute. Behind a proxy make sure `TRUST_PROXY=1` is set (already set in the Docker and Render setups). |
