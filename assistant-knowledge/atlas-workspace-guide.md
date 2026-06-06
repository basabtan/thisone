# Atlas Workspace — Guide for Assistant

**Atlas** (`atlas.html`) is the Sabtan Knowledge Base **infinite canvas research table**: a pan/zoom workspace where users arrange sticky notes, embedded vault pages, PDFs, images, shapes, connectors, and ink strokes across one or more boards. State persists in the browser (`localStorage`).

Use this guide when the user is on Atlas or asks to open, arrange, or annotate their research table.

---

## What Atlas is

- **Canvas**: pan, zoom, multi-board tabs, export PNG/PDF
- **Library sidebar**: collections of vault pages (embeds) loaded from `atlas.content.json`
- **Recall**: pin a collection into the sidebar for quick access
- **Import**: drag-drop or Import button for PDF, images, Word — places files on the canvas
- **Notes**: sticky notes with title + rich HTML body

Atlas is **not** the Ideas workspace. Idea-card attachments live on `research-ideas.html` in localStorage; Atlas imports are separate canvas objects.

---

## Library collections and item IDs

Collections and IDs come from `atlas.content.json`:

### Najd Fault System

| id | title | kind |
|----|-------|------|
| `nfs-dash` | Structural Dashboard | embed |
| `nfs-roadmap` | Programme Roadmap | embed |
| `nfs-phase1` | Phase I Papers | embed |
| `nfs-p1guide` | Paper 1 — Author Guide | embed |
| `nfs-rock` | Rock-slope Reinforcement | embed |
| `nfs-vtest` | V-test Dashboard | embed |
| `nfs-archive` | Earlier Overview | embed |

### GeoStrength & Tools

| id | title | kind |
|----|-------|------|
| `gs-main` | GeoStrength | embed |
| `gs-pave` | Geo-Pavement Toolkit | embed |
| `tl-instr` | Instruments | embed |
| `tl-tilt` | Surface Tilt Level | embed |

### Research Ideas

| id | title | kind |
|----|-------|------|
| `ri-app` | Research Ideas | embed |

### Profile & Library

| id | title | kind |
|----|-------|------|
| `lib-profile` | Executive Profile | embed |

The live session also sends a compact catalog via `atlas_workspace_context` (id | title | collection).

---

## Client tool: `atlas_action`

Call when `current_page` is `atlas.html` (or after navigating there). The browser executes the action via `window.SabtanAtlas`.

| action | parameters | effect |
|--------|------------|--------|
| `add_note` | `title`, `html` | New sticky note on the active board |
| `open_item` | `id` | Opens library item; recalls its collection |
| `recall_collection` | `name` | Pins collection in sidebar (exact name, e.g. `Najd Fault System`) |
| `import_chat_attachment` | — | **No-op** — chat files auto-import on send |

### Examples

```json
{ "action": "open_item", "id": "nfs-roadmap" }
```

```json
{ "action": "recall_collection", "name": "Najd Fault System" }
```

```json
{ "action": "add_note", "title": "Paper 2 angles", "html": "<p>Compare JRC vs NII at Site 3.</p>" }
```

---

## File import

- **On canvas**: user drags files onto the stage or uses the Import control
- **Via assistant chat on Atlas**: attaching PDF/images/Word to the chat widget and sending **auto-imports** the file to the canvas immediately (system message confirms). The assistant receives `uploaded_file_name` and `atlas_workspace_context` noting the import — no separate tool call needed unless you are acknowledging completion

**Distinction from Ideas**: Ideas attachments are stored on idea cards (`research-ideas.html`). Atlas attachments become canvas PDF/image windows.

---

## Navigation and deep links

Use `navigate_to_page` to send users to Atlas, optionally opening items or recalling collections:

| Intent | Path or args |
|--------|----------------|
| Open Atlas | `atlas.html` |
| Open roadmap on canvas | `atlas.html?open=nfs-roadmap` |
| Open item + recall collection | `atlas.html?open=nfs-roadmap&recall=Najd Fault System` |
| Multiple opens | `atlas.html?open=nfs-roadmap,nfs-dash` |
| Recall only | `atlas.html?recall=Najd Fault System` |

`navigate_to_page` fields: `path`, `open` (item id), `recall` (collection name; comma-separated for multiple).

If already on Atlas, same-page navigation with `open` / `recall` runs without a full reload.

---

## Live context (`atlas_workspace_context`)

Each chat message from Atlas includes:

- Current board name and object counts (notes, embeds, PDFs, images)
- Full library catalog (id, title, collection)
- Note if a chat attachment was just auto-imported

Use this to answer “what’s on my board?” or “what can I open?” without guessing IDs.

---

## Typical user intents

| User wants… | Do this |
|-------------|---------|
| Open Atlas | `navigate_to_page` → `atlas.html` |
| Put roadmap on the table | `atlas_action` `open_item` `nfs-roadmap` or deep link |
| Pin Najd collection | `atlas_action` `recall_collection` `Najd Fault System` |
| Capture a thought on the board | `atlas_action` `add_note` |
| Import their chat PDF | Already done on send; confirm in reply |
| List what’s available | Read `atlas_workspace_context` library catalog |
