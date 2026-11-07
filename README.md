# Smarter Qatar

A local Next.js mobility prototype with an explicit demo dataset and Supabase integration boundaries. Nothing has been deployed or published.

## Open in VS Code and run

Requires Node.js 22.12+ (Node 24 also supported) and npm.

1. Download or clone this whole folder, then choose **File → Open Folder** in VS Code.
2. Open the VS Code terminal in the project folder.
3. Run:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell use `Copy-Item .env.example .env.local` instead of `cp`.
Open http://localhost:3000. No environment values are needed for demo mode.

```sh
npm run typecheck
npm test
npm run build
npm start
```

The development server is for local development. Do not expose it publicly.

## Try the demo

- Home: try Msheireb Downtown → Museum of Islamic Art for a road-following walking route, or Msheireb → Katara for the demo Metro comparison. Metro sample durations are synthetic, with no official departure claim.
- Compare Fastest, Shortest, Most comfortable and Budget-friendly. Select a result for its legs and map geometry.
- Comfort: walking uses the mapped street/path network. Preview the City Center indoor-choice concept; hypothetical doors are labelled and never inserted into live navigation. No shade or heat-protection percentage is invented.
- Auth: Open demo profile. Save a journey from its detail panel; reopen or delete it in Saved journeys.
- Settings: save default priority, walking, sun, transit and budget preferences.
- Explore: filter dataset places and stops, click a marker, select origin/destination on the map.
- Parking: choose a destination and compare location proximity. No availability feed is simulated.
- Demand: sample forecasts have fixed timestamps and no invented live ride prices or driver counts.

Local demo profile and saved journeys are stored in this browser's localStorage. This is a testing convenience, not authentication. Signing out hides personal pages; starting the demo again reopens its local records. Browser storage is not suitable for sensitive data.

## Environment variables

| Name                            | Needed                | Purpose                                                                                                           |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | For real backend      | Project URL                                                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For real backend      | Public anon key; permissions come from RLS                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | No                    | Reserved contract name; deliberately unused. Never expose it in browser code.                                     |
| `GRAPHHOPPER_URL`               | Real walking          | Optional override of the bundled local walking network: GraphHopper base URL, e.g. `https://routing.example.org/` |
| `GRAPHHOPPER_API_KEY`           | Provider dependent    | Server-only routing credential                                                                                    |
| `PHOTON_URL`                    | External place search | Approved/self-hosted Photon base URL                                                                              |
| `NEXT_PUBLIC_CARTO_MAPS_KEY`    | Optional override     | CARTO browser key; leave blank for no-signup OpenFreeMap                                                          |
| `NEXT_PUBLIC_MAP_TILE_URL`      | Optional alternative  | Authorized raster template with `{z}/{x}/{y}`                                                                     |
| `NEXT_PUBLIC_MAP_ATTRIBUTION`   | With custom template  | Required custom-provider credit                                                                                   |

Both public Supabase values activate connected mode. Connected data errors are displayed; the application never silently substitutes demo fixtures for failed Supabase reads. Restart Next.js after changing environment variables.

See [the connection check and teammate handoff](docs/BACKEND-CONNECTION.md) for the tested backend state and Windows setup instructions.

## Backend handoff

The final 15-table contract, including `admin_users`, is represented in `src/types/database.ts` and `src/data/backend-contract.json`. No `created_at` is expected on stops, transit routes or parking locations. Schedules contain only the eight supplied columns; shade levels are text. Array element semantics, nullability, constraints and defaults still need generated database types or administrative verification. No schema was changed remotely. `admin_users` is typed but never read by the public application or used for client-side authorization.

Required for the connected app:

- Public read access (with licence-appropriate RLS policies) for `places`, `transport_stops`, `transit_routes`, `transit_route_stops`, `transit_schedules`, `parking_locations`, `parking_status`, `shade_segments`, `demand_forecasts`, `data_sources`.
- `profiles`, `user_preferences` and `saved_journeys`: RLS must restrict reads and writes to the owner. Profile ownership uses `id = auth.uid()`; preferences/journeys use `user_id = auth.uid()`. UPDATE needs SELECT, USING and WITH CHECK policies. DELETE also needs ownership checks.
- Grant only required Data API access, not blanket access. New tables may require explicit API grants in current Supabase settings.
- UUID/default creation timestamps on inserted records; unique `profiles.id`; ideally unique `user_preferences.user_id`.
- Email/password auth, confirmed-email URLs and password-reset redirect allowlist for `http://localhost:3000/auth` and `/profile`. Configure SMTP for reliable email delivery.
- A profile creation trigger is optional; the settings screen can upsert a profile. Registration stores the name in auth metadata only; this is not used for authorization.
- `dataset_imports` has types but is intentionally not queried from the public app. No backend RPC or Edge Function is currently required.
- Keep restricted census data private; do not grant it public reads. Only expose imported rows after permission/licence review.

