import test from "node:test";
import assert from "node:assert/strict";
import {
  alongPath,
  isAtDecision,
  expectedOpen,
  validatePassages,
} from "../src/services/navigation";
import type { IndoorPassage } from "../src/types/database";
const passage: IndoorPassage = {
  id: "test",
  name: "Test passage",
  entry: { id: "a", name: "Reviewed entry", latitude: 25.28, longitude: 51.53 },
  exit: { id: "b", name: "Reviewed exit", latitude: 25.281, longitude: 51.531 },
  coordinates: [
    [51.53, 25.28],
    [51.531, 25.281],
  ],
  footprint: [
    [51.5299, 25.2799],
    [51.5311, 25.2799],
    [51.5311, 25.2811],
    [51.5299, 25.2811],
    [51.5299, 25.2799],
  ],
  schedule: [{ days: [0, 1, 2, 3, 4, 5, 6], opens: "08:00", closes: "22:00" }],
  source: "Reviewed test fixture",
  verifiedAt: "2026-11-01T00:00:00Z",
  validUntil: "2027-01-01T00:00:00Z",
  publicAccess: true,
  airConditioned: false,
  isDemo: false,
  notes: "Test only",
};
test("uncertain or stale GPS cannot trigger a doorway decision", () => {
  const now = 100000,
    fix = { ...passage.entry, accuracy: 5, timestamp: now };
  assert.ok(isAtDecision(fix, passage, now));
  assert.equal(isAtDecision({ ...fix, accuracy: 80 }, passage, now), false);
  assert.equal(
    isAtDecision({ ...fix, timestamp: now - 30000 }, passage, now),
    false,
  );
});
test("hours are evaluated in Qatar time and expired access is not offered", () => {
  assert.ok(expectedOpen(passage, new Date("2026-11-07T09:00:00+03:00")));
  assert.equal(
    expectedOpen(passage, new Date("2026-11-07T23:00:00+03:00")),
    false,
  );
  assert.equal(
    expectedOpen(
      { ...passage, validUntil: "2026-11-06" },
      new Date("2026-11-07T09:00:00+03:00"),
    ),
    false,
  );
});
test("hypothetical demo doors cannot enter live navigation registry", () => {
  assert.equal(validatePassages([passage]).length, 1);
  assert.equal(validatePassages([{ ...passage, isDemo: true }]).length, 0);
  assert.equal(
    validatePassages([
      {
        ...passage,
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    ]).length,
    0,
  );
});
test("route progress follows polyline distance instead of only endpoint displacement", () => {
  const p = alongPath({ longitude: 51.531, latitude: 25.28 }, [
    [51.53, 25.28],
    [51.531, 25.28],
    [51.531, 25.281],
  ]);
  assert.ok(p.distance < 1);
  assert.ok(p.progress > 90);
  assert.ok(p.remaining > 100);
});
