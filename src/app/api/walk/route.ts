import { NextResponse } from "next/server";
import { getWalkingNetwork } from "@/lib/walking-network.server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { from, to, avoidPolygons = [] } = await req.json();
    const valid = (p: { latitude: number; longitude: number }) =>
      p &&
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      p.latitude >= 24 &&
      p.latitude <= 27 &&
      p.longitude >= 50 &&
      p.longitude <= 52.5;
    if (!valid(from) || !valid(to))
      return NextResponse.json(
        { error: "Choose valid locations in Qatar." },
        { status: 400 },
      );
    if (
      !Array.isArray(avoidPolygons) ||
      avoidPolygons.length > 3 ||
      avoidPolygons.some(
        (poly) =>
          !Array.isArray(poly) ||
          poly.length < 4 ||
          poly.length > 100 ||
          poly.some(
            (p) =>
              !Array.isArray(p) ||
              p.length !== 2 ||
              !valid({ longitude: p[0], latitude: p[1] }),
          ),
      )
    )
      return NextResponse.json(
        { error: "Invalid building boundary." },
        { status: 400 },
      );
    if (process.env.GRAPHHOPPER_URL) {
      if (avoidPolygons.length)
        return NextResponse.json(
          {
            error:
              "The configured GraphHopper adapter does not support indoor-building avoidance. Use the bundled graph adapter for this choice.",
          },
          { status: 501 },
        );
      const url = new URL(
        "route",
        process.env.GRAPHHOPPER_URL.replace(/\/?$/, "/"),
      );
      url.searchParams.append("point", `${from.latitude},${from.longitude}`);
      url.searchParams.append("point", `${to.latitude},${to.longitude}`);
      url.searchParams.set("profile", "foot");
      url.searchParams.set("points_encoded", "false");
      if (process.env.GRAPHHOPPER_API_KEY)
        url.searchParams.set("key", process.env.GRAPHHOPPER_API_KEY);
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("Pedestrian provider unavailable.");
      const p = (await response.json()).paths?.[0];
      if (!p?.points?.coordinates)
        throw new Error("No pedestrian route returned.");
      return NextResponse.json({
        coordinates: p.points.coordinates,
        minutes: Math.ceil(p.time / 60000),
        distance: Math.round(p.distance),
        instructions: (p.instructions || []).map(
          (i: { text: string; interval: number[] }) => ({
            text: i.text,
            pointIndex: i.interval[0],
          }),
        ),
        source: "Configured GraphHopper pedestrian provider",
      });
    }
    const graph = await getWalkingNetwork();
    return NextResponse.json(graph.route(from, to, avoidPolygons));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The walking route could not be calculated.",
      },
      { status: 422 },
    );
  }
}
