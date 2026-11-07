"use client";
import { useState } from "react";
import { Sun, ArrowRight } from "lucide-react";
import type { Journey, Location, Rows } from "@/types/database";
import type { MobilityRows } from "@/types/mobility-context";
import { corridorJourney, validShadeCorridor } from "@/services/shade-demo";
import { dataStatus, displayNumber as n } from "@/services/provenance";
export default function ShadeDemoPanel({
  rows,
  segments,
  maxWalkingMinutes = 20,
  onShow,
}: {
  rows: MobilityRows["shade_demo_routes"][];
  segments: Rows["shade_segments"][];
  maxWalkingMinutes?: number;
  onShow: (
    from: Location,
    to: Location,
    route: Journey,
    segments: Rows["shade_segments"][],
  ) => void;
}) {
  const [area, setArea] = useState(""),
    [priority, setPriority] = useState("all"),
    [error, setError] = useState("");
  const areas = [...new Set(rows.map((r) => r.route_name.split(" -> ")[0]))];
  const activeArea = area || areas[0] || "All";
  const filtered = rows.filter(
    (r) =>
      (activeArea === "All" || r.route_name.startsWith(activeArea + " -> ")) &&
      (priority === "all" || r.optimization_profile === priority),
  );
  return (
    <section className="shade-demo-panel" aria-label="Shade route comparison">
      <span className="eyebrow">SHADE-AWARE WALKING</span>
      <h2>Compare a quicker walk with a gentler one.</h2>
      <p>
        Explore the route summaries supplied by your team. Select a corridor to
        preview its linked shade segments on the map.
      </p>
      <div className="shade-filters">
        <label>
          Starting area
          <select
            aria-label="Starting area"
            value={activeArea}
            onChange={(e) => setArea(e.target.value)}
          >
            <option>All</option>
            {areas.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Route preference
          <select
            aria-label="Route preference"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">Compare both</option>
            <option value="fastest_direct">Faster walking</option>
            <option value="most_shaded">Prioritise shade</option>
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="shade-demo-options">
        {filtered.map((r) => {
          const valid = validShadeCorridor(r),
            missingSegments = (r.segment_ids ?? []).some(
              (id) => !segments.some((s) => s.id === id),
            ),
            over =
              (r.estimated_walking_duration_min ?? Infinity) >
              Math.min(20, maxWalkingMinutes),
            base = rows.find(
              (a) =>
                a.route_name.split(" (")[0] === r.route_name.split(" (")[0] &&
                a.optimization_profile === "fastest_direct",
            ),
            difference =
              base &&
              r.estimated_walking_duration_min !== null &&
              base.estimated_walking_duration_min !== null
                ? r.estimated_walking_duration_min -
                  base.estimated_walking_duration_min
                : null;
          return (
            <button
              className="shade-demo-option"
              key={r.id}
              disabled={!valid || over || missingSegments}
              title={
                missingSegments
                  ? "Waiting for linked shade segments in this data view"
                  : over
                    ? "Exceeds your walking budget"
                    : !valid
                      ? "Incomplete corridor record"
                      : "Preview these linked segments"
              }
              onClick={() => {
                try {
                  const result = corridorJourney(
                    r,
                    segments,
                    maxWalkingMinutes,
                  );
                  setError("");
                  onShow(result.from, result.to, result.route, result.segments);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <Sun size={20} />
              <span className="data-status">
                {dataStatus(r)} · corridor preview
              </span>
              <strong>{r.route_name}</strong>
              <span>
                {n(r.estimated_walking_duration_min, " min")} ·{" "}
                {n(r.total_walking_distance_m, " m")}
              </span>
              <span>{n(r.shade_coverage_percent, "% shade coverage")}</span>
              <small>
                {n(r.shaded_distance_m, " m shaded")} ·{" "}
                {n(r.exposed_distance_m, " m exposed")}
              </small>
              {difference !== null &&
                r.optimization_profile === "most_shaded" && (
                  <small>
                    {difference >= 0 ? "+" : ""}
                    {n(difference, " min")} versus the direct option
                  </small>
                )}
              <span>
                Preview on map <ArrowRight size={16} />
              </span>
            </button>
          );
        })}
      </div>
      {!filtered.length && <p>No shade corridors match this data view.</p>}
      <p className="data-note">
        Route-summary estimates from Supabase. Corridor previews are separate
        from live road-following walking navigation.
      </p>
    </section>
  );
}
