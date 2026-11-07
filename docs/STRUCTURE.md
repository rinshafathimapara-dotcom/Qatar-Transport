# Complete source file structure

```text
smarter-qatar/
  .env.example
  .gitignore
  README.md
  data/routing/README.md
  data/routing/doha-walking.json.gz
  data/routing/qatar-rail.json.gz
  docs/BACKEND-CONNECTION.md
  docs/MAP-SETUP.md
  docs/STRUCTURE.md
  docs/VALIDATION.md
  docs/VENGEANCEUI-LICENSE.txt
  docs/WALKING-NAVIGATION.md
  next-env.d.ts
  next.config.ts
  package-lock.json
  package.json
  postcss.config.mjs
  public/images/dashboard-city-poster.jpg
  public/images/doha.jpg
  public/videos/dashboard-city.mp4
  public/workers/LICENSE.MapLibre.txt
  public/workers/maplibre-worker.js
  scripts/build-transit-geometries.py
  scripts/build-walking-network.py
  scripts/check-backend.mjs
  scripts/sync-map-worker.mjs
  src/app/[section]/page.tsx
  src/app/api/geocode/route.ts
  src/app/api/transit-shape/route.ts
  src/app/api/walk/route.ts
  src/app/error.tsx
  src/app/globals.css
  src/app/layout.tsx
  src/app/not-found.tsx
  src/app/page.tsx
  src/components/hero-video.tsx
  src/components/indoor-concept.tsx
  src/components/location-search.tsx
  src/components/map.tsx
  src/components/mobility-app.tsx
  src/components/ui/stagger-text.tsx
  src/components/ui/stats-counter.tsx
  src/components/walking-assistant.tsx
  src/data/backend-contract.json
  src/data/demo.ts
  src/data/indoor-passages.json
  src/data/mall-concept.json
  src/lib/map-tiles.ts
  src/lib/supabase-config.ts
  src/lib/supabase-server.ts
  src/lib/supabase.ts
  src/lib/transit-geometry.server.ts
  src/lib/walking-network.server.ts
  src/services/data.ts
  src/services/geo.ts
  src/services/indoor-routing.ts
  src/services/navigation.ts
  src/services/planner.ts
  src/services/preferences.ts
  src/services/transit.ts
  src/services/walking-graph.ts
  src/types/database.ts
  tests/indoor-routing.test.ts
  tests/map-tiles.test.ts
  tests/navigation.test.ts
  tests/planner.test.ts
  tests/routing-api.test.ts
  tests/supabase-config.test.ts
  tests/transit.test.ts
  tests/walking-graph.test.ts
  tsconfig.json
```

Walking presentation additions:
- `src/app/demo/page.tsx`: separate presentation route.
- `src/components/journey-demo.tsx`: interactive simulated walk and branch choice.
- `src/services/journey-simulation.ts`: path interpolation and pause/arrival transitions.
- `tests/journey-simulation.test.ts`: deterministic simulation checks.
- `public/videos/walking-journey-demo.mp4`: actual browser recording, with simulated movement.
- `docs/WALKING-DEMO.md`: presentation instructions and survey requirements.

Shade additions:
- `src/services/shade.ts`: conservative geometry matching, categories and weighted synthetic coverage.
- `src/services/shade-demo.ts`: validated optional teammate demo-table adapter.
- `src/components/shade-demo-panel.tsx`: local and supplied shade demonstrations in Comfortable routes.
- `src/data/shade-presentation.json`: separately labelled synthetic observations on bundled mapped paths.
- `public/images/planner-sunset.jpg`: original generated decorative planner background.
- `docs/SHADE-INTEGRATION.md`: calculation methodology, limitations and backend handoff.
- `tests/shade.test.ts`, `tests/shade-demo.test.ts`: matching, calculation and adapter validation checks.

v3 additions:
- `src/types/mobility-context.ts`: observed weather, accessibility, telemetry, traffic, analytics and corridor record shapes.
- `src/services/mobility-context.ts`: independent, error-tolerant v3 dataset loading.
- `src/services/records.ts`: stable pagination and ID deduplication.
- `src/services/provenance.ts`: compact source/status labels and nullable display helpers.
- `src/components/mobility-insights.tsx`: city conditions and weather selector.
- `docs/BACKEND-V3.md`: current schema observations, limitations and backend checks.

Eye-level walking additions:
- `src/app/walk/page.tsx`: dedicated map-to-eye-level experience.
- `src/components/walking-view.tsx`: accessible walking modal, playback, mall choices and exit states.
- `src/components/walking-street-canvas.tsx`: dependency-free grayscale perspective renderer and illustrative shadows.
- `src/services/walking-scene.ts`: progress/choice/exit state transitions and nearby-mall lookup.
- `tests/walking-scene.test.ts`: state-machine and mall-proximity checks.
- `docs/WALKING-VIEW.md`: controls, data boundaries and weather-loading changes.

Fare additions:
- `src/data/qatarTransportFares.ts`: central tariff references and verification metadata.
- `src/types/fares.ts`, `src/services/fares.ts`: fare contexts, breakdowns, caps and ticket recommendations.
- `src/services/driving.ts`, `src/app/api/drive/route.ts`: optional server-side driving adapter.
- `src/components/fare-settings.tsx`, `fare-details.tsx`, `transport-fare-options.tsx`: existing-planner fare settings and displays.
- `tests/fares.test.ts`, `tests/driving.test.ts`: tariff and shared-distance/provider-state verification.
- `docs/FARES.md`: implementation report and source/credential limitations.
