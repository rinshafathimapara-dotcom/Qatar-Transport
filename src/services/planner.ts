import type { Collection, Journey, Location, Priority } from "@/types/database";
import { coord, distance, walkingProvider } from "./geo";
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
): Promise<Journey[]> {
  if (distance(from, to) < 30)
    throw new Error("Choose two different locations.");
  if (!demoMode) {
    const transit = approximateTransit(from, to, data);
    try {
      const w = await walkingProvider.route(from, to);
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
          isDemo: !!(from.is_demo || to.is_demo),
          legs: [{ mode: "walk", name: `Walk to ${to.name}`, ...w }],
          warning:
            "Estimated pedestrian route. Shade coverage unavailable. Imported transit candidates, when present, are separately labelled MVP approximations.",
          source: "Configured GraphHopper pedestrian provider",
        },
        ...transit,
      ];
    } catch (error) {
      if (transit.length)
        return transit.map((r) => ({
          ...r,
          warning:
            r.warning +
            " Pedestrian provider unavailable: " +
            (error as Error).message,
        }));
      throw new Error(
        "Journey planning is blocked: " +
          (error as Error).message +
          " No supported single-route transit candidate was found with nearby stops, ordered links and segment schedules. Import the required rows or use the unconfigured-backend demo.",
      );
    }
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
