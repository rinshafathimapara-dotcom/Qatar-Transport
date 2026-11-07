# Eye-level walking experience

Open **Walking experience** (`/walk`; `/demo` remains an alias), or select a journey and click/tap a walking line on its map. The line zooms to its walking start and opens the eye-level scene automatically. Keyboard users can focus the walking path and press Enter/Space, or use the map's **Walk view** alternative.

The generated scene uses lightweight Canvas perspective projection: grayscale buildings, a path, illustrative crossings, floor arrows and visible shadow shapes. No Three.js dependency, paid street imagery, API key or external scene assets are required. A compact persistent label identifies simulated movement and generated scenery. The street/building/crossing arrangement and shadow shapes are not surveyed geometry or measured sunlight.

## Mall interaction

The dedicated City Center Doha experience starts in map view. Clicking its walking path starts playback. At the pause point it stops automatically and shows a mall façade with the mall name. Choose **Enter the mall** or **Go around outside**.

Entering replaces the street with an indoor corridor, shopfront-like walls and an EXIT sign. Playback stops at the exit until **Leave through the exit** is selected. The street scene then resumes. At the end, **Continue on the map** returns to the normal map for later journey sections. The indoor branch on the dedicated map is updated when chosen.

The known City Center location/footprint is preserved. Doors and indoor paths remain illustrative, separate from the reviewed live passage registry. For ordinary journey legs, a mall interaction is offered only if a supplied mall location lies within 200 metres of the selected walking path and is not at an endpoint. This proximity is sufficient for a visual interaction, not for recommending physical public access. It does not insert an unverified shortcut into real pedestrian routing.

Transit lines retain normal map behaviour; only walking legs open the street scene. Sun/shade scene controls visualize alternative lighting, not computed insolation for those generated buildings. Actual route comparisons and shade estimates remain sourced through the planner and its shade data.

## Controls and accessibility

Playback starts after the map-to-eye-level transition. Pause/resume, 1×/8×/20×/40× speeds, sunny/shaded scene styles, replay, Escape to close, and return-to-map controls work. The modal traps focus, restores focus and page scroll on close, and respects reduced motion for the camera transition. Playback uses simulated progress; it does not request geolocation or report simulated steps as real GPS. Timers stop at decisions/exits and are disposed on close.

The earlier preview-only **Start my journey** button is removed. Real location tracking remains available separately in the planner's expandable **Walking directions & live location** section, via **Follow my location**.

## Weather visibility

City-table loading now reports partial results so a slow unrelated table does not hold weather behind the full Promise.all. Weather renders as soon as its records arrive. A compact weather/heat summary is visible beside the map, with refresh/empty states and a link to City conditions. The selected weather reference is passed into the walking view. It remains a timestamped reference/scenario, not a live meteorological feed.

## Recorded walkthrough

The `/walk` page includes a 20.64-second actual browser recording of the interaction at `public/videos/eye-level-walk.mp4`: map-line click, eye-level street, mall decision, indoor corridor, exit and return to map. It records generated simulation, not a field walk. It can be played or downloaded from **Watch the walking experience**. The previous recording remains as a historical asset but is no longer the primary walking experience.
