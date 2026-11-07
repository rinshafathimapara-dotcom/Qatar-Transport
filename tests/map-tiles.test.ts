import test from "node:test";
import assert from "node:assert/strict";
import { resolveMapTiles } from "../src/lib/map-tiles";
test("no credentials makes no request to a public tile demo server", () => {
  assert.equal(resolveMapTiles({}).status, "unconfigured");
});
test("CARTO uses the supplied key and both provider credits", () => {
  const c = resolveMapTiles({ cartoKey: " a&b " });
  assert.equal(c.status, "ready");
  if (c.status === "ready") {
    assert.match(c.url, /key=a%26b$/);
    assert.match(c.attribution, /CARTO/);
    assert.match(c.attribution, /OpenStreetMap/);
  }
});
test("blocked OSM hosts cannot be used as an alternate fallback", () => {
  for (const host of ["tile.openstreetmap.org", "a.tile.openstreetmap.org"])
    assert.equal(
      resolveMapTiles({
        customUrl: `https://${host}/{z}/{x}/{y}.png`,
        customAttribution: "OSM",
      }).status,
      "invalid",
    );
});
test("custom providers require valid templates and attribution", () => {
  assert.equal(
    resolveMapTiles({ customUrl: "https://tiles.example.org/{z}/{x}/{y}.png" })
      .status,
    "invalid",
  );
  assert.equal(
    resolveMapTiles({
      customUrl: "https://tiles.example.org/map.png",
      customAttribution: "Provider",
    }).status,
    "invalid",
  );
  const c = resolveMapTiles({
    customUrl: "https://tiles.example.org/{z}/{x}/{y}.png",
    customAttribution: "Provider <script>",
  });
  assert.equal(c.status, "ready");
  if (c.status === "ready") {
    assert.match(c.attribution, /&lt;script&gt;/);
    assert.doesNotMatch(c.attribution, /<script>/);
  }
});
