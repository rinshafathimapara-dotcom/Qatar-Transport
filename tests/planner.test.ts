import test from "node:test";
import assert from "node:assert/strict";
import { demo } from "../src/data/demo";
import { plan, rank } from "../src/services/planner";
import { distance } from "../src/services/geo";
test("demo corridor returns bounded, labelled options and meaningful ranking", async () => {
  const r = await plan(demo.places[0], demo.places[1], demo, true);
  assert.equal(r.length, 3);
  assert.ok(r.every((r) => r.isDemo));
  assert.equal(rank(r, "Budget-friendly")[0].cost, 0);
  assert.equal(rank(r, "Most comfortable")[0].shade, 80);
  assert.equal(rank(r, "Fastest")[0].id, "metro-demo");
  assert.equal(
    r.find((x) => x.id === "comfort-demo")!.minutes -
      r.find((x) => x.id === "metro-demo")!.minutes,
    4,
  );
});
test("unsupported pair cannot invent connections", async () => {
  await assert.rejects(
    plan(demo.places[0], demo.places[4], demo, true),
    /outside the demonstration network/,
  );
});
test("short pair has no invented metro service", async () => {
  const r = await plan(demo.places[0], demo.places[2], demo, true);
  assert.equal(r.length, 1);
  assert.equal(r[0].legs[0].mode, "walk");
  assert.equal(r[0].shade, null);
});
test("same point is rejected", async () => {
  await assert.rejects(
    plan(demo.places[0], demo.places[0], demo, true),
    /different locations/,
  );
  assert.equal(distance(demo.places[0], demo.places[0]), 0);
});
