import test from "node:test";
import assert from "node:assert/strict";
import {
  PedestrianGraph,
  avoids,
  type WalkGraph,
} from "../src/services/walking-graph";
import { getWalkingNetwork } from "../src/lib/walking-network.server";
import { distance } from "../src/services/geo";
const loc = (longitude: number, latitude: number) => ({
  id: "test",
  name: "Test point",
  longitude,
  latitude,
});
function network() {
  const nodes: [number, number][] = [
    [51.53, 25.28],
    [51.531, 25.28],
    [51.532, 25.28],
    [51.53, 25.281],
    [51.532, 25.281],
  ];
  return {
    version: 1,
    source: "Synthetic test graph",
    osm_timestamp: "test",
    nodes,
    names: ["Test way"],
    edges: [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 4],
      [4, 2],
    ].map(([a, b]) => [
      a,
      b,
      distance(loc(...nodes[a]), loc(...nodes[b])),
      0,
      1,
      1,
    ]),
  } as WalkGraph;
}
test("avoidance reroutes over existing edges around the supplied footprint", () => {
  const graph = new PedestrianGraph(network()),
    a = loc(51.53, 25.28),
    b = loc(51.532, 25.28),
    polygon: [number, number][] = [
      [51.5308, 25.2798],
      [51.5312, 25.2798],
      [51.5312, 25.2802],
      [51.5308, 25.2802],
      [51.5308, 25.2798],
    ];
  const direct = graph.route(a, b),
    outside = graph.route(a, b, [polygon]);
  assert.ok(outside.distance > direct.distance);
  for (let i = 1; i < outside.coordinates.length; i++)
    assert.ok(
      avoids(outside.coordinates[i - 1], outside.coordinates[i], [polygon]),
    );
});
test("oneway foot restrictions do not permit a reverse shortcut", () => {
  const g = network();
  g.nodes = g.nodes.slice(0, 2);
  g.edges = [[0, 1, 100, 0, 0, 1]];
  const graph = new PedestrianGraph(g);
  assert.throws(
    () => graph.route(loc(51.531, 25.28), loc(51.53, 25.28)),
    /No connected walking path/,
  );
});
test("unmapped points are unavailable instead of joined by a straight line", () => {
  const graph = new PedestrianGraph(network());
  assert.throws(
    () => graph.route(loc(51.6, 25.4), loc(51.53, 25.28)),
    /No mapped network path/,
  );
});
test("bundled museum journey uses a substantial mapped pedestrian path around the waterfront", async () => {
  const graph = await getWalkingNetwork(),
    r = graph.route(loc(51.5294, 25.2855), loc(51.539, 25.2953));
  assert.ok(r.coordinates.length > 50);
  assert.ok(r.distance > 1500 && r.distance < 4000);
  assert.ok(r.instructions.length > 1);
  assert.ok(r.snappedFrom < 150 && r.snappedTo < 150);
});

test("shade weighting chooses a longer connected path without changing reported physical distance", () => {
  const graph = new PedestrianGraph(network()),
    a = loc(51.53, 25.28),
    b = loc(51.532, 25.28);
  const direct = graph.route(a, b),
    shaded = graph.route(a, b, [], (id) => (id < 2 ? 4 : 1));
  assert.ok(shaded.coordinates.some((p) => p[1] > 25.2805));
  assert.ok(shaded.distance > direct.distance);
  assert.ok(shaded.distance < 500);
});
