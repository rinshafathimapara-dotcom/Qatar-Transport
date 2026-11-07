import type {
  IndoorPassage,
  Journey,
  LiveFix,
  Location,
} from "@/types/database";
import { distance } from "./geo";
export function alongPath(
  p: Pick<Location, "latitude" | "longitude">,
  line: [number, number][],
) {
  let nearest = Infinity,
    progress = 0,
    total = 0,
    pointIndex = 0;
  const scaleX = 111320 * Math.cos((p.latitude * Math.PI) / 180),
    scaleY = 111320;
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = [
      (line[i - 1][0] - p.longitude) * scaleX,
      (line[i - 1][1] - p.latitude) * scaleY,
    ];
    const [x2, y2] = [
      (line[i][0] - p.longitude) * scaleX,
      (line[i][1] - p.latitude) * scaleY,
    ];
    const dx = x2 - x1,
      dy = y2 - y1,
      len = Math.hypot(dx, dy),
      t = len
        ? Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / (len * len)))
        : 0;
    const d = Math.hypot(x1 + t * dx, y1 + t * dy);
    if (d < nearest) {
      nearest = d;
      progress = total + t * len;
      pointIndex = i - 1;
    }
    total += len;
  }
  return {
    distance: nearest,
    progress,
    total,
    remaining: Math.max(0, total - progress),
    pointIndex,
  };
}
export function isAtDecision(fix: LiveFix, p: IndoorPassage, now = Date.now()) {
  return (
    now - fix.timestamp < 15000 &&
    fix.accuracy >= 0 &&
    fix.accuracy <= 30 &&
    distance(fix, p.entry) + fix.accuracy <= 40
  );
}
export function expectedOpen(p: IndoorPassage, now = new Date()) {
  if (
    p.isDemo ||
    !p.publicAccess ||
    Date.parse(p.verifiedAt) > now.getTime() ||
    Date.parse(p.validUntil) < now.getTime()
  )
    return false;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Qatar",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (key: string) => parts.find((x) => x.type === key)?.value || "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    value("weekday"),
  );
  const minute = Number(value("hour")) * 60 + Number(value("minute"));
  return p.schedule.some((s) => {
    const a = s.opens.split(":").map(Number),
      b = s.closes.split(":").map(Number),
      start = a[0] * 60 + a[1],
      end = b[0] * 60 + b[1];
    return start < end
      ? s.days.includes(day) && minute >= start && minute < end
      : (s.days.includes(day) && minute >= start) ||
          (s.days.includes((day + 6) % 7) && minute < end);
  });
}
export function relevantPassages(
  route: Journey,
  passages: IndoorPassage[],
  now = new Date(),
) {
  return passages.filter(
    (p) =>
      expectedOpen(p, now) &&
      route.legs.some((l) => {
        if (l.mode !== "walk" || l.geometry !== "routed") return false;
        const a = alongPath(p.entry, l.coordinates),
          b = alongPath(p.exit, l.coordinates);
        return (
          a.distance <= 250 && b.distance <= 250 && b.progress > a.progress + 10
        );
      }),
  );
}
export function validatePassages(input: unknown): IndoorPassage[] {
  if (!Array.isArray(input)) return [];
  return input.filter((p): p is IndoorPassage => {
    if (!p || typeof p !== "object") return false;
    const valid = (point: unknown) =>
      Array.isArray(point) &&
      point.length === 2 &&
      point.every(Number.isFinite) &&
      point[0] >= 50 &&
      point[0] <= 52.5 &&
      point[1] >= 24 &&
      point[1] <= 27;
    const loc = (l: Location) =>
      l && typeof l.name === "string" && valid([l.longitude, l.latitude]);
    if (
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      !loc(p.entry) ||
      !loc(p.exit) ||
      !Array.isArray(p.coordinates) ||
      p.coordinates.length < 2 ||
      !p.coordinates.every(valid) ||
      !Array.isArray(p.footprint) ||
      p.footprint.length < 4 ||
      !p.footprint.every(valid)
    )
      return false;
    if (
      p.footprint[0][0] !== p.footprint.at(-1)[0] ||
      p.footprint[0][1] !== p.footprint.at(-1)[1]
    )
      return false;
    const a = p.coordinates[0],
      b = p.coordinates.at(-1);
    if (
      distance(p.entry, { longitude: a[0], latitude: a[1] }) > 15 ||
      distance(p.exit, { longitude: b[0], latitude: b[1] }) > 15
    )
      return false;
    if (
      !Array.isArray(p.schedule) ||
      !p.schedule.length ||
      !p.schedule.every(
        (s: { days: number[]; opens: string; closes: string }) =>
          Array.isArray(s.days) &&
          s.days.length &&
          s.days.every((n) => Number.isInteger(n) && n >= 0 && n <= 6) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(s.opens) &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(s.closes),
      )
    )
      return false;
    return (
      typeof p.source === "string" &&
      p.source.length > 0 &&
      Number.isFinite(Date.parse(p.verifiedAt)) &&
      Number.isFinite(Date.parse(p.validUntil)) &&
      typeof p.publicAccess === "boolean" &&
      typeof p.airConditioned === "boolean" &&
      p.isDemo === false &&
      typeof p.notes === "string"
    );
  });
}
