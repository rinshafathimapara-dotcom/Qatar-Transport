"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Collection, Journey, Location } from "@/types/database";
export default function MobilityMap({
  data,
  from,
  to,
  route,
  onPick,
}: {
  data: Collection;
  from: Location;
  to: Location;
  route?: Journey;
  onPick?: (p: Location) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<maplibregl.Map | null>(null),
    pick = useRef(onPick);
  pick.current = onPick;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current,
        center: [51.532, 25.321],
        zoom: 11,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                process.env.NEXT_PUBLIC_MAP_TILE_URL ||
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              paint: { "raster-saturation": -0.65, "raster-opacity": 0.82 },
            },
          ],
        },
      });
      map.current = m;
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      m.on("error", () => setFailed(true));
      m.on("click", (e) =>
        pick.current?.({
          id: `map-${e.lngLat.lng}-${e.lngLat.lat}`,
          name: `Map point ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`,
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        }),
      );
    } catch {
      setFailed(true);
      return;
    }
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const markers: maplibregl.Marker[] = [];
    const add = (p: Location, label: string, color: string) => {
      const el = document.createElement("button");
      el.className = "map-marker";
      el.style.background = color;
      el.textContent = label;
      el.setAttribute("aria-label", p.name);
      const text = document.createElement("div");
      text.textContent = p.name;
      el.onclick = (e) => {
        e.stopPropagation();
        pick.current?.(p);
      };
      markers.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([p.longitude, p.latitude])
          .setPopup(new maplibregl.Popup().setDOMContent(text))
          .addTo(m),
      );
    };
    data.transport_stops.forEach((p) =>
      add(p, p.mode === "tram" ? "T" : "M", "#173d50"),
    );
    data.parking_locations.forEach((p) => add(p, "P", "#7776b3"));
    data.places.forEach((p) => add(p, "•", "#1a9b8d"));
    add(from, "A", "#159b8b");
    add(to, "B", "#ec725e");
    return () => markers.forEach((p) => p.remove());
  }, [data, from, to]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const update = () => {
      if (m.getLayer("journey")) m.removeLayer("journey");
      if (m.getSource("journey")) m.removeSource("journey");
      if (!route) return;
      m.addSource("journey", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: route.legs.map((l) => ({
            type: "Feature",
            properties: { mode: l.mode },
            geometry: { type: "LineString", coordinates: l.coordinates },
          })),
        },
      });
      m.addLayer({
        id: "journey",
        type: "line",
        source: "journey",
        paint: {
          "line-color": [
            "match",
            ["get", "mode"],
            "walk",
            "#159b8b",
            "#ec725e",
          ],
          "line-width": 5,
        },
      });
      const coords = route.legs.flatMap((l) => l.coordinates);
      if (coords.length) {
        const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
        coords.forEach((c) => bounds.extend(c));
        m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
      }
    };
    if (m.isStyleLoaded()) update();
    else m.once("load", update);
    return () => {
      m.off("load", update);
    };
  }, [route]);
  return (
    <div className="map-shell">
      <div
        ref={container}
        className="map-canvas"
        aria-label="Interactive Qatar map"
      />
      {failed && (
        <div className="map-notice">
          Map tiles unavailable. Journey details remain available.
        </div>
      )}
      <span className="map-label">
        DOHA, QATAR <span>25.2854° N · 51.5310° E</span>
      </span>
      {route?.isDemo && (
        <span className="map-demo">Demonstration · schematic route</span>
      )}
    </div>
  );
}
