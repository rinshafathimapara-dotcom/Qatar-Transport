import type { Location, WalkingInstruction } from "@/types/database";
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
export type WalkingResult = {
  coordinates: [number, number][];
  minutes: number;
  distance: number;
  instructions?: WalkingInstruction[];
  source?: string;
  networkDate?: string;
  snappedFrom?: number;
  snappedTo?: number;
};
export interface WalkingProvider {
  route(
    from: Location,
    to: Location,
    options?: {
      avoidPolygons?: [number, number][][];
      preferShade?: boolean;
      shadeSegments?: import("./shade").ShadeObservation[];
    },
  ): Promise<WalkingResult>;
}
export const walkingProvider: WalkingProvider = {
  async route(from, to, options) {
    const response = await fetch("/api/walk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, ...options }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Walking routing unavailable");
    return data;
  },
};
