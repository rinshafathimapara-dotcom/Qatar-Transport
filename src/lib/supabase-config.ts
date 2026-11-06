export type SupabaseConfig =
  | { status: "demo" }
  | { status: "ready"; url: string; key: string }
  | { status: "error"; message: string };

// Accept a copied REST endpoint, but initialize the SDK with the project root.
// Keep the agreed ANON_KEY variable name; modern publishable keys work here too.
export function resolveSupabaseConfig(
  rawUrl?: string,
  rawKey?: string,
): SupabaseConfig {
  const input = rawUrl?.trim();
  const key = rawKey?.trim();
  if (!input && !key) return { status: "demo" };
  if (!input || !key) {
    return {
      status: "error",
      message:
        "Supabase setup is incomplete. Add both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the app.",
    };
  }
  try {
    const url = new URL(input);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["/", "", "/rest/v1", "/rest/v1/"].includes(url.pathname)
    ) {
      throw new Error();
    }
    return { status: "ready", url: url.origin, key };
  } catch {
    return {
      status: "error",
      message:
        "Use your Supabase project URL, for example https://your-project.supabase.co, in .env.local. Restart the app after saving.",
    };
  }
}
