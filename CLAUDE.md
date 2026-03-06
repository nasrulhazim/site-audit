# SiteAudit — CLAUDE.md

> Read this file in full before making any changes.

---

## Project Overview

**SiteAudit** is a static website for checking planning compliance status of buildings and sites.
Deployed on Netlify. Data is loaded from static JSON files (one per state). No backend, no database.

---

## Tech Stack

| Layer         | Tool                          | Version     |
|---------------|-------------------------------|-------------|
| Framework     | Astro                         | latest      |
| CSS           | Tailwind CSS                  | latest      |
| Interactivity | Alpine.js                     | v3.x (CDN)  |
| Map           | Leaflet.js                    | v1.9 (CDN)  |
| Charts        | Chart.js                      | v4.x (CDN)  |
| Data          | JSON (per-state static files) | —           |
| Deploy        | Netlify                       | —           |
| Fonts         | Google Fonts (Syne + DM Mono) | —           |

---

## Project Structure

```
site-audit/
├── public/
│   └── data/
│       └── states/
│           ├── kedah.json        ← one file per state
│           └── ...               ← add more states here
├── src/
│   ├── styles/
│   │   └── global.css            ← CSS custom properties, scrollbar, base styles
│   ├── layouts/
│   │   └── BaseLayout.astro      ← html shell, meta tags, dark mode root
│   ├── pages/
│   │   └── index.astro           ← single page, glob-imports all state JSONs
│   └── components/
│       ├── Header.astro          ← logo, state selector, view tabs, dark mode toggle
│       ├── ViewSearch.astro      ← view: search bar + data table
│       ├── ViewMap.astro         ← view: Leaflet map with markers
│       └── ViewStats.astro       ← view: Chart.js statistics dashboard
├── netlify.toml
├── astro.config.mjs
├── tailwind.config.cjs
└── CLAUDE.md
```

---

## Data Schema

Each state has its own file: `public/data/states/{state-name}.json`

All state files are **glob-imported at build time** in `index.astro` via `import.meta.glob`. Total count is auto-computed from `locations.length` — never stored in meta.

```json
{
  "meta": {
    "state": "Kedah",
    "generated": "2025-01-01",
    "center": { "lat": 5.8, "lng": 100.5, "zoom": 9 }
  },
  "locations": [
    {
      "id": 1,
      "name": "Kuil Hindu (Tanpa Nama)",
      "address": "Pejabat Hutan Pahau, Kulim",
      "district": "Kulim",
      "lat": 5.3905825,
      "lng": 100.6991191,
      "status": "illegal",
      "category": "general",
      "notes": "-",
      "issues": ["no-lot"],
      "links": [
        { "url": "https://www.facebook.com/example/posts/123", "label": "FB Post" }
      ]
    }
  ]
}
```

**Meta fields:**
- `state` — state name, used as key for state selector
- `generated` — date the data was generated
- `center` — map center coordinates and zoom level for this state

**Status values:** `illegal` | `possibly-illegal` | `legal`
**Category values:** `general` | `estate` | `residential` | `commercial` | `industrial` | `agricultural` | `government` | `reserve`
**Issues values (array, multiple allowed):** `no-lot` | `wrong-zoning` | `restricted-area` | `other`
**Links (optional array):** `[{ "url": "https://...", "label": "FB Post" }]` — social media or reference links. Platform auto-detected from URL (FB, X, IG, TikTok, YT). `label` is optional.

### Adding a New State

1. Create `public/data/states/{state-name}.json` following the schema above
2. Set `meta.center` to the geographic center of the state with appropriate zoom
3. Build — the state automatically appears in the dropdown (no code changes needed)

---

## Alpine.js Store

Glob-import all state JSON files and inject into the Alpine store in `index.astro`. All views share the same store. Switching `activeState` updates `locations`, `meta`, filters, and map center.

Key store properties:
- `_stateMap` — lookup object `{ "Kedah": { meta, locations }, ... }`
- `stateNames` — sorted array of available state names
- `activeState` — currently selected state
- `switchState(state)` — changes state + resets all filters
- `locations` / `meta` — computed getters from `activeState`
- `stats.total` — auto-computed from `locations.length`

---

