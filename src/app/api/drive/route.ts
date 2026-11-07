import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { from, to } = await req.json();
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
    if (!process.env.DRIVING_GRAPHHOPPER_URL)
      return NextResponse.json({
        available: false,
        reason:
          "A driving-routing provider is not configured. A road route is required for a Karwa estimate.",
      });
    const url = new URL(
      "route",
      process.env.DRIVING_GRAPHHOPPER_URL.replace(/\/?$/, "/"),
    );
    url.searchParams.append("point", `${from.latitude},${from.longitude}`);
    url.searchParams.append("point", `${to.latitude},${to.longitude}`);
    const profile = process.env.DRIVING_GRAPHHOPPER_PROFILE || "car";
    if (/foot|walk|hike|bike|bicycle/i.test(profile))
      return NextResponse.json({
        available: false,
        reason:
          "The driving adapter needs a car profile; pedestrian/cycling profiles cannot supply taxi distance.",
      });
    url.searchParams.set("profile", profile);
    url.searchParams.set("points_encoded", "false");
    if (process.env.DRIVING_GRAPHHOPPER_API_KEY)
      url.searchParams.set("key", process.env.DRIVING_GRAPHHOPPER_API_KEY);
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error("provider unavailable");
    const p = (await response.json()).paths?.[0];
    if (
      !Number.isFinite(p?.distance) ||
      p.distance <= 0 ||
      !Number.isFinite(p?.time) ||
      p.time < 0 ||
      !Array.isArray(p.points?.coordinates) ||
      p.points.coordinates.length < 2 ||
      p.points.coordinates.some(
        (q: unknown) =>
          !Array.isArray(q) ||
          q.length !== 2 ||
          !Number.isFinite(q[0]) ||
          !Number.isFinite(q[1]),
      )
    )
      throw Error("invalid driving response");
    return NextResponse.json({
      available: true,
      coordinates: p.points.coordinates,
      distance: Math.round(p.distance),
      minutes: Math.max(1, Math.ceil(p.time / 60000)),
      source: "Configured GraphHopper driving provider",
    });
  } catch {
    return NextResponse.json({
      available: false,
      reason:
        "The driving route could not be retrieved. No walking-distance fare has been substituted.",
    });
  }
}
