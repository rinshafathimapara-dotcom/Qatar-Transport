"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  DoorOpen,
  Footprints,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import model from "@/data/mall-concept.json";
import {
  advance,
  initialSimulation,
  pathLength,
  pointAt,
  type Point,
  type Simulation,
} from "@/services/journey-simulation";
import type { Collection, Journey } from "@/types/database";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <p>Loading Doha map…</p>,
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
const entry = model.entry as Point,
  exit = model.exit as Point;
// Illustrative paths are exclusively used in this labelled presentation; never sent to the planner.
const approach: Point[] = [
  [entry[0] - 0.00065, entry[1] - 0.00015],
  [entry[0] - 0.00015, entry[1] - 0.00015],
  entry,
];
const ring = model.footprint.slice(0, -1) as Point[];
const a = ring.findIndex((p) => p[0] === entry[0] && p[1] === entry[1]);
const b = ring.findIndex((p) => p[0] === exit[0] && p[1] === exit[1]);
const outside = (
  a < b ? ring.slice(a, b + 1) : [...ring.slice(a), ...ring.slice(0, b + 1)]
) as Point[];
const inside = model.inside as Point[];
const finish: Point[] = [exit, [exit[0] + 0.00045, exit[1] + 0.00005]];
const threshold = pathLength(approach);
const location = (id: string, p: Point) => ({
  id,
  name:
    id === "entry"
      ? "Pause point · hypothetical entrance"
      : "Hypothetical exit",
  longitude: p[0],
  latitude: p[1],
  is_demo: true,
});
const from = location("entry", entry),
  to = location("exit", exit);
