# Cadence — Architecture

## What Cadence does

Cadence renders a daily habit heatmap inside Obsidian Bases. It reads date-named notes (`YYYY-MM-DD`) and inspects their boolean or list properties to show habit completion over time.

- **Rows** — tracked habits (one per selected property)
- **Columns** — dates (current week or current month)
- **Dots** — completion state per habit per day

Dot states:

| State | Meaning |
|-------|---------|
| `filled` | Property is truthy (boolean `true` or non-empty list) |
| `empty` | Note exists for that date but property is falsy / null |
| `missing` | No note found for that date |

A "today pill" (SVG squircle border) highlights the current date's column.

---

## Module breakdown

| File | Responsibility |
|------|---------------|
| `src/main.ts` | Plugin lifecycle; registers `CadenceView` with the Bases API. Keep it minimal (~23 lines). |
| `src/view.ts` | Core rendering: heatmap grid, dot state resolution, today-pill positioning. |
| `src/date-utils.ts` | Date math: column generation, Monday-anchored week-start, date formatting. |
| `src/view-options.ts` | Declares the `timescale` view option (`week` / `month` dropdown). |
| `src/settings.ts` | Reserved for future plugin-level settings; currently empty. |
| `styles.css` | Grid layout and dot/pill styling using Obsidian CSS custom properties. |

---

## Data flow

```
Obsidian Bases query
  └─▶ QueryController
        └─▶ CadenceView.onDataUpdated()
              └─▶ render()
                    ├─ buildEntryMap()      // date-string → BasesEntry lookup table
                    ├─ buildColumns()       // date-utils: generate ordered date columns
                    ├─ resolveDotState()    // per cell: filled | empty | missing
                    └─ positionTodayPill()  // SVG squircle over current date column
```

`buildEntryMap()` filters query results to notes whose filename matches `/^\d{4}-\d{2}-\d{2}$/`, then indexes them by that date string for O(1) lookup during rendering.

`resolveDotState()` unwraps Obsidian's `BooleanValue` and `ListValue` property wrappers to determine dot state.

---

## Key types

| Type | Definition | Description |
|------|-----------|-------------|
| `DotState` | `'filled' \| 'empty' \| 'missing'` | Completion state for one cell |
| `HeatmapTimescale` | `'week' \| 'month'` | Active timescale for column generation |

Obsidian API types used: `BasesView`, `BasesEntry`, `BasesPropertyId`, `BooleanValue`, `ListValue`, `ViewOption`, `QueryController`.

---

## Conventions & patterns

**CSS custom properties** — the grid is driven by two properties set at render time:
- `--hh-column-count` — number of date columns (7 for week, ~28–31 for month)
- `--hh-label-width` — measured pixel width of the widest row label (set after render via `computeLabelWidth()`)

**Property label display** — `BasesPropertyId` values carry a `"note."` prefix (e.g. `"note.exercise"`). The view strips this prefix before rendering the row label.

**Monday-anchored weeks** — `startOfWeek()` in `date-utils.ts` anchors to Monday (ISO week), not Sunday.

**Today-pill SVG** — drawn as a cubic-bezier squircle path (`k = 0.6`), absolutely positioned over the heatmap, with `pointer-events: none` so it doesn't block dot interactions.

**Obsidian theme colors** — dots and the pill use Obsidian CSS variables (`--interactive-accent`, `--text-muted`, `--text-faint`, `--background-modifier-border`) so they adapt to any theme automatically.

---

## Development & testing

### Dev date override

All date logic routes through `getCurrentDate()` in `src/date-utils.ts` rather than calling `new Date()` directly. This function checks `window.__cadenceDevDate` first, making it possible to freeze the plugin's sense of "today" during development without touching production code.

The `CadenceView` constructor installs a setter on `window.__cadenceDevDate` so that assigning a value **automatically re-renders** the view.

**One-time setup after each build + plugin reload** — BasesView instances persist across `plugin:reload`, so the new constructor code doesn't run until the `.base` file is reopened:

```bash
obsidian eval code="const l=app.workspace.getLeavesOfType('bases')[0]; const s=l.getViewState(); l.detach(); app.workspace.openLinkText(s.state.file,'',true)"
```

**Usage:**

```bash
# Set override (auto-renders immediately) — use local noon to avoid UTC-offset surprises
obsidian eval code="window.__cadenceDevDate = new Date('2025-05-19T12:00:00')"  # Monday
obsidian eval code="window.__cadenceDevDate = new Date('2025-05-23T12:00:00')"  # Friday

# Clear override (auto-renders back to real today)
obsidian eval code="window.__cadenceDevDate = undefined"

# Manual refresh fallback (if setter isn't active yet)
obsidian eval code="window.__cadenceRefresh()"
```

The override resets automatically when Obsidian restarts. It has no effect in production because nothing outside the dev workflow sets `window.__cadenceDevDate`.
