import { withFare } from "./fares";
import type { FarePreferences } from "@/types/fares";
import { drivingProvider, type DrivingProvider } from "./driving";
import { withShade } from "./shade";
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
    if (priority === "Budget-friendly") {
      const quality = (r: Journey) =>
        r.cost === null || !Number.isFinite(r.cost)
          ? 2
          : r.fare?.status === "indicative_estimate"
            ? 1
            : 0;
      return (
        quality(a) - quality(b) ||
        (a.cost ?? Infinity) - (b.cost ?? Infinity) ||
        a.minutes - b.minutes
      );
    }
    if (priority === "Most comfortable")
      return (
        (b.shadeInfo?.highPercent ?? -1) - (a.shadeInfo?.highPercent ?? -1) ||
        (b.shade ?? -1) - (a.shade ?? -1) ||
        a.walking - b.walking
      );
    return a.minutes - b.minutes;
  });
}
export async function plan(
  from: Location,
  to: Location,
  data: Collection,
  demoMode: boolean,
  options: {
    walker?: WalkingProvider;
    maxWalkingMinutes?: number;
    shadeWeightMultiplier?: number;
    farePreferences?: FarePreferences;
    driver?: DrivingProvider;
    includeTaxi?: boolean;
    onDrivingUnavailable?: (reason: string) => void;
  } = {},
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
  if (
    results[0] &&
    results[0].minutes <= walkingLimit(options.maxWalkingMinutes) &&
    data.shade_segments.length
  ) {
    try {
      const w = await walker.route(from, to, {
        preferShade: true,
        shadeSegments: data.shade_segments,
        shadeWeightMultiplier: options.shadeWeightMultiplier,
      });
      if (
        JSON.stringify(w.coordinates) !==
        JSON.stringify(results[0].legs[0].coordinates)
      )
        results.push({
          ...results[0],
          id: "walking-shade",
          title: "Shade-priority walking alternative",
          minutes: w.minutes,
          distance: w.distance,
          walking: w.distance,
          legs: [{ ...results[0].legs[0], ...w }],
          warning:
            results[0].warning +
            " Categorical shade weighting favours high-shade observations; this is an estimate, not measured heat protection or a guarantee of maximum shade.",
        });
    } catch {
      /* Keep the supported standard route if shade routing is unavailable. */
    }
  }
  for (const candidate of approximateTransit(from, to, data).slice(0, 5)) {
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
          (candidate.serviceCalendarKnown
            ? ""
            : "Service days/calendar are not supplied; these are static duration estimates, not available departures. ") +
          "Walking sections follow mapped pedestrian paths; supported rail geometry follows OSM track relations. Waiting time and heat exposure are unknown. Fare references are calculated separately. Any unverified segment geometry is hidden rather than joined with a straight line.",
      });
    } catch {
      /* A missing access path cannot be replaced with a straight line. */
    }
  }
  const driver =
    options.includeTaxi === false
      ? undefined
      : (options.driver ?? (!options.walker ? drivingProvider : undefined));
  if (driver) {
    try {
      const road = await driver.route(from, to);
      if (road.available) {
        results.push({
          id: "karwa-taxi",
          title: "Karwa Taxi",
          minutes: road.minutes,
          drivingMinutes: road.minutes,
          distance: road.distance,
          distanceMode: "driving",
          walking: 0,
          cost: null,
          transfers: 0,
          shade: null,
          isDemo: demoMode || !!(from.is_demo || to.is_demo),
          legs: [
            {
              mode: "taxi",
              name: "Karwa Taxi · road route",
              minutes: road.minutes,
              distance: road.distance,
              coordinates: road.coordinates,
              geometry: "routed-driving",
            },
          ],
          warning:
            "Road distance and driving time come from the configured car router. Taxi fare uses indicative tariff assumptions and excludes unselected waiting/booking charges; it is not a live quote.",
          source: road.source,
        });
      } else options.onDrivingUnavailable?.(road.reason);
    } catch {
      options.onDrivingUnavailable?.(
        "Driving route unavailable. No pedestrian distance is substituted.",
      );
    }
  }
  const limit = walkingLimit(options.maxWalkingMinutes);
  const eligible = results.filter((r) => walkingMinutes(r) <= limit);
  if (results.length && !eligible.length)
    throw new Error(
      `No supported journey fits your ${limit}-minute total walking budget. Choose closer places or add connected transit data. Long walks have been excluded.`,
    );
  if (!results.length)
    throw new Error(
      `No supported pedestrian or transit connection was found. ${walkingError}`,
    );
  return eligible.map((r) =>
    withFare(withShade(r, data.shade_segments), options.farePreferences),
  );
}

export const walkingMinutes = (route: Journey) =>
  Math.round(
    route.legs
      .filter((l) => l.mode === "walk")
      .reduce((sum, l) => sum + l.minutes, 0) * 1000,
  ) / 1000;
export const walkingLimit = (value = 20) =>
  Number.isFinite(value) ? Math.min(20, Math.max(1, value)) : 20;
