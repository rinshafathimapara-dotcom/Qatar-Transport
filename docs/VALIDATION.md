# Validation record

- Dependencies installed with npm; lockfile included.
- `npm run typecheck`: passed.
- `npm run build`: passed with all App Router pages compiled. No deployment.
- `npm test`: passed. Planner assertions cover labelled synthetic results, cost/comfort/time ranking, a 4-minute comfort difference, unsupported-pair rejection, same-point rejection and no invented transit for short pairs.
- Browser QA: not run. The required `cua_repl.js` browser tool was unavailable; no alternate browser-control path or preview server was started.
- Supabase connection: public SDK queries succeeded for all ten dataset tables using the supplied publishable key; each returned zero visible rows. Auth settings verified; no account created. Authenticated flows and actual RLS policies remain unverified. See BACKEND-CONNECTION.md.
- Real geocoder/routing: implemented adapter endpoints, not exercised against configured providers.
- Maps: Leaflet replaces MapLibre; OSM attribution and database marker/shade layers configured. Tile access, mobile layout and marker interaction need browser verification.
- Demo save/reopen/delete: implemented with localStorage and route handoff; not browser-tested.
- No fake live metrics: demo counts derive from actual fixtures, routes and forecasts explicitly labelled, no availability counts in demo.
- External VengeanceUI collage URL: returned HTTP 404. Local replacement implemented. Counter and stagger definitions inspected/adapted with MIT notice.
- Image: Qatar skyline downloaded and Wikimedia licence/author checked.
- No remote database writes, deployment or repository creation. Application source pushed successfully to the user-supplied Qatar-Transport repository on main after GitHub access was updated. No application deployment.

- Connection configuration checks: REST URL normalization, whitespace handling, incomplete configuration errors and invalid URL rejection covered by automated tests. No keys committed.

- Final schema: all 15 exact column probes succeeded. All ten public dataset queries still returned zero visible rows. No database writes or policy changes.
- Transit MVP tests cover required schedules, forward-only edges, duplicate sequence rejection, no fabricated reverse service and backend priority mappings.

## Dashboard video update

- Uploaded video optimized locally to H.264, 1280 × 720, approximately 7.92 seconds and 2.6 MB. Audio removed; MP4 fast-start metadata enabled.
- TypeScript and production build passed after integration.
- First-dashboard-only component supports pause/play, poster fallback, reduced-motion and save-data preferences, offscreen pausing and hidden-tab pausing.
- Browser QA attempted via managed preview; `sites-preview start` failed with `preview relay unavailable: No such file or directory`. No browser playback or visual verification is claimed for this update.

- Dashboard styling update: removed desktop and mobile fade overlays completely. White hero text uses text shadows over the unobscured clip; form inputs retain their existing opaque card. No new browser verification for this styling update.

## Blocked basemap correction

- Removed the direct OpenStreetMap community tile-server default after the user observed access-blocked tiles.
- Added explicit CARTO key configuration and required provider attribution. In that version, no key meant no third-party tile request; the subsequent no-signup update below supersedes that default.
- Failed layers stop requesting tiles; manual Retry is available. Configuration tests, TypeScript and production build pass.
- CARTO's current documentation and key page were read; no live CARTO tile success is claimed without a configured key. See MAP-SETUP.md.

## No-signup basemap update

- OpenFreeMap is now the default. Its official website, quick-start guide and terms were checked; no account or API key is required for its public service.
- Leaflet remains the application map. MapLibre GL JS 5.24.0 and the official Leaflet adapter 0.1.4 render its vector background, with mandatory source attribution.
- A live isolated Chromium smoke test rendered Doha through the installed Leaflet/MapLibre adapter. The map reported `loaded: true`, `tilesLoaded: true`, and no map errors; its screenshot was visually inspected. This verifies the provider/adapter, not a complete browser regression of the Next.js app.
- The application's production build, TypeScript and configuration tests pass. WebGL2 failure shows an unavailable state while retaining data markers.
- Optional licensed raster/CARTO configurations remain supported. No request goes to the previously blocked OSM raster service.

## Road-following walking, GPS and indoor decisions

