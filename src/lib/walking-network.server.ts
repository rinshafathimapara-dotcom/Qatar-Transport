import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { PedestrianGraph, type WalkGraph } from "@/services/walking-graph";
let graph: Promise<PedestrianGraph> | undefined;
export function getWalkingNetwork() {
  graph ??= readFile(
    path.join(process.cwd(), "data/routing/doha-walking.json.gz"),
  )
    .then(
      (bytes) =>
        new PedestrianGraph(
          JSON.parse(gunzipSync(bytes).toString("utf8")) as WalkGraph,
        ),
    )
    .catch((error) => {
      graph = undefined;
      throw new Error(
        "The bundled walking network could not be loaded. Refresh or contact the project team.",
      );
    });
  return graph;
}
