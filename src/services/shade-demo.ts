import { distance } from "./geo";
import type { MobilityRows } from "@/types/mobility-context";
import type { Journey, Location, Rows } from "@/types/database";
export type ShadeCorridor = MobilityRows["shade_demo_routes"];
export function validShadeCorridor(value: unknown): value is ShadeCorridor {
  if (!value || typeof value !== "object") return false;
  const r = value as ShadeCorridor;
  return (
    typeof r.id === "string" &&
    typeof r.route_name === "string" &&
    typeof r.corridor_group === "string" &&
    typeof r.optimization_profile === "string" &&
    typeof r.total_walking_distance_m === "number" &&
    r.total_walking_distance_m > 0 &&
    typeof r.estimated_walking_duration_min === "number" &&
    r.estimated_walking_duration_min > 0 &&
    typeof r.shade_coverage_percent === "number" &&
    r.shade_coverage_percent >= 0 &&
    r.shade_coverage_percent <= 100 &&
    Array.isArray(r.segment_ids) &&
    r.segment_ids.length > 0 &&
    r.segment_ids.every((id) => typeof id === "string")
  );
}
export function corridorJourney(
  row: ShadeCorridor,
  all: Rows["shade_segments"][],
  limit = 20,
): {
  from: Location;
  to: Location;
  route: Journey;
  segments: Rows["shade_segments"][];
} {
  if (!validShadeCorridor(row))
    throw new Error(
      "This corridor has incomplete route metrics or segment references.",
    );
  if (
    row.estimated_walking_duration_min! >
    (Number.isFinite(limit) ? Math.min(20, Math.max(1, limit)) : 20)
  )
    throw new Error("This corridor exceeds your walking budget.");
  const byId = new Map(all.map((s) => [s.id, s])),
    segments = row.segment_ids!.map((id) => byId.get(id));
  if (segments.some((s) => !s))
    throw new Error(
      "Some corridor segments are missing from the current data view.",
    );
  const list = segments as Rows["shade_segments"][];
  if (
    list.some(
      (s) =>
        ![
          s.start_latitude,
          s.start_longitude,
          s.end_latitude,
          s.end_longitude,
        ].every(Number.isFinite),
    )
  )
    throw new Error("A corridor segment has invalid coordinates.");
  const first = list[0],
    last = list.at(-1)!;
  const lengths = list.map((s) =>
    distance(
      { latitude: s.start_latitude, longitude: s.start_longitude },
      { latitude: s.end_latitude, longitude: s.end_longitude },
    ),
  );
  const totalLength = lengths.reduce((a, b) => a + b, 0) || 1;
  // Each supplied segment remains separate: never bridge a missing connection.
  return {
    from: {
      id: row.id + "-from",
      name: row.route_name.split(" -> ")[0] || "Corridor start",
      latitude: first.start_latitude,
      longitude: first.start_longitude,
      is_demo: row.is_demo !== false,
    },
    to: {
      id: row.id + "-to",
      name:
        row.route_name.split(" -> ")[1]?.replace(/\s*\(.*/, "") ||
        "Corridor destination",
      latitude: last.end_latitude,
      longitude: last.end_longitude,
      is_demo: row.is_demo !== false,
    },
    segments: list,
    route: {
      id: row.id,
      title: row.route_name,
      minutes: row.estimated_walking_duration_min!,
      distance: row.total_walking_distance_m!,
      walking: row.total_walking_distance_m!,
      cost: null,
      transfers: 0,
      shade: row.shade_coverage_percent,
      isDemo: row.is_demo !== false,
      isApproximate: true,
      shadeDetails: {
        shadedDistance: row.shaded_distance_m,
        exposedDistance: row.exposed_distance_m,
        basis:
          "Supabase route summary; segment-level numeric fractions are not supplied",
      },
      source:
        "Supabase shade_demo_routes with ordered shade_segments references",
      warning:
        "Dataset corridor preview. Shade coverage, distance and walking time are supplied route-summary estimates. Segment coordinates are displayed individually; they are not snapped or verified for live pedestrian navigation.",
      legs: list.map((s, i) => ({
        mode: "walk",
        name: `${s.shade_level} shade · section ${i + 1}`,
        minutes:
          (row.estimated_walking_duration_min! * lengths[i]) / totalLength,
        distance: lengths[i],
        coordinates: [
          [s.start_longitude, s.start_latitude],
          [s.end_longitude, s.end_latitude],
        ],
        geometry: "concept",
        environment: "outdoor",
      })),
    },
  };
}