The browser client uses only public keys. The request-scoped server helper validates a bearer token through `getUser` and uses the same user's permissions. It does not use the service role. Protected personal screens are client-session gated; database RLS is the actual security boundary.

Dataset reads currently cap each table at 2,000 rows. Add paginated/windowed queries for larger imports. Shade label meanings, confidence units and schedule-day array conventions need semantic documentation. The supplied backend has now been queried read-only; see docs/BACKEND-CONNECTION.md for schema differences and zero-visible-row results.

## Walking navigation and indoor decisions

See [walking navigation](docs/WALKING-NAVIGATION.md) and [routing data provenance/licence](data/routing/README.md). The companion supports opt-in browser GPS with a moving accuracy circle, follow/pan controls and explicit rerouting. Reviewed indoor passages can expose entrance/exit decision points and recalculate inside/outside alternatives. The current reviewed registry is empty; the real City Center outline is used for a clearly labelled hypothetical-door concept simulation, isolated from live navigation. No shared Supabase tables were changed.

## Providers and production boundaries

- `services/geo.ts`: replaceable geocoding and pedestrian-routing interfaces.
- `/api/geocode`: Photon adapter, debounced browser calls, cancellation and bounded 24-hour in-process cache. No external geocoding is called without an endpoint. Local dataset suggestions always work. Deploying later requires a shared cache, per-user rate limits, and a provider agreement; do not point at an unapproved public demo service.
- `/api/walk`: by default searches the bundled ODbL Doha pedestrian graph locally on the Node server. No routing account, API key, contact email or third-party request is required. The pilot network is a dated snapshot, not a complete live navigation service. It estimates time at 75 m/min and reports endpoint snapping. Optional GraphHopper `foot` remains a server-keyed override; it currently rejects building-exclusion requests rather than claiming unsupported indoor detours.
- `/api/transit-shape`: uses actual mapped OSM Metro/tram relation members to produce a track-aligned shape for a supported imported line/station sequence. Unknown/ambiguous geometry remains unavailable. It supplies no operating schedule.
- `services/planner.ts` and `services/transit.ts`: all walking legs are routed, never invented straight connectors. Transit candidates still require imported active routes, stop links and duration samples; waiting time, live operation and service calendars are unverified. Colour categories distinguish walking, rail, bus/tram and reviewed indoor paths.
- The bundled walking pilot covers central Doha, including mapped paths toward Katara/Lusail within its published bounds. Imported disconnected/out-of-area points receive an unavailable state. The demo Red corridor uses corrected OSM station positions with explicit synthetic duration samples. No official Qatar-wide transit network or live ride-hailing integration is claimed.
- The previous straight-line demo geometry has been removed. Even sample endpoints use road-following walking calculations. Synthetic Metro sample durations remain explicitly marked; fares and shade are unknown. Older saved snapshots with unverified geometry are not drawn—replan them.
- Parking uses Haversine straight-line distance. Real walking geometry uses the bundled Doha network by default, with optional provider overrides. No walking time is inferred from straight-line parking distance. Live spaces are shown only from a non-demo live status observed within five minutes. Other observations remain unverified; compare nearby alternatives when a full status is supplied.
- Demand forecasts come from the table or demo fixtures. Timestamps are shown in Qatar time. No live Uber integration exists.
- Balanced ranking uses a documented heuristic: minutes + 3 × walking kilometres + 5 × transfers. Backend `balanced`, `fastest`, and `cheapest` map into the existing UI controls. Only default priority affects ranking. The other saved preferences are advisory until provider coverage supports hard constraints.

## Dashboard video

The first dashboard uses the user-supplied eight-second city clip as a decorative background. The local H.264 MP4 is compressed to about 2.6 MB, has no audio, and loops while visible. The video stays at full brightness across the hero, with no fade or tint overlay. White headings and supporting text use text shadows for readability; the journey form retains its solid white surface. A pause/play button lets users stop the motion. Playback pauses offscreen and in hidden tabs. Reduced-motion or data-saving settings use a still poster without loading the video. Media errors also fall back to the poster. Other application pages do not load this background.

## Maps, photos and UI licences

The map uses Leaflet 1.9.4. Its vector worker is served locally and kept in sync with the pinned MapLibre package by `scripts/sync-map-worker.mjs` (automatically before dev/build). Places, transport stops, parking and shade segments come from Supabase. Places and station names both populate location search. Connected mode excludes demo rows by default; use **Include demo records** explicitly. Join records inherit inclusion from parent routes and stops.

