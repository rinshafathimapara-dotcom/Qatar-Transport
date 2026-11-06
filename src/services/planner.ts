import type { Collection, Journey, Location, Priority } from "@/types/database";
import { coord, distance, walkingProvider } from "./geo";
export function rank(routes: Journey[], priority: Priority) {
  return [...routes].sort((a, b) => {
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
): Promise<Journey[]> {
  if (distance(from, to) < 30)
    throw new Error("Choose two different locations.");
  if (!demoMode) {
    const w = await walkingProvider.route(from, to);
    // Transit is intentionally gated: schedules alone do not establish access paths,
    // service timezone, calendar exceptions, fares or complete network geometry.
    return [
      {
        id: "walking",
        title: "Walk to your destination",
        minutes: w.minutes,
        distance: w.distance,
        walking: w.distance,
        cost: 0,
        transfers: 0,
        shade: null,
        isDemo: false,
        legs: [{ mode: "walk", name: `Walk to ${to.name}`, ...w }],
        warning:
          "Estimated pedestrian route. Shade coverage unavailable. Transit results require a validated network adapter.",
        source: "Configured GraphHopper pedestrian provider",
      },
    ];
  }
  const supported = new Set(["msheireb", "katara", "souq", "museum"]);
  if (!supported.has(from.id) || !supported.has(to.id))
    throw new Error(
      "This pair is outside the demonstration network. Try Msheireb Downtown → Katara, Souq Waqif or the Museum of Islamic Art. Configure a pedestrian provider for arbitrary locations.",
    );
  const meters = Math.round(distance(from, to) * 1.25),
    minutes = Math.ceil(meters / 75);
  const walk: Journey = {
    id: "walk-demo",
    title: "A little more city, on foot",
    minutes,
    distance: meters,
    walking: meters,
    cost: 0,
    transfers: 0,
    shade: null,
    isDemo: true,
    legs: [
      {
        mode: "walk",
        name: `Walk to ${to.name}`,
        minutes,
        distance: meters,
        coordinates: [coord(from), coord(to)],
      },
    ],
    warning:
      "Synthetic estimate; straight-line schematic, not a navigable path. Shade coverage unknown.",
    source: "Smarter Qatar demo fixture",
  };
  const result = [walk];
  if (
    new Set([from.id, to.id]).has("katara") &&
    new Set([from.id, to.id]).has("msheireb")
  ) {
    const stations = [
      data.transport_stops.find((s) => s.id === "msh")!,
      data.transport_stops.find((s) => s.id === "west")!,
      data.transport_stops.find((s) => s.id === "kat")!,
    ];
    if (from.id === "katara") stations.reverse();
    const transit: Journey = {
      id: "metro-demo",
      title: "The city, connected",
      minutes: 32,
      distance: 10500,
      walking: 1100,
      cost: 2,
      transfers: 0,
      shade: 65,
      isDemo: true,
      legs: [
        {
          mode: "walk",
          name: `Walk to ${stations[0].name}`,
          minutes: 5,
          distance: 350,
          coordinates: [coord(from), coord(stations[0])],
        },
        {
          mode: "metro",
          name: "Illustrative Red corridor · 2 demo segments",
          minutes: 17,
          distance: 9400,
          coordinates: stations.map(coord),
        },
        {
          mode: "walk",
          name: `Walk to ${to.name}`,
          minutes: 10,
          distance: 750,
          coordinates: [coord(stations[2]), coord(to)],
        },
      ],
      warning:
        "All times, fare and 65% walking-shade score are synthetic illustrations. No official timetable, departure, service status or verified shade. Lines are schematic.",
      source: "Smarter Qatar synthetic corridor fixture",
    };
    result.push(transit, {
      ...transit,
      id: "comfort-demo",
      title: "Take the gentler way",
      minutes: 36,
      distance: 10800,
      walking: 1400,
      shade: 80,
      legs: transit.legs.map((l, i) =>
        i === 0
          ? {
              ...l,
              minutes: l.minutes + 4,
              distance: l.distance + 300,
              name: "Illustrative shaded walking detour",
            }
          : l,
      ),
      warning:
        "Demonstration: 4 extra minutes versus the quicker Metro option; synthetic 80% shade score. Detour geometry is schematic, not surveyed.",
    });
  }
  return result;
}
