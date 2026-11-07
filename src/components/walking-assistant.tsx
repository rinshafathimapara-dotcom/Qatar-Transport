"use client";
import { useEffect, useRef, useState } from "react";
import {
  LocateFixed,
  Pause,
  Navigation,
  DoorOpen,
  Sun,
  Footprints,
} from "lucide-react";
import type { Journey, LiveFix, IndoorPassage } from "@/types/database";
import {
  alongPath,
  isAtDecision,
  relevantPassages,
} from "@/services/navigation";
import { choosePassage } from "@/services/indoor-routing";
import { distance } from "@/services/geo";
import IndoorConcept from "./indoor-concept";
export default function WalkingAssistant({
  route,
  passages,
  selectedId,
  onSelect,
  onPosition,
  onReplace,
  onReroute,
  onError,
}: {
  route: Journey;
  passages: IndoorPassage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPosition: (p: LiveFix | null) => void;
  onReplace: (r: Journey) => void;
  onReroute: (p: LiveFix) => void;
  onError: (s: string) => void;
}) {
  const [tracking, setTracking] = useState(false),
    [fix, setFix] = useState<LiveFix | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [clock, setClock] = useState(0);
  const decisions = useRef(new Set<string>()),
    watch = useRef<number | null>(null);
  const available = relevantPassages(route, passages, new Date(clock));
  const selected = available.find((p) => p.id === selectedId);
  useEffect(() => {
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation || !window.isSecureContext) {
      setMessage(
        "Location needs an HTTPS preview or localhost and browser permission.",
      );
      setTracking(false);
      return;
    }
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        const next = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          timestamp: p.timestamp,
        };
        setFix(next);
        onPosition(next);
        setMessage("");
      },
      (error) => {
        setMessage(
          error.code === 1
            ? "Location permission was denied. You can enable it in your browser settings."
            : "Location temporarily unavailable. Keep the map open or move where GPS reception is clearer.",
        );
        if (error.code === 1) setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
    return () => {
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
      onPosition(null);
    };
  }, [tracking, onPosition]);
  useEffect(() => {
    if (!tracking || !fix) return;
    const next = available.find(
      (p) => !decisions.current.has(p.id) && isAtDecision(fix, p, clock),
    );
    if (next) onSelect(next.id);
  }, [fix, tracking, available, clock, onSelect]);
  const fresh = fix && clock - fix.timestamp < 15000;
  const legs = route.legs.filter(
    (l) => l.mode === "walk" && l.geometry === "routed",
  );
  const current = fix
    ? legs
        .map((l) => ({ leg: l, ...alongPath(fix, l.coordinates) }))
        .sort((a, b) => a.distance - b.distance)[0]
    : null;
  const instruction = current?.leg.instructions?.filter(
    (i) => i.pointIndex >= current.pointIndex,
  )[0]?.text;
  async function choose(choice: "inside" | "outside") {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await choosePassage(route, selected, choice);
      decisions.current.add(selected.id);
      onReplace(updated);
      onSelect(null);
      setMessage(
        choice === "inside"
          ? "Indoor route selected. Check the named doorway and access signs on arrival."
          : "Outdoor route selected.",
      );
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const indoors = route.legs
    .filter((l) => l.environment === "indoor")
    .reduce((n, l) => n + l.minutes, 0);
  return (
    <div className="walking-assistant">
      <div className="walking-assistant-heading">
        <div>
          <span className="eyebrow">WALK WITH CONTEXT</span>
          <h3>Your walking companion</h3>
        </div>
        <button
          className="secondary"
          onClick={() => {
            setTracking(!tracking);
            if (tracking) {
              setFix(null);
              onPosition(null);
            }
          }}
        >
          {tracking ? <Pause size={16} /> : <LocateFixed size={16} />}
          {tracking ? "Stop location" : "Start live location"}
        </button>
      </div>
      <p className="data-note">
        Your blue dot is your browser's GPS estimate, not a guaranteed road
        position. Tracking stays in this tab and stops when you leave the
        journey. Planning or rerouting sends the selected endpoints to this
        app's server. Only an optional external provider forwards those
        endpoints to that provider.
      </p>
      {tracking && (
        <div className="gps-status" role="status">
          {fix ? (
            <>
              <strong>
                {fresh
                  ? `Location accuracy: ±${Math.round(fix.accuracy)} m`
                  : "Waiting for a fresh GPS fix…"}
              </strong>
              <span>
                Updated{" "}
                {new Date(fix.timestamp).toLocaleTimeString("en-GB", {
                  timeZone: "Asia/Qatar",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}{" "}
                Qatar time
              </span>
              {fresh && fix.accuracy <= 50 && current && (
                <p>
                  {current.distance > 40 + fix.accuracy
                    ? "You may be off the displayed path."
                    : instruction || "Follow the marked pedestrian path."}
                </p>
              )}
            </>
          ) : (
            <span>Waiting for browser location permission and a GPS fix…</span>
          )}
          {fix && fresh && (
            <button className="text-button" onClick={() => onReroute(fix)}>
              Replan from my location <Navigation size={14} />
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="data-note">
          {message}
        </p>
      )}
      <div className="walking-comfort">
        <Sun size={19} />
        <p>
          {indoors
            ? `About ${indoors} min on the selected mapped indoor passage. `
            : ""}
          Outdoor shade and heat exposure are unknown unless supplied by
          reviewed data. Indoor or shaded walking may improve comfort; it does
          not guarantee safety from heat.
        </p>
      </div>
      {available.length ? (
        <div className="pause-list">
          <strong>Indoor decision points on this walking leg</strong>
          {available.map((p) => (
            <button
              key={p.id}
              className="secondary"
              onClick={() => onSelect(p.id)}
            >
              <DoorOpen size={16} />
              {p.name}
              <small>
                {fix
                  ? `${Math.round(distance(fix, p.entry))} m from your GPS fix`
                  : "Preview entrance and exit"}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <p className="data-note">
          No reviewed public indoor shortcut matches this route. No mall doors
          or walk-through permissions have been invented for live navigation.
        </p>
      )}
      <IndoorConcept />
      {selected && (
        <section
          className="indoor-decision"
          role="region"
          aria-label={`Route choice at ${selected.name}`}
          aria-live="polite"
        >
          <span className="eyebrow">DECISION POINT</span>
          <h3>{selected.name}: through or around?</h3>
          <p>
            Entrance: <strong>{selected.entry.name}</strong>
            <br />
            Exit: <strong>{selected.exit.name}</strong>
          </p>
          <p>
            Expected open from supplied hours; confirm signs and access when you
            arrive.{" "}
            {selected.airConditioned
              ? "Air conditioning was reported by the data source."
              : "Air conditioning is unverified."}
          </p>
          <div>
            <button
              className="primary"
              disabled={busy}
              onClick={() => choose("inside")}
            >
              <DoorOpen size={16} />
              {busy ? "Calculating…" : "Go through"}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => choose("outside")}
            >
              <Footprints size={16} />
              Go around
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                decisions.current.add(selected.id);
                onSelect(null);
              }}
            >
              Keep current route
            </button>
          </div>
          <small>
            Source: {selected.source} · Checked {selected.verifiedAt}
          </small>
        </section>
      )}
    </div>
  );
}
