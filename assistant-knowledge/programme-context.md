# Sabtan Knowledge Base — Programme Context

**Last updated:** May 2026  
**Audience:** OpenAI assistant (File search) + vault navigation helper

---

## Who we are

- **Prof. Abdullah Sabtan (AS)** — Department of Geology, King Abdulaziz University (KAU), Jeddah. Lead on geological interpretation and field programme.
- **Dr. Bader Sabtan (BS)** — Department of Industrial Engineering, KAU. Co-author, quantitative analysis, and builder of the **Sabtan Knowledge Base Vault** (HTML/React workspace for roadmap, papers, and ideas).

We are developing a structured research programme on **Najd Fault System effects on rock slopes** along transport corridors in western Saudi Arabia (Makkah region focus), plus a digital vault to manage the programme.

---

## What we are working on (big picture)

### Scientific programme — Najd road-cut characterisation

**Core question:** How does Najd-related structural fabric (joints, cataclasis) control rock-mass quality and slope behaviour at highway cuts — and can we measure it quantitatively?

**Field basis:** Five granodiorite road-cut sites, ~330 joint measurements, circular statistics, classification into Najd (NW–SE), Red Sea (NE–SW), and Other families.

**Three-phase roadmap:**

| Phase | Theme | Focus |
|-------|--------|--------|
| **Phase I** | Field characterisation | Paper 1 (joint populations) + Paper 2 (Najd Intensity Index) |
| **Phase II** | Engineering application | Link indices to slope stability / rock-mass quality (~12 slopes) |
| **Phase III** | Regional synthesis | Broader Najd corridor integration |

**Current priority:** Phase I — both papers can advance from data already collected. Paper 1 establishes the bimodal fabric statistically; Paper 2 builds the **Najd Intensity Index (NII)** linking fabric to GSI/RMR-type rock-mass indicators.

### Parallel tracks (not Najd-core but active)

- **Corrosion in problematic soils** — comparative review of sabkha, calcareous, sulfate, industrial, and organic environments (Saudi infrastructure context).
- **Side ideas** — JRC as Najd proxy, drone photogrammetry for joints, slope monitoring sensors, SGS archive digitisation (see Ideas workspace seeds).

### Digital product — Sabtan Knowledge Base Vault

BS is building a **static HTML/React vault** (hosted on Netlify) that wraps the research programme:

- **Roadmap** — phases, papers, writing guides
- **Phase I paper cards** — author roles, status, links to guides
- **Ideas workspace** — Research Ideas (papers) + App Ideas (vault UI/features)
- **Navigation** — bottom nav strip, home hub, profiles
- **Future:** OpenAI assistant for navigation, idea capture, and document Q&A

The vault is **not** the research itself — it is the **operating environment** for managing it.

---

## Paper 1 (active writing)

**Title:** Bimodal joint population characterisation at Najd-affected road cuts, Makkah region, western Saudi Arabia

**Role in programme:** Proves non-random, bimodal Najd + Red Sea joint families at all five sites using circular statistics (Rayleigh test, mean direction, resultant length). Output feeds Paper 2’s index inputs.

**Status:** Data complete; draft and writing guide in vault (`Paper 1/drafts/p1/`).

**Does NOT include:** NII or engineering ratings (reserved for Paper 2).

---

## Paper 2 (planned, depends on Paper 1)

**Title:** Najd Intensity Index (NII) — composite quantitative index linking structural fabric to rock mass quality

**Inputs:** Paper 1 family proportions + Schmidt rebound + field GSI/RMR  
**Timeline:** ~4–6 months after Paper 1

---

## Ideas workspace — two kinds of work

| Category | Purpose | Examples |
|----------|---------|----------|
| **Research** | Papers, field studies, reviews | JRC proxy, corrosion framework, drone joints |
| **App** | Vault UI and product | Nav crystal, Ideas switch, Explore hub, AI assistant |

Do not mix these when drafting or navigating.

---

## How the assistant should help

1. **Orient** — explain where the user is in Phase I–III and what page to open.
2. **Navigate** — use `navigate_to_page` (not guess URLs from memory alone).
3. **Capture ideas** — use `prefill_idea_draft` with correct category and field keys.
4. **Answer from documents** — Paper 1 draft, guides, this context file, site map, ideas guide.
5. **Stay grounded** — prefer vault documents over inventing programme details. Say when something is not in uploaded files.

---

## What is NOT in File search

- Live idea cards (browser localStorage only)
- Unuploaded local files on the user’s PC
- Real-time roadmap edits unless re-uploaded

Re-upload documents when major drafts change.

---

## Related files in this upload pack

| File | Role |
|------|------|
| `programme-context.md` | This file — who, what, priorities |
| `vault-site-map.md` | URLs and navigation |
| `ideas-workspace-guide.md` | Idea form schema and examples |
| `Paper-1.md` (separate upload) | Full Paper 1 draft text |
