import type { IndoorPassage, Journey, Leg, Location } from "@/types/database";
import { walkingProvider, type WalkingProvider } from "./geo";
import { alongPath, expectedOpen } from "./navigation";
const loc = (p: [number, number], name: string): Location => ({
  id: "route-point",
  name,
  longitude: p[0],
  latitude: p[1],
});
export async function choosePassage(
  route: Journey,
  p: IndoorPassage,
  choice: "inside" | "outside",
  walker: WalkingProvider = walkingProvider,
): Promise<Journey> {
  if (!expectedOpen(p))
    throw new Error(
      "This passage is not currently supported by verified public-access hours. Keep the outdoor route.",
    );
  const index = route.legs.findIndex(
    (l) =>
      l.mode === "walk" &&
      l.geometry === "routed" &&
      alongPath(p.entry, l.coordinates).distance <= 250 &&
      alongPath(p.exit, l.coordinates).progress >
        alongPath(p.entry, l.coordinates).progress,
  );
  if (index < 0)
    throw new Error(
      "This passage does not match the current walking leg. Replan your journey.",
    );
  const leg = route.legs[index],
    start = loc(leg.coordinates[0], "Walking leg start"),
    end = loc(leg.coordinates.at(-1)!, "Walking leg end");
  const create = async (
    a: Location,
    b: Location,
    name: string,
  ): Promise<Leg> => ({
    mode: "walk",
    name,
    ...(await walker.route(a, b, { avoidPolygons: [p.footprint] })),
    geometry: "routed",
    environment: "outdoor",
  });
  let replacement: Leg[];
  if (choice === "outside")
    replacement = [await create(start, end, `Walk around ${p.name}`)];
  else {
    const first = await create(start, p.entry, `Walk to ${p.name} entrance`),
      last = await create(p.exit, end, `Continue from ${p.name} exit`);
    // A reviewed indoor line must meet the mapped outdoor approach, not a distant snap.
    const near = (point: [number, number], target: Location) =>
      alongPath(target, [point, [point[0] + 1e-10, point[1]]]).distance;
    if (
      near(first.coordinates.at(-1)!, p.entry) > 20 ||
      near(last.coordinates[0], p.exit) > 20
    )
      throw new Error(
        "The mapped outdoor approach does not meet the reviewed doorway closely enough. Keep the outdoor route until the access path is mapped.",
      );
    const length = p.coordinates
      .slice(1)
      .reduce(
        (sum, point, i) =>
          sum + alongPath(loc(point, ""), [p.coordinates[i], point]).total,
        0,
      );
    replacement = [
      first,
      {
        mode: "walk",
        name: `Enter ${p.name}, follow the public passage, then use the marked exit`,
        minutes: Math.max(1, Math.ceil(length / 75)),
        distance: Math.round(length),
        coordinates: p.coordinates,
        geometry: "verified-indoor",
        environment: "indoor",
        instructions: [
          { text: `Enter ${p.entry.name}.`, pointIndex: 0 },
          {
            text: `Exit via ${p.exit.name}.`,
            pointIndex: p.coordinates.length - 1,
          },
        ],
      },
      last,
    ];
  }
  const legs = [
    ...route.legs.slice(0, index),
    ...replacement,
    ...route.legs.slice(index + 1),
  ];
  return {
    ...route,
    legs,
    minutes: legs.reduce((n, l) => n + l.minutes, 0),
    distance: legs.reduce((n, l) => n + l.distance, 0),
    walking: legs
      .filter((l) => l.mode === "walk")
      .reduce((n, l) => n + l.distance, 0),
    warning: `${choice === "inside" ? "Indoor passage" : "Outdoor alternative"} selected for ${p.name}. Access last checked ${p.verifiedAt}. Hours are supplied observations, not live availability. Indoor GPS can be unreliable. More indoor walking does not guarantee protection from heat. ${p.notes}`,
  };
}
