# Fare and distance integration

## How to use it

Open Plan a journey. Select places, choose Travel class / Rail ticket / Payment type, and press Find my journey. Fares appear on the existing route cards and in a breakdown above the map. Ticket settings recalculate displayed prices without requesting another route. The expandable settings include optional card purchase, fare-day journey count, a seven-day ticket comparison, and taxi tariff assumptions.

- Standard/Family single reference: QAR 2; Gold Metro: QAR 10. Day passes QAR 6 / QAR 30. Standard weekly QAR 40; no Gold weekly or Tram Gold product is assumed.
- Walking: QAR 0, explicitly no transport fare. Missing bus/provider fares remain unavailable rather than zero.
- All amounts are formatted as QAR with two decimal places. Invalid values render an unavailable state.
- A new reusable card is an optional separate purchase (QAR 10 / QAR 100), never added to every journey. If a new card is selected, previous card journeys are not assumed to carry a daily cap onto it.
- Reusable cards use the supplied same-class fare-day journey count to calculate incremental capped debit (Standard QAR 6 / Gold QAR 30). The zero debit after reaching a cap is explained, not treated as missing data.
- The ticket-plan recommendation compares pay-as-you-go, day passes and eligible weekly products for stated journeys/day and 1–7 days. Its projected total is not charged on every journey.
- Published/reference and indicative prices carry different status labels. Budget sorting prioritises known published/free components before indicative estimates; unknown totals are not declared cheapest. Card purchases are displayed separately from fare comparison.

## Sources and verification

All rates and source metadata are in `src/data/qatarTransportFares.ts`.

### Rail

The team supplied the Qatar Rail policy dated 2024-08-05:
https://www.qr.com.qa/media/Qatar%20Rail%20Fares%20Policy%20-%20ENG%20-%2005-08-2024.pdf

Retrieval attempts during this implementation returned an upstream timeout/503. Accordingly these are labelled **published fare references**, with a source note that current validity could not be independently reverified. This is not a claim of a confirmed live/current tariff. Standard/Family and Gold products, daily caps, 02:59 day-pass boundary, seven-day weekly period and tap-in/out rules follow the supplied policy description.

Metro–Tram interchange uses one fare only with explicit application-layer proof: previous leg index, verified interchange eligibility, nonnegative elapsed time <=30 minutes, a Qatar Rail source URL and only walking legs between the two rail legs. Unknown/ineligible interchange receives separate conservative journey charges and an explanation; it is not silently discounted. This does not fabricate a Metro–Tram route connection. The current transit planner still uses a bounded single-route connection; route-engine support/data are needed to emit verified transfer metadata in real results.

### Bus

https://hukoomi.gov.qa/en/services/karwa-smart-card-for-using-public-bus-services

The government reference/search index supports the card-product references. The live page's parsed body did not expose the full fee content, so current applicability/conditions remain unconfirmed. Classic QAR 30, Limited QAR 10 / two journeys and Unlimited QAR 20 / 24 hours are separate ticket references, not invented per-trip fares. Ordinary bus fare remains unavailable.

Metrolink is free only if the actual leg includes explicit eligible-service provenance with an official source URL. A name containing Metrolink or a route-code pattern is not enough. The existing imported table fields do not provide this explicit eligibility metadata, so no new database column or blanket free-bus rule was introduced.

### Taxi and ride-hailing

The Ministry PDF was retrieved and its text inspected:
https://www.mot.gov.qa/sites/default/files/2025-02/VOLUME%201_%20English_1.pdf

It provides historical transport context; the inspected text did not establish the full supplied meter tariff. The supplied tariff assumptions are therefore **indicative**, not an official verified current tariff. The linked July 2026 guide explicitly cautions that a complete current Mowasalat public tariff is unavailable:
https://www.qatarliving.com/en/article/karwa-taxi-ride-hailing-qatar-options-apps-costs

