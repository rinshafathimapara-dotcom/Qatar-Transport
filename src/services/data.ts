import { readPages } from "./records";
import { supabase, supabaseConfig } from "@/lib/supabase";
import { demo } from "@/data/demo";
import type { Collection } from "@/types/database";

// Explicit columns enforce the teammate's final contract at the API boundary.
import contract from "@/data/backend-contract.json";
export const datasetColumns = Object.fromEntries(
  (Object.keys(demo) as (keyof Collection)[]).map((name) => [
    name,
    contract[name],
  ]),
) as Record<keyof Collection, string>;
const demoTables = new Set([
  "places",
  "transport_stops",
  "transit_routes",
  "parking_locations",
  "parking_status",
  "shade_segments",
  "demand_forecasts",
]);
export async function loadDataset({
  includeDemo = false,
}: { includeDemo?: boolean } = {}): Promise<Collection> {
  if (supabaseConfig.status === "error")
    throw new Error(supabaseConfig.message);
  if (!supabase) return structuredClone(demo);
  const names = Object.keys(datasetColumns) as (keyof Collection)[];
  const entries = await Promise.all(
    names.map(async (name) => {
      const data = await readPages(async (from, to) => {
        let query = supabase!
          .from(name)
          .select(datasetColumns[name])
          .order("id")
          .range(from, to);
        if (!includeDemo && demoTables.has(name))
          query = query.filter("is_demo", "eq", false);
        const result = await query.abortSignal(AbortSignal.timeout(15000));
        return {
          data: result.data as unknown as { id: string }[] | null,
          error: result.error,
        };
      }).catch((error) => {
        throw new Error(`${name}: ${error.message}`);
      });
      return [name, data] as const;
    }),
  );
  const result = Object.fromEntries(entries) as unknown as Collection;
  // Join tables have no is_demo column; inherit inclusion from their parents.
  const routes = new Set(result.transit_routes.map((r) => r.id));
  const stops = new Set(result.transport_stops.map((s) => s.id));
  result.transit_route_stops = result.transit_route_stops.filter(
    (s) => routes.has(s.route_id) && stops.has(s.stop_id),
  );
  result.transit_schedules = result.transit_schedules.filter(
    (s) =>
      routes.has(s.route_id) &&
      stops.has(s.from_stop_id) &&
      stops.has(s.to_stop_id),
  );
  return result;
}
