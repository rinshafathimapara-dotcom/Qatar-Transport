import test from "node:test";
import assert from "node:assert/strict";
import { validDemoRoute } from "../src/services/shade-demo";
const valid = {
  id: "sample",
  route_name: "Sample",
  area_name: "Doha",
  origin_name: "A",
  destination_name: "B",
  distance_m: 600,
  walking_minutes: 8,
  shade_percent: 75,
  exposed_percent: 25,
  priority: "shade",
  geometry: {
    type: "LineString",
    coordinates: [
      [51.53, 25.28],
      [51.54, 25.29],
    ],
  },
  is_demo: true,
};
test("optional supplied shade routes must be explicitly synthetic, bounded, and within walking budget", () => {
  assert.equal(validDemoRoute(valid), true);
  assert.equal(validDemoRoute({ ...valid, is_demo: false }), false);
  assert.equal(validDemoRoute({ ...valid, walking_minutes: 151 }), false);
  assert.equal(validDemoRoute({ ...valid, shade_percent: 999 }), false);
  assert.equal(
    validDemoRoute({
      ...valid,
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    }),
    false,
  );
});
