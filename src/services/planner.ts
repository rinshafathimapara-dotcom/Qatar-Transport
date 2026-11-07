import type {
  Collection,
  Journey,
  Location,
  Priority,
  Leg,
} from "@/types/database";
import { distance, walkingProvider, type WalkingProvider } from "./geo";
import { approximateTransit } from "./transit";
export function rank(routes: Journey[], priority: Priority) {
  return [...routes].sort((a, b) => {
    if (priority === "Balanced")
      return (
        a.minutes +
        (a.walking / 1000) * 3 +
        a.transfers * 5 -
        (b.minutes + (b.walking / 1000) * 3 + b.transfers * 5)
      );
    if (priority === "Shortest") return a.distance - b.distance;
    if (priority === "Budget-friendly")
      return (
        (a.cost ?? Infinity) - (b.cost ?? Infinity) || a.minutes - b.minutes
      );
    if (priority === "Most comfortable")
      return (b.shade ?? -1) - (a.shade ?? -1) || a.walking - b.walking;
    return a.minutes - b.minutes;
  });
}
export async function plan(
  from: Location,
  to: Location,
  data: Collection,
  demoMode: boolean,
  options: { walker?: WalkingProvider } = {},
): Promise<Journey[]> {
  if (distance(from, to) < 30)
    throw new Error("Choose two different locations.");
  const walker = options.walker || walkingProvider,
    results: Journey[] = [];
  let walkingError = "";
  try {
    const w = await walker.route(from, to);
    results.push({
      id: "walking",
      title: "Walk along mapped streets and paths",
      minutes: w.minutes,
      distance: w.distance,
      walking: w.distance,
      cost: 0,
      transfers: 0,
      shade: null,
      isDemo: demoMode || !!(from.is_demo || to.is_demo),
      legs: [
        {
          mode: "walk",
          name: `Walk to ${to.name}`,
          ...w,
          geometry: "routed",
          environment: "outdoor",
        },
      ],
      warning: `Road-following pedestrian route from ${w.source || "the walking provider"}. Walking time is estimated, not a live arrival promise. Shade and heat exposure are unknown. The route may start/end at the nearest mapped path (${Math.round(w.snappedFrom || 0)} m / ${Math.round(w.snappedTo || 0)} m from the selected points). Check crossings and access on the ground.`,
      source: w.source || "Configured pedestrian provider",
    });
  } catch (error) {
    walkingError = (error as Error).message;
  }
  for (const candidate of approximateTransit(from, to, data).slice(0, 3)) {
    try {
      const legs: Leg[] = [];
      for (const leg of candidate.legs) {
        if (leg.mode !== "walk") {
          let mapped: Leg = { ...leg, geometry: "schematic" };
          if (
            (leg.mode === "metro" || leg.mode === "tram") &&
            !options.walker
          ) {
            try {
              const response = await fetch("/api/transit-shape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mode: leg.mode,
                  name: leg.routeName || leg.routeCode || leg.name,
                  coordinates: leg.coordinates,
                }),
              });
              if (response.ok) {
                const shape = await response.json();
                mapped = {
                  ...leg,
                  coordinates: shape.coordinates,
                  distance: shape.distance,
                  geometry: "mapped-transit",
                };
              }
            } catch {
              /* Keep stations, never invent a rail path. */
            }
          }
          legs.push(mapped);
          continue;
        }
        const a = leg.coordinates[0],
          b = leg.coordinates.at(-1)!;
        const w = await walker.route(
          {
            id: "access",
            name: "Walking start",
            longitude: a[0],
            latitude: a[1],
          },
          {
            id: "egress",
            name: "Walking end",
            longitude: b[0],
            latitude: b[1],
          },
        );
        legs.push({ ...leg, ...w, geometry: "routed", environment: "outdoor" });
      }
      results.push({
        ...candidate,
        legs,
        minutes: legs.reduce((n, l) => n + l.minutes, 0),
        distance: legs.reduce((n, l) => n + l.distance, 0),
        walking: legs
          .filter((l) => l.mode === "walk")
          .reduce((n, l) => n + l.distance, 0),
        warning:
          (candidate.isDemo
            ? "Transit durations are synthetic demonstration samples, not official timetables or upcoming departures. "
            : "Transit durations come from imported schedule samples, not upcoming departures. ") +
          "Walking sections follow mapped pedestrian paths; supported rail geometry follows OSM track relations. Waiting time, fare and heat exposure are unknown. Any unverified segment geometry is hidden rather than joined with a straight line.",
      });
    } catch {
      /* A missing access path cannot be replaced with a straight line. */
    }
  }
  if (!results.length)
    throw new Error(
      `No supported pedestrian or transit connection was found. ${walkingError}`,
    );
  return results;
}
