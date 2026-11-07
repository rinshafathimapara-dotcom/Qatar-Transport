"use client";
import { useState } from "react";
import { Sun, ArrowRight } from "lucide-react";
import fixture from "@/data/shade-presentation.json";
import { withShade, type ShadeObservation } from "@/services/shade";
import {
  fetchDemoShadeRoutes,
  type DemoShadeRoute,
} from "@/services/shade-demo";
import type { Journey, Location } from "@/types/database";
const makeLocal = (i: number): Journey => {
  const r = fixture.routes[i];
  return withShade(
    {
      id: r.id,
      title: r.name,
      minutes: r.minutes,
      distance: r.distance,
      walking: r.distance,
      cost: 0,
      transfers: 0,
      shade: null,
      isDemo: true,
      isApproximate: true,
      source: "Bundled OSM walking geometry; synthetic shade presentation",
      warning:
        "Presentation only: route geometry follows mapped pedestrian paths. Shade labels and high=85%, medium=50%, low=15% coverage model are synthetic, not measured shade or live sun exposure. No time-of-day validity is available.",
      legs: [
        {
          mode: "walk",
          name: r.name,
          minutes: r.minutes,
          distance: r.distance,
          coordinates: r.coordinates as [number, number][],
          geometry: "routed",
          environment: "outdoor",
        },
      ],
    },
    fixture.segments,
  );
};
export default function ShadeDemoPanel({
  onShow,
  maxWalkingMinutes = 20,
}: {
  maxWalkingMinutes?: number;
  onShow: (
    from: Location,
    to: Location,
    route: Journey,
    segments: ShadeObservation[],
  ) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [rows, setRows] = useState<DemoShadeRoute[] | null>(null);
  async function load() {
    setBusy(true);
    setError("");
    try {
      setRows(await fetchDemoShadeRoutes());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="shade-demo-panel"
      aria-label="Shade walking demonstration"
    >
      <div>
        <span className="pill coral">SYNTHETIC SHADE DEMONSTRATION</span>
        <h2>A little longer. More shade to compare.</h2>
        <p>
          Try two mapped Msheireb–Souq walks. Geometry follows the bundled
          walking network; shade is a synthetic, distance-weighted presentation
          model.
        </p>
      </div>
      <div className="shade-demo-options">
        {fixture.routes.map((r, i) => {
          const route = makeLocal(i);
          return (
            <button
              className="shade-demo-option"
              key={r.id}
              disabled={r.minutes > maxWalkingMinutes}
              title={
                r.minutes > maxWalkingMinutes
                  ? "Exceeds your walking budget"
                  : "Show this demonstration"
              }
              onClick={() =>
                onShow(fixture.from, fixture.to, route, fixture.segments)
              }
            >
              <Sun size={22} />
              <strong>{r.name}</strong>
              <span>
                {r.minutes} min · {r.distance} m
              </span>
              <span>
                {route.shade !== null
                  ? `${route.shade}% modelled shade · synthetic`
                  : `${route.shadeInfo?.highPercent}% of path matched to high-shade labels`}
              </span>
              <small>
                {i
                  ? `+${r.minutes - fixture.routes[0].minutes} min compared with the shorter walk`
                  : "The shorter of these two demonstration paths"}
              </small>
              <span>
                Show on map <ArrowRight size={16} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="data-note">
        The same conservative matching algorithm calculates both results.
        Unknown sections stay unknown; no exact heat exposure or protection is
        claimed.
      </p>
      <details>
        <summary>Load your teammate’s supplied demo routes</summary>
        <p>
          The uploaded integration files also support an optional Supabase
          table, demo_shade_routes. These are separate presentation records.
        </p>
        <button className="secondary" disabled={busy} onClick={load}>
          {busy
            ? "Checking supplied routes…"
            : "Load / retry supplied demo routes"}
        </button>
        {error && <p role="status">{error}</p>}
        {rows?.length === 0 && (
          <p>No public synthetic demo routes were returned.</p>
        )}
        {rows?.map((r) => (
          <button
            className="shade-demo-option"
            key={r.id}
            disabled={r.walking_minutes > maxWalkingMinutes}
            title={
              r.walking_minutes > maxWalkingMinutes
                ? "Exceeds your walking budget"
                : "Show supplied demonstration"
            }
            onClick={() => {
              const a = r.geometry.coordinates[0],
                b = r.geometry.coordinates.at(-1)!;
              onShow(
                {
                  id: r.id + "-a",
                  name: r.origin_name,
                  longitude: a[0],
                  latitude: a[1],
                  is_demo: true,
                },
                {
                  id: r.id + "-b",
                  name: r.destination_name,
                  longitude: b[0],
                  latitude: b[1],
                  is_demo: true,
                },
                {
                  id: r.id,
                  title: r.route_name,
                  minutes: r.walking_minutes,
                  distance: r.distance_m,
                  walking: r.distance_m,
                  cost: null,
                  transfers: 0,
                  shade: null,
                  isDemo: true,
                  isApproximate: true,
                  source:
                    "Supabase demo_shade_routes · supplied synthetic geometry",
                  warning: `Supplied presentation route; geometry and ${r.shade_percent}% backend-reported synthetic shade are not independently verified. Segment-level coverage cannot be recomputed from this row alone.`,
                  legs: [
                    {
                      mode: "walk",
                      name: r.route_name,
                      minutes: r.walking_minutes,
                      distance: r.distance_m,
                      coordinates: r.geometry.coordinates,
                      geometry: "concept",
                      environment: "outdoor",
                    },
                  ],
                },
                [],
              );
            }}
          >
            <strong>
              {r.area_name} · {r.route_name}
            </strong>
            <span>
              {r.walking_minutes} min · {r.shade_percent}% backend-reported
              synthetic shade (unverified)
            </span>
            <span>Show supplied concept geometry →</span>
          </button>
        ))}
      </details>
    </section>
  );
}
