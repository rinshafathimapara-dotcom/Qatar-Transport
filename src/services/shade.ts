import type { Journey, Rows } from "@/types/database";
import { distance } from "./geo";
export type ShadeLevel = "high" | "medium" | "low" | "unknown";
export type ShadeObservation = Rows["shade_segments"];
export type ShadeSummary = {
  percent: number | null;
  observedPercent: number;
  highPercent: number;
  metres: number;
  synthetic: boolean;
  method: string;
};
export function shadeLevel(value: unknown): ShadeLevel {
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  return s === "high" || s === "medium" || s === "low" ? s : "unknown";
}
export const shadeColor = (value: unknown) =>
  ({ high: "#15805e", medium: "#d7a117", low: "#e87544", unknown: "#788794" })[
    shadeLevel(value)
  ];
type Point = [number, number];
const location = (p: Point) => ({ longitude: p[0], latitude: p[1] });
// Conservative spatial estimate: sample every <=8 m, within 5 m of a segment,
// and within 15 degrees of its direction. Crossings do not count as overlaps.
export function matchShade(
  a: Point,
  b: Point,
  rows: ShadeObservation[],
): ShadeObservation | undefined {
  const y = (a[1] + b[1]) / 2,
    sx = 111320 * Math.cos((y * Math.PI) / 180),
    sy = 111320;
  const vx = (b[0] - a[0]) * sx,
    vy = (b[1] - a[1]) * sy,
    len = Math.hypot(vx, vy);
  let best: ShadeObservation | undefined,
    nearest = 5;
  const mx = (a[0] + b[0]) / 2,
    my = (a[1] + b[1]) / 2;
  for (const row of rows) {
    if (shadeLevel(row.shade_level) === "unknown") continue;
    const dx = (row.end_longitude - row.start_longitude) * sx,
      dy = (row.end_latitude - row.start_latitude) * sy,
      d = Math.hypot(dx, dy);
    if (
      !d ||
      !len ||
      Math.abs((vx * dx + vy * dy) / (len * d)) < Math.cos(Math.PI / 12)
    )
      continue;
    const px = (mx - row.start_longitude) * sx,
      py = (my - row.start_latitude) * sy,
      t = (px * dx + py * dy) / (d * d);
    if (t < 0 || t > 1) continue;
    const gap = Math.hypot(px - t * dx, py - t * dy);
    // Conflicting equally close observations are conservatively resolved by lower shade.
    if (
      gap < nearest - 0.1 ||
      (Math.abs(gap - nearest) <= 0.1 &&
        { high: 3, medium: 2, low: 1, unknown: 0 }[
          shadeLevel(row.shade_level)
        ] <
          { high: 3, medium: 2, low: 1, unknown: 0 }[
            shadeLevel(best?.shade_level)
          ])
    ) {
      nearest = gap;
      best = row;
    }
  }
  return best;
}
export function shadeSlices(path: Point[], rows: ShadeObservation[]) {
  const slices: {
    a: Point;
    b: Point;
    metres: number;
    row: ShadeObservation | undefined;
  }[] = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      length = distance(location(a), location(b)),
      steps = Math.max(1, Math.ceil(length / 8));
    for (let j = 0; j < steps; j++) {
      const at = (t: number): Point => [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
      ];
      const x = at(j / steps),
        y = at((j + 1) / steps);
      slices.push({
        a: x,
        b: y,
        metres: length / steps,
        row: matchShade(x, y, rows),
      });
    }
  }
  return slices;
}
export function summarizeShade(
  route: Journey,
  rows: ShadeObservation[],
): ShadeSummary {
  let total = 0,
    known = 0,
    high = 0,
    shaded = 0,
    numeric = 0,
    synthetic = false;
  for (const leg of route.legs.filter((l) => l.mode === "walk")) {
    if (!["routed", "verified-indoor"].includes(leg.geometry || "")) {
      total += leg.distance;
      continue;
    }
    for (const s of shadeSlices(leg.coordinates, rows)) {
      total += s.metres;
      if (!s.row) continue;
      known += s.metres;
      const level = shadeLevel(s.row.shade_level);
      if (level === "high") high += s.metres;
      if (s.row.is_demo === true) {
        synthetic = true;
        numeric += s.metres;
        shaded +=
          s.metres * { high: 0.85, medium: 0.5, low: 0.15, unknown: 0 }[level];
      }
    }
  }
  // Unknown coverage is not zero shade. Only produce a whole-route percentage
  // when numeric (currently synthetic-model) observations cover the entire walk.
  return {
    percent:
      total > 0 && numeric >= total - 0.01
        ? Math.round((shaded / total) * 100)
        : null,
    observedPercent: total ? Math.round((known / total) * 100) : 0,
    highPercent: total ? Math.round((high / total) * 100) : 0,
    metres: Math.round(total),
    synthetic,
    method: synthetic
      ? "Spatial estimate; synthetic model high=85%, medium=50%, low=15%. Unknown portions are excluded from numeric claims."
      : "Spatially matched categorical observations; numeric shade coverage and observation time unavailable.",
  };
}
export function withShade(route: Journey, rows: ShadeObservation[]): Journey {
  const shadeInfo = summarizeShade(route, rows);
  return {
    ...route,
    shade: shadeInfo.percent,
    shadeInfo,
    isDemo: route.isDemo || shadeInfo.synthetic,
    warning:
      route.warning +
      (shadeInfo.observedPercent
        ? ` Shade methodology: ${shadeInfo.method}`
        : " No shade observations match this walking route."),
  };
}
