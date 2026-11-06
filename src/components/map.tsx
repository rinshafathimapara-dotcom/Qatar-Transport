"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
    map = useRef<L.Map | null>(null),
    pick = useRef(onPick);
  const reduced = useRef(false);
  pick.current = onPick;
  const [failed, setFailed] = useState(false);
  const point = (
    p: Pick<Location, "latitude" | "longitude">,
  ): L.LatLngTuple => [p.latitude, p.longitude];
  useEffect(() => {
    if (!container.current) return;
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const m = L.map(container.current, { zoomControl: false }).setView(
      [25.321, 51.532],
      11,
    );
    map.current = m;
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    )
      .on("tileerror", () => setFailed(true))
      .addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) =>
      pick.current?.({
        id: `map-${e.latlng.lng}-${e.latlng.lat}`,
        name: `Map point ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      }),
    );
    const observer = new ResizeObserver(() => m.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const layer = L.featureGroup().addTo(m);
    const valid = (lat: number, lng: number) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;
    const add = (p: Location, label: string, color: string) => {
      if (!valid(p.latitude, p.longitude) || p.id.startsWith("empty-")) return;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "map-marker";
      el.style.background = color;
      el.textContent = label;
      el.setAttribute("aria-label", p.name);
      const content = document.createElement("div");
      content.textContent = p.name + (p.is_demo ? " · Demo" : "");
      const marker = L.marker(point(p), {
        icon: L.divIcon({
          html: el,
          className: "leaflet-mobility-icon",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
        keyboard: true,
        title: p.name,
      })
        .bindPopup(content)
        .addTo(layer);
      marker.on("click", () => pick.current?.(p));
    };
    data.places.forEach((p) => add(p, "•", "#1a9b8d"));
    data.transport_stops.forEach((p) =>
      add(
        { ...p, category: p.mode + " station" },
        p.mode.toLowerCase() === "tram"
          ? "T"
          : p.mode.toLowerCase() === "bus"
            ? "B"
            : p.mode.toLowerCase() === "metro"
              ? "M"
              : "S",
        "#173d50",
      ),
    );
    data.parking_locations.forEach((p) => add(p, "P", "#7776b3"));
    data.shade_segments.forEach((s) => {
      if (
        !valid(s.start_latitude, s.start_longitude) ||
        !valid(s.end_latitude, s.end_longitude)
      )
        return;
      const text = document.createElement("div");
      text.textContent = `Shade: ${s.shade_level} · ${s.is_demo ? "Demo data" : "Imported observation; not live heat exposure"} · ${s.data_source}`;
      L.polyline(
        [
          [s.start_latitude, s.start_longitude],
          [s.end_latitude, s.end_longitude],
        ],
        {
          color: "#8b9e3a",
          weight: 7,
          opacity: 0.7,
          dashArray: s.is_demo ? "5 7" : undefined,
        },
      )
        .bindPopup(text)
        .addTo(layer);
    });
    add(from, "A", "#159b8b");
    add(to, "B", "#ec725e");
    if (!route && layer.getLayers().length)
      m.fitBounds(layer.getBounds(), {
        padding: [45, 45],
        maxZoom: 14,
        animate: !reduced.current,
      });
    return () => {
      layer.remove();
    };
  }, [data, from, to, route]);
  useEffect(() => {
    const m = map.current;
    if (!m || !route) return;
    const layer = L.featureGroup().addTo(m);
    route.legs.forEach((l) =>
      L.polyline(
        l.coordinates.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
        {
          color: l.mode === "walk" ? "#159b8b" : "#ec725e",
          weight: 5,
          dashArray: route.isApproximate || route.isDemo ? "7 7" : undefined,
        },
      ).addTo(layer),
    );
    if (layer.getLayers().length)
      m.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 14,
        animate: !reduced.current,
      });
    return () => {
      layer.remove();
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
          Map tiles unavailable. Dataset markers remain available.
        </div>
      )}
      <span className="map-label">
        DOHA, QATAR <span>Destinations · Stations · Parking · Shade</span>
      </span>
      {(route?.isDemo || route?.isApproximate) && (
        <span className="map-demo">
          {route.isDemo ? "Demonstration" : "MVP approximation"} · schematic
          route
        </span>
      )}
    </div>
  );
}
