import test from "node:test";
import assert from "node:assert/strict";
import { demo } from "../src/data/demo";
import { approximateTransit } from "../src/services/transit";
import { plan, rank } from "../src/services/planner";
import type { WalkingProvider } from "../src/services/geo";
const walker: WalkingProvider = {
  async route(from, to) {
    return {
      coordinates: [
        [from.longitude, from.latitude],
        [from.longitude + 0.0001, from.latitude],
        [to.longitude, to.latitude],
      ],
      distance: 2000,
      minutes: 12,
      source: "Test network",
      snappedFrom: 0,
      snappedTo: 0,
    };
  },
};
test("even demo endpoints use a routed walking geometry, never a straight-line fallback", async () => {
  const r = await plan(demo.places[0], demo.places[3], demo, true, { walker });
  assert.ok(r.length);
  assert.equal(r[0].legs[0].geometry, "routed");
  assert.equal(r[0].legs[0].coordinates.length, 3);
  assert.equal(r[0].shade, null);
  assert.match(r[0].warning, /unknown/);
});
test("provider failure does not fabricate a route", async () => {
  await assert.rejects(
    plan(demo.places[0], demo.places[3], demo, true, {
      walker: {
        async route() {
          throw new Error("No connected path");
        },
      },
    }),
    /No connected path/,
  );
});
test("same point is rejected before provider calls", async () => {
  await assert.rejects(
    plan(demo.places[0], demo.places[0], demo, true, { walker }),
    /different locations/,
  );
});
test("ranking considers distance and budget without inventing shade", async () => {
  const [a] = await plan(demo.places[0], demo.places[3], demo, true, {
    walker,
  });
  const b = { ...a, id: "paid", minutes: 8, distance: 1500, cost: 3 };
  assert.equal(rank([a, b], "Fastest")[0].id, "paid");
  assert.equal(rank([a, b], "Budget-friendly")[0].id, "walking");
  assert.equal(rank([a, b], "Shortest")[0].id, "paid");
});

test("long walks are excluded, including when a larger budget is requested", async () => {
  await assert.rejects(
    plan(demo.places[0], demo.places[3], demo, true, {
      maxWalkingMinutes: 151,
      walker: {
        async route(a, b) {
          return { ...(await walker.route(a, b)), minutes: 151 };
        },
      },
    }),
    /20-minute total walking budget/,
  );
});
test("walking budget applies to combined transit access and egress, not just individual legs", async () => {
  assert.ok(
    approximateTransit(demo.places[0], demo.places[1], demo).length > 0,
  );
  const routes = await plan(demo.places[0], demo.places[1], demo, true, {
    walker,
  });
  assert.ok(
    routes.every(
      (r) =>
        r.legs
          .filter((l) => l.mode === "walk")
          .reduce((sum, l) => sum + l.minutes, 0) <= 20,
    ),
  );
  assert.ok(
    routes.every((r) => !r.legs.some((l) => l.mode !== "walk")),
    "two 12-minute walking legs exceed the 20-minute total budget",
  );
  await assert.rejects(
    plan(demo.places[0], demo.places[1], demo, true, {
      walker,
      maxWalkingMinutes: 10,
    }),
    /10-minute total walking budget/,
  );
});
