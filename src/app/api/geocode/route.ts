import { NextResponse } from "next/server";
import { searchQatar } from "@/services/local-geocoder";
const cache = new Map<string, { at: number; data: unknown }>();
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2 || q.length > 160) return NextResponse.json([]);
  if (!process.env.PHOTON_URL) {
    try {
      return NextResponse.json(await searchQatar(q));
    } catch {
      return NextResponse.json(
        { error: "Location index unavailable" },
        { status: 503 },
      );
    }
  }
  const hit = cache.get(q.toLowerCase());
  if (hit && Date.now() - hit.at < 86400000) return NextResponse.json(hit.data);
  try {
    const url = new URL("api/", process.env.PHOTON_URL.replace(/\/?$/, "/"));
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "30");
    url.searchParams.set("bbox", "50.7,24.4,51.7,26.3");
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error();
    const body = await res.json();
    const data = (body.features || []).map(
      (f: {
        geometry: { coordinates: number[] };
        properties: { osm_id?: string; name?: string; city?: string };
      }) => ({
        id: `geo-${f.properties.osm_id}`,
        name: f.properties.name || f.properties.city || q,
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
      }),
    );
    if (cache.size > 500) cache.clear();
    cache.set(q.toLowerCase(), { at: Date.now(), data });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Geocoder unavailable" },
      { status: 502 },
    );
  }
}
