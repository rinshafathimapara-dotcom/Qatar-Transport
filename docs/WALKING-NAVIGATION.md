# Road-following walking and indoor decisions

## Try the working features

1. Pull main and start the app. No new account, API key, contact email or external routing service is required.
2. Plan **Msheireb Downtown → Museum of Islamic Art**. The bundled snapshot returns roughly **1.95 km**, about **27 estimated minutes**, and more than **140 path coordinates**. This replaces the previous straight line across the waterfront.
3. Walking is green, Metro coral, bus blue, tram amber, reviewed indoor walking purple. Metro/tram geometry is drawn only when an actual OSM rail relation supports the imported line and station sequence. Unknown segment geometry is hidden; stops remain visible. Replan older saved journey snapshots to obtain new geometry.
4. Click **Start live location**, allow browser location, and keep the HTTPS preview open. A blue dot and accuracy circle update from browser GPS. Dragging the map disables follow; use **Follow my location** to resume. **Stop location** clears the watch. Tracking also stops when the companion unmounts. It is foreground browser tracking, not a native background navigation service.
5. **Replan from my location** is explicit; GPS readings do not continuously trigger route requests. The bundled route calculation runs on this app's server. If an optional external provider is configured, route endpoints go to that provider.
6. Click **Preview the indoor-choice concept**, then **Simulate reaching the pause point**. At the real mapped City Center Doha footprint, choose **Go through · demo** or **Go around · demo**. The illustration changes branch and shows hypothetical entry/exit markers. This simulation does not modify a navigable journey or claim real doors.

## Reviewed live indoor shortcuts

The live workflow is implemented, but the supplied backend schema has no table for verified mall access paths. No shared table or column was added. `src/data/indoor-passages.json` is an explicit empty registry awaiting reviewed records; the adapter/validation lives in `services/navigation.ts`. This can later be fed by a separately agreed backend contract.

Record format:

```typescript
type IndoorPassage = {
  id: string;
  name: string;
  entry: { id: string; name: string; latitude: number; longitude: number };
  exit: { id: string; name: string; latitude: number; longitude: number };
  coordinates: [number, number][]; // reviewed indoor path, longitude then latitude
  footprint: [number, number][]; // closed building ring
  schedule: { days: number[]; opens: string; closes: string }[];
  source: string;
  verifiedAt: string; // ISO date/time of review
  validUntil: string; // supplied expiry of access review
  publicAccess: boolean;
  airConditioned: boolean; // confirmed by reviewer, not a temperature measurement
  isDemo: false;
  notes: string;
};
```

Schedule days use Sunday=0 through Saturday=6, Qatar time, `HH:MM`. Overnight windows are supported; equal open/close times explicitly mean a 24-hour window on the listed day. Holiday exceptions and unusual closures need records updated/reviewed. The UI says **expected open from supplied hours**, never live guaranteed access. Validation rejects hypothetical/demo records, out-of-Qatar coordinates, missing provenance/review periods, mismatched path ends and unclosed footprints.

Only records matching a routed walking leg are offered. A decision auto-opens when a fresh GPS fix (under 15 seconds old, accuracy at most 30 m) plus its uncertainty radius fits within 40 m of the entrance. This reduces false triggers; it does not prove a person has reached a doorway. Users can preview the decision point manually as well.

- **Go through** reroutes the outdoor approaches and inserts only the reviewed interior geometry, with separate entrance/exit instructions. If a mapped approach is over 20 m from the reviewed doorway, the shortcut is refused instead of bridging the gap with a made-up line.
- **Go around** requests a new road/path route with the reviewed building footprint excluded. The optional GraphHopper adapter currently rejects polygon avoidance rather than claiming support it does not implement; the bundled graph supports it.
- **Keep current route** dismisses the prompt and prevents repeated automatic reopening for that record during the session.

GPS can be inaccurate or fail indoors; users must check the named entrances, access signs, opening conditions and accessibility. Shaded/indoor walking can improve comfort, but the app does not guarantee protection from heat or calculate measured heat exposure. Unknown shade remains unknown; the old synthetic 65%/80% comfort numbers have been removed.

## Routing boundaries

The bundled graph is a **central Doha pilot**, not a full Qatar/Google Maps replacement. It is a fixed OSM snapshot, with no live traffic, closures or access updates. See `data/routing/README.md` for bounds, licence and rebuild steps. Supported sample endpoints can still snap tens of metres to the nearest mapped public path; that distance is shown, not hidden. GPS readings themselves are not shifted to make them appear on the route.

The existing `GRAPHHOPPER_URL` / server-only `GRAPHHOPPER_API_KEY` configuration remains an optional provider override. The default local graph does not call the public FOSSGIS router evaluated during development, so there is no new public-service routing quota, account or contact-email requirement. OpenFreeMap basemap tiles still need an Internet connection and WebGL2.

Transit candidates still require imported active routes, ordered links, stops and sample schedules. Mapped rail shapes do not prove service is running. Bus geometry with no validated shape is not fabricated by running a walking router along a guessed bus corridor.
