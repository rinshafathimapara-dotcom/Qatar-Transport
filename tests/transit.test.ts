import test from "node:test";
import assert from "node:assert/strict";
import { demo } from "../src/data/demo";
import { approximateTransit } from "../src/services/transit";
import { normalizePriority, storedPriority } from "../src/services/preferences";
function network() {
  const data = structuredClone(demo);
  data.transit_schedules = [
    {
      id: "s1",
      route_id: "red",
      from_stop_id: "msh",
      to_stop_id: "west",
      departure_time: "09:00:00",
      arrival_time: "09:10:00",
      days_of_week: ["Monday"],
    },
    {
      id: "s2",
      route_id: "red",
      from_stop_id: "west",
      to_stop_id: "kat",
      departure_time: "09:12:00",
      arrival_time: "09:20:00",
      days_of_week: ["Monday"],
    },
  ];
  return data;
}
test("MVP uses imported forward edges and labels schedule/geometry limits", () => {
  const r = approximateTransit(demo.places[0], demo.places[1], network());
  assert.equal(r.length, 1);
  assert.equal(r[0].legs[1].minutes, 18);
  assert.equal(r[0].isApproximate, true);
  assert.equal(r[0].cost, null);
  assert.match(r[0].warning, /Waiting time/);
});
test("missing schedules cannot become a made-up connection", () => {
  assert.equal(
    approximateTransit(demo.places[0], demo.places[1], demo).length,
    0,
  );
});
test("reverse service and duplicate sequences are not assumed", () => {
  const data = network();
  assert.equal(
    approximateTransit(demo.places[1], demo.places[0], data).length,
    0,
  );
  data.transit_route_stops[1].stop_sequence = 1;
  assert.equal(
    approximateTransit(demo.places[0], demo.places[1], data).length,
    0,
  );
});
test("backend priority vocabulary round-trips into existing controls", () => {
  assert.equal(normalizePriority("cheapest"), "Budget-friendly");
  assert.equal(storedPriority("Budget-friendly"), "cheapest");
  assert.equal(normalizePriority("balanced"), "Balanced");
  assert.equal(normalizePriority("fastest"), "Fastest");
});
