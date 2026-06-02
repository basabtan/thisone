# Ideas Workspace — Schema and Examples

The Ideas page (`research-ideas.html`) is a React workspace with two categories. The assistant should use `prefill_idea_draft` with the correct category and field keys.

## Categories

### Research Ideas (`category: research`)

For paper proposals, field studies, and academic projects.

| Field key | Label | Required |
|-----------|-------|----------|
| `title` | Working title | Yes |
| `summary` | The core idea | Yes |
| `motivation` | Why now / why us | Yes |
| `trigger` | Triggered by | Optional |
| `data` | Data we'd need | Optional |
| `methods` | Methods envisioned | Optional |
| `effort` | Effort & outcomes | Optional |

Optional sections may start collapsed (`hidden_sections`: `trigger`, `data`, `methods`, `effort`).

### App Ideas (`category: app`)

For vault UI, navigation, React features, and product work.

Same field keys; different labels in the UI:

| Field key | App label |
|-----------|-----------|
| `summary` | What we're building |
| `motivation` | Problem / gap |
| `trigger` | Spark / origin |
| `data` | Scope & touchpoints |
| `methods` | Implementation sketch |
| `effort` | Effort & ship criteria |

## Status values

`half`, `discuss`, `plan`, `approved`, `parked`, `done` (shown as Half-baked, Worth discussing, etc.)

## Example research ideas (seed content)

### JRC as Najd cataclasis proxy

- **Title:** Joint roughness coefficients as a non-destructive proxy for Najd cataclasis
- **Summary:** JRC profiles at 5 granodiorite sites may correlate with Najd-related cataclastic overprint — a low-cost field proxy complementing NII.
- **Motivation:** No published JRC–Najd study; we hold the only existing structural dataset for these sites.
- **Trigger:** SGS workshop, March — rapid field methods to pre-screen sites.
- **Data:** 5 sites, scanline JRC, ~4-day revisit, no new lab work.
- **Methods:** Barton–Choubey JRC, paired with Najd %, Schmidt R, field GSI, linear regression.
- **Effort:** 6-month side project; short paper or methods section in Paper 2.

### Corrosion sources in problematic soils

- **Title:** Corrosion sources in problematic soils — comparative aggressiveness (sabkha, calcareous, sulfate, industrial, organic)
- **Summary:** Source-based framework ranking five corrosion environments for buried steel and concrete; sabkha most aggressive naturally.
- **Motivation:** No comparative framework despite all five co-occurring in Saudi corridors; SBC 303 is lithology-based.
- **Effort:** 6–9 month review; AS + BS.

## Example app ideas (seed content)

### Ideas category switch

- **Title:** Ideas workspace — Research vs App category switch
- **Summary:** Single Ideas page; header fixed; research panel swaps with app panel.
- **Motivation:** Shared workflow, different audience and storage — one page, two windows.

### KB navigation crystal

- **Title:** Knowledge Base navigation crystal and collapsible strip
- **Summary:** Ruby crystal toggle; nav bar slides away; crystal stays fixed; links never covered.
- **Motivation:** Navigation as part of the vault product — consistent across pages.

## Notes for the assistant

- Do not confuse **research ideas** (papers) with **app ideas** (vault build).
- When importing from a report, map content to the six text fields; leave unknown optional fields empty.
- User ideas in production live in browser localStorage — this document describes schema and examples only.
