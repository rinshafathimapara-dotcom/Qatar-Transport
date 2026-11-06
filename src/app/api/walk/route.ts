import { NextResponse } from "next/server";
export async function POST(req: Request) {
  if (!process.env.GRAPHHOPPER_URL)
    return NextResponse.json(
      {
        error:
          "No pedestrian routing provider is configured. Try the demo network or configure GraphHopper.",
      },
      { status: 503 },
    );
  try {
    const { from, to } = await req.json();
    for (const p of [from, to])
      if (
        !p ||
        !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) ||
        p.latitude < 24 ||
        p.latitude > 27 ||
        p.longitude < 50 ||
        p.longitude > 52.5
      )
        return NextResponse.json(
          { error: "Choose locations in Qatar." },
          { status: 400 },
        );
    const url = new URL(
      "route",
      process.env.GRAPHHOPPER_URL!.replace(/\/?$/, "/"),
    );
    url.searchParams.append("point", `${from.latitude},${from.longitude}`);
    url.searchParams.append("point", `${to.latitude},${to.longitude}`);
    url.searchParams.set("profile", "foot");
    url.searchParams.set("points_encoded", "false");
    if (process.env.GRAPHHOPPER_API_KEY)
      url.searchParams.set("key", process.env.GRAPHHOPPER_API_KEY);
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error();
    const p = (await res.json()).paths?.[0];
    if (!p?.points?.coordinates) throw new Error();
    return NextResponse.json({
      coordinates: p.points.coordinates,
      minutes: Math.ceil(p.time / 60000),
      distance: Math.round(p.distance),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The pedestrian provider could not find a route. Please try again.",
      },
      { status: 502 },
    );
  }
}
