import { NextResponse } from "next/server";
import { transitShape } from "@/lib/transit-geometry.server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { mode, name, coordinates } = await request.json();
    if (
      !["metro", "tram"].includes(mode) ||
      typeof name !== "string" ||
      name.length > 200 ||
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      coordinates.length > 40 ||
      coordinates.some(
        (p) =>
          !Array.isArray(p) ||
          p.length !== 2 ||
          !Number.isFinite(p[0]) ||
          !Number.isFinite(p[1]) ||
          p[0] < 50 ||
          p[0] > 52.5 ||
          p[1] < 24 ||
          p[1] > 27,
      )
    )
      return NextResponse.json(
        { error: "Invalid transit shape request." },
        { status: 400 },
      );
    return NextResponse.json(
      await transitShape(
        mode,
        name,
        coordinates.map((p: [number, number], i: number) => ({
          id: String(i),
          name: "Transit stop",
          longitude: p[0],
          latitude: p[1],
        })),
      ),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transit shape unavailable",
      },
      { status: 422 },
    );
  }
}
