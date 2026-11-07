# Shade integration and backend handoff

## What is implemented

The existing Leaflet map has a shade overlay toggle, high/medium/low/unknown colours, source popups, explicit synthetic labels, and shade information on walking paths. Journey cards show the fraction of walking geometry matched to high-shade observations and the fraction with any known categorical observation. `Most comfortable` ranks by matched high-shade fraction. Where observations exist, the bundled pedestrian graph can calculate a shade-priority alternative using connected OSM edges; total walking remains capped at the user's limit (maximum 20 minutes). Additional walking minutes are shown.

The `/comfort` page also contains a local presentation: a 9-minute standard walk and 14-minute alternative between Msheireb and Souq. Both geometries were calculated from the bundled pedestrian graph. Their shade labels are deliberately synthetic. An API check also found an 11-minute weighted alternative to the 9-minute standard route using those categorical observations. This is a heuristic preference, not a maximum-shade guarantee. The local fixture is separate from Supabase and never inserted into backend tables.

The four supplied files were adapted to the existing imperative Leaflet integration. No second map framework, react-leaflet dependency, or blocked OSM raster tile source was added. The optional `demo_shade_routes` integration is isolated in `services/shade-demo.ts`, validated before rendering, and requested only when the user presses Load. It does not alter the agreed 15-table database types or schema. Supplied concept geometry is visible only when explicitly selected as a labelled presentation; it is not treated as verified road routing.

## Calculation and limits

Geometry uses `[longitude, latitude]`. Walking geometry is subdivided into samples at most 8 metres long. Samples match observations within 5 metres, within their longitudinal extent, and with orientation differing by no more than 15 degrees. This is a conservative spatial estimate, not a validated survey or guaranteed match to a particular footway. Nearby parallel paths remain ambiguous without network edge IDs. Crossings alone do not match. Duplicate observations never double-count distance; equally close conflicts prefer lower shade.

Matched high-shade distance / total walking distance gives **high-label path coverage**, not measured shaded area. Unknown lengths remain in the denominator and are not described as exposed/no-shade.

Numeric shade percentages are shown only when numeric-model observations cover the entirety of the walking geometry. Currently only the explicit synthetic model supplies numeric weights: high 85%, medium 50%, low 15%. These are presentation assumptions, not measured values. Coverage is the sum of (sample length × model fraction) divided by total walking length, rounded to a whole percent. Incomplete coverage or non-demo categorical observations produce an unknown numeric result.

Shade-aware graph costs use high=1, medium=2, low/unknown=3, length-weighted along each edge. This ranks a bounded heuristic tradeoff; it does not claim a mathematically maximum-shade path or heat safety. Distances and walking time are calculated from the chosen physical path, not weighted cost. The optional GraphHopper adapter reports shade weighting unsupported instead of fabricating it.

## Backend check in this implementation

Read-only public queries succeeded: 120 places, 101 stops, 20 routes, 132 route-stop links, 1,724 schedules, 50 parking locations, 50 parking status rows, 317 shade segments, 408 forecasts, and 6 sources.

For places, transport_stops and shade_segments, zero rows with `is_demo=false` were visible. The app hides synthetic records by default; **Include demo records** intentionally exposes them. Do not change those flags merely to make them appear verified.

The optional `demo_shade_routes` query returned `PGRST205` (table missing from the exposed schema cache). Its absence does not prevent the local presentation, normal map or journey planner from working.

The existing shade table has exactly the eight agreed columns. It does not provide numeric shade coverage, observation times, time windows, explicit validation status or network linkage. No schema or RLS changes were made. Public reads do not establish private-user RLS correctness or the existence of database-enforced foreign keys.

## Message to the backend teammate

Please provide the final shade API/schema contract before we query additional columns. We need a licensed pedestrian-network edge ID or GeoJSON LineString for each observation; numeric shade fraction (0–1) or percent with an explicit convention; observation/calculation timestamp; methodology and source; verified/estimated/synthetic status; applicable Qatar local-time window and validity period. Explain how shade records join to pedestrian edges and how unknown coverage is represented. Please provide request/response/error examples for geographically bounded overlay retrieval, segment-weighted route coverage and shade-priority routing if those operations are implemented. Include permission/licence status.

The frontend currently uses the existing shade_segments fields safely. Please do not mark synthetic records as non-demo. If you intend us to use the uploaded demo_shade_routes extension, provide/create that table with the exact uploaded contract and suitable read policies, and document whether its geometry/percentages are synthetic. We will validate and load it independently.

Numeric verified routing remains blocked until this contract and reliable supporting data are supplied. Indoor GPS, mall access and shade/heat observations require separate field validation.
