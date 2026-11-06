import type { Priority } from "@/types/database";
export function normalizePriority(value: string): Priority {
  const v = value.trim().toLowerCase();
  if (v === "balanced") return "Balanced";
  if (v === "cheapest" || v === "budget-friendly") return "Budget-friendly";
  if (v === "shortest") return "Shortest";
  if (v === "most comfortable" || v === "comfortable")
    return "Most comfortable";
  return "Fastest";
}
export function storedPriority(value: string): string {
  const p = normalizePriority(value);
  return p === "Budget-friendly" ? "cheapest" : p.toLowerCase();
}
