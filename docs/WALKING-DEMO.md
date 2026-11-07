# Walking presentation and real navigation

Open **Walking experience** (`/walk`; `/demo` remains an alias). Tap the walking line to enter a generated eye-level street scene. It pauses at City Center Doha, offers through/around choices, shows an indoor corridor and exit, and returns to the map. See [the current guide](WALKING-VIEW.md) for exact controls and data boundaries. The older purple-dot presentation has been superseded.

## Real journeys

The planner now enforces a maximum **total walking budget of 20 minutes**, including all access/transfer/egress walking legs; users can choose 15 minutes or a smaller saved preference. Transit journeys may take longer in total. When no supported journey fits, the planner explains this instead of suggesting a 151-minute walk. Changing the limit also hides older/saved comparisons that exceed it. Indoor rerouting must respect the same budget.

**Follow my location** on a selected real route opts into browser GPS. Stop location tracking or leaving the page clears the watch. Estimated distance/steps use fresh, reasonably accurate fixes near a mapped walking leg, rejecting implausible speeds and small jitter. These remain estimates, not a reliable pedometer. Background/locked-screen tracking is not guaranteed by browsers. GPS is often poor inside buildings.

The existing live passage registry stays empty until reviewed data is supplied. Verified live decision markers and proximity prompts are separate from the presentation simulation.

## What the team should collect

More place names alone do not extend the routable network. Expand the pedestrian graph coverage with connected, licensed sidewalks, crossings and access restrictions, and supply actual transit routes, stop ordering, service calendars and schedules. The bundled walking graph currently covers a Doha pilot area, not all Qatar.

For each mall: licensed floor plans, connected walkable corridors, floor identifiers, confirmed entrance/exit coordinates, stairs/lifts/ramps, public access and opening hours, closure information, accessibility details and dated evidence of air conditioning/shade where claimed. Owner permission may be required for plans. Doors alone do not define a safe route through a building. Indoor live positioning may need BLE/Wi-Fi infrastructure or user-confirmed checkpoints; ordinary GPS cannot identify a precise corridor or floor reliably.

The main constraint is reliable, maintained data and positioning—not simply storage volume. This can grow into a capable Qatar mobility product, but collecting more rows cannot guarantee Google Maps parity or error-free navigation. No Google Maps data is copied.

## Recorded demonstration

The current `/walk` page plays and downloads `public/videos/eye-level-walk.mp4`, a 20.64-second actual browser recording of the first-person scene and mall flow. It records simulated movement, not a field walk. The older `public/videos/walking-journey-demo.mp4` is retained only as a historical asset.