- Built a bundled ODbL central-Doha pedestrian graph from the Qatar OSM extract, with original-node topology and no synthetic cross-water links. Source/coverage/rebuild/licence notes are in data/routing/README.md.
- Actual local engine tests: Msheireb → Museum roughly 1,952 m / 141 coordinates / 27 estimated minutes; Souq roughly 664 m / 46 coordinates. These are snapshot routing estimates, not live conditions.
- Extracted 17 OSM rail-relation graphs. A supported Red Line shape returned more than 80 coordinates and about 10 km of mapped track, separately from sample timetables.
- Unit/API checks cover connected paths, no fabricated fallback, polygon avoidance, oneway foot restrictions, invalid endpoints, actual walking/rail responses, GPS geofence accuracy/freshness, Qatar hours, expired/demo access rejection and both indoor choices.
- An isolated browser harness rendered the actual WalkingAssistant component with mocked browser GPS. Start tracking, receiving a fix, Stop tracking, and through/around concept choices passed without page errors. This is not physical-device GPS or a complete application browser regression.
- TypeScript, automated tests and the production build pass. Replan old saved snapshots; unverified geometry is hidden.
- The live reviewed-passage registry is empty. No hypothetical doors are offered to a real GPS user. The City Center demo uses a real OSM footprint with explicitly hypothetical access points and circulation.
- No heat-protection, exact Google Maps parity, live service or error-free navigation guarantee is made. GPS, indoor access and OSM completeness remain practical limitations.

- Final visual/UI pass removed an over-broad SVG rule in the indoor concept panel. Map worker loading is now explicit and version-matched, synced from the installed MapLibre package by predev/prebuild; its upstream licence is included.

## Walking presentation update

- All nine test files passed, including walking-budget rejection, combined transit access/egress limits and simulation pause/branch/arrival transitions.
- Production `next build` compiled and checked TypeScript successfully.
- Actual production-app Chromium run completed both indoor and outdoor presentation journeys; no JavaScript page errors. The E? marker opened the branch choices.
- Fresh-build mobile check at 390×844: no horizontal overflow, 380px map, one-column layout, no page errors. Embedded MP4 metadata loaded (81.4 seconds).
- All ten application pages returned HTTP 200, including `/demo`.
- Recording: `public/videos/walking-journey-demo.mp4`, ~2.75 MB. This is a simulated presentation, not field validation.
- Real GPS accuracy, indoor access and positioning have not been field-tested. The live reviewed-passage registry remains empty. Supabase data and RLS were not changed by this update.

## Shade integration and planner artwork update

- Public Supabase reads succeeded for all ten shared dataset tables. 317 shade records are visible; none are visible with `is_demo=false`. Places and stops also have zero visible non-demo rows. This is reflected in the data-view messaging and explicit demo toggle.
- Optional `demo_shade_routes` returned `PGRST205`; the UI explains this and retains the working local presentation.
- Tests cover distance-weighted shade modelling, unknown/categorical-only coverage, crossings, duplicate/conflicting observations, synthetic-route validation, weighted graph distance and walking-budget preservation.
- Production-app browser checks passed: local alternative selection, shade-overlay toggle, optional-table error handling, generated planner background, desktop and 390px mobile layouts without horizontal overflow. No JavaScript page errors were reported.
- Actual `/api/walk` check: standard route 9 minutes / 664 m; shade-weighted alternative 11 minutes / 801 m using the synthetic fixture on the connected OSM graph. No invented straight-line connection was used.
- No backend writes, migrations, RLS changes, private-data changes or deployment were performed. Verified numeric shade coverage, survey validation and time-dependent shade remain unavailable.

## v3 integration checks

- All 16 explicit public dataset selects succeeded against the current Supabase project, including the six new v3 tables and the expanded schedule fields.
- Visible ID joins had zero unresolved route/stop, schedule/stop, parking/status, weather/source and accessibility/source references. All 20 shade-corridor rows resolved their segment IDs.
- Pagination tests cover retrieval of 1,724 rows, duplicate IDs, failures and page-limit exhaustion. Status tests cover conflicting source metadata and null metrics. Corridor tests cover the v3 contract, missing segments, independent geometry across gaps and walking-budget enforcement. Weather weighting tests cover valid and invalid multipliers.
- Management schema/RLS access was denied and the OpenAPI schema endpoint returned 401. Catalog constraints and authenticated/private write policies are not certified. No schema/RLS changes or test writes were made.
- The production browser passed weather reference selection (41°C / feels-like 45°C high-heat scenario), actual v3 corridor selection with 92.5% supplied coverage, disabled live GPS on corridor previews, and accessibility/traffic/vehicle map toggles. All selected data was fetched from Supabase, without mocked database responses.
- Desktop (1440px), tablet (1024px), and mobile (390px) layout checks passed with no horizontal overflow. No JavaScript page errors were reported. A loading race was fixed: corridor preview controls wait until their referenced shade segments have loaded.
- All 12 test files passed and the production build compiled with TypeScript checks.
