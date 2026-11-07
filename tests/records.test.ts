import test from "node:test";
import assert from "node:assert/strict";
import { readPages } from "../src/services/records";
import {
  dataStatus,
  displayNumber,
  qatarTimestamp,
} from "../src/services/provenance";
test("pagination retrieves beyond an API row limit and removes duplicate IDs", async () => {
  const data = Array.from({ length: 1724 }, (_, i) => ({ id: String(i) }));
  const rows = await readPages(async (a, b) => ({
    data: data.slice(a, b + 1),
    error: null,
  }));
  assert.equal(rows.length, 1724);
  const duplicates = await readPages(
    async (a) => ({
      data: a === 0 ? [{ id: "a" }, { id: "b" }] : [{ id: "b" }],
      error: null,
    }),
    2,
  );
  assert.equal(duplicates.length, 2);
});
test("read failures and an endless full-page response are surfaced", async () => {
  await assert.rejects(
    readPages(async () => ({
      data: null,
      error: { message: "RLS permissions" },
    })),
    /RLS/,
  );
  await assert.rejects(
    readPages(async () => ({ data: [{ id: "x" }], error: null }), 1, 2),
    /page limit/,
  );
});
test("status follows explicit provenance and nullable metrics render safely", () => {
  assert.equal(
    dataStatus({ is_demo: false }, "DEMO DATASET — illustrative reference"),
    "Illustrative",
  );
  assert.equal(dataStatus({ is_demo: true }), "Illustrative");
  assert.equal(dataStatus({ is_demo: false }), "Reference data");
  assert.equal(displayNumber(null), "Not supplied");
  assert.equal(displayNumber(29, "°C"), "29°C");
  assert.equal(qatarTimestamp("bad"), "Timestamp not supplied");
});
