import test from "node:test";
import assert from "node:assert/strict";
import {
  shadeLevel,
  shadeColor,
  summarizeShade,
  matchShade,
  withShade,
  type ShadeObservation,
} from "../src/services/shade";
import fixture from "../src/data/shade-presentation.json";
import type { Journey } from "../src/types/database";
const points: [number, number][] = [
  [51.53, 25.28],
  [51.531, 25.28],
  [51.534, 25.28],
];
const observation = (
  id: string,
  a: [number, number],
  b: [number, number],
  level: string,
  demo = true,
): ShadeObservation => ({
  id,
  start_longitude: a[0],
  start_latitude: a[1],
  end_longitude: b[0],
  end_latitude: b[1],
  shade_level: level,
  data_source: "Test fixture",
  is_demo: demo,
});
const route: Journey = {
  id: "test",
  title: "Test",
  minutes: 6,
  distance: 400,
  walking: 400,
  cost: 0,
  transfers: 0,
  shade: null,
  isDemo: false,
  warning: "",
  source: "Test",
  legs: [
    {
      mode: "walk",
      name: "Test",
      minutes: 6,
      distance: 400,
      coordinates: points,
      geometry: "routed",
    },
  ],
};
test("coverage model uses segment length, not an average of labels", () => {
  const result = summarizeShade(route, [
    observation("a", points[0], points[1], "high"),
    observation("b", points[1], points[2], "low"),
  ]);
  assert.equal(result.percent, 33);
  assert.equal(result.observedPercent, 100);
  assert.equal(result.highPercent, 25);
  assert.equal(result.synthetic, true);
});
test("partial, crossing, unknown and categorical-only observations do not produce whole-route percentages", () => {
  const partial = summarizeShade(route, [
    observation("a", points[0], points[1], "high"),
  ]);
  assert.equal(partial.percent, null);
  assert.equal(partial.observedPercent, 25);
  assert.equal(
    summarizeShade(route, [
      observation("a", points[0], points[2], "high", false),
    ]).percent,
    null,
  );
  assert.equal(
    matchShade(points[0], points[1], [
      observation("x", [51.5305, 25.279], [51.5305, 25.281], "high"),
    ]),
    undefined,
  );
  assert.equal(shadeLevel(null), "unknown");
  assert.notEqual(shadeColor("unknown"), shadeColor("low"));
});
test("duplicate observations do not inflate coverage, and conflicting labels resolve conservatively", () => {
  const high = observation("a", points[0], points[2], "high"),
    low = observation("b", points[0], points[2], "low");
  assert.equal(summarizeShade(route, [high, high]).percent, 85);
  assert.equal(summarizeShade(route, [high, low]).percent, 15);
  assert.equal(summarizeShade(route, [low, high]).percent, 15);
});
test("local presentation has genuinely different road geometries, distance-weighted synthetic coverage, and walks under 20 minutes", () => {
  const results = fixture.routes.map((r) =>
    withShade(
      {
        ...route,
        id: r.id,
        minutes: r.minutes,
        legs: [
          {
            ...route.legs[0],
            coordinates: r.coordinates as [number, number][],
            distance: r.distance,
            minutes: r.minutes,
          },
        ],
      },
      fixture.segments,
    ),
  );
  assert.ok(results.every((r) => r.minutes <= 20 && r.shadeInfo?.synthetic));
  assert.ok(results[1].minutes > results[0].minutes);
  assert.ok(
    results[1].shadeInfo!.highPercent > results[0].shadeInfo!.highPercent,
  );
  assert.notDeepEqual(
    results[0].legs[0].coordinates,
    results[1].legs[0].coordinates,
  );
});
