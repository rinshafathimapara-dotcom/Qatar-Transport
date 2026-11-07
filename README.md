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

- Home: choose Msheireb Downtown → Katara Cultural Village and Find my journey.
- Compare Fastest, Shortest, Most comfortable and Budget-friendly. Select a result for its legs and map geometry.
- Comfort: the illustrated gentler Metro option adds four minutes with synthetic 80% rather than 65% walking shade.
- Auth: Open demo profile. Save a journey from its detail panel; reopen or delete it in Saved journeys.
- Settings: save default priority, walking, sun, transit and budget preferences.
- Explore: filter dataset places and stops, click a marker, select origin/destination on the map.
- Parking: choose a destination and compare location proximity. No availability feed is simulated.
- Demand: sample forecasts have fixed timestamps and no invented live ride prices or driver counts.

Local demo profile and saved journeys are stored in this browser's localStorage. This is a testing convenience, not authentication. Signing out hides personal pages; starting the demo again reopens its local records. Browser storage is not suitable for sensitive data.

## Environment variables

| Name                            | Needed                | Purpose                                                                             |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | For real backend      | Project URL                                                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For real backend      | Public anon key; permissions come from RLS                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | No                    | Reserved contract name; deliberately unused. Never expose it in browser code.       |
| `GRAPHHOPPER_URL`               | Real walking          | Your licensed/self-hosted GraphHopper base URL, e.g. `https://routing.example.org/` |
| `GRAPHHOPPER_API_KEY`           | Provider dependent    | Server-only routing credential                                                      |
| `PHOTON_URL`                    | External place search | Approved/self-hosted Photon base URL                                                |
| `NEXT_PUBLIC_MAP_TILE_URL`      | Optional              | Approved raster tile template with `{z}/{x}/{y}`                                    |

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

## Providers and production boundaries

- `services/geo.ts`: replaceable geocoding and pedestrian-routing interfaces.
- `/api/geocode`: Photon adapter, debounced browser calls, cancellation and bounded 24-hour in-process cache. No external geocoding is called without an endpoint. Local dataset suggestions always work. Deploying later requires a shared cache, per-user rate limits, and a provider agreement; do not point at an unapproved public demo service.
- `/api/walk`: GraphHopper `foot` profile, unencoded geometry, server-only key, timeout and Qatar coordinate bounds. Verify your chosen instance has a true pedestrian profile and licensed Qatar data. It is not tested against a real provider.
- `services/planner.ts` and `services/transit.ts`: real mode uses the pedestrian provider when configured. The bounded transit MVP requires an active imported route, forward ordered stops within 1.5 km of the endpoints, and a schedule row for each consecutive segment. It labels routes as schematic approximations; sampled segment durations may come from different services and omit waiting time. Days, service calendars, access paths, transfers, fares and shade are not verified. No upcoming departure or complete routing engine is claimed. With neither a pedestrian route nor supported transit data, planning reports the blocker.
- Demo routes are bounded to four predefined places. Only the central–Katara demo pair includes the synthetic Metro corridor. Tram stops are discoverable, but no tram, bus, Metrolink or ride-hailing route is fabricated.
- Demo walking geometries are straight-line schematics. They are not safe navigation instructions. Comfort numbers and QAR 2 fare are labelled synthetic.
- Parking uses Haversine straight-line distance. Real walking geometry is available only through the configured pedestrian provider. No walking time is inferred from straight-line parking distance. Live spaces are shown only from a non-demo live status observed within five minutes. Other observations remain unverified; compare nearby alternatives when a full status is supplied.
- Demand forecasts come from the table or demo fixtures. Timestamps are shown in Qatar time. No live Uber integration exists.
- Balanced ranking uses a documented heuristic: minutes + 3 × walking kilometres + 5 × transfers. Backend `balanced`, `fastest`, and `cheapest` map into the existing UI controls. Only default priority affects ranking. The other saved preferences are advisory until provider coverage supports hard constraints.

## Dashboard video

The first dashboard uses the user-supplied eight-second city clip as a decorative background. The local H.264 MP4 is compressed to about 2.6 MB, has no audio, and loops while visible. The video stays at full brightness across the hero, with no fade or tint overlay. White headings and supporting text use text shadows for readability; the journey form retains its solid white surface. A pause/play button lets users stop the motion. Playback pauses offscreen and in hidden tabs. Reduced-motion or data-saving settings use a still poster without loading the video. Media errors also fall back to the poster. Other application pages do not load this background.

## Maps, photos and UI licences

The map uses Leaflet 1.9.4. Places, transport stops, parking and shade segments come from Supabase. Places and station names both populate location search. Connected mode excludes demo rows by default; use **Include demo records** explicitly. Join records inherit inclusion from parent routes and stops.

Default tiles use OpenStreetMap standard raster tiles with visible attribution. For local evaluation only; review https://operations.osmfoundation.org/policies/tiles/ before wider use and choose a suitable commercial or self-hosted tile provider. OSM tiles require Internet access. No tiles are prefetched or scraped.

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
