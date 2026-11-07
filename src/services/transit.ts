import type { Collection, Journey, Location } from "@/types/database";
import { coord, distance } from "./geo";

function timeMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return null;
  const [h, m, s = 0] = value.split(":").map(Number);
  return h < 24 && m < 60 && s < 60 ? h * 60 + m + s / 60 : null;
}
// A bounded MVP: a single imported route, forward ordered stops, with a schedule
// row for each consecutive segment. No invented edges, reverse service or transfers.
export function approximateTransit(
  from: Location,
  to: Location,
  data: Collection,
): Journey[] {
  const results: Journey[] = [];
  const stops = new Map(
    data.transport_stops
      .filter(
        (s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude),
      )
      .map((s) => [s.id, s]),
  );
  for (const route of data.transit_routes.filter((r) => r.is_active)) {
    if (!["metro", "tram", "bus"].includes(route.mode.toLowerCase())) continue;
    const ordered = data.transit_route_stops
      .filter((s) => s.route_id === route.id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence);
    // Ambiguous duplicate sequences are not a trustworthy directed chain.
    if (new Set(ordered.map((s) => s.stop_sequence)).size !== ordered.length)
      continue;
    let best: Journey | undefined;
    const nearest = (location: Location) =>
      ordered
        .map((link, index) => ({ index, stop: stops.get(link.stop_id) }))
        .filter((p) => p.stop && distance(location, p.stop) <= 1500)
        .sort(
          (a, b) => distance(location, a.stop!) - distance(location, b.stop!),
        )
        .slice(0, 4)
        .map((p) => p.index);
    for (const i of nearest(from)) {
      const a = stops.get(ordered[i].stop_id)!;
      for (const j of nearest(to)) {
        if (j <= i) continue;
        const b = stops.get(ordered[j].stop_id);
        if (!b || distance(b, to) > 1500) continue;
        const chain = ordered.slice(i, j + 1).map((s) => stops.get(s.stop_id));
        if (chain.some((s) => !s)) continue;
        let rideMinutes = 0,
          valid = true;
        for (let k = i; k < j; k++) {
          const durations = data.transit_schedules
            .filter(
              (s) =>
                s.route_id === route.id &&
                s.from_stop_id === ordered[k].stop_id &&
                s.to_stop_id === ordered[k + 1].stop_id &&
                Array.isArray(s.days_of_week) &&
                s.days_of_week.length > 0,
            )
            .map((s) => {
              const dep = timeMinutes(s.departure_time),
                arr = timeMinutes(s.arrival_time);
              return dep !== null && arr !== null && arr > dep
                ? arr - dep
                : null;
            })
            .filter((n): n is number => n !== null && n <= 240);
          if (!durations.length) {
            valid = false;
            break;
          }
          rideMinutes += Math.min(...durations);
        }
        if (!valid) continue;
        const access = Math.round(distance(from, a)),
          egress = Math.round(distance(b, to));
        const accessMin = Math.ceil(access / 75),
          egressMin = Math.ceil(egress / 75);
        const rideDistance = chain
          .slice(1)
          .reduce((n, s, k) => n + distance(chain[k]!, s!), 0);
        const candidate: Journey = {
          id: `mvp-${route.id}-${a.id}-${b.id}`,
          title: `${route.route_name} · MVP connection`,
          minutes: Math.ceil(accessMin + rideMinutes + egressMin),
          distance: Math.round(access + rideDistance + egress),
          walking: access + egress,
          cost: null,
          transfers: 0,
          shade: null,
          isDemo: !!(
            route.is_demo ||
            chain.some((s) => s!.is_demo) ||
            from.is_demo ||
            to.is_demo
          ),
          isApproximate: true,
          legs: [
            {
              mode: "walk",
              name: `Schematic access to ${a.name}`,
              minutes: accessMin,
              distance: access,
              coordinates: [coord(from), coord(a)],
            },
            {
              mode: route.mode.toLowerCase() as "metro" | "tram" | "bus",
              name: `${route.route_name} · imported stop order`,
              routeName: route.route_name,
              routeCode: route.route_code,
              minutes: Math.ceil(rideMinutes),
              distance: Math.round(rideDistance),
              coordinates: chain.map((s) => coord(s!)),
            },
            {
              mode: "walk",
              name: `Schematic walk to ${to.name}`,
              minutes: egressMin,
              distance: egress,
              coordinates: [coord(b), coord(to)],
            },
          ],
          warning:
            "MVP approximation, not navigation or an upcoming departure. Station links and per-segment durations come from imported rows; sampled durations may belong to different services. Waiting time, service dates, day-of-week interpretation and access paths are unverified. Walking assumes 75 metres/minute along straight lines; distances are lower bounds. Fare and shade unknown.",
          source: route.source || "Imported transit rows",
        };
        if (!best || candidate.minutes < best.minutes) best = candidate;
      }
    }
    if (best) results.push(best);
  }
  return results.slice(0, 5);
}
