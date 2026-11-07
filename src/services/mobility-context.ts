import { supabase } from "@/lib/supabase";
import contract from "@/data/backend-contract.json";
import {
  emptyMobilityContext,
  type MobilityContext,
} from "@/types/mobility-context";
import { readPages } from "./records";
export async function loadMobilityContext(
  includeIllustrative: boolean,
): Promise<{ data: MobilityContext; issues: string[] }> {
  const data = structuredClone(emptyMobilityContext),
    issues: string[] = [];
  if (!supabase) return { data, issues };
  await Promise.all(
    (Object.keys(data) as (keyof MobilityContext)[]).map(async (table) => {
      try {
        const rows = await readPages(async (from, to) => {
          let q = supabase!
            .from(table)
            .select(contract[table])
            .order("id")
            .range(from, to);
          if (!includeIllustrative) q = q.eq("is_demo", false);
          const result = await q.abortSignal(AbortSignal.timeout(15000));
          return {
            data: result.data as unknown as { id: string }[] | null,
            error: result.error,
          };
        });
        Object.assign(data, { [table]: rows });
      } catch (e) {
        issues.push(`${table}: ${(e as Error).message}`);
      }
    }),
  );
  return { data, issues };
}
