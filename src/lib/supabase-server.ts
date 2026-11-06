import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
// Request-scoped user client. Verify bearer tokens with getUser before private reads.
// The service role is deliberately never read or needed by this application.
export async function userServerClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const client = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Please sign in again.");
  return { client, user: data.user };
}
