import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import type { Location } from "@/types/database";
import { searchLocations } from "./location-index";
let index: Promise<Location[]> | undefined;
export async function searchQatar(query: string) {
  index ??= readFile(
    path.join(process.cwd(), "data/geocoding/qatar-places.json.gz"),
  )
    .then((b) => JSON.parse(gunzipSync(b).toString()).places as Location[])
    .catch((e) => {
      index = undefined;
      throw e;
    });
  return searchLocations(await index, query, 60);
}
