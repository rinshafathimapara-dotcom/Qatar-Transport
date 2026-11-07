import test from "node:test";
import assert from "node:assert/strict";
import { choosePassage } from "../src/services/indoor-routing";
import type { IndoorPassage, Journey } from "../src/types/database";
import type { WalkingProvider } from "../src/services/geo";
const p: IndoorPassage = {
  id: "test-only",
  name: "Test only",
  entry: {
    id: "entry",
    name: "Fixture entry",
    longitude: 51.53,
    latitude: 25.28,
  },
  exit: {
    id: "exit",
    name: "Fixture exit",
    longitude: 51.531,
    latitude: 25.28,
  },
  coordinates: [
    [51.53, 25.28],
    [51.531, 25.28],
  ],
  footprint: [
    [51.53, 25.2799],
    [51.531, 25.2799],
    [51.531, 25.2801],
    [51.53, 25.2801],
    [51.53, 25.2799],
  ],
  schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], opens: "00:00", closes: "00:00" }],
  source: "Automated test fixture, not a real mall",
  verifiedAt: "2020-01-01",
  validUntil: "2099-01-01",
  publicAccess: true,
  airConditioned: false,
  isDemo: false,
  notes: "Not a real record",
};
const route: Journey = {
  id: "test",
  title: "Fixture route",
  minutes: 10,
  distance: 300,
  walking: 300,
  cost: 0,
  transfers: 0,
  shade: null,
  isDemo: false,
  warning: "",
  source: "Fixture",
  legs: [
    {
      mode: "walk",
      name: "Walk",
      minutes: 10,
      distance: 300,
      coordinates: [
        [51.529, 25.28],
        [51.532, 25.28],
      ],
      geometry: "routed",
    },
  ],
};
const walker: WalkingProvider = {
  async route(a, b, options) {
    assert.deepEqual(options?.avoidPolygons, [p.footprint]);
    return {
      coordinates: [
        [a.longitude, a.latitude],
        [b.longitude, b.latitude],
      ],
      distance: 100,
      minutes: 2,
    };
  },
};
test("through choice splices an explicit indoor segment without changing journey identity", async () => {
  const result = await choosePassage(route, p, "inside", walker);
  assert.equal(result.id, route.id);
  assert.equal(result.legs.length, 3);
  assert.equal(result.legs[1].geometry, "verified-indoor");
  assert.equal(result.legs[1].environment, "indoor");
  assert.equal(result.shade, null);
  assert.match(result.warning, /does not guarantee/);
});
test("around choice asks the router to exclude the building", async () => {
  const result = await choosePassage(route, p, "outside", walker);
  assert.equal(result.legs.length, 1);
  assert.match(result.legs[0].name, /around/);
});
test("demo or expired doors never become a live navigation shortcut", async () => {
  await assert.rejects(
    choosePassage(route, { ...p, isDemo: true }, "inside", walker),
    /verified/,
  );
  await assert.rejects(
    choosePassage(route, { ...p, validUntil: "2000-01-01" }, "inside", walker),
    /verified/,
  );
});
