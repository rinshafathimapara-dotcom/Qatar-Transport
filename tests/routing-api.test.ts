import test from "node:test";
import assert from "node:assert/strict";
import { POST as walk } from "../src/app/api/walk/route";
import { POST as shape } from "../src/app/api/transit-shape/route";
const request = (body: unknown) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
test("walking API returns road geometry and validates coordinates", async () => {
  const ok = await walk(
    request({
      from: { latitude: 25.2855, longitude: 51.5294 },
      to: { latitude: 25.2953, longitude: 51.539 },
    }),
  );
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(body.coordinates.length > 50);
  assert.ok(body.distance > 1500);
  assert.match(body.source, /OSM/);
  const invalid = await walk(
    request({
      from: { latitude: 0, longitude: 0 },
      to: { latitude: 25.2953, longitude: 51.539 },
    }),
  );
  assert.equal(invalid.status, 400);
});
test("rail API uses actual mapped track geometry when the line is unambiguous", async () => {
  const response = await shape(
    request({
      mode: "metro",
      name: "Red Line",
      coordinates: [
        [51.5255767, 25.282817],
        [51.52174318, 25.36225434],
      ],
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.coordinates.length > 20);
  assert.ok(body.distance > 9000 && body.distance < 14000);
  assert.match(body.source, /openstreetmap.org\/relation/);
});
test("unknown rail geometry cannot become a straight line", async () => {
  const response = await shape(
    request({
      mode: "metro",
      name: "Unknown imaginary line",
      coordinates: [
        [51.5255767, 25.282817],
        [51.52174318, 25.36225434],
      ],
    }),
  );
  assert.equal(response.status, 422);
});
