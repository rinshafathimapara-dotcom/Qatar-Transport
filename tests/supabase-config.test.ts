import test from "node:test";
import assert from "node:assert/strict";
import { resolveSupabaseConfig } from "../src/lib/supabase-config";

test("normalizes a copied REST endpoint and accepts publishable keys", () => {
  assert.deepEqual(
    resolveSupabaseConfig(
      " https://example.supabase.co/rest/v1/ ",
      " sb_publishable_test ",
    ),
    {
      status: "ready",
      url: "https://example.supabase.co",
      key: "sb_publishable_test",
    },
  );
});
test("only wholly unconfigured projects use demo mode", () => {
  assert.equal(resolveSupabaseConfig().status, "demo");
  assert.equal(
    resolveSupabaseConfig("https://example.supabase.co").status,
    "error",
  );
  assert.equal(resolveSupabaseConfig(undefined, "test-key").status, "error");
});
test("rejects unrelated URL paths and URL credentials", () => {
  assert.equal(
    resolveSupabaseConfig("https://example.supabase.co/not-a-project", "test")
      .status,
    "error",
  );
  assert.equal(
    resolveSupabaseConfig("https://user:pass@example.supabase.co/", "test")
      .status,
    "error",
  );
});
