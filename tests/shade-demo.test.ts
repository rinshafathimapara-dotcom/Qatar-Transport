import test from "node:test";
import assert from "node:assert/strict";
import {
  validShadeCorridor,
  corridorJourney,
} from "../src/services/shade-demo";
import type { ShadeCorridor } from "../src/services/shade-demo";
import type { Rows } from "../src/types/database";
const row: ShadeCorridor = {
  id: "r",
  route_name: "A -> B (Most Shaded)",
  corridor_group: "A_B",
  optimization_profile: "most_shaded",
  total_walking_distance_m: 600,
  estimated_walking_duration_min: 8,
  shade_coverage_percent: 75,
  shaded_distance_m: 450,
  exposed_distance_m: 150,
  segment_ids: ["a", "b"],
  is_demo: true,
  created_at: null,
};
const segments: Rows["shade_segments"][] = [
  {
    id: "a",
    start_latitude: 25.28,
    start_longitude: 51.53,
    end_latitude: 25.281,
    end_longitude: 51.531,
    shade_level: "high",
    data_source: "test",
    is_demo: true,
  },
  {
    id: "b",
    start_latitude: 25.29,
    start_longitude: 51.54,
    end_latitude: 25.291,
    end_longitude: 51.541,
    shade_level: "low",
    data_source: "test",
    is_demo: true,
  },
];
test("v3 corridor uses exact segment references without inventing geometry across gaps", () => {
  assert.ok(validShadeCorridor(row));
  const result = corridorJourney(row, segments);
  assert.equal(result.route.legs.length, 2);
  assert.equal(result.route.legs[0].geometry, "concept");
  assert.equal(result.route.shade, 75);
  assert.equal(result.route.shadeDetails?.shadedDistance, 450);
  assert.equal(result.route.isDemo, true);
  assert.equal(result.route.legs[0].coordinates[1][0], 51.531);
  assert.equal(result.route.legs[1].coordinates[0][0], 51.54);
});
test("missing segment, invalid metrics and walking-budget violations are explained", () => {
  assert.throws(() => corridorJourney(row, segments.slice(0, 1)), /missing/);
  assert.throws(
    () =>
      corridorJourney(
        { ...row, estimated_walking_duration_min: 151 },
        segments,
      ),
    /walking budget/,
  );
  assert.equal(
    validShadeCorridor({ ...row, shade_coverage_percent: 999 }),
    false,
  );
});
