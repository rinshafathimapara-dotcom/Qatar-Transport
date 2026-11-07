import type { Leg, Location } from "@/types/database";
import { alongPath } from "./navigation";
export type WalkPhase =
  "entering" | "walking" | "choice" | "indoors" | "exit" | "complete";
export type WalkState = {
  phase: WalkPhase;
  metres: number;
  indoorMetres: number;
  branch: null | "inside" | "outside";
};
export const initialWalkState: WalkState = {
  phase: "entering",
  metres: 0,
  indoorMetres: 0,
  branch: null,
};
export function advanceWalk(
  state: WalkState,
  delta: number,
  total: number,
  pauseAt: number | null,
): WalkState {
  const step = Math.max(0, delta);
  if (state.phase === "indoors") {
    const next = Math.min(70, state.indoorMetres + step);
    return {
      ...state,
      indoorMetres: next,
      phase: next >= 70 ? "exit" : "indoors",
    };
  }
  if (state.phase !== "walking") return state;
  const next = Math.min(total, state.metres + step);
  if (pauseAt !== null && !state.branch && next >= pauseAt)
    return { ...state, metres: pauseAt, phase: "choice" };
  return {
    ...state,
    metres: next,
    phase: next >= total ? "complete" : "walking",
  };
}
export function chooseWalk(
  state: WalkState,
  branch: "inside" | "outside",
): WalkState {
  if (state.phase !== "choice") return state;
  return {
    ...state,
    branch,
    phase: branch === "inside" ? "indoors" : "walking",
  };
}
export function mallAlongWalk(leg: Leg, places: Location[]) {
  const candidates = places
    .filter(
      (p) =>
        /mall|shopping/i.test(p.category ?? "") ||
        /mall|city cent(?:er|re)|vend[oô]me/i.test(p.name),
    )
    .map((place) => ({ place, ...alongPath(place, leg.coordinates) }))
    .filter((p) => p.distance <= 200 && p.progress > 15 && p.remaining > 15)
    .sort((a, b) => a.distance - b.distance);
  return candidates[0] ?? null;
}
