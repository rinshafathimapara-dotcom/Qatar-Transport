"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { Collection, Journey } from "@/types/database";
const ConceptMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <p>Loading the concept map…</p>,
});
const empty: Collection = {
  places: [],
  transport_stops: [],
  transit_routes: [],
  transit_route_stops: [],
  transit_schedules: [],
  parking_locations: [],
  parking_status: [],
  shade_segments: [],
  demand_forecasts: [],
  data_sources: [],
};
import { DoorOpen, Footprints, MapPin } from "lucide-react";
import model from "@/data/mall-concept.json";
export default function IndoorConcept() {
  const [open, setOpen] = useState(false),
    [phase, setPhase] = useState<"approach" | "choose" | "inside" | "outside">(
      "approach",
    );
  const points = model.footprint,
    lon = points.map((p) => p[0]),
    lat = points.map((p) => p[1]),
    minX = Math.min(...lon),
    maxX = Math.max(...lon),
    minY = Math.min(...lat),
    maxY = Math.max(...lat);
  const ring = points.slice(0, -1),
    a = ring.findIndex(
      (p) => p[0] === model.entry[0] && p[1] === model.entry[1],
    ),
    b = ring.findIndex((p) => p[0] === model.exit[0] && p[1] === model.exit[1]);
  const perimeter =
    a < b ? ring.slice(a, b + 1) : [...ring.slice(a), ...ring.slice(0, b + 1)];
  return (
    <div className="indoor-concept">
      <button
        className="secondary"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <DoorOpen size={17} />
        {open
          ? "Close indoor-choice concept"
          : "Preview the indoor-choice concept"}
      </button>
      {open && (
        <section aria-label="Indoor route concept simulator">
          <span className="pill coral">
            DESIGN SIMULATION · HYPOTHETICAL DOORS
          </span>
          <h3>{model.name}: what if you could go through?</h3>
          <p>{model.warning}</p>
          <ConceptMap
            data={empty}
            from={{
              id: "concept-entry",
              name: "Hypothetical entrance (not surveyed)",
              longitude: model.entry[0],
              latitude: model.entry[1],
              is_demo: true,
            }}
            to={{
              id: "concept-exit",
              name: "Hypothetical exit (not surveyed)",
              longitude: model.exit[0],
              latitude: model.exit[1],
              is_demo: true,
            }}
            conceptOnly
            conceptFootprint={model.footprint as [number, number][]}
            route={{
              id: "concept-only",
              title: "Design concept",
              minutes: 0,
              distance: 0,
              walking: 0,
              cost: null,
              transfers: 0,
              shade: null,
              isDemo: true,
              isApproximate: true,
              warning: model.warning,
              source: model.source,
              legs: [
                {
                  mode: "walk",
                  name: "Hypothetical branch (not directions)",
                  minutes: 0,
                  distance: 0,
                  geometry: "concept",
                  environment: phase === "inside" ? "indoor" : "outdoor",
                  coordinates: (phase === "inside"
                    ? model.inside
                    : perimeter) as [number, number][],
                },
              ],
            }}
          />
          {phase === "approach" ? (
            <button className="primary" onClick={() => setPhase("choose")}>
              <MapPin size={16} />
              Simulate reaching the pause point
            </button>
          ) : (
            <>
              <div className="indoor-decision" role="status">
                <strong>
                  {phase === "choose"
                    ? "You reached the demo decision point. Choose a branch."
                    : phase === "inside"
                      ? "Concept: enter, walk inside, then exit on the other side."
                      : "Concept: stay outside and go around."}
                </strong>
                <div>
                  <button
                    className="primary"
                    onClick={() => setPhase("inside")}
                  >
                    <DoorOpen size={16} />
                    Go through · demo
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setPhase("outside")}
                  >
                    <Footprints size={16} />
                    Go around · demo
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setPhase("approach")}
                  >
                    Reset simulation
                  </button>
                </div>
              </div>
              <p className="data-note">
                These illustrative branches do not change live navigation. No
                public indoor access, real doors, cooling or perimeter footpath
                is being claimed.
              </p>
            </>
          )}
          <a
            className="text-button"
            href={model.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Mall outline source: {model.source} ↗
          </a>
        </section>
      )}
    </div>
  );
}
