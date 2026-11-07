"use client";
import { createPortal } from "react-dom";
import WalkingView, { type WalkingViewInput } from "./walking-view";
import { mallAlongWalk } from "@/services/walking-scene";
import type { Leg } from "@/types/database";
import type { MobilityContext } from "@/types/mobility-context";
import { dataStatus, qatarTimestamp } from "@/services/provenance";
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
import { shadeColor, shadeLevel, shadeSlices } from "@/services/shade";
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
  showConceptRoute = false,
  mobility,
  walkingMall,
  walkingWeather,
  onWalkChoice,
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
  showConceptRoute?: boolean;
  mobility?: MobilityContext;
  walkingMall?: { name: string; atMetres: number; exitAtMetres?: number };
  walkingWeather?: {
    temperature_c: number | null;
    feels_like_c: number | null;
  };
  onWalkChoice?: (choice: "inside" | "outside") => void;
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
  const [walkingView, setWalkingView] = useState<WalkingViewInput | null>(null);
  const [contextLayers, setContextLayers] = useState({
    access: false,
    traffic: false,
    vehicles: false,
  });
  const [showShade, setShowShade] = useState(true);
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
  const openWalking = (leg: Leg) => {
    const p = leg.coordinates[0];
    if (!p) return;
    map.current?.setView([p[1], p[0]], 18, { animate: false });
    const mall = mallAlongWalk(leg, data.places);
    const weather =
      walkingWeather ??
      mobility?.weather_conditions.find((r) => r.is_demo === false) ??
      mobility?.weather_conditions[0];
    setWalkingView({
      leg,
      mall:
        (walkingMall && route?.legs[0] === leg ? walkingMall : undefined) ??
        (mall ? { name: mall.place.name, atMetres: mall.progress } : undefined),
      initialShade:
        conceptOnly ||
        leg.environment === "indoor" ||
        (route?.shadeInfo?.highPercent ?? 0) > 30,
      temperature: weather?.temperature_c,
      feelsLike: weather?.feels_like_c,
      onChoice: onWalkChoice,
    });
  };
  const walkOpen = useRef(openWalking);
  walkOpen.current = openWalking;
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
      content.textContent =
        p.name + (p.is_demo ? " · Illustrative record" : "");
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
          ((conceptOnly || showConceptRoute) && l.geometry === "concept"),
      )
      .forEach((l) => {
        const line = L.polyline(
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
        ).addTo(layer);
        if (l.mode === "walk") {
          line.on("click", () => walkOpen.current(l));
          const target = L.polyline(
            l.coordinates.map(([lng, lat]) => [lat, lng] as L.LatLngTuple),
            { weight: 22, opacity: 0, interactive: true },
          ).addTo(layer);
          target.on("click", () => walkOpen.current(l));
          target.bindTooltip("Open first-person walking view");
          const element = target.getElement();
          element?.setAttribute("role", "button");
          element?.setAttribute("tabindex", "0");
          element?.setAttribute("aria-label", `Open walking view: ${l.name}`);
          element?.addEventListener("keydown", (event) => {
            if (
              (event as KeyboardEvent).key === "Enter" ||
              (event as KeyboardEvent).key === " "
            ) {
              event.preventDefault();
              walkOpen.current(l);
            }
          });
        }
      });
    if (layer.getLayers().length)
      m.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: conceptOnly ? 18 : 17,
        animate: false,
      });
    return () => {
      layer.remove();
    };
  }, [route, conceptOnly, conceptFootprint, showConceptRoute]);
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
  useEffect(() => {
    const m = map.current;
    if (!m || !showShade) return;
    const layer = L.featureGroup().addTo(m);
    for (const row of data.shade_segments) {
      if (
        ![
          row.start_latitude,
          row.start_longitude,
          row.end_latitude,
          row.end_longitude,
        ].every(Number.isFinite)
      )
        continue;
      const content = document.createElement("div");
      content.textContent = `${shadeLevel(row.shade_level)} shade · ${row.is_demo ? "Illustrative" : "Categorical reference"}. ${data.data_sources.find((s) => s.id === row.data_source)?.name || row.data_source || "Source not supplied"}. Coverage percentage, observation time and time-of-day validity unavailable.`;
      const shadeLine = L.polyline(
        [
          [row.start_latitude, row.start_longitude],
          [row.end_latitude, row.end_longitude],
        ],
        {
          color: shadeColor(row.shade_level),
          weight: 7,
          opacity: 0.7,
          dashArray: row.is_demo ? "5 6" : undefined,
        },
      ).addTo(layer);
      const selectedWalk = route?.legs.find(
        (l) =>
          l.mode === "walk" &&
          l.coordinates.some(
            ([lng, lat]) =>
              Math.abs(lng - row.start_longitude) < 1e-7 &&
              Math.abs(lat - row.start_latitude) < 1e-7,
          ),
      );
      if (selectedWalk)
        shadeLine
          .bindTooltip("Open first-person walking view")
          .on("click", () => walkOpen.current(selectedWalk));
      else shadeLine.bindPopup(content);
    }
    for (const leg of route?.legs.filter(
      (l) => l.mode === "walk" && l.geometry === "routed",
    ) ?? []) {
      for (const slice of shadeSlices(leg.coordinates, data.shade_segments)) {
        const text = document.createElement("div");
        text.textContent = slice.row
          ? `Walking path matched to ${shadeLevel(slice.row.shade_level)} shade · ${slice.row.is_demo ? "illustrative" : "categorical spatial estimate"}. 5 m spatial tolerance; not a heat measurement.`
          : "No shade information matched to this walking section.";
        const walkingSlice = L.polyline(
          [
            [slice.a[1], slice.a[0]],
            [slice.b[1], slice.b[0]],
          ],
          {
            color: shadeColor(slice.row?.shade_level),
            weight: 9,
            opacity: 0.55,
          },
        ).addTo(layer);
        walkingSlice
          .bindTooltip("Open first-person walking view")
          .on("click", () => walkOpen.current(leg));
      }
    }
    return () => {
      layer.remove();
    };
  }, [showShade, data.shade_segments, route]);
  useEffect(() => {
    const m = map.current;
    if (!m || !mobility) return;
    const layer = L.featureGroup().addTo(m);
    const marker = (
      lat: number | null,
      lon: number | null,
      title: string,
      detail: string,
      color: string,
    ) => {
      if (
        typeof lat !== "number" ||
        typeof lon !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      )
        return;
      const content = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = title;
      const text = document.createElement("p");
      text.textContent = detail;
      content.append(heading, text);
      L.circleMarker([lat, lon], {
        radius: 7,
        color: "white",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(content)
        .addTo(layer);
    };
    if (contextLayers.access)
      mobility.accessibility_features.forEach((r) =>
        marker(
          r.latitude,
          r.longitude,
          r.feature_name ?? "Accessibility feature",
          `${dataStatus(r)} · ${r.is_step_free === true ? "Step-free reported" : "Access details in record"}. ${r.notes ?? ""}`,
          "#386fbe",
        ),
      );
    if (contextLayers.traffic)
      mobility.traffic_incidents.forEach((r) =>
        marker(
          r.latitude,
          r.longitude,
          r.location_description ?? "Traffic report",
          `${dataStatus(r)} · ${r.description ?? ""} · ${qatarTimestamp(r.recorded_at)}`,
          "#d17c35",
        ),
      );
    if (contextLayers.vehicles)
      mobility.real_time_vehicle_telemetry.forEach((r) =>
        marker(
          r.latitude,
          r.longitude,
          r.line_name ?? "Vehicle snapshot",
          `${dataStatus(r)} · ${r.previous_stop ?? ""} → ${r.next_stop ?? ""} · ${qatarTimestamp(r.last_updated)}. ${r.note ?? ""}`,
          "#805eb5",
        ),
      );
    return () => {
      layer.remove();
    };
  }, [mobility, contextLayers]);
  return (
    <div className="map-shell">
      {walkingView &&
        createPortal(
          <WalkingView
            input={walkingView}
            onClose={() => setWalkingView(null)}
          />,
          document.body,
        )}
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
        {conceptOnly ? "WALKING EXPERIENCE" : "DOHA, QATAR"}{" "}
        <span>
          {conceptOnly
            ? "Tap a walking line for the eye-level scene"
            : "Destinations · Stations · Parking · Shade"}
        </span>
      </span>
      {!conceptOnly && (
        <div className="map-shade-controls">
          <button
            type="button"
            aria-pressed={showShade}
            onClick={() => setShowShade((v) => !v)}
          >
            {showShade ? "Hide shade overlay" : "Show shade overlay"}
          </button>
          {showShade && (
            <div className="shade-legend">
              <span style={{ color: shadeColor("high") }}>● High</span>
              <span style={{ color: shadeColor("medium") }}>● Medium</span>
              <span style={{ color: shadeColor("low") }}>● Low</span>
              <span style={{ color: shadeColor("unknown") }}>● Not mapped</span>
              <small>
                {data.shade_segments.length} segments ·{" "}
                {data.shade_segments.some((r) => r.is_demo)
                  ? "illustrative observations"
                  : "categorical observations"}
              </small>
            </div>
          )}
        </div>
      )}
      {mobility && !conceptOnly && (
        <div className="map-context-controls" aria-label="City map layers">
          {(
            [
              ["access", "Accessibility"],
              ["traffic", "Traffic"],
              ["vehicles", "Vehicles"],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              aria-pressed={contextLayers[key]}
              key={key}
              onClick={() =>
                setContextLayers((s) => ({ ...s, [key]: !s[key] }))
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
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
      {route?.legs.some((l) => l.mode === "walk") && (
        <div className="map-walk-actions">
          {route.legs
            .filter((l) => l.mode === "walk")
            .map((leg, i) => (
              <button
                key={i}
                type="button"
                onClick={() => walkOpen.current(leg)}
              >
                Walk view{" "}
                {route.legs.filter((l) => l.mode === "walk").length > 1
                  ? i + 1
                  : ""}{" "}
                ↗
              </button>
            ))}
        </div>
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
            ? "Illustrative mall access · visual experience"
            : route.legs.some((l) => l.geometry === "concept")
              ? "Dataset corridor preview · not live navigation"
              : route.legs.some(
                    (l) => !l.geometry || l.geometry === "schematic",
                  )
                ? "Unverified segment geometry hidden · stations shown only"
                : route.isDemo
                  ? "Sample endpoints · road-following walk"
                  : "Estimated journey · mapped walking paths"}
        </span>
      )}
    </div>
  );
}
