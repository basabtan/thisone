# Sabtan Knowledge Base Vault — interactive pages

Root: `C:\Users\bader\OneDrive\A - KAU\Geo\HTML\Sabtan Knowledge Base Vault`

Canonical names (use these in links and bookmarks):

| File | Purpose |
|------|---------|
| `index.html` | Welcome landing — **Knowledge Base** centerpiece; Explore opens Enter Portal / Under Development |
| `atlas.html` | Atlas — infinite-canvas Research Table (spatial hub) |
| `najd-roadmap.html` | Full programme roadmap (Phases I–III, guides, checklist) |
| `phase-1-papers.html` | Phase I paper cards with author morph expand (`phase1-react/` source) |
| `research-ideas.html` | Research Ideas bundled React app (~1.9 MB, self-contained) |
| `research-ideas-dev.html` | Research Ideas dev build (`ideas-react/` source, for editing) |
| `Sabtan Knowledge Base/index.html` | Hub linking to all of the above |

## Legacy redirects (old bookmarks still work)

- `Najd Roadmap v2.html` → `najd-roadmap.html`
- `Phase 1 (React).html` → `phase-1-papers.html`
- `Research Ideas.html` → `research-ideas.html`
- `Research Ideas - standalone.html` → `research-ideas.html`
- `Research Ideas (React).html` → `research-ideas-dev.html`

| `shared/nav-strip.css` + `shared/nav-strip.js` | Bottom “Go to” nav on all main pages |

**Nav bar styles** (toggle under the assistant ✦ icon on pages with the strip): **Classic** — separate search box and nav pill; **Editorial** — numbered sharp cards (01–06) for Home, Hub, Overview, Phase I, Ideas, P1 Guide with hover lift/gold rule (replaces legacy `unified`); **Disc** — center navdisc star with **Ideas** and **Home** rolling discs. Preference is stored in `localStorage` key `sabtan-nav-config` (`design`: `classic` | `editorial` | `disc`; old `unified` maps to `editorial`). API: `setNavbarDesign('editorial')`, `getNavbarDesign()`. Hidden on welcome `index.html` and KB hub `Sabtan Knowledge Base/index.html`.

## Aliases

- **navbar** → vault nav strip (`#navstrip-shell`, `#navstrip`; `shared/nav-strip.js` + `shared/nav-strip.css`). Not a generic HTML `<nav>` elsewhere in the vault.

- `phase1-react/` — JSX modules for Phase I
- `ideas-react/` — JSX modules for Research Ideas (dev entry only)

## Do not use from Najd1 zip folders

Older exports may contain a **different** static `Research Ideas.html` (~50 KB). Always use vault `research-ideas.html`.
