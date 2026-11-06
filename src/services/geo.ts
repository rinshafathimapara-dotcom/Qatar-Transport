import type { Location } from "@/types/database";
export function distance(
  a: Pick<Location, "latitude" | "longitude">,
  b: Pick<Location, "latitude" | "longitude">,
) {
  const rad = (n: number) => (n * Math.PI) / 180,
    dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export const coord = (
  p: Pick<Location, "latitude" | "longitude">,
): [number, number] => [p.longitude, p.latitude];
export interface Geocoder {
  search(query: string, signal?: AbortSignal): Promise<Location[]>;
}
export const geocoder: Geocoder = {
  async search(query, signal) {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
      signal,
    });
    if (!res.ok)
      throw new Error(
        "Location search is unavailable. Choose a dataset place or a map point.",
      );
    return res.json();
  },
};
export interface WalkingProvider {
  route(
    from: Location,
    to: Location,
  ): Promise<{
    coordinates: [number, number][];
    minutes: number;
    distance: number;
  }>;
}
export const walkingProvider: WalkingProvider = {
  async route(from, to) {
    const res = await fetch("/api/walk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Walking routing unavailable");
    return data;
  },
};
