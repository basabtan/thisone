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

## Idea card attachments (browser localStorage)

Users can attach documents (PDF, Word, images, etc.) to idea cards by dragging onto a card or via **Attach document** in the detail panel. Attachments are stored on each idea as:

| Field | Meaning |
|-------|---------|
| `attachments[]` | Array on each idea object |
| `attachments[].name` | Original filename |
| `attachments[].mimeType` | MIME type |
| `attachments[].size` | Bytes |
| `attachments[].added` | Unix ms timestamp |
| `attachments[].addedBy` | `AS` or `BS` |
| `attachments[].dataUrl` | Base64 data URL (not sent to the assistant API) |

Activity is logged to `sabtan-ideas-activity-v1` (attachment_added, idea_created, status_changed, idea_deleted).

On every chat message, the vault client sends **`ideas_workspace_context`** in session variables, including:

- **Last document attached to an idea card** (file name, when, which idea, research vs app)
- **Card changes since the user's previous assistant message** (new cards, edited fields, new attachments)
- **Recent workspace events** from the activity log

This is separate from files attached directly to the assistant widget (`uploaded_file_name`).

When the user asks “what did I last upload?” or “what changed on my cards?”, read `ideas_workspace_context` first. To open the idea: `navigate_to_page` with `path: research-ideas.html`, `open: <ideaId>`, and matching `view` query (`research` or `app`).

## Notes for the assistant

- Do not confuse **research ideas** (papers) with **app ideas** (vault build).
- Do not confuse **idea-card attachments** (stored on cards in localStorage) with **assistant chat attachments** (uploaded in the ✦ widget for that message).
- **When capturing from a document, chat, or report:** call `prefill_idea_draft` with **all seven fields** you can infer — not only `title` and `summary`. At minimum always include **`motivation`**. Fill `trigger`, `data`, `methods`, and `effort` whenever the source mentions them; use `""` only when truly unknown.
- **Field mapping from typical reports:**

| Source content | Target field |
|----------------|--------------|
| Title, aim, hypothesis | `title`, `summary` |
| Gap, rationale, why this team | `motivation` |
| Workshop, paper cite, observation | `trigger` |
| Sites, datasets, field/lab needs | `data` |
| Methods, statistics, workflow | `methods` |
| Timeline, deliverable, paper type | `effort` |

- Omit `hidden_sections` unless you intentionally want empty optional cards collapsed; filled sections auto-expand in the UI.
- User ideas in production live in browser localStorage — this document describes schema and examples only.

---

## OpenAI function definition (update Bob's tool)

Replace Bob's `prefill_idea_draft` function with the JSON in **`prefill-idea-draft-tool.json`** (same folder). The live tool must expose **`motivation`, `trigger`, `data`, `methods`, `effort`** — if the schema only lists `title` and `summary`, the API will strip the other fields before they reach the browser.

### Example — full research capture from a report

```json
{
  "category": "research",
  "title": "Joint roughness as Najd cataclasis proxy",
  "summary": "JRC profiles at five granodiorite sites may correlate with Najd-related cataclastic overprint — a low-cost field proxy complementing NII.",
  "motivation": "No published JRC–Najd study; we hold the only existing structural dataset for these sites.",
  "trigger": "SGS workshop, March — rapid field methods to pre-screen sites.",
  "data": "Five sites, scanline JRC, ~4-day revisit; pair with existing Najd % and Schmidt R.",
  "methods": "Barton–Choubey JRC, linear regression against Najd family proportion and GSI.",
  "effort": "6-month side project; short methods paper or Paper 2 section.",
  "tags": ["Paper-2", "fieldwork"]
}
```