export default function JourneyDemo() {
  const [state, setState] = useState<Simulation>(initialSimulation),
    [speed, setSpeed] = useState(20),
    [preview, setPreview] = useState(false);
  const branch = state.branch === "outside" ? outside : inside;
  const path = useMemo(
    () => [...approach, ...branch.slice(1), ...finish.slice(1)],
    [branch],
  );
  const total = pathLength(path),
    position = pointAt(path, state.metres),
    minutes = Math.ceil(total / 75);
  useEffect(() => {
    if (state.status !== "countdown") return;
    const t = setTimeout(
      () => setState((s) => ({ ...s, status: "walking" })),
      2000,
    );
    return () => clearTimeout(t);
  }, [state.status]);
  useEffect(() => {
    if (state.status !== "walking") return;
    const t = setInterval(
      () => setState((s) => advance(s, 1.25 * speed * 0.1, threshold, total)),
      100,
    );
    return () => clearInterval(t);
  }, [state.status, speed, total]);
  const route = useMemo<Journey>(
    () => ({
      id: "presentation",
      title: "City Center walking concept",
      minutes: Math.ceil(pathLength(path) / 75),
      distance: pathLength(path),
      walking: pathLength(path),
      cost: 0,
      transfers: 0,
      shade: null,
      isDemo: true,
      isApproximate: true,
      warning: model.warning,
      source: model.source,
      legs: [
        {
          mode: "walk",
          name: "Illustrative approach",
          minutes: 1,
          distance: threshold,
          coordinates: approach,
          geometry: "concept",
          environment: "outdoor",
        },
        {
          mode: "walk",
          name:
            state.branch === "outside"
              ? "Illustrative perimeter"
              : "Hypothetical indoor passage",
          minutes: Math.ceil(pathLength(branch) / 75),
          distance: pathLength(branch),
          coordinates: branch,
          geometry: "concept",
          environment: state.branch === "outside" ? "outdoor" : "indoor",
        },
        {
          mode: "walk",
          name: "Illustrative final stretch",
          minutes: 1,
          distance: pathLength(finish),
          coordinates: finish,
          geometry: "concept",
          environment: "outdoor",
        },
      ],
    }),
    [branch, path, state.branch],
  );
  const decision = state.status === "decision" || preview;
  const indoors =
    state.branch === "inside" &&
    state.metres > threshold &&
    state.metres < threshold + pathLength(inside);
  function choose(choice: "inside" | "outside") {
    setPreview(false);
    setState((s) => ({
      ...s,
      branch: choice,
      status: s.status === "decision" ? "walking" : s.status,
    }));
  }
  return (
    <main className="journey-demo">
      <header className="demo-header">
        <a href="/">
          smarter<span>qatar.</span>
        </a>
        <span className="pill coral">
          PRESENTATION DEMO · SIMULATED LOCATION
        </span>
        <a href="/plan">
          Back to planner <ArrowRight size={16} />
        </a>
      </header>
      <div className="demo-intro">
        <span className="eyebrow">A LITTLE WALK. A BETTER WAY.</span>
        <h1>Your walk, with a cooler possibility.</h1>
        <p>
          A real mall location. Hypothetical doors and paths. Press start to
          demonstrate the experience without leaving the room.
        </p>
      </div>
      <div className="demo-layout">
        <section className="demo-sidebar">
          <span className="eyebrow">CITY CENTER DOHA · WALKING CONCEPT</span>
          <h2>
            {state.status === "arrived"
              ? "You’ve arrived."
              : decision
                ? "A choice along the way."
                : indoors
                  ? "Walk through the mall."
                  : "Let’s take a smarter walk."}
          </h2>
          <div className="demo-metrics">
            <strong>
              {minutes}
              <small> min estimated</small>
            </strong>
            <span>
              {Math.round(total)} m total
              <br />
              Within a 20-minute walking budget
            </span>
          </div>
          <p className="demo-cue" aria-live="polite">
            {state.status === "ready"
              ? "Start the demonstration. Your purple dot will move after two seconds."
              : state.status === "countdown"
                ? "Starting in two seconds…"
                : decision
                  ? "Pause point: City Center is beside your path. Would you like to explore the hypothetical walk-through, or stay outside?"
                  : state.status === "arrived"
                    ? "Demo complete. Replay to compare the other choice."
                    : indoors
                      ? "Enter at E? and follow the purple concept path towards X?. Indoor positioning is simulated."
                      : state.branch === "outside"
                        ? "Continue along the green illustrative perimeter."
                        : state.metres > threshold + pathLength(branch)
                          ? "You passed the exit. Follow the last green section to the destination."
                          : `Continue towards the pause point · ${Math.max(0, Math.round(threshold - state.metres))} m ahead.`}
          </p>
          {decision && (
            <section className="demo-decision" aria-label="Mall route choice">
              <h3>Through or around?</h3>
              <p>
                These doors and both branches are illustrative. A surveyed
                approach would provide an accurate left/right turn instruction
                here.
              </p>
              <button className="primary" onClick={() => choose("inside")}>
                <DoorOpen size={18} />
                Go through the mall · demo
              </button>
              <p>
                {Math.ceil(pathLength(inside) / 75)} min between concept doors ·
                indoor exposure may feel more comfortable; cooling is
                unverified.
              </p>
              <button className="secondary" onClick={() => choose("outside")}>
                <Footprints size={18} />
                Stay outside · demo
              </button>
              <p>
                {Math.ceil(pathLength(outside) / 75)} min along the illustrative
                perimeter · shade unknown.
              </p>
              {preview && state.status !== "decision" && (
                <button
                  className="text-button"
                  onClick={() => setPreview(false)}
                >
                  Close preview
                </button>
              )}
            </section>
          )}
          <div className="demo-controls">
            <button
              className="primary"
              disabled={
                state.status === "decision" ||
                state.status === "countdown" ||
                state.status === "arrived"
              }
              onClick={() =>
                setState((s) => ({
                  ...s,
                  status:
                    s.status === "walking"
                      ? "paused"
                      : s.status === "ready"
                        ? "countdown"
                        : "walking",
                }))
              }
            >
              {state.status === "walking" ? (
                <Pause size={18} />
              ) : (
                <Play size={18} />
              )}{" "}
              {state.status === "walking"
                ? "Pause demo"
                : state.status === "paused"
                  ? "Resume demo"
                  : "Start my journey · demo"}
            </button>
            <button
              className="secondary"
              aria-label="Reset demo"
              onClick={() => {
                setState(initialSimulation);
                setPreview(false);
              }}
            >
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
          <label className="demo-speed">
            Playback speed
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={10}>10×</option>
              <option value={20}>20×</option>
              <option value={40}>40×</option>
            </select>
          </label>
          <progress
            max={total}
            value={state.metres}
            aria-label="Simulated walking progress"
          />
          <p className="data-note">
            {Math.round(state.metres)} m simulated · ~
            {Math.round(state.metres / 0.75)} estimated steps (not a pedometer).
            No GPS permission is requested.
          </p>
        </section>
        <section className="demo-map-area">
          <Map
            data={empty}
            from={from}
            to={to}
            route={route}
            conceptOnly
            conceptFootprint={model.footprint as Point[]}
            simulatedPosition={position}
            onConceptDecision={() => {
              setPreview(true);
              setState((s) =>
                s.status === "walking" ? { ...s, status: "paused" } : s,
              );
            }}
          />
          <div className="demo-timeline">
            <span>
              <Footprints size={20} />
              Approach · green
            </span>
            <span>
              <DoorOpen size={20} />
              E? · click to choose
            </span>
            <span>Indoor · purple / outdoors · green</span>
            <span>X? · concept exit</span>
          </div>
          <p className="data-note">
            Mall outline:{" "}
            <a href={model.sourceUrl} target="_blank" rel="noreferrer">
              {model.source}
            </a>
            . Approach, doors, interior and perimeter branches are presentation
            illustrations, not usable directions. Surveyed paths, access hours
            and indoor positioning are required for real navigation.
          </p>
        </section>
      </div>
      <details className="demo-recording">
        <summary>Watch the recorded judge demonstration</summary>
        <video
          controls
          preload="none"
          src="/videos/walking-journey-demo.mp4"
          aria-label="Recorded simulated walking journey"
        />
        <a
          className="secondary"
          href="/videos/walking-journey-demo.mp4"
          download
        >
          Download demonstration video
        </a>
      </details>
      <footer className="demo-footer">
        For real journeys use “Start my journey” in the planner: browser GPS is
        opt-in and may be unreliable indoors.{" "}
        <a href="/plan">Plan a journey →</a>
      </footer>
    </main>
  );
}
