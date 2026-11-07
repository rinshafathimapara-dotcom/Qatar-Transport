import type { Location } from "@/types/database";
export function normalizeLocation(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function searchLocations(
  rows: Location[],
  query: string,
  limit = 30,
): Location[] {
  const q = normalizeLocation(query),
    tokens = q.split(" ").filter(Boolean);
  const scored = rows
    .map((p, order) => {
      const name = normalizeLocation(p.name),
        aliases = normalizeLocation(p.aliases || ""),
        text = `${name} ${aliases} ${normalizeLocation(p.address || "")} ${normalizeLocation(p.category || "")}`;
      if (tokens.length && !tokens.every((t) => text.includes(t))) return null;
      const score =
        (name === q
          ? 10000
          : name.startsWith(q) && q
            ? 5000
            : name.includes(q) && q
              ? 2000
              : aliases.includes(q) && q
                ? 1000
                : 0) + (p.priority || 0);
      return { p, score, order };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => b.score - a.score || a.order - b.order);
  const result: Location[] = [];
  for (const { p } of scored) {
    if (
      result.some(
        (x) =>
          x.id === p.id ||
          (normalizeLocation(x.name) === normalizeLocation(p.name) &&
            Math.abs(x.latitude - p.latitude) < 0.0005 &&
            Math.abs(x.longitude - p.longitude) < 0.0005),
      )
    )
      continue;
    result.push(p);
    if (result.length >= limit) break;
  }
  return result;
}
export function coordinateLocation(query: string): Location | null {
  const m = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]),
    longitude = Number(m[2]);
  return latitude >= 24 &&
    latitude <= 27 &&
    longitude >= 50 &&
    longitude <= 52.5
    ? {
        id: `coordinate-${latitude}-${longitude}`,
        name: `${latitude}, ${longitude}`,
        latitude,
        longitude,
        category: "Map coordinates",
      }
    : null;
}
