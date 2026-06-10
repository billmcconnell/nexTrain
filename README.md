# nexTrain

MBTA real-time arrivals app. Search any MBTA station and see upcoming departures grouped by route and direction, with live occupancy indicators, service alerts, and auto-refresh.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS**
- **MBTA API v3** — `api-v3.mbta.com`
- **Vitest** for unit tests

## Features

### Stop search
Searches parent stations (`location_type=1`) across subway, light rail, and commuter rail. Results are ranked by exact match first, then prefix match, then alphabetical.

### Real-time predictions
Fetches predictions with vehicle and route included in a single API call. Filters out `CANCELLED`, `SKIPPED`, and `NO_DATA` schedule relationships, drops predictions more than 90 seconds in the past, and caps each direction group at 4 upcoming trips. Grouped by route + direction, sorted rail-before-bus then by route name.

### Service alerts
Fetches active alerts (`NEW`, `ONGOING`, `ONGOING_UPCOMING`) for the selected stop. Alerts that reference a specific route are shown inline on the matching route card; stop-scoped alerts (no route in `informed_entity`) appear as a banner above all cards.

### Car occupancy indicators
Each prediction row shows a row of colored dots — one per car — sourced from `vehicle.attributes.carriages[].occupancy_status`:

| Dot | Status |
|---|---|
| Green ● | `MANY_SEATS_AVAILABLE` |
| Yellow ● | `FEW_SEATS_AVAILABLE` |
| Orange ● | `STANDING_ROOM_ONLY` |
| Empty ○ | `NO_DATA_AVAILABLE` |

**MBTA API occupancy support by mode:**

| Mode | Support |
|---|---|
| Orange / Red / Blue / Green Line | Per-car dots via `carriages[]`; Orange Line confirmed live |
| Bus | Single dot per vehicle via top-level `occupancy_status` |
| Commuter Rail | Not supported — API always returns `null` / `[]` |

When a vehicle has no carriage-level data, the component falls back to the vehicle-level `occupancy_status` as a single dot (covers buses). When no occupancy data exists at all, nothing is shown.

### Auto-refresh
Client component polls the predictions API every 30 seconds and re-renders silently.

## Project structure

```
app/
  page.tsx                  # Server component — renders search form + board
  api/
    stops/route.ts          # GET /api/stops?q=… — stop search
    predictions/route.ts    # GET /api/predictions?stop=… — predictions + alerts
components/
  SearchForm.tsx            # Client — search input + URL state
  PredictionBoard.tsx       # Prediction cards + occupancy dots
  AutoRefresh.tsx           # Client — 30s polling
lib/
  mbta.ts                   # All MBTA API calls
  types.ts                  # Shared TypeScript types
  alerts.ts                 # Alert parsing + filtering logic
  alerts.test.ts            # Vitest unit tests for alert logic
```

## Development

```bash
pnpm dev       # start dev server at http://localhost:3000
pnpm test      # run Vitest unit tests
pnpm build     # production build
```

### MBTA API key

The app works without a key (public rate limit applies). To use a key:

```bash
echo "MBTA_API_KEY=your_key_here" > .env.local
```

Keys are free at [api-v3.mbta.com](https://api-v3.mbta.com).
