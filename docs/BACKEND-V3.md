# v3 frontend integration

The frontend uses the existing Supabase project, its publishable browser key and the tables actually returned by its public data API. No table replacement, schema migration, RLS edit, secret-key use or deployment was performed.

## Observed contract

The exact explicit select lists are in `src/data/backend-contract.json`. The six newly connected tables are:

| Table | Fields consumed |
| --- | --- |
| shade_demo_routes | id, route_name, corridor_group, optimization_profile, total_walking_distance_m, estimated_walking_duration_min, shade_coverage_percent, shaded_distance_m, exposed_distance_m, segment_ids, is_demo, created_at |
| weather_conditions | id, scenario_name, district, temperature_c, feels_like_c, humidity_percent, uv_index, weather_condition, heat_stress_level, shade_weight_multiplier, recorded_at, data_source_id, is_demo |
| accessibility_features | id, feature_name, feature_type, district, latitude, longitude, is_step_free, notes, data_source_id, is_demo |
| real_time_vehicle_telemetry | id, vehicle_id, line_name, previous_stop, next_stop, latitude, longitude, speed_kmh, passenger_occupancy_percent, service_status, last_updated, is_demo, note |
| traffic_incidents | id, incident_code, location_description, latitude, longitude, traffic_condition, description, recorded_at, is_demo |
| historical_journey_analytics | id, journey_profile, average_duration_min, average_cost_qar, average_walking_km, average_comfort_score_out_of_100, journey_success_rate_percent, sample_size_count, is_demo |

`transit_schedules` additionally returns valid_from, valid_until, source and is_demo; days_of_week is nullable. Missing calendar information is not invented. The current bounded transit planner still requires usable route/stop relationships and calendar-bearing schedule rows.

The prior uploaded `demo_shade_routes` contract is superseded. The actual table is **shade_demo_routes**, and its segment_ids join to shade_segments.id. There is no geometry column in this table. All 20 observed route rows resolve their segment references.

Types for newly observed nullable values are conservative application types. Catalog-level column types, defaults, constraints and RLS settings could not be inspected through the management account (permission denied), and the OpenAPI schema endpoint returned 401. Columns and value shapes were inspected through authorized public SELECTs. A catalog export from the backend teammate is still needed to certify exact database nullability/types and constraints.

## Behaviour

- `/conditions`: weather/reference selector, temperatures, feels-like, UV, humidity, heat stress, accessibility, traffic reports, vehicle snapshots and journey history. Source details are expandable; records carry compact status badges. Lists offer Show all rather than presenting every record at once.
- Home and planner: weather/heat reference panel. The supplied shade_weight_multiplier affects the next shade-priority route request; it does not measure individual heat exposure. Walking is still limited to 20 minutes or the user's smaller budget.
- `/comfort`: automatically fetched v3 corridor comparisons, start-area and route-priority filters, time differences, shade percentage, shaded/exposed metres, and linked segment previews. Metrics are labelled dataset-summary estimates, not recomputed numeric segment fractions (the current segment table still has categorical labels only).
- Map: shade, accessibility, traffic and vehicle layer controls. Vehicle locations are timestamped snapshots, never called a live feed merely because the table name contains real_time.
- Corridor segments are rendered individually. Missing connections are never bridged with invented lines; corridor previews cannot start GPS navigation. Use the normal pedestrian planner for road-following GPS journeys.
- Data is fetched with stable 500-row pagination and ID deduplication. This retrieves all 1,724 schedule records instead of silently accepting the API row cap.
- All publicly readable dataset records are shown by default, including labelled illustrative rows. The data-view toggle can exclude is_demo=true records. No records are silently relabelled or replaced.
- Existing auth, saved journeys and preferences remain in place; no privileged client is introduced.

## Public read verification

| Dataset | Public rows |
| --- | ---: |
| Places / stops / transit routes | 120 / 101 / 20 |
| Route-stop links / schedules | 132 / 1,724 |
| Shade segments / shade routes | 317 / 20 |
| Parking locations / status | 50 / 50 |
| Forecasts / sources | 408 / 6 |
| Weather / accessibility | 4 / 10 |
| Vehicle snapshots / traffic reports / history | 18 / 10 / 10 |

All 16 explicit public dataset queries succeeded. Relationship checks found zero unresolved route-stop, schedule-stop, parking-status, weather-source or accessibility-source references among visible rows. This establishes visible relationship consistency, not the existence of enforced foreign-key constraints.

## Provenance and what the backend teammate should confirm

At inspection time every visible place, stop, transit route, shade segment, shade corridor, parking row, forecast, accessibility record, vehicle snapshot, traffic report and history row was flagged is_demo=true. One weather row was is_demo=false; its linked source description still explicitly identifies the dataset as illustrative/reference scenarios. Source metadata includes phrases such as “DEMO DATASET”, “synthetic” and “simulated”. The frontend therefore keeps concise Illustrative/Reference status and expandable sources. Old warnings that the shade route table is missing were removed because the correct table now exists.

If the team has completed surveys or verified imports, the backend owner should reconcile provenance fields with that evidence: genuine source URL, collection method, observation/calculation time, licence, validation status and applicable date/time windows. Correct is_demo where supported by that evidence. Research/reference data should not be described as live telemetry or measured current weather without an actual feed.

Please also provide a read-only catalog export of:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

The connected management tool cannot inspect this project. No private-user records were read, no test writes were made, and authenticated ownership/write policies were not certified. The frontend respects the existing policies and sends no service-role key.
