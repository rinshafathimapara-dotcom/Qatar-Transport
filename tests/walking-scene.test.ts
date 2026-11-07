import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceWalk,
  chooseWalk,
  initialWalkState,
  mallAlongWalk,
} from "../src/services/walking-scene";
import type { Leg } from "../src/types/database";
test("walking scene pauses at a choice, walks indoors, waits at exit, then completes outdoors", () => {
  let s = advanceWalk({ ...initialWalkState, phase: "walking" }, 99, 300, 40);
  assert.equal(s.phase, "choice");
  assert.equal(s.metres, 40);
  assert.deepEqual(advanceWalk(s, 99, 300, 40), s);
  s = chooseWalk(s, "inside");
  assert.equal(s.phase, "indoors");
  s = advanceWalk(s, 100, 300, 40);
  assert.equal(s.phase, "exit");
  assert.deepEqual(advanceWalk(s, 100, 300, 40), s);
  s = advanceWalk({ ...s, phase: "walking", metres: 260 }, 99, 300, 40);
  assert.equal(s.phase, "complete");
});
test("outside choice continues without reopening the pause point, and paused phases do not move", () => {
  const choice = { ...initialWalkState, phase: "choice" as const, metres: 20 };
  const next = advanceWalk(chooseWalk(choice, "outside"), 10, 100, 20);
  assert.equal(next.phase, "walking");
  assert.equal(next.metres, 30);
  assert.equal(advanceWalk(initialWalkState, 100, 100, 20).metres, 0);
});
test("a mall is offered only when a supplied location is near the walking geometry", () => {
  const leg: Leg = {
    mode: "walk",
    name: "Test",
    minutes: 10,
    distance: 1000,
    coordinates: [
      [51.53, 25.28],
      [51.54, 25.28],
    ],
    geometry: "routed",
  };
  const near = {
    id: "near",
    name: "Existing Mall",
    category: "mall",
    longitude: 51.535,
    latitude: 25.2801,
  };
  const far = { ...near, id: "far", longitude: 51.6 };
  assert.equal(mallAlongWalk(leg, [near, far])?.place.id, "near");
  assert.equal(mallAlongWalk(leg, [far]), null);
});
