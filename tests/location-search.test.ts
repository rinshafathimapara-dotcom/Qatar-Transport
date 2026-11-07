import test from "node:test";
import assert from "node:assert/strict";
import { searchQatar } from "../src/services/local-geocoder";
import {
  searchLocations,
  coordinateLocation,
} from "../src/services/location-index";
test("bundled Qatar search finds landmarks beyond imported backend places", async () => {
  for (const name of ["Villaggio", "Hamad", "Lusail", "الدوحة"])
    assert.ok((await searchQatar(name)).length > 0, name);
});
test("search ranks exact matches and supports Arabic aliases and addresses", () => {
  const rows = [
    { id: "1", name: "Doha Mall cafe", latitude: 25, longitude: 51 },
    {
      id: "2",
      name: "Doha Mall",
      aliases: "مول الدوحة",
      address: "Street 200",
      latitude: 25,
      longitude: 51,
    },
  ];
  assert.equal(searchLocations(rows, "Doha Mall")[0].id, "2");
  assert.equal(searchLocations(rows, "مول الدوحة")[0].id, "2");
  assert.equal(searchLocations(rows, "street 200")[0].id, "2");
  assert.equal(searchLocations(rows, "missing").length, 0);
});
test("coordinates allow arbitrary Qatar points without fabricated places", () => {
  assert.equal(coordinateLocation("25.3, 51.5")?.latitude, 25.3);
  assert.equal(coordinateLocation("99, 190"), null);
});