## Views

### 1. ViewSearch (default view)

- Real-time search bar — filters by name and address
- Dropdown filters — District, Status, Category
- Record count badge
- Table columns: No, Name, Address, District, Category, Status, Issues, Coordinates
- Colour-coded status badges: red (illegal), orange (possibly illegal), green (legal)
- Row hover highlight
- Empty state when no results found

### 2. ViewMap

- Leaflet.js fullscreen map
- Tile layer: OpenStreetMap (light) / CartoDB dark_all (dark mode)
- Colour-coded markers by status: red / orange / green
- Popup on marker click: name, address, status badge, coordinates
- Marker clustering for dense areas (Leaflet.markercluster via CDN)
- Mini filter bar above map (filter by status)
- Map must reinitialise when view becomes active — use Alpine `$watch('$store.audit.activeView', ...)`
- Map re-centers when `activeState` changes — reads `meta.center` for lat/lng/zoom

```js
// Safe map init pattern — ensure div has height before init
// Always call map.invalidateSize() after view switch
x-init="
  $watch('$store.audit.activeView', val => {
    if (val === 'map') {
      $nextTick(() => { map.invalidateSize() })
    }
  })
"
```

### 3. ViewStats

- KPI cards: Total Sites, Illegal, Possibly Illegal, Districts Affected
- Doughnut chart — status breakdown (with datalabels showing value + percentage)
- Stacked bar chart — count by district, split by status colour (red/orange/green)
- Category breakdown cards (dynamic from data)
- Issue breakdown cards — No Lot, Wrong Zoning, Restricted Area, Others
- Charts use `chartjs-plugin-datalabels` CDN for inline labels
- All charts must be destroyed and rebuilt when dark mode is toggled, view is switched, or state changes

---

## Dark Mode

- **Default: dark**
- Toggle button in Header component
- Uses CSS custom properties (`--bg`, `--surface`, `--border`, etc.)
- Applied via `data-dark="true"` on the `<html>` element
- Alpine store `toggleDark()` updates both `dataset.dark` and `localStorage`
- Persist preference to `localStorage` key `site-audit-dark`

```html
<!-- In BaseLayout.astro <head> — prevents flash of wrong theme -->
<script>
  const saved = localStorage.getItem('site-audit-dark')
  document.documentElement.dataset.dark = saved !== null ? saved : 'true'
</script>
```

---

## CSS Variables

File: `src/styles/global.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');

:root {
  --bg:        #f1f5f9;
  --surface:   #ffffff;
  --surface2:  #f8fafc;
  --border:    #e2e8f0;
  --text:      #0f172a;
  --muted:     #64748b;
  --subtle:    #94a3b8;
  --thead:     #f1f5f9;
  --row-hover: #eff6ff;
  --input-bg:  #f8fafc;
  --hdr-from:  #e2e8f0;
  --hdr-to:    #f1f5f9;
  --grid:      #e2e8f0;
  --scroll:    #cbd5e1;
}

[data-dark="true"] {
  --bg:        #0f172a;
  --surface:   #1e293b;
  --surface2:  #0f172a;
  --border:    #334155;
  --text:      #e2e8f0;
  --muted:     #94a3b8;
  --subtle:    #64748b;
  --thead:     #0f172a;
  --row-hover: #1e3a5f;
  --input-bg:  #0f172a;
  --hdr-from:  #1e293b;
  --hdr-to:    #0f172a;
  --grid:      #334155;
  --scroll:    #475569;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: 'DM Mono', monospace;
  background: var(--bg);
  color: var(--text);
  transition: background .25s, color .2s;
}

::-webkit-scrollbar       { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: var(--surface); }
::-webkit-scrollbar-thumb { background: var(--scroll); border-radius: 3px; }
```

---

## Tailwind Config

```js
// tailwind.config.cjs
module.exports = {
  content: ['./src/**/*.{astro,html,js}'],
  theme: {
    extend: {
      fontFamily: {
        mono:    ['"DM Mono"', 'monospace'],
        display: ['Syne', 'sans-serif'],
      }
    }
  },
  plugins: []
}
```

---

