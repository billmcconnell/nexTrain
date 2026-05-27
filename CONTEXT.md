# nexTrain — Domain Context

## What this is

nexTrain helps MBTA riders find out when the next train or bus will arrive at the stop nearest to them. Given a user's location, it identifies the closest stop, surfaces upcoming arrivals in each direction, and enriches that data with vehicle details (occupancy, car count) where the MBTA API provides them.

The app has two interface flavors:
- **Web** — a location-aware page showing next arrivals
- **Conversational** — a bot reachable via iMessage, Telegram, or similar messaging platforms; the user sends their location and desired direction and gets a plain-language reply

## Domain terms

**Stop** — a physical location where riders board or exit. The MBTA API calls these `stops`. Every stop belongs to one or more routes and has arrivals in one or two directions. Prefer "stop" over "station" in code and output; use "station" only when referring to a named complex (e.g. "Park Street Station") in user-facing text.

**Route** — a named service path (e.g. Red Line, 39 Bus). Routes have a `mode` (see below). The MBTA API resource is `routes`.

**Mode** — the type of transit. MBTA modes: `subway` (heavy rail), `light_rail`, `bus`, `commuter_rail`, `ferry`. Vehicle-level detail (car count, occupancy) is only available for subway and commuter rail.

**Direction** — each route has two directions, identified by a `direction_id` (0 or 1) and a human label set per route (e.g. "Inbound / Outbound" or "Northbound / Southbound"). Always display the label, never the raw id.

**Prediction** — a real-time estimated arrival or departure time for a specific trip at a specific stop. The MBTA API resource is `predictions`. Prefer predictions over schedules when available; fall back to `schedules` when no real-time data exists.

**Schedule** — a static timetable arrival/departure. Use only as a fallback when no prediction exists for a trip.

**Trip** — a single run of a vehicle along a route in one direction. A prediction always belongs to a trip.

**Vehicle** — the physical train or bus serving a trip. The MBTA API resource is `vehicles`. Carries optional attributes:
- `occupancy_status` — crowding level (e.g. `MANY_SEATS_AVAILABLE`, `FEW_SEATS_AVAILABLE`, `FULL`). Only present when the vehicle reports it.
- `carriages` — list of individual cars on a train, each with its own occupancy. Use carriage count as "number of cars". Only present for multi-car consists (subway, commuter rail).

**Alert** — service notice affecting a route, stop, or trip. Surface alerts that affect the user's stop or route alongside arrival predictions.

**Nearest stop** — the stop with the shortest straight-line distance to the user's reported location, filtered to a relevant mode or route when the user specifies one. Ties broken by distance; present the closest match.

**User location** — in the initial build, location is supplied manually (typed address, stop name, or coordinates). Automatic device geolocation (browser Geolocation API, iOS/Android location sharing) is a planned future enhancement — design data flows so the location source is swappable without restructuring the rest of the app.

**Conversational interface** — the messaging-bot flavor of the app. User sends location (and optionally a direction or route preference); bot replies in plain language. Keep replies concise — one arrival per direction, occupancy note if crowded, alert summary if active.

## MBTA API

Base URL and full documentation are at the MBTA's public developer portal. Authentication requires an API key passed as `x-api-key` header or `api_key` query param.

Key endpoints used:
- `GET /stops` — find stops by location (`filter[latitude]`, `filter[longitude]`, `filter[radius]`)
- `GET /predictions` — real-time arrivals (`filter[stop]`, `filter[route]`, `filter[direction_id]`)
- `GET /vehicles` — vehicle details (`filter[trip]` or `filter[route]`)
- `GET /schedules` — static fallback (`filter[stop]`, `filter[route]`)
- `GET /alerts` — active alerts (`filter[stop]`, `filter[route]`)
- `GET /routes` — route metadata including direction labels

## What we avoid

- Don't call schedules "predictions" — they are different data sources with different freshness.
- Don't surface raw `direction_id` integers to users; always resolve to the route's direction label.
- Don't show vehicle details (cars, occupancy) for bus routes — the data isn't available and the concept doesn't apply.
