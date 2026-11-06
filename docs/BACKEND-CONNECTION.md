# Supabase connection handoff

## Local setup

Create `.env.local` next to `package.json`, using these agreed variable names:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
```

Use the project root URL. A copied `/rest/v1/` URL is normalized by the client configuration. The ANON_KEY variable also accepts a modern `sb_publishable_...` key; keep the name to preserve the shared contract. Local configuration is ignored by Git and must be added separately on each computer.

Restart the dev server after changing configuration:

```powershell
npm.cmd run dev
```

For a read-only diagnostic, open a second terminal in the project folder:

```powershell
npm.cmd run backend:check
```

This counts visible records in the ten public dataset tables. It prints no credentials or record contents and makes no database writes. It does not verify private-data policies or authenticated workflows.

## Observed connection checks — 6 November 2026

- The user-supplied publishable key was accepted by the project's REST and Auth APIs.
- The JavaScript SDK queried all ten public dataset tables successfully: `places`, `transport_stops`, `transit_routes`, `transit_route_stops`, `transit_schedules`, `parking_locations`, `parking_status`, `shade_segments`, `demand_forecasts`, `data_sources`.
- All ten queries returned zero visible rows for the unsigned-in client. This may indicate empty tables or read policies that hide existing rows. It does **not** establish the total number of rows in the database.
- Email/password authentication is enabled and signup is enabled. Email confirmation is required. No account was created, no reset email was sent, and no authenticated workflow was tested.
- The final schema was received and all 15 table column probes now succeed. The TypeScript row types and explicit dataset selects match it. No timestamps are invented on stops, transit routes or parking locations; no validity dates, sources or demo flags are assumed on schedules. Shade levels are text, not measured percentages.
- Leaflet now displays database destinations, transit stops, parking and shade segments. Location search includes both places and stations. Demo rows are excluded unless explicitly included. Empty API results remain empty; local fixtures are never substituted for connected data.
- A bounded single-route transit MVP uses actual imported stop ordering and consecutive segment schedules. Results remain schematic approximations with no upcoming-departure claim. Waiting time, calendars, exact access paths, transfers, fares and shade matching are still blockers for verified journey planning.
- Administration access through the Supabase connector was unavailable. RLS policies, grants, actual private row counts, constraints and triggers were not inspected or modified. A successful public query does not certify RLS safety.
- The project URL and key are stored only in the session's ignored `.env.local`; no project-specific values are committed in this handoff.

## Teammate actions

1. Confirm actual nullability, foreign keys, defaults, unique constraints, schedule-day array conventions and shade label meanings. All supplied column names are now verified via read-only API probes.
2. Confirm the approved transport/place/parking/demand datasets are imported.
3. Inspect public read policies for the datasets. Expose only licensed, approved rows; do not broadly disable RLS to make records appear.
4. Check owner-only policies on `profiles`, `user_preferences`, and `saved_journeys`. Their public queries returned no rows during testing, which alone is not enough to prove their policies correct.
5. Allow local auth redirects to `http://localhost:3000/profile` and `http://localhost:3000/auth`, and confirm email delivery settings.
6. Test registration, email confirmation, login, password recovery, preferences and saved journeys using a consenting test user.

Real pedestrian routing still requires a GraphHopper provider. The new transit MVP is limited to imported single-route connections; it does not provide verified service calendars, transfers, shade matching, live parking or ride-hailing feeds.
