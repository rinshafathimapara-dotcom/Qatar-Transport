import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { resolveSupabaseConfig } from "./supabase-config";

export const supabaseConfig = resolveSupabaseConfig(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export const supabase =
  supabaseConfig.status === "ready"
    ? createClient<Database>(supabaseConfig.url, supabaseConfig.key)
    : null;
export const isDemo = supabaseConfig.status === "demo";
