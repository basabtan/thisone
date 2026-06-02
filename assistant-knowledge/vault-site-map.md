# Sabtan Knowledge Base Vault — Site Map for Assistant

Programme: Najd Fault System research vault for Prof. Abdullah Sabtan and Dr. Bader Sabtan (King Abdulaziz University).

Use these paths when navigating users or answering “where do I find…?” questions.

## Main pages

| Path | Purpose |
|------|---------|
| `index.html` | Home hub — Knowledge Base centerpiece, Explore menu (Najd, Profile, Ideas) |
| `Sabtan Knowledge Base/index.html` | KB hub linking to roadmap, Phase I, ideas, profiles |
| `najd-roadmap.html` | Full programme roadmap (Phases I–III, guides, checklist) |
| `najd-roadmap.html?layer=overview` | Roadmap overview layer |
| `phase-1-papers.html` | Phase I paper cards with author expand |
| `research-ideas.html?view=research` | Research Ideas workspace (papers, field studies) |
| `research-ideas.html?view=app` | App Ideas workspace (vault UI, product features) |
| `Najd Fault System Dashboard.html` | Najd dashboard |
| `Paper 1/drafts/p1/G -p1 - guide .html` | Paper 1 guide |
| `Sabtan Knowledge Base/profile.html` | Profile views |
| `Sabtan Knowledge Base/profile-strategic.html` | Strategic profile |
| `Sabtan Knowledge Base/profile-matrix.html` | Profile matrix |

## Legacy redirects (old bookmarks)

- `Najd Roadmap v2.html` → use `najd-roadmap.html`
- `Phase 1 (React).html` → use `phase-1-papers.html`
- `Research Ideas.html` → use `research-ideas.html`
- `Research Ideas (React).html` → use `research-ideas-dev.html` (dev only)

## Navigation behaviour

- Bottom **nav strip** (`shared/nav-strip.js`) appears on main pages — Home, Knowledge Base, Overview, Phase I, P1 Guide, Ideas.
- **Ideas** has two categories: **research** (paper pipeline) and **app** (vault/product ideas). Same page, different view via `?view=research` or `?view=app`.
- Ideas data is stored in the **browser** (localStorage), not on a server.

## Typical user intents → page

| User wants… | Send them to… |
|-------------|----------------|
| Programme overview / roadmap | `najd-roadmap.html` |
| Phase I papers list | `phase-1-papers.html` |
| Capture a research paper idea | `research-ideas.html?view=research` |
| Capture a vault/UI/app idea | `research-ideas.html?view=app` |
| Paper 1 methods/guide | `Paper 1/drafts/p1/G -p1 - guide .html` |
| Home / start | `index.html` |
| KB entry | `Sabtan Knowledge Base/index.html` |

## Authors

- **AS** — Prof. Abdullah Sabtan (Geology)
- **BS** — Dr. Bader Sabtan (Industrial Engineering / vault build)
