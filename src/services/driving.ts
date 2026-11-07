import type { Location } from "@/types/database";
export type DrivingResult =
  | {
      available: true;
      coordinates: [number, number][];
      distance: number;
      minutes: number;
      source: string;
    }
  | { available: false; reason: string };
export interface DrivingProvider {
  route(from: Location, to: Location): Promise<DrivingResult>;
}
export const drivingProvider: DrivingProvider = {
  async route(from, to) {
    try {
      const response = await fetch("/api/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const body = await response.json();
      if (!response.ok)
        return {
          available: false,
          reason: body.error || "Driving route unavailable.",
        };
      return body;
    } catch {
      return {
        available: false,
        reason: "Driving route could not load. Try the journey search again.",
      };
    }
  },
};
