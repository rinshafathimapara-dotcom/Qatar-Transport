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
- Added explicit CARTO key configuration and required provider attribution. No key means no third-party tile request; dataset markers remain on a clearly labelled neutral background.
- Failed layers stop requesting tiles; manual Retry is available. Configuration tests, TypeScript and production build pass.
- CARTO's current documentation and key page were read; no live CARTO tile success is claimed without a configured key. See MAP-SETUP.md.
