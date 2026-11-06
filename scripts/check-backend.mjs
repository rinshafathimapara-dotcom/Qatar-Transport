import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import contract from "../src/data/backend-contract.json" with { type: "json" };
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
const input = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!input || !key) {
  console.error(
    "Add the two public Supabase values to .env.local first. See .env.example.",
  );
  process.exit(1);
}
let url;
try {
  url = new URL(input).origin;
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tables = [
  "places",
  "transport_stops",
  "transit_routes",
  "transit_route_stops",
  "transit_schedules",
  "parking_locations",
  "parking_status",
  "shade_segments",
  "demand_forecasts",
  "data_sources",
];
// Only count public dataset rows. Never print keys, records or personal data.
const results = await Promise.all(
  tables.map(async (table) => {
    const { count, error } = await client
      .from(table)
      .select(contract[table], { count: "exact", head: true })
      .abortSignal(AbortSignal.timeout(15000));
    return {
      table,
      rows_visible: count ?? "unknown",
      result: error ? `${error.code || "ERROR"}: ${error.message}` : "OK",
    };
  }),
);
console.table(results);
if (results.some((r) => r.result !== "OK")) process.exitCode = 1;
else if (results.every((r) => r.rows_visible === 0)) {
  console.log(
    "Connected, but no public dataset rows are visible. Check imports and RLS read policies. This does not establish that the underlying tables are empty.",
  );
} else
  console.log(
    "Public dataset queries succeeded. Private-data policies and user sign-in need separate testing.",
  );