The default street map is **OpenFreeMap**, whose public service requires no signup or API key. Its vector background is rendered through the official MapLibre–Leaflet adapter; Leaflet still owns the location markers, route lines and interactions. Required OpenFreeMap, OpenMapTiles and OpenStreetMap attribution is visible. See [map setup](docs/MAP-SETUP.md). No OSM community tile-server workaround is used.

Optional CARTO or authorized custom raster overrides remain available through environment variables. Leave all map-provider variables blank to use the no-signup default. If the renderer, network or WebGL fails, the app shows a clear error and retains dataset markers on a neutral background. The public service has no SLA; self-hosting or another authorized provider remains an option for production.

Photo: **Doha skyline**, Haakon S. Krohn (4 March 2013), https://commons.wikimedia.org/wiki/File:Doha_skyline.jpg, **CC BY-SA 3.0**, https://creativecommons.org/licenses/by-sa/3.0/. The skyline image remains available as an original project asset; the dashboard now uses the user-provided clip and its derived poster. The downloaded image retains that licence; any adapted image must preserve its share-alike terms. Photo attribution is visible in Explore → data information.

StatsCounter and StaggerText are adapted from Ashutoshx7/VengeanceUI under MIT; full notice is in `docs/VENGEANCEUI-LICENSE.txt`. Their `framer-motion` imports were adapted to the compatible `motion/react` API, and reduced-motion support was added. The supplied image-collage registry URL returned HTTP 404, so the original collage was implemented locally; it has now been replaced by the dashboard video background. No shadcn CLI scaffold was needed. Lucide icons and motion are installed directly; Tailwind 4 is configured via PostCSS.

## Validation and limitations

Dependency installation, strict TypeScript, Next.js production build and planner tests were run successfully. The tests cover demo ranking, unsupported location pairs, no invented transit on short routes and same-location rejection. See `docs/VALIDATION.md` for scope. Browser preview QA was unavailable because this environment did not expose the required Sites browser tool; responsive styles and interactions have not been visually verified. Public Supabase dataset queries and authentication settings have been verified with the supplied publishable key. Authenticated flows, database administration/RLS and provider routes still need separate end-to-end checks.

## GitHub (after reviewing locally)

The project source is available at https://github.com/rinshafathimapara-dotcom/Qatar-Transport on the main branch. Clone this repository to open it in VS Code. `.gitignore` excludes environment files, dependencies and build output. Inspect staged files before future pushes.

To clone and open the existing repository:

```sh
git clone https://github.com/rinshafathimapara-dotcom/Qatar-Transport.git
cd Qatar-Transport
code .
```

For future changes, after reviewing staged files:

```sh
git add .
git commit -m "Update Smarter Qatar"
git push
```

Never commit `.env.local` or service-role keys. Pushing source to GitHub does not require deploying the application.

### Interactive walking presentation

Open **Walking experience** (`/walk`, with `/demo` retained as an alias) and tap the walking line to enter the eye-level scene. It pauses for the mall entrance choice, continues through an illustrative indoor corridor or around outside, and returns to the map. See [the walking-view guide](docs/WALKING-VIEW.md). Real route planning retains the maximum 20-minute walking budget; optional **Follow my location** GPS tracking is separate from the simulated scene.

### Shade overlay and comparison

Open **Comfortable routes** (`/comfort`) to compare supplied Supabase shade corridors. Click a corridor to preview its linked segments, or plan a road-following journey. Use **Hide/Show shade overlay** to toggle shade categories. The data-view control switches between all dataset records and records not flagged illustrative. Route cards distinguish categorical spatial matches from numeric synthetic-model percentages. See [shade integration and the backend handoff](docs/SHADE-INTEGRATION.md) for calculation details and remaining verified-data requirements.

The journey planner (`/plan`) now uses an original AI-generated Doha-inspired sunset background, stored locally at `public/images/planner-sunset.jpg`. It is decorative artwork, not geographic data. The home video is preserved.

### v3 city information

Open **City conditions** (`/conditions`) for the connected weather/heat references, accessibility, traffic, vehicle snapshots and historical journey metrics. The planner also offers the weather selector. **Comfortable routes** now loads `shade_demo_routes` and joins its ordered segment IDs to the existing shade table; the earlier missing-table message is obsolete. Source/status badges follow backend provenance. See [the v3 integration report](docs/BACKEND-V3.md) for observed columns, public query checks and the remaining RLS/provenance confirmations.

### Eye-level walking

Click a walking line on a journey map to open the new first-person walking scene. Or open **Walking experience** (`/walk`) for the City Center approach, mall decision, indoor corridor and exit flow. Generated gray buildings and shadow shapes illustrate the walk; a compact simulation label distinguishes it from GPS or street imagery. Weather/heat references now load independently and also appear beside the map. See [walking-view instructions](docs/WALKING-VIEW.md).
