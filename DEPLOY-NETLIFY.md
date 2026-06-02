# Deploy Najd Research Vault to Netlify

Static site — **no build command**. Upload the vault folder; Netlify serves HTML as-is.

## What to upload (~16 MB deploy)

Upload the **entire** `Najd Research Vault` folder **except** items in `.netlifyignore`.

### Required (must include)

| Path | Purpose |
|------|---------|
| `index.html` | Home / Explore hub |
| `najd-roadmap.html` | Najd programme roadmap |
| `phase-1-papers.html` | Phase I papers |
| `research-ideas.html` | Research Ideas (bundled, ~1.9 MB) |
| `Najd Fault System Dashboard.html` | Structural dashboard |
| `shared/` | Nav bar, KB board, profile switcher |
| `Sabtan Knowledge Base/` | Portal + profiles (~3.3 MB incl. matrix) |
| `Paper 1/` | P1 guides and assets |
| `phase1-react/` | Phase I JSX (loaded by phase-1-papers) |
| `ideas-react/` | Ideas JSX (loaded by research-ideas-dev only) |
| `research-ideas.html`, `research-ideas-dev.html` | Ideas pages |
| Legacy redirects | `Research Ideas.html`, `Najd Roadmap v2.html`, etc. |
| `netlify.toml` | Redirects + publish settings |
| `.netlifyignore` | Keeps node_modules out of deploy |

### Do NOT upload

- `tools/najd-vtest-dashboard/node_modules/` (~134 MB)
- `Project Road map/` (old drafts)
- `najd1.html`, `1111.html` (superseded)

---

## Method A — Drag & drop (fastest)

1. Zip the vault folder (or use Netlify Drop: https://app.netlify.com/drop)
2. Ensure `netlify.toml` is at the **root** of the zip
3. Drop the zip on Netlify Drop
4. Site URL will be something like `https://random-name.netlify.app`
5. Home page: `https://YOUR-SITE.netlify.app/`

---

## Method B — Git + Netlify (recommended for updates)

1. Create a GitHub repo
2. Push the vault (respecting `.gitignore` / `.netlifyignore`)
3. Netlify → **Add new site** → **Import from Git**
4. Settings:
   - **Build command:** leave empty or `echo "static"`
   - **Publish directory:** `.` (root)
5. Deploy

---

## Method C — Netlify CLI

```bash
cd "path/to/Najd Research Vault"
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir .
```

---

## After deploy — smoke test

Open these URLs (replace `YOUR-SITE`):

- `/` — Explore → Najd Project, Prof. Profile
- `/Sabtan%20Knowledge%20Base/index.html` — KB board
- `/najd-roadmap.html`
- `/phase-1-papers.html`
- `/research-ideas.html` — wait for “Unpacking…” to finish; nav must appear
- `/Sabtan%20Knowledge%20Base/profile-matrix.html` — profile switcher bar
- `/Najd%20Fault%20System%20Dashboard.html` — back link + bottom nav
- **✦ assistant** (bottom-right) — opens chat; requires env vars below

---

## OpenAI assistant (Netlify function)

Add in **Netlify → Site settings → Environment variables** (then redeploy):

| Variable | Value |
|----------|--------|
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `OPENAI_ASSISTANT_ID` | `asst_…` from the OpenAI assistant you built |

Files:

- `netlify/functions/chat.mjs` — server proxy (key never in browser)
- `shared/assistant-chat.js` — ✦ chat widget on main pages

Local `python -m http.server` **cannot** run the function. Use **Netlify deploy** or `netlify dev` from the vault folder.

Test on live site: *“Open research ideas”*, *“What is Paper 1 about?”*

---

## Notes

- Paths like `/shared/nav-strip.js` work on Netlify (site root = vault root).
- Folders with spaces (`Sabtan Knowledge Base`, `Paper 1`) work; browsers encode spaces as `%20`.
- `localStorage` (favorites, nav customize) is per-browser, per-domain — expected.
- Optional password: Netlify → Site settings → Access control (Pro) or use Netlify Identity.