## Astro Config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
})
```

---

## netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Branding & Design

- **Name:** SiteAudit
- **Tagline:** Planning Compliance Status Checker
- **Primary colour:** `#3b82f6` (blue-500)
- **Display font:** Syne — used for logo wordmark only (via SVG)
- **Body / mono font:** DM Mono — used for everything: table content, labels, KPI numbers, coordinates
- **Aesthetic:** Dark-first, industrial/utilitarian, data-dense but clean
- **Logo:** SVG wordmark files (`/logo-dark.svg`, `/logo-light.svg`) — lowercase "siteaudit" in Syne 800. Use `<img>` tags, never recreate in HTML/CSS
- **Brand palette:** Slate 900 `#0f172a`, Slate 800 `#1e293b`, Blue 500 `#3b82f6`, Cyan 500 `#06b6d4`, Slate 200 `#e2e8f0`, Slate 400 `#94a3b8`

---

## Status Badge Classes

| Status           | Dark mode                         | Light mode                       |
|------------------|-----------------------------------|----------------------------------|
| illegal          | `bg-red-900 text-red-300`         | `bg-red-100 text-red-700`        |
| possibly-illegal | `bg-orange-900 text-orange-300`   | `bg-orange-100 text-orange-700`  |
| legal            | `bg-green-900 text-green-300`     | `bg-green-100 text-green-700`    |

---

## Ground Rules

1. **Never hardcode data inside components** — all data comes from per-state JSON files via Alpine store
2. **Static output only** — `output: 'static'` in Astro config, no SSR
3. **Alpine.js via CDN** — load in `BaseLayout.astro` `<head>`, do not npm install
4. **Leaflet via CDN** — initialise map inside `x-init`, always ensure div has explicit height
5. **Chart.js via CDN** — always destroy existing chart instances before rebuilding. Uses `chartjs-plugin-datalabels` for inline labels
6. **No React or Vue** — Alpine.js only for all interactivity
7. **Single page app** — all views live in `index.astro`, toggled via `activeView` in the store
8. **Mobile responsive** — table scrolls horizontally on mobile, map is full width

---

## DO / DON'T

- ✅ DO use the existing SVG files (`/logo-dark.svg`, `/logo-light.svg`) via `<img>` tags
- ❌ DON'T recreate logo in HTML/CSS — always reference the SVG assets
- ✅ DO use DM Mono for KPI numbers and all body text
- ❌ DON'T use `font-display` (Syne) for numbers — renders condensed
- ✅ DO use `x-show` for chart containers (canvas stays in DOM)
- ❌ DON'T use `x-if` for Chart.js canvases — destroys/recreates elements causing timing issues
- ❌ DON'T use `animation: false` on Chart.js — causes charts to render off-center/wrong size
- ✅ DO destroy charts immediately in watcher, then rebuild via `setTimeout(100)` after `x-show` repaints
- ❌ DON'T modify files in `tinker/` unless explicitly asked
- ✅ DO use `is:inline` on CDN `<script>` tags — prevents Astro from reordering/bundling them
- ✅ DO use `.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')` for Title Case in Alpine `<option>` elements (CSS `capitalize` doesn't work on `<option>`)

---

## Gotchas

> **Gotcha:** Chart.js + Alpine.js `x-show` timing — when a parent has `x-show`, the canvas
> may have zero dimensions when `$nextTick` fires. Use `setTimeout(100)` after `$nextTick` to
> wait for browser repaint. Always call `destroyCharts()` immediately (not inside setTimeout)
> to prevent "Canvas is already in use" errors.

> **Gotcha:** Astro reorders and bundles `<script>` tags by default. CDN scripts that depend
> on load order (Leaflet → MarkerCluster → Chart.js) must use `is:inline` to prevent this.
> Without it, `L is not defined` errors occur.

> **Gotcha:** CSS `text-transform: capitalize` (Tailwind's `capitalize` class) does not work
> on `<option>` elements in most browsers. Must use JavaScript string transformation in Alpine
> `:x-text` bindings instead.

---

## Initial Setup

```bash
npm create astro@latest site-audit -- --template minimal
cd site-audit
npx astro add tailwind
npm install
```

Then scaffold the folder structure above, add state JSON files into `public/data/states/`, and build components one at a time.
