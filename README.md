# SiteAudit

[![Netlify Status](https://img.shields.io/badge/deploy-Netlify-00C7B7?style=flat-square&logo=netlify)](https://netlify.com)
[![Astro](https://img.shields.io/badge/Astro-static-BC52EE?style=flat-square&logo=astro)](https://astro.build)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**Planning Compliance Status Checker** — a static website for checking planning compliance status of buildings and sites across Malaysian states.

## Features

- **Multi-State Support** — select a state from the dropdown; data is separated per state file
- **Search & Filter** — real-time search by name/address with district, status, and category filters
- **Interactive Map** — Leaflet.js map with colour-coded clustered markers, auto-centers per state
- **Statistics Dashboard** — KPI cards, doughnut chart with datalabels, stacked bar chart by district/status, category and issue breakdowns via Chart.js
- **Dark Mode** — dark-first design with persistent light/dark toggle

## Tech Stack

| Layer         | Tool                          |
|---------------|-------------------------------|
| Framework     | [Astro](https://astro.build)  |
| CSS           | Tailwind CSS                  |
| Interactivity | Alpine.js (CDN)               |
| Map           | Leaflet.js + MarkerCluster    |
| Charts        | Chart.js                      |
| Data          | Static JSON (per state)       |
| Deploy        | Netlify                       |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install and Run

```bash
git clone <repo-url> && cd site-audit
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build for Production

```bash
npm run build
```

Output is written to `dist/`.

## Project Structure

```
site-audit/
├── public/data/states/
│   ├── kedah.json               # One file per state
│   └── ...                      # Add more states here
├── src/
│   ├── styles/global.css        # CSS custom properties, themes
│   ├── layouts/BaseLayout.astro # HTML shell, CDN scripts
│   ├── pages/index.astro        # Single page + Alpine store
│   └── components/
│       ├── Header.astro         # Logo, state selector, view tabs, dark toggle
│       ├── ViewSearch.astro     # Search bar + data table
│       ├── ViewMap.astro        # Leaflet map with markers
│       └── ViewStats.astro      # Chart.js statistics
├── astro.config.mjs
├── tailwind.config.cjs
├── netlify.toml
└── CLAUDE.md
```

## Contributing Data

Data is organized as **one JSON file per state** in `public/data/states/`.

### Option A: Add Locations to an Existing State

1. Fork this repository
2. Open `public/data/states/{state}.json`
3. Add a new entry to the `locations` array (total is auto-computed)
4. Submit a Pull Request

### Option B: Add a New State

1. Fork this repository
2. Create `public/data/states/{state-name}.json` using the schema below
3. No code changes needed — the state appears automatically in the dropdown
4. Submit a Pull Request

### State File Schema

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
      "name": "Site Name",
      "address": "Full address",
      "district": "District Name",
      "lat": 5.1234,
      "lng": 100.5678,
      "status": "illegal",
      "category": "general",
      "notes": "Additional context or '-' if none",
      "issues": ["no-lot"]
    }
  ]
}
```

### Meta Fields

| Field       | Type   | Required | Description                                   |
|-------------|--------|----------|-----------------------------------------------|
| `state`     | string | Yes      | State name (used as dropdown label and key)   |
| `generated` | string | Yes      | Date the data was generated (YYYY-MM-DD)      |
| `center`    | object | Yes      | Map center: `{ lat, lng, zoom }` for the state |

### Location Fields

| Field      | Type     | Required | Description                                      |
|------------|----------|----------|--------------------------------------------------|
| `id`       | number   | Yes      | Unique sequential ID (within this state file)    |
| `name`     | string   | Yes      | Name of the building or site                     |
| `address`  | string   | Yes      | Full address                                     |
| `district` | string   | Yes      | District name                                    |
| `lat`      | number   | Yes      | Latitude (decimal degrees)                       |
| `lng`      | number   | Yes      | Longitude (decimal degrees)                      |
| `status`   | string   | Yes      | One of: `illegal`, `possibly-illegal`, `legal`   |
| `category` | string   | Yes      | One of: `general`, `estate`, `residential`, `commercial`, `industrial`, `agricultural`, `government`, `reserve` |
| `notes`    | string   | Yes      | Context notes, use `"-"` if none                 |
| `issues`   | string[] | Yes      | Array of: `no-lot`, `wrong-zoning`, `restricted-area`, `other`. Use `[]` if none |

### Validation Checklist

Before submitting, ensure:

- [ ] `id` is unique and sequential within the state file
- [ ] `lat` and `lng` are valid coordinates within the state
- [ ] `status` is one of the three allowed values
- [ ] `category` is one of: `general`, `estate`, `residential`, `commercial`, `industrial`, `agricultural`, `government`, `reserve`
- [ ] `issues` only contains allowed values
- [ ] `meta.state` matches the filename (e.g. `kedah.json` has `"state": "Kedah"`)
- [ ] `meta.center` points to a sensible center of the state
- [ ] JSON is valid (no trailing commas, proper quoting)

### Currently Available States

- **Kedah** — 27 locations across 8 districts

## License

MIT
