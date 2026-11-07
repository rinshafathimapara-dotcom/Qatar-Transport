"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Pause,
  Play,
  Sun,
  DoorOpen,
  ArrowRight,
  RotateCcw,
  Map,
} from "lucide-react";
import type { Leg } from "@/types/database";
import {
  advanceWalk,
  chooseWalk,
  initialWalkState,
  type WalkState,
} from "@/services/walking-scene";
import { pathLength, type Point } from "@/services/journey-simulation";
import WalkingStreetCanvas from "./walking-street-canvas";
export type WalkingViewInput = {
  leg: Leg;
  mall?: { name: string; atMetres: number; exitAtMetres?: number };
  initialShade?: boolean;
  temperature?: number | null;
  feelsLike?: number | null;
  onComplete?: () => void;
  onChoice?: (choice: "inside" | "outside") => void;
};
export default function WalkingView({
  input,
  onClose,
}: {
  input: WalkingViewInput;
  onClose: () => void;
}) {
  const [state, setState] = useState<WalkState>(initialWalkState),
    [paused, setPaused] = useState(false),
    [shaded, setShaded] = useState(input.initialShade ?? true),
    [speed, setSpeed] = useState(20);
  const close = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLElement>(null);
  const total = Math.max(1, pathLength(input.leg.coordinates as Point[])),
    pauseAt = input.mall
      ? Math.max(5, Math.min(total - 5, input.mall.atMetres))
      : null;
  useEffect(() => {
    const old = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, []);
  useEffect(() => {
    if (state.phase !== "entering") return;
    const t = setTimeout(
      () =>
        setState((s) => ({
          ...s,
          phase: input.leg.environment === "indoor" ? "indoors" : "walking",
          branch: input.leg.environment === "indoor" ? "inside" : s.branch,
        })),
      1100,
    );
    return () => clearTimeout(t);
  }, [state.phase]);
  useEffect(() => {
    if (paused || !["walking", "indoors"].includes(state.phase)) return;
    let previous = performance.now();
    const t = setInterval(() => {
      const now = performance.now(),
        delta = Math.min((now - previous) / 1000, 0.5) * 1.25 * speed;
      previous = now;
      setState((s) => advanceWalk(s, delta, total, pauseAt));
    }, 100);
    return () => clearInterval(t);
  }, [paused, state.phase, speed, total, pauseAt]);
  const canMove = state.phase === "walking" || state.phase === "indoors";
  function key(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Tab") {
      const nodes = panel.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled),select,a[href]",
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  return (
    <section
      ref={panel}
      className="walking-view"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walking-view-title"
      onKeyDown={key}
    >
      <div
        className={
          "walking-camera " + (state.phase === "entering" ? "descending" : "")
        }
      >
        <WalkingStreetCanvas
          state={state}
          shaded={shaded}
          mallName={input.mall?.name}
          paused={paused}
        />
      </div>
      <header className="walking-view-header">
        <div>
          <span className="walking-scene-status">
            SIMULATED WALK · GENERATED SCENERY
          </span>
          <h2 id="walking-view-title">
            {state.phase === "indoors"
              ? "Through the mall"
              : state.phase === "exit"
                ? "You’ve reached the exit"
                : state.phase === "complete"
                  ? "Walking section complete"
                  : "Your walk, at eye level"}
          </h2>
        </div>
        <button
          ref={close}
          className="walking-icon"
          onClick={onClose}
          aria-label="Close walking view"
        >
          <X />
        </button>
      </header>
      <div className="walking-view-route">
        <span>{input.leg.name}</span>
        <strong>
          {Math.max(0, Math.round(total - state.metres))} m remaining
        </strong>
        {typeof input.temperature === "number" && (
          <span>
            {input.temperature}°C
            {typeof input.feelsLike === "number"
              ? ` · feels like ${input.feelsLike}°C`
              : ""}{" "}
            · weather reference
          </span>
        )}
      </div>
      {state.phase === "entering" && (
        <div className="walking-enter-cue">
          Moving from the map to eye level…
        </div>
      )}
      {state.phase === "choice" && (
        <div
          className="walking-choice"
          role="region"
          aria-label="Mall entrance choice"
        >
          <span className="eyebrow">PAUSE POINT</span>
          <h3>{input.mall?.name} is ahead.</h3>
          <p>Explore an indoor passage, or continue around the building.</p>
          <button
            className="primary"
            onClick={() => {
              input.onChoice?.("inside");
              setState((s) => chooseWalk(s, "inside"));
            }}
          >
            <DoorOpen size={18} />
            Enter the mall
          </button>
          <button
            className="secondary"
            onClick={() => {
              input.onChoice?.("outside");
              setState((s) => chooseWalk(s, "outside"));
            }}
          >
            Go around outside <ArrowRight size={17} />
          </button>
          <small>
            Illustrative entrance and indoor layout; public access is not
            verified.
          </small>
        </div>
      )}
      {state.phase === "indoors" && (
        <div className="walking-instruction">
          Follow the corridor towards the EXIT sign ·{" "}
          {Math.max(0, Math.round(70 - state.indoorMetres))} m in this scene
        </div>
      )}
      {state.phase === "exit" && (
        <div className="walking-choice">
          <span className="eyebrow">OTHER SIDE OF THE BUILDING</span>
          <h3>Back to the street.</h3>
          <p>Your outdoor walking scene continues from here.</p>
          <button
            className="primary"
            onClick={() =>
              setState((s) => ({
                ...s,
                phase: "walking",
                metres: Math.min(
                  total,
                  input.leg.environment === "indoor"
                    ? total
                    : (input.mall?.exitAtMetres ?? s.metres + 1),
                ),
              }))
            }
          >
            Leave through the exit <ArrowRight size={18} />
          </button>
        </div>
      )}
      {state.phase === "complete" && (
        <div className="walking-choice">
          <h3>That’s your walking section.</h3>
          <p>Return to the map for the next part of your journey.</p>
          <button
            className="primary"
            onClick={() => {
              input.onComplete?.();
              onClose();
            }}
          >
            <Map size={18} />
            Continue on the map
          </button>
          <button
            className="secondary"
            onClick={() => {
              setState(initialWalkState);
              setPaused(false);
            }}
          >
            <RotateCcw size={17} />
            Replay the walk
          </button>
        </div>
      )}
      <div
        className="walking-view-controls"
        role="group"
        aria-label="Walking playback controls"
      >
        <div>
          <button
            className="walking-icon"
            disabled={!canMove}
            onClick={() => setPaused(!paused)}
            aria-label={
              paused ? "Resume simulated walk" : "Pause simulated walk"
            }
          >
            {paused ? <Play /> : <Pause />}
          </button>
          <label>
            Playback
            <select
              aria-label="Walking playback speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={1}>1×</option>
              <option value={8}>8×</option>
              <option value={20}>20×</option>
              <option value={40}>40×</option>
            </select>
          </label>
          <button
            className="walking-shade-toggle"
            aria-pressed={shaded}
            onClick={() => setShaded(!shaded)}
          >
            <Sun size={16} />
            {shaded ? "Shaded scene" : "Sunny scene"}
          </button>
        </div>
        <progress
          value={state.metres}
          max={total}
          aria-label="Simulated walking progress"
        />
        <small>
          Buildings, crossings, indoor paths and shadows are illustrative.
          Movement here is simulated, not GPS or street imagery.
        </small>
      </div>
    </section>
  );
}