Taxi formula: max(QAR 10 minimum, selected flag fall + routed road kilometres × selected rate), plus only user-selected waiting blocks and telephone fees. City flag fall QAR 4, airport pickup QAR 25 (replacement, not additive), day QAR 1.60/km, night/outside QAR 1.90/km. Reference day/night boundaries 04:00 / 23:00 Qatar time are configurable, not claimed verified 2026 boundaries. Waiting is explicitly selected whole 15-minute blocks at a QAR 8 reference; no billing-rounding rule or congestion delay is inferred. Optional phone references are QAR 5 within Doha / QAR 8 to HIA. Incompatible selections produce an explanation rather than silently combining fees.

The Ministry list identifies authorised app services:
https://www.mot.gov.qa/en/announcement/announcement-official-list-authorized-ride-hailing-companies-qatar

Uber, Badrgo and Ryde show **Live fare unavailable — check the provider's app**. No provider quote integration is configured and Karwa rates are never reused for them.

## One source of route distance

Walking and transit continue to use the existing planner. Rail uses ticket rules independent of kilometres. Historical average_cost_qar is not a current fare and is not substituted.

Taxi is an optional additional route in that same planner, using `/api/drive`. The same driving adapter result supplies the journey distance, taxi leg, map geometry, fare formula and comparison. Walking/straight-line distances are not used as road distance.

Configure a licensed/self-hosted GraphHopper car router in `.env.local`:

```dotenv
DRIVING_GRAPHHOPPER_URL=https://your-authorized-graphhopper-server/
DRIVING_GRAPHHOPPER_API_KEY=your-server-only-key-if-required
DRIVING_GRAPHHOPPER_PROFILE=car
```

No provider is configured in the current workspace. The API and UI therefore show an unavailable taxi estimate. No public routing demo server is silently used. Obvious foot/bike profiles are rejected for taxi distance. The driving key remains server-only. Driving duration comes from the same route response; selected waiting time is added once to total journey duration.

## Existing transit data

Public Supabase queries for all 16 datasets still succeed. No schema, RLS, staging table or user data was changed.

The imported schedule rows currently lack days_of_week. This previously filtered every row out. Valid stop-pair departure/arrival differences can now support **static duration estimates**, with a missing-calendar warning. They do not establish active dates, a guaranteed service, or an upcoming departure. Missing forward links/schedule durations are still rejected, reverse service is not invented, and actual pedestrian access still must fit the maximum 20-minute budget.

## Files

Inspected: planner.ts, transit.ts, geo.ts, types/database.ts, mobility-app.tsx, map.tsx, data.ts, records.ts, Supabase configuration, the route APIs, existing fare placeholders and tests.

Created:
- src/data/qatarTransportFares.ts
- src/types/fares.ts
- src/services/fares.ts
- src/services/driving.ts
- src/app/api/drive/route.ts
- src/components/fare-settings.tsx
- src/components/fare-details.tsx
- src/components/transport-fare-options.tsx
- tests/fares.test.ts and tests/driving.test.ts

Modified: src/types/database.ts (application types only), src/services/planner.ts, src/services/transit.ts, src/components/mobility-app.tsx, src/components/map.tsx, src/app/globals.css, .env.example, tests/transit.test.ts and documentation.

## Validation and remaining work

Tests cover Standard/Family/Gold, Tram, day/weekly passes, cards, daily caps, valid/invalid/unknown interchange, ordinary bus/eligible Metrolink, 8km daytime/night/outside/airport taxi cases, minimum and optional charges, missing/invalid/non-driving distance, missing route data, ticket recommendations, shared driving distance and missing-provider behaviour. Browser validation covers price visibility, class/pass changes, mobile/desktop layout and no undefined/NaN prices.

Remaining external dependencies: reverify the current Qatar Rail policy; confirm bus/optional taxi tariffs; configure a driving router for actual taxi route estimates; add authorised quote integrations for other providers if desired; supply service calendars/verified interchange and Metrolink eligibility for operational transit claims. No new fare table, migration or service-role key is needed.
