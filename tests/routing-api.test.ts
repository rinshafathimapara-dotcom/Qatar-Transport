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

test("shade-aware walking API uses connected road geometry and reports physical walking time", async () => {
  const fixture = (await import("../src/data/shade-presentation.json")).default;
  const base = await walk(request({ from: fixture.from, to: fixture.to }));
  const standard = await base.json();
  const weighted = await walk(
    request({
      from: fixture.from,
      to: fixture.to,
      preferShade: true,
      shadeSegments: fixture.segments,
    }),
  );
  assert.equal(weighted.status, 200);
  const alternate = await weighted.json();
  assert.notDeepEqual(alternate.coordinates, standard.coordinates);
  assert.ok(alternate.distance > standard.distance);
  assert.ok(alternate.minutes <= 20);
  assert.equal(alternate.minutes, Math.ceil(alternate.distance / 75));
  const invalid = await walk(
    request({
      from: fixture.from,
      to: fixture.to,
      preferShade: true,
      shadeSegments: [{ is_demo: true }],
    }),
  );
  assert.equal(invalid.status, 400);
});

test("weather shade multiplier is accepted within bounds and invalid values are rejected", async () => {
  const fixture = (await import("../src/data/shade-presentation.json")).default;
  const body = {
    from: fixture.from,
    to: fixture.to,
    preferShade: true,
    shadeSegments: fixture.segments,
  };
  const weighted = await walk(request({ ...body, shadeWeightMultiplier: 3.5 }));
  assert.equal(weighted.status, 200);
  const invalid = await walk(request({ ...body, shadeWeightMultiplier: 99 }));
  assert.equal(invalid.status, 400);
});
