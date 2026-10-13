# Putting Overture online (for iPads, phones and students at home)

Your classroom server does two jobs: it **hosts the Overture app** (so iPads, iPhones, Android
devices and any browser can install it from a link) and it **stores accounts, assignments,
results and synced progress**.

For iPads and phones it **must have an `https://` address** — without HTTPS, browsers block the
microphone, offline mode and "Add to Home Screen" as an app.

Pick **one** of the three options below.

| | Option | Cost | Skill needed | Best for |
|---|---|---|---|---|
| **A** | **Render.com** (cloud, a few clicks) | about US$7–8 / month | none | Most teachers |
| **B** | **Your own small cloud server** with Docker | about US$5 / month + optional domain | copy-paste commands | Lowest cost, full control |
| **C** | **Your own computer + Cloudflare Tunnel** (built into the desktop app) | free (domain optional) | none — two clicks | Small studios; trying it out |

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

## Option C — your own computer + Cloudflare Tunnel (free) ⭐ built into the desktop app

Everything stays on your computer (accounts, recordings, chord PDFs) and Cloudflare gives it a
free public `https://` address, so students at home and iPads can use it. Your computer must be
**on and awake** while students use Overture.

### C1. Quick address — no account, two clicks
1. Install the **Overture desktop app** on the computer that will be the server.
2. Open **Classroom → Host classroom on this computer → Start classroom server**.
3. In the same box, under **🌍 Students at home (free)**, choose **Quick address → Put online**.
   The first time, Overture downloads Cloudflare's small `cloudflared` program (20–40 MB).
4. After a few seconds an address like **`https://happy-river-tone-music.trycloudflare.com`**
   appears. Click **Copy** and send it to your students (iPads: open it in Safari →
   Share → *Add to Home Screen*).
5. Sign in yourself (or set up the master teacher) using that address or `http://localhost:8787`.

⚠️ The quick address **changes every time** you put it online again, and Cloudflare offers no
uptime guarantee for quick tunnels. It is perfect for trying things out and for lessons today;
for a class that uses it every week, set up C2 once.

### C2. Your own permanent address (free Cloudflare account + a domain)
1. Add your domain (e.g. `yourschool.com`, about US$10/year from any registrar) to a free
   **Cloudflare** account.
2. In Cloudflare go to **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**,
   give it a name (e.g. *cadenza*), and **copy the token** it shows (the long text after
   `--token`). You don't need to run the install command it shows.
3. Still in the tunnel, add a **Public hostname**: subdomain `music`, your domain, service
   **HTTP** → `localhost:8787` (use the port you start the classroom server on).
4. In Overture: **Classroom → Host classroom → Start**, then **My own address**, enter
   `music.yourschool.com`, paste the token and click **Put online**. Overture remembers the token —
   next time just click **Put online**.
5. Students always use **`https://music.yourschool.com`**.

### Without the desktop app (command line)
```bash
TRUST_PROXY=1 node server/server.js          # the classroom server on port 8787
cloudflared tunnel --url http://localhost:8787   # quick address, or:
cloudflared tunnel run --token <YOUR_TOKEN>      # your own address (C2 steps 1–3)
```
Install `cloudflared` from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
(`cloudflared service install <TOKEN>` starts it automatically with the computer).

**Back up:** data lives in the desktop app's data folder (shown in *Host classroom*) or in
`server-data/` for the command line — copy that folder. Recordings and PDFs are in its `files/`
folder.

**Keep it running:** set the computer not to sleep while lessons happen (Windows: *Settings →
System → Power*; Mac: *System Settings → Battery/Energy → Prevent automatic sleeping*).

---

## After it's online

### First steps for you (the master teacher)
1. Open your `https://` address → **Classroom** → **Set up as master teacher**.
2. **Students → Add a student** (gives a temporary password) or **Invite codes → Generate**.
3. **Assignments → New assignment** to set work: a custom task with PDFs, a song from the library,
   a Learn activity, a play-along, an improvisation or a challenge. Tick *Student must send a
   recording* to review their playing by listening in **Results**.
4. **Songs → Add a song** to add hymns and gospel songs (English, Tamil or any language) with
   their chord charts and chord PDFs.

### What to send your students
> Open **https://music.yourschool.com** on your iPad in **Safari** → tap **Share** → **Add to Home Screen** → **Add**.
> Open Overture from the new icon → **Classroom** → sign in with the username and password I gave you
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
| iPad: progress missing / signed out | Open Overture from the **Home Screen icon**, not a Safari tab, and sign in there once. |
| iPad: no sound from the speaker | Turn the volume up; with the mic on, iPhones play quietly — use headphones. |
| iPad: MIDI keyboard not detected | Safari on iPad doesn't support MIDI. Use the microphone, or the desktop app on a computer. |
| Students can't reach the server | Check the address in a normal browser; on Option C make sure your computer is awake and *Students at home* says **online**. |
| Quick address stopped working | Quick addresses change each time — send students the new one, or set up C2 for a permanent address. |
| "Put online" fails | The computer needs internet access to github.com (first download) and Cloudflare; some school firewalls block it — try another network. |
| Too many login attempts | Wait one minute. Behind a proxy make sure `TRUST_PROXY=1` is set (already set in the Docker and Render setups). |
