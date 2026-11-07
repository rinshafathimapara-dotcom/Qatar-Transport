# Walking presentation and real navigation

Open `/demo` or choose **Walking demo** in the navigation. No Supabase records or GPS permissions are needed for this page.

1. Press **Start my journey · demo**. After two seconds the purple dot walks along the illustrative approach, at the selected playback speed.
2. It automatically stops at E?, the entrance decision point. You can also click E? at any time to preview the choice; doing so pauses a running demo.
3. Choose **Go through the mall · demo** (purple interior) or **Stay outside · demo** (green perimeter). Playback continues after an automatic stop. If you opened the marker manually, press Resume.
4. The dot passes X? and finishes at the destination. Reset to compare the other branch.

The City Center Doha footprint is from OpenStreetMap. All demo doors, approaches, indoor paths and perimeter branches are hypothetical illustrations. They are not surveyed public walking directions. Minutes use an illustrative 75 m/min walking speed. Playback is accelerated and not live location. Steps are distance divided by 0.75 m, not sensor measurements. No cooling, shade, actual indoor access or verified floor plan is claimed.

## Real journeys

The planner now enforces a maximum **total walking budget of 20 minutes**, including all access/transfer/egress walking legs; users can choose 15 minutes or a smaller saved preference. Transit journeys may take longer in total. When no supported journey fits, the planner explains this instead of suggesting a 151-minute walk. Changing the limit also hides older/saved comparisons that exceed it. Indoor rerouting must respect the same budget.

**Start my journey** on a selected real route opts into browser GPS. Stop journey or leaving the page clears the watch. Estimated distance/steps use fresh, reasonably accurate fixes near a mapped walking leg, rejecting implausible speeds and small jitter. These remain estimates, not a reliable pedometer. Background/locked-screen tracking is not guaranteed by browsers. GPS is often poor inside buildings.

The existing live passage registry stays empty until reviewed data is supplied. Verified live decision markers and proximity prompts are separate from the presentation simulation.

## What the team should collect

More place names alone do not extend the routable network. Expand the pedestrian graph coverage with connected, licensed sidewalks, crossings and access restrictions, and supply actual transit routes, stop ordering, service calendars and schedules. The bundled walking graph currently covers a Doha pilot area, not all Qatar.

For each mall: licensed floor plans, connected walkable corridors, floor identifiers, confirmed entrance/exit coordinates, stairs/lifts/ramps, public access and opening hours, closure information, accessibility details and dated evidence of air conditioning/shade where claimed. Owner permission may be required for plans. Doors alone do not define a safe route through a building. Indoor live positioning may need BLE/Wi-Fi infrastructure or user-confirmed checkpoints; ordinary GPS cannot identify a precise corridor or floor reliably.

The main constraint is reliable, maintained data and positioning—not simply storage volume. This can grow into a capable Qatar mobility product, but collecting more rows cannot guarantee Google Maps parity or error-free navigation. No Google Maps data is copied.

## Recorded demonstration

`public/videos/walking-journey-demo.mp4` is an actual browser recording of the interactive presentation: start, automatic pause, indoor choice, arrival, reset, marker click and outdoor choice. Open **Watch the recorded judge demonstration** on `/demo` to play or download it. It has no narration and records simulated movement, not a field test.
