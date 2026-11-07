import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const root = new URL("../", import.meta.url);
mkdirSync(new URL("public/workers/", root), { recursive: true });
const worker =
  readFileSync(
    new URL("node_modules/maplibre-gl/dist/maplibre-gl-csp-worker.js", root),
    "utf8",
  )
    .replace(/\/\/# sourceMappingURL=.*$/m, "")
    .trimEnd() + "\n";
writeFileSync(new URL("public/workers/maplibre-worker.js", root), worker);
writeFileSync(
  new URL("public/workers/LICENSE.MapLibre.txt", root),
  readFileSync(new URL("node_modules/maplibre-gl/LICENSE.txt", root)),
);
