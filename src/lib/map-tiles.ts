type TileOptions = {
  cartoKey?: string;
  customUrl?: string;
  customAttribution?: string;
};
export type MapTiles =
  | {
      status: "ready";
      kind: "raster" | "vector";
      url: string;
      attribution: string;
      maxZoom: number;
    }
  | { status: "unconfigured" | "invalid"; message: string };
const osmCredit =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

export function resolveMapTiles({
  cartoKey,
  customUrl,
  customAttribution,
}: TileOptions): MapTiles {
  const custom = customUrl?.trim();
  if (custom) {
    try {
      const url = new URL(custom);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.hash ||
        !["{z}", "{x}", "{y}"].every((token) => custom.includes(token))
      )
        throw new Error();
      // Do not retry the blocked OSM service through aliases or another subdomain.
      if (
        url.hostname === "tile.openstreetmap.org" ||
        url.hostname.endsWith(".tile.openstreetmap.org")
      )
        return {
          status: "invalid",
          message:
            "The OpenStreetMap tile service has blocked this app. Configure an authorized basemap provider instead.",
        };
      if (!customAttribution?.trim())
        return {
          status: "invalid",
          message:
            "The custom map provider needs its attribution configured before street tiles can load.",
        };
      return {
        status: "ready",
        kind: "raster",
        url: custom,
        attribution: osmCredit + " · " + escapeHtml(customAttribution.trim()),
        maxZoom: 19,
      };
    } catch {
      return {
        status: "invalid",
        message:
          "The configured map provider URL is invalid. Locations remain visible while map setup is corrected.",
      };
    }
  }
  const key = cartoKey?.trim();
  if (key) {
    return {
      status: "ready",
      kind: "raster",
      url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
      attribution:
        osmCredit + ' · © <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    };
  }
  return {
    status: "ready",
    kind: "vector",
    url: "https://tiles.openfreemap.org/styles/liberty",
    attribution:
      '<a href="https://openfreemap.org/">OpenFreeMap</a> · © <a href="https://openmaptiles.org/">OpenMapTiles</a> · ' +
      osmCredit,
    maxZoom: 20,
  };
}
