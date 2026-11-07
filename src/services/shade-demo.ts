import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
export interface DemoShadeRoute {
  id: string;
  route_name: string;
  area_name: string;
  origin_name: string;
  destination_name: string;
  distance_m: number;
  walking_minutes: number;
  shade_percent: number;
  exposed_percent: number;
  priority: "balanced" | "shade";
  geometry: { type: "LineString"; coordinates: [number, number][] };
  is_demo: boolean;
}
export function validDemoRoute(value: unknown): value is DemoShadeRoute {
  if (!value || typeof value !== "object") return false;
  const r = value as DemoShadeRoute;
  return (
    r.is_demo === true &&
    ["id", "route_name", "area_name", "origin_name", "destination_name"].every(
      (k) => typeof (r as unknown as Record<string, unknown>)[k] === "string",
    ) &&
    ["balanced", "shade"].includes(r.priority) &&
    Number.isFinite(r.walking_minutes) &&
    r.walking_minutes > 0 &&
    r.walking_minutes <= 20 &&
    Number.isFinite(r.distance_m) &&
    r.distance_m > 0 &&
    Number.isFinite(r.shade_percent) &&
    r.shade_percent >= 0 &&
    r.shade_percent <= 100 &&
    r.geometry?.type === "LineString" &&
    Array.isArray(r.geometry.coordinates) &&
    r.geometry.coordinates.length >= 2 &&
    r.geometry.coordinates.length <= 10000 &&
    r.geometry.coordinates.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        Number.isFinite(p[0]) &&
        Number.isFinite(p[1]) &&
        p[0] >= 50 &&
        p[0] <= 52.5 &&
        p[1] >= 24 &&
        p[1] <= 27,
    )
  );
}
export async function fetchDemoShadeRoutes(): Promise<DemoShadeRoute[]> {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Use the local demonstration below.",
    );
  // Optional teammate-supplied extension, validated at this boundary; the 15-table contract is unchanged.
  const client: SupabaseClient = supabase;
  const { data, error } = await client
    .from("demo_shade_routes")
    .select(
      "id,route_name,area_name,origin_name,destination_name,distance_m,walking_minutes,shade_percent,exposed_percent,priority,geometry,is_demo",
    )
    .eq("is_demo", true)
    .order("area_name")
    .limit(200)
    .abortSignal(AbortSignal.timeout(12000));
  if (error)
    throw new Error(
      error.code === "PGRST205"
        ? "The optional demo_shade_routes table is not available yet. The local presentation works without it."
        : `Shade demonstration could not load (${error.code}). Check the table contract and read permissions.`,
    );
  const rows = data ?? [];
  if (rows.some((r) => !validDemoRoute(r)))
    throw new Error(
      "Some supplied shade demo routes have invalid geometry, missing fields or exceed the 20-minute walking budget.",
    );
  return rows;
}
