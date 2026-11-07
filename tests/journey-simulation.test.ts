import test from "node:test";
import assert from "node:assert/strict";
import {
  advance,
  initialSimulation,
  pathLength,
  pointAt,
} from "../src/services/journey-simulation";
test("simulation pauses exactly at decision and requires a branch before advancing", () => {
  const pause = advance(
    { ...initialSimulation, status: "walking" },
    200,
    50,
    300,
  );
  assert.equal(pause.status, "decision");
  assert.equal(pause.metres, 50);
  assert.deepEqual(advance(pause, 200, 50, 300), pause);
  const end = advance(
    { ...pause, branch: "inside", status: "walking" },
    999,
    50,
    300,
  );
  assert.equal(end.status, "arrived");
  assert.equal(end.metres, 300);
});
test("path interpolation follows each segment and clamps to destination", () => {
  const p: [number, number][] = [
    [51.5, 25.3],
    [51.501, 25.3],
    [51.501, 25.301],
  ];
  const first = pathLength(p.slice(0, 2));
  assert.ok(Math.abs(pointAt(p, first / 2)[0] - 51.5005) < 0.000001);
  assert.deepEqual(pointAt(p, 99999), p[2]);
});
