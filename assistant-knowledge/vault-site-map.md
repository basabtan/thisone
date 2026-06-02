# Sabtan Knowledge Base Vault — Site Map for Assistant

Programme: Najd Fault System research vault for Prof. Abdullah Sabtan and Dr. Bader Sabtan (King Abdulaziz University).

**Live site:** `https://asabtan.sa`

Use these **relative paths** with `navigate_to_page` when users ask to open or go somewhere. Do not invent URLs — pick from this map.

---

## Home hub (Explore menu)

From `index.html`, the core Explore destinations are:

| Path | Purpose |
|------|---------|
| `najd-roadmap.html` | Najd programme roadmap |
| `Sabtan Knowledge Base/profile.html` | Prof. Abdullah — executive capability profile |
| `research-ideas.html?view=research` | Research Ideas workspace |
| `instruments.html` | Geological calculators & field tools catalogue |

---

## Main programme pages

| Path | Purpose |
|------|---------|
| `index.html` | Home hub — Knowledge Base centerpiece, Explore menu, Add shortcuts |
| `Sabtan Knowledge Base/index.html` | KB hub linking to roadmap, Phase I, ideas, profile |
| `najd-roadmap.html` | Full programme roadmap (Phases I–III, guides, checklist) |
| `najd-roadmap.html?layer=overview` | Roadmap overview layer only |
| `phase-1-papers.html` | Phase I paper cards with author expand |
| `paper-1-guide.html` | Paper 1 — visual author / drafting guide (primary) |
| `Paper 1/drafts/p1/p - guide .html` | Paper 1 companion notes (secondary reference) |
| `research-ideas.html?view=research` | Research Ideas (papers, field studies, reviews) |
| `research-ideas.html?view=app` | App Ideas (vault UI, product features) |
| `Najd Fault System Dashboard.html` | Najd structural / slope data dashboard |
| `Sabtan Knowledge Base/profile.html` | Executive capability profile (50+ years in Saudi Arabia) |
| `najd1.html` | Earlier programme overview (archive) |

---

## Instruments (geological tools)

Catalogue page: **`instruments.html`**

| Path | Tool | Purpose |
|------|------|---------|
| `instruments.html` | — | List of live calculators; each card has its own featured-art style picker |
| `vtest-najd.html` | V-test Dashboard | Preferred orientation (μ₀) for Najd sites — compass, presets, circular statistics |
| `najd-tilt-level.html` | Surface Tilt Level | Phone sensors — tilt, slope, roll, pitch, lower direction (HTTPS on mobile) |
| `geostrength.html` | GeoStrength | Rock mass classification, GSI, Hoek–Brown, wedge analysis, Najd Δθ |
| `geo-pavement-toolkit.html` | Geotechnical & Pavement Toolkit | Bearing capacity, CBR, plate bearing test, flexible pavement design |

Typical intents:

| User wants… | Send them to… |
|-------------|----------------|
| Calculators / instruments / tools | `instruments.html` |
| V-test / circular statistics / μ₀ | `vtest-najd.html` |
| Tilt level / bubble level / phone slope | `najd-tilt-level.html` |
| GSI / slope stability / Hoek–Brown | `geostrength.html` |
| CBR / pavement / foundation design | `geo-pavement-toolkit.html` |

---

## Legacy redirects (old bookmarks)

These URLs still work but redirect — prefer the target path:

| Old path | Use instead |
|----------|-------------|
| `Najd Roadmap v2.html` | `najd-roadmap.html` |
| `Phase 1 (React).html` | `phase-1-papers.html` |
| `Research Ideas.html` | `research-ideas.html` |
| `Research Ideas (React).html` | `research-ideas-dev.html` (dev only) |
| `Paper 1/drafts/p1/G -p1 - guide .html` | `paper-1-guide.html` |
| `Sabtan Knowledge Base/profile-strategic.html` | `Sabtan Knowledge Base/profile.html` |
| `Sabtan Knowledge Base/profile-matrix.html` | `Sabtan Knowledge Base/profile.html` |

---

## Navigation behaviour

- Bottom **nav strip** (`shared/nav-strip.js`) on main pages — Ideas, Home, Knowledge Base, Overview, Phase I, P1 Guide, Najd submenu.
- **Ideas** has two categories: **research** and **app**. Same page, different view: `?view=research` or `?view=app`.
- **Instruments** is linked from the home Explore hub and from `instruments.html` tool cards.
- Ideas data is stored in the **browser** (localStorage), not on a server.
- Vault assistant chat appears on most pages; use `navigate_to_page` with a path from this map.

---

## Typical user intents → page

| User wants… | Send them to… |
|-------------|----------------|
| Home / start | `index.html` |
| KB entry / dashboard | `Sabtan Knowledge Base/index.html` |
| Programme overview / roadmap | `najd-roadmap.html` |
| Roadmap overview layer | `najd-roadmap.html?layer=overview` |
| Phase I papers list | `phase-1-papers.html` |
| Paper 1 guide / drafting help | `paper-1-guide.html` |
| Capture a research paper idea | `research-ideas.html?view=research` |
| Capture a vault/UI/app idea | `research-ideas.html?view=app` |
| Prof. Sabtan profile / CV / executive summary | `Sabtan Knowledge Base/profile.html` |
| Najd data dashboard | `Najd Fault System Dashboard.html` |
| Geological calculators (any) | `instruments.html` |

---

## `navigate_to_page` examples

```json
{ "path": "instruments.html", "label": "Instruments", "reason": "Catalogue of live geological tools" }
{ "path": "vtest-najd.html", "label": "V-test Dashboard", "reason": "Circular statistics for preferred orientation" }
{ "path": "research-ideas.html?view=research", "label": "Research Ideas", "reason": "Capture a paper or field-study idea" }
{ "path": "Sabtan Knowledge Base/profile.html", "label": "Executive Profile", "reason": "Prof. Abdullah capability profile" }
```

Paths are relative to the site root (`asabtan.sa`). Query strings are allowed.

---

## Authors

- **AS** — Prof. Abdullah Sabtan (Geology)
- **BS** — Dr. Bader Sabtan (Industrial Engineering / vault build)
