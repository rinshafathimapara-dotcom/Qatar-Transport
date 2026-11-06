import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient<Database>(url, key) : null;
export const isDemo = !supabase;
