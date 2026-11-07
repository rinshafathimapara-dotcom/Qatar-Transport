"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  Collection,
  Journey,
  Location,
  LiveFix,
  IndoorPassage,
} from "@/types/database";
import { resolveMapTiles } from "@/lib/map-tiles";
setWorkerUrl("/workers/maplibre-worker.js");
const tiles = resolveMapTiles({
  cartoKey: process.env.NEXT_PUBLIC_CARTO_MAPS_KEY,
  customUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL,
  customAttribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION,
});

export default function MobilityMap({
  data,
  from,
  to,
  route,
  onPick,
  livePosition,
  passages = [],
  selectedPassage,
  onPassage,
  conceptOnly = false,
  conceptFootprint,
  simulatedPosition,
  onConceptDecision,
}: {
  data: Collection;
  from: Location;
  to: Location;
  route?: Journey;
  onPick?: (p: Location) => void;
  livePosition?: LiveFix | null;
  passages?: IndoorPassage[];
  selectedPassage?: string | null;
  onPassage?: (id: string) => void;
  conceptOnly?: boolean;
  conceptFootprint?: [number, number][];
  simulatedPosition?: [number, number];
  onConceptDecision?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    pick = useRef(onPick);
  const reduced = useRef(false);
  const vectorBase = useRef<L.MaplibreGL | null>(null);
  pick.current = onPick;
  const conceptDecision = useRef(onConceptDecision);
  conceptDecision.current = onConceptDecision;
  const simulationMarker = useRef<L.CircleMarker | null>(null);
  const [failed, setFailed] = useState(false);
  const [follow, setFollow] = useState(true);
  const userLayer = useRef<L.CircleMarker | null>(null),
    accuracyLayer = useRef<L.Circle | null>(null);
  const passageSignature = passages.map((p) => p.id).join("|");
  const passageSelect = useRef(onPassage);
  passageSelect.current = onPassage;
  const [tileAttempt, setTileAttempt] = useState(0);
  const point = (
    p: Pick<Location, "latitude" | "longitude">,
  ): L.LatLngTuple => [p.latitude, p.longitude];
  useEffect(() => {
    if (!container.current) return;
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const m = L.map(container.current, {
      zoomControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      minZoom: 1,
      maxZoom: 20,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1,
    }).setView([25.321, 51.532], 11);
    map.current = m;
    m.on("dragstart", () => setFollow(false));
    L.control.zoom({ position: "topright" }).addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) =>
      pick.current?.({
        id: `map-${e.latlng.lng}-${e.latlng.lat}`,
        name: `Map point ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      }),
    );
    const observer = new ResizeObserver(() => {
      m.invalidateSize({ animate: false });
      const vector = vectorBase.current;
      if (vector) {
        const gl = vector.getMaplibreMap();
        if (gl) {
          const size = m.getSize(),
            element = vector.getContainer();
          element.style.width = `${size.x}px`;
          element.style.height = `${size.y}px`;
          gl.resize();
        }
      }
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.remove();
      map.current = null;
      simulationMarker.current = null;
      userLayer.current = null;
      accuracyLayer.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || tiles.status !== "ready") return;
    setFailed(false);
    if (tiles.kind === "vector") {
      const context = document.createElement("canvas").getContext("webgl2");
      if (!context) {
        setFailed(true);
        return;
      }
      context.getExtension("WEBGL_lose_context")?.loseContext();
    }
    let layer: L.Layer | undefined;
    let active = true;
    const stop = () => {
      if (!active) return;
      setFailed(true);
      // Defer removal until the renderer's error event finishes dispatching.
      window.setTimeout(() => {
        if (active) {
          vectorBase.current = null;
          layer?.remove();
        }
      }, 0);
    };
    try {
      if (tiles.kind === "vector") {
        const options: L.LeafletMaplibreGLOptions & { padding: number } = {
          style: tiles.url,
          attributionControl: false,
          padding: 0,
        };
        const vector = maplibreGL(options);
        layer = vector;
        vector.addTo(m);
        vectorBase.current = vector;
        window.requestAnimationFrame(() => {
          if (active) vector.getMaplibreMap()?.resize();
        });
        vector.getMaplibreMap().on("error", stop);
        m.attributionControl.addAttribution(tiles.attribution);
      } else {
        layer = L.tileLayer(tiles.url, {
          attribution: tiles.attribution,
          maxZoom: tiles.maxZoom,
          updateWhenIdle: true,
          keepBuffer: 1,
        })
          .on("tileerror", stop)
          .addTo(m);
      }
    } catch {
      stop();
    }
    return () => {
      active = false;
      vectorBase.current = null;
      layer?.off();
      layer?.remove();
      if (tiles.kind === "vector")
        m.attributionControl.removeAttribution(tiles.attribution);
    };
  }, [tileAttempt]);
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
      marker.on("click", () => {
        if (conceptOnly && p.id === from.id) conceptDecision.current?.();
        else pick.current?.(p);
      });
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
    add(from, conceptOnly ? "E?" : "A", "#159b8b");
    add(to, conceptOnly ? "X?" : "B", "#ec725e");
    if (!route && layer.getLayers().length)
      m.fitBounds(layer.getBounds(), {
        padding: [45, 45],
        maxZoom: 14,
        animate: false,
      });
    return () => {
      layer.remove();
    };
  }, [data, from, to, route]);
  useEffect(() => {
    const m = map.current;
    if (!m || !route) return;
    const layer = L.featureGroup().addTo(m);
    if (conceptOnly && conceptFootprint)
      L.polygon(
        conceptFootprint.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
        { color: "#9a8b72", weight: 2, fillColor: "#f3ead8", fillOpacity: 0.3 },
      ).addTo(layer);
    route.legs
      .filter(
        (l) =>
          l.geometry === "routed" ||
          l.geometry === "verified-indoor" ||
          l.geometry === "mapped-transit" ||
          (conceptOnly && l.geometry === "concept"),
      )
      .forEach((l) =>
        L.polyline(
          l.coordinates.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
          {
            color:
              l.geometry === "verified-indoor" || l.environment === "indoor"
                ? "#7652c5"
                : l.mode === "walk"
                  ? "#138879"
                  : l.mode === "bus"
                    ? "#2479c7"
                    : l.mode === "tram"
                      ? "#da9b21"
                      : "#e75d4e",
            weight: 5,
            dashArray:
              l.geometry === "verified-indoor" || l.geometry === "concept"
                ? "5 5"
                : undefined,
          },
        ).addTo(layer),
      );
    if (layer.getLayers().length)
      m.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: conceptOnly ? 18 : 17,
        animate: false,
      });
    return () => {
      layer.remove();
    };
  }, [route, conceptOnly, conceptFootprint]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!livePosition) {
      userLayer.current?.remove();
      accuracyLayer.current?.remove();
      userLayer.current = null;
      accuracyLayer.current = null;
      return;
    }
    const latlng: L.LatLngTuple = [
      livePosition.latitude,
      livePosition.longitude,
    ];
    if (!userLayer.current) {
      accuracyLayer.current = L.circle(latlng, {
        radius: livePosition.accuracy,
        color: "#2479e8",
        weight: 1,
        fillOpacity: 0.08,
      }).addTo(m);
      userLayer.current = L.circleMarker(latlng, {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#2479e8",
        fillOpacity: 1,
      }).addTo(m);
    }
    userLayer.current.setLatLng(latlng);
    accuracyLayer.current?.setLatLng(latlng).setRadius(livePosition.accuracy);
    const content = document.createElement("div");
    content.textContent = `Your location · accuracy ±${Math.round(livePosition.accuracy)} m`;
    userLayer.current.bindPopup(content);
    if (follow) m.panTo(latlng, { animate: !reduced.current });
  }, [livePosition, follow]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const layer = L.featureGroup().addTo(m);
    for (const p of passages) {
      for (const [type, where] of [
        ["Entrance / decision point", p.entry],
        ["Exit", p.exit],
      ] as const) {
        const el = document.createElement("button");
        el.className = "map-marker";
        el.type = "button";
        el.style.background = type === "Exit" ? "#7652c5" : "#138879";
        el.textContent = type === "Exit" ? "X" : "E";
        el.setAttribute("aria-label", `${p.name} ${type}`);
        const text = document.createElement("div");
        text.textContent = `${p.name} · ${type}: ${where.name}. Based on reviewed access data; check signs.`;
        const marker = L.marker([where.latitude, where.longitude], {
          icon: L.divIcon({
            html: el,
            className: "leaflet-mobility-icon",
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        })
          .bindPopup(text)
          .addTo(layer);
        marker.on("click", () => passageSelect.current?.(p.id));
        if (selectedPassage === p.id && type !== "Exit") marker.openPopup();
      }
    }
    return () => {
      layer.remove();
    };
  }, [passageSignature, selectedPassage]);
  useEffect(() => {
    const m = map.current;
    if (!m || !simulatedPosition) return;
    const latlng: L.LatLngTuple = [simulatedPosition[1], simulatedPosition[0]];
    if (!simulationMarker.current)
      simulationMarker.current = L.circleMarker(latlng, {
        radius: 10,
        color: "white",
        weight: 4,
        fillColor: "#7652c5",
        fillOpacity: 1,
      })
        .bindTooltip("Simulated walker · not GPS")
        .addTo(m);
    simulationMarker.current.setLatLng(latlng);
  }, [simulatedPosition]);
  return (
    <div className="map-shell">
      <div
        ref={container}
        className="map-canvas"
        aria-label="Interactive Qatar map"
      />
      {(failed || tiles.status !== "ready") && (
        <div className="map-notice map-provider-notice" role="status">
          <strong>
            {failed ? "Street map unavailable" : "Street map setup needed"}
          </strong>
          <span>
            {failed
              ? "The street map could not load. Check your connection and WebGL support. If using a custom provider, also check its access settings. Dataset locations remain visible."
              : tiles.status !== "ready"
                ? tiles.message
                : ""}
          </span>
          {failed && (
            <button
              type="button"
              onClick={() => setTileAttempt((value) => value + 1)}
            >
              Retry map
            </button>
          )}
        </div>
      )}
      <span className="map-label">
        {conceptOnly ? "CONCEPT SIMULATION" : "DOHA, QATAR"}{" "}
        <span>
          {conceptOnly
            ? "Hypothetical doors · not live directions"
            : "Destinations · Stations · Parking · Shade"}
        </span>
      </span>
      {livePosition && (
        <button
          className="map-follow-button"
          type="button"
          aria-pressed={follow}
          onClick={() => setFollow(!follow)}
        >
          {follow ? "Following location" : "Follow my location"}
        </button>
      )}
      {route && (
        <div className="map-route-legend">
          <span style={{ color: "#138879" }}>● Walk</span>
          <span style={{ color: "#e75d4e" }}>● Metro</span>
          <span style={{ color: "#2479c7" }}>● Bus</span>
          <span style={{ color: "#da9b21" }}>● Tram</span>
          <span style={{ color: "#7652c5" }}>● Indoor</span>
        </div>
      )}
      {(route?.isDemo ||
        route?.isApproximate ||
        route?.legs.some((l) => !l.geometry || l.geometry === "schematic")) && (
        <span className="map-demo">
          {conceptOnly
            ? "Hypothetical entrance, exit and passage · do not follow"
            : route.legs.some((l) => !l.geometry || l.geometry === "schematic")
              ? "Unverified segment geometry hidden · stations shown only"
              : route.isDemo
                ? "Sample endpoints · road-following walk"
                : "Estimated journey · mapped walking paths"}
        </span>
      )}
    </div>
  );
}
