# Validation record

- Dependencies installed with npm; lockfile included.
- `npm run typecheck`: passed.
- `npm run build`: passed with all App Router pages compiled. No deployment.
- `npm test`: passed. Planner assertions cover labelled synthetic results, cost/comfort/time ranking, a 4-minute comfort difference, unsupported-pair rejection, same-point rejection and no invented transit for short pairs.
- Browser QA: not run. The required `cua_repl.js` browser tool was unavailable; no alternate browser-control path or preview server was started.
- Authentication/RLS: implemented, not exercised against a project; no credentials supplied.
- Real geocoder/routing: implemented adapter endpoints, not exercised against configured providers.
- Maps: MapLibre compiled; OSM attribution configured. Tile access, mobile layout and marker interaction need browser verification.
- Demo save/reopen/delete: implemented with localStorage and route handoff; not browser-tested.
- No fake live metrics: demo counts derive from actual fixtures, routes and forecasts explicitly labelled, no availability counts in demo.
- External VengeanceUI collage URL: returned HTTP 404. Local replacement implemented. Counter and stagger definitions inspected/adapted with MIT notice.
- Image: Qatar skyline downloaded and Wikimedia licence/author checked.
- No remote database writes, deployment or repository creation. Source connected to the user-supplied empty Qatar-Transport repository.
