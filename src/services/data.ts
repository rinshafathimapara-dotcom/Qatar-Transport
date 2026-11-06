import { supabase, supabaseConfig } from "@/lib/supabase";
import { demo } from "@/data/demo";
import type { Collection } from "@/types/database";
export async function loadDataset(): Promise<Collection> {
  if (supabaseConfig.status === "error")
    throw new Error(supabaseConfig.message);
  if (!supabase) return structuredClone(demo);
  const names = Object.keys(demo) as (keyof Collection)[];
  const entries = await Promise.all(
    names.map(async (name) => {
      const { data, error } = await supabase!
        .from(name)
        .select("*")
        .limit(2000);
      if (error) throw new Error(`${name}: ${error.message}`);
      return [name, data] as const;
    }),
  );
  return Object.fromEntries(entries) as Collection;
}
