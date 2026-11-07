import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/drive/route";
import { plan } from "../src/services/planner";
import { demo } from "../src/data/demo";
const request = (body: unknown) =>
  new Request("http://localhost/api/drive", {
    method: "POST",
    body: JSON.stringify(body),
  });
test("unconfigured driving API returns an unavailable state, not a walking proxy", async () => {
  const saved = process.env.DRIVING_GRAPHHOPPER_URL;
  delete process.env.DRIVING_GRAPHHOPPER_URL;
  try {
    const r = await POST(request({ from: demo.places[0], to: demo.places[1] }));
    const b = await r.json();
    assert.equal(b.available, false);
    assert.match(b.reason, /driving-routing provider/);
    assert.equal(b.distance, undefined);
    assert.equal(
      (
        await POST(
          request({ from: { latitude: 0, longitude: 0 }, to: demo.places[1] }),
        )
      ).status,
      400,
    );
  } finally {
    if (saved) process.env.DRIVING_GRAPHHOPPER_URL = saved;
  }
});
test("planner uses one driving distance for the taxi leg, summary and fare, without replacing walking geometry", async () => {
  const results = await plan(demo.places[0], demo.places[3], demo, true, {
    walker: {
      async route(a, b) {
        return {
          minutes: 8,
          distance: 600,
          coordinates: [
            [a.longitude, a.latitude],
            [b.longitude, b.latitude],
          ],
        };
      },
    },
    driver: {
      async route(a, b) {
        return {
          available: true,
          minutes: 12,
          distance: 8000,
          coordinates: [
            [a.longitude, a.latitude],
            [51.52, 25.29],
            [b.longitude, b.latitude],
          ],
          source: "Test driving adapter",
        };
      },
    },
  });
  const taxi = results.find((r) => r.id === "karwa-taxi")!;
  assert.equal(taxi.distance, 8000);
  assert.equal(taxi.legs[0].distance, 8000);
  assert.equal(taxi.fare?.amount, 16.8);
  assert.equal(taxi.cost, 16.8);
  assert.equal(taxi.legs[0].geometry, "routed-driving");
  assert.equal(results.find((r) => r.id === "walking")?.distance, 600);
});
