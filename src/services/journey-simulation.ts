import { distance } from "./geo";
export type Point = [number, number];
export function pathLength(path: Point[]) {
  return path
    .slice(1)
    .reduce(
      (n, p, i) =>
        n +
        distance(
          { longitude: path[i][0], latitude: path[i][1] },
          { longitude: p[0], latitude: p[1] },
        ),
      0,
    );
}
export function pointAt(path: Point[], metres: number): Point {
  let left = Math.max(0, metres);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      d = pathLength([a, b]);
    if (left <= d) {
      const t = d ? left / d : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    left -= d;
  }
  return path.at(-1)!;
}
export type Simulation = {
  status: "ready" | "countdown" | "walking" | "paused" | "decision" | "arrived";
  metres: number;
  branch: "inside" | "outside" | null;
};
export const initialSimulation: Simulation = {
  status: "ready",
  metres: 0,
  branch: null,
};
export function advance(
  state: Simulation,
  increment: number,
  decision: number,
  total: number,
): Simulation {
  if (state.status !== "walking") return state;
  const next = Math.min(total, state.metres + Math.max(0, increment));
  if (!state.branch && next >= decision)
    return { ...state, metres: decision, status: "decision" };
  return {
    ...state,
    metres: next,
    status: next >= total ? "arrived" : "walking",
  };
}
