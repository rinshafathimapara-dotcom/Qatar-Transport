import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { PedestrianGraph, type WalkGraph } from "@/services/walking-graph";
import { distance } from "@/services/geo";
import type { Location } from "@/types/database";
type RailLine = {
  name: string;
  ref: string;
  mode: string;
  relationId: number;
  graph: WalkGraph;
};
let lines: Promise<{ line: RailLine; engine: PedestrianGraph }[]> | undefined;
const canonical = (name: string) => {
  const n = name.toLowerCase();
  for (const color of [
    "red",
    "gold",
    "green",
    "orange",
    "turquoise",
    "pink",
    "purple",
    "blue",
    "yellow",
  ])
    if (new RegExp(`\\b${color}\\b`).test(n)) return color;
  return (
    ({ tq: "turquoise", or: "orange", pk: "pink" } as Record<string, string>)[
      n
    ] || ""
  );
};
export async function transitShape(
  mode: string,
  name: string,
  points: Location[],
) {
  lines ??= readFile(
    path.join(process.cwd(), "data/routing/qatar-rail.json.gz"),
  ).then((bytes) =>
    (JSON.parse(gunzipSync(bytes).toString("utf8")) as RailLine[]).map(
      (line) => ({ line, engine: new PedestrianGraph(line.graph, 350) }),
    ),
  );
  const color = canonical(name);
  if (!color)
    throw new Error("No unambiguous OSM rail relation matches this line name.");
  let best:
    | { coordinates: [number, number][]; distance: number; source: string }
    | undefined;
  for (const { line, engine } of await lines) {
    if (line.mode !== mode || canonical(line.ref) !== color) continue;
    try {
      const coordinates: [number, number][] = [];
      let meters = 0;
      for (let i = 1; i < points.length; i++) {
        const result = engine.route(points[i - 1], points[i]);
        if (result.distance > distance(points[i - 1], points[i]) * 5 + 1500)
          throw new Error("Ambiguous station-to-track match.");
        coordinates.push(
          ...(i === 1 ? result.coordinates : result.coordinates.slice(1)),
        );
        meters += result.distance;
      }
      if (!best || meters < best.distance)
        best = { coordinates, distance: meters, source: line.graph.source };
    } catch {
      /* No connecting track is drawn when relation members are incomplete. */
    }
  }
  if (!best)
    throw new Error(
      "No continuous mapped track shape supports this station sequence.",
    );
  return best;
}
