# SiteAudit — CLAUDE.md

> Read this file in full before making any changes.

---

## Project Overview

**SiteAudit** is a static website for checking planning compliance status of buildings and sites.
Deployed on Netlify. Data is loaded from a static JSON file. No backend, no database.

---

## Tech Stack

| Layer         | Tool                          | Version     |
|---------------|-------------------------------|-------------|
| Framework     | Astro                         | latest      |
| CSS           | Tailwind CSS                  | latest      |
| Interactivity | Alpine.js                     | v3.x (CDN)  |
| Map           | Leaflet.js                    | v1.9 (CDN)  |
| Charts        | Chart.js                      | v4.x (CDN)  |
| Data          | JSON (static file)            | —           |
| Deploy        | Netlify                       | —           |
| Fonts         | Google Fonts (Syne + DM Mono) | —           |

---

## Project Structure

```
site-audit/
├── public/
│   └── data/
│       └── locations.json        ← all location data
├── src/
│   ├── styles/
│   │   └── global.css            ← CSS custom properties, scrollbar, base styles
│   ├── layouts/
│   │   └── BaseLayout.astro      ← html shell, meta tags, dark mode root
│   ├── pages/
│   │   └── index.astro           ← single page, injects JSON into Alpine store
│   └── components/
│       ├── Header.astro          ← logo, view tabs, dark mode toggle
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

File: `public/data/locations.json`

```json
{
  "meta": {
    "title": "Planning Compliance Status Check",
    "region": "Kedah",
    "total": 27,
    "generated": "2025-01-01"
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
      "issues": ["no-lot"]
    }
  ]
}
```

**Status values:** `illegal` | `possibly-illegal` | `legal`
**Category values:** `general` | `estate`
**Issues values (array, multiple allowed):** `no-lot` | `wrong-zoning` | `restricted-area` | `other`

---

## Alpine.js Store

Inject JSON into the Alpine store in `index.astro`. All views share the same store.

```js
// Pattern in index.astro
---
import data from '../public/data/locations.json'
---

<script define:vars={{ data }}>
  document.addEventListener('alpine:init', () => {
    Alpine.store('audit', {
      locations: data.locations,
      meta: data.meta,
      activeView: 'search',   // 'search' | 'map' | 'stats'
      dark: true,
      search: '',
      filterDistrict: 'all',
      filterStatus: 'all',
      filterCategory: 'all',

      get filtered() {
        return this.locations.filter(l => {
          const q = this.search.toLowerCase()
          const matchQ = !q || l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
          const matchD = this.filterDistrict === 'all' || l.district === this.filterDistrict
          const matchS = this.filterStatus === 'all' || l.status === this.filterStatus
          const matchC = this.filterCategory === 'all' || l.category === this.filterCategory
          return matchQ && matchD && matchS && matchC
        })
      },

      get districts() {
        return [...new Set(this.locations.map(l => l.district))].sort()
      },

      get stats() {
        const total = this.locations.length
        const byStatus = this.locations.reduce((a, l) => {
          a[l.status] = (a[l.status] || 0) + 1; return a
        }, {})
        const byDistrict = this.locations.reduce((a, l) => {
          a[l.district] = (a[l.district] || 0) + 1; return a
        }, {})
        const byCategory = this.locations.reduce((a, l) => {
          a[l.category] = (a[l.category] || 0) + 1; return a
        }, {})
        return { total, byStatus, byDistrict, byCategory }
      },

      toggleDark() {
        this.dark = !this.dark
        document.documentElement.dataset.dark = this.dark
        localStorage.setItem('site-audit-dark', this.dark)
      }
    })
  })
</script>
```

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
- Tile layer: OpenStreetMap
- Colour-coded markers by status: red / orange / green
- Popup on marker click: name, address, status badge, coordinates
- Marker clustering for dense areas (Leaflet.markercluster via CDN)
- Mini filter bar above map (filter by status)
- Map must reinitialise when view becomes active — use Alpine `$watch('$store.audit.activeView', ...)`

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
- Doughnut chart — status breakdown
- Bar chart — count by district
- Issue breakdown cards — Estate, Wrong Zoning, No Lot, Others
- All charts must be destroyed and rebuilt when dark mode is toggled or view is switched

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
- **Display font:** Syne — used for headers, logo, KPI numbers
- **Body / mono font:** DM Mono — used for table content, labels, coordinates
- **Aesthetic:** Dark-first, industrial/utilitarian, data-dense but clean
- **Logo:** `🏛️` emoji + "SiteAudit" wordmark in Syne bold

---

## Status Badge Classes

| Status           | Dark mode                         | Light mode                       |
|------------------|-----------------------------------|----------------------------------|
| illegal          | `bg-red-900 text-red-300`         | `bg-red-100 text-red-700`        |
| possibly-illegal | `bg-orange-900 text-orange-300`   | `bg-orange-100 text-orange-700`  |
| legal            | `bg-green-900 text-green-300`     | `bg-green-100 text-green-700`    |

---

## Ground Rules

1. **Never hardcode data inside components** — all data comes from `locations.json` via Alpine store
2. **Static output only** — `output: 'static'` in Astro config, no SSR
3. **Alpine.js via CDN** — load in `BaseLayout.astro` `<head>`, do not npm install
4. **Leaflet via CDN** — initialise map inside `x-init`, always ensure div has explicit height
5. **Chart.js via CDN** — always destroy existing chart instances before rebuilding
6. **No React or Vue** — Alpine.js only for all interactivity
7. **Single page app** — all views live in `index.astro`, toggled via `activeView` in the store
8. **Mobile responsive** — table scrolls horizontally on mobile, map is full width

---

## Initial Setup

```bash
npm create astro@latest site-audit -- --template minimal
cd site-audit
npx astro add tailwind
npm install
```

Then scaffold the folder structure above, copy `locations.json` into `public/data/`, and build components one at a time.
