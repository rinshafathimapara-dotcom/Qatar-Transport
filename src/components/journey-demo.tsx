"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Sun, Footprints, DoorOpen } from "lucide-react";
import { loadMobilityContext } from "@/services/mobility-context";
import {
  emptyMobilityContext,
  type MobilityContext,
} from "@/types/mobility-context";
import model from "@/data/mall-concept.json";
import type { Collection, Journey } from "@/types/database";
import { pathLength, type Point } from "@/services/journey-simulation";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <p>Loading the walking map…</p>,
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
  exit = model.exit as Point,
  approach: Point[] = [
    [entry[0] - 0.00065, entry[1] - 0.00015],
    [entry[0] - 0.00015, entry[1] - 0.00015],
    entry,
  ],
  finish: Point[] = [exit, [exit[0] + 0.00045, exit[1] + 0.00005]],
  ring = model.footprint.slice(0, -1) as Point[];
const a = ring.findIndex((p) => p[0] === entry[0] && p[1] === entry[1]),
  b = ring.findIndex((p) => p[0] === exit[0] && p[1] === exit[1]),
  outside = (
    a < b ? ring.slice(a, b + 1) : [...ring.slice(a), ...ring.slice(0, b + 1)]
  ) as Point[],
  inside = model.inside as Point[];
const start = {
    id: "walking-start",
    name: "Walking experience start",
    longitude: approach[0][0],
    latitude: approach[0][1],
    is_demo: true,
  },
  end = {
    id: "walking-end",
    name: "Other side of City Center Doha",
    longitude: finish[1][0],
    latitude: finish[1][1],
    is_demo: true,
  };
export default function JourneyDemo() {
  const [city, setCity] = useState<MobilityContext>(emptyMobilityContext);
  useEffect(() => {
    let active = true;
    loadMobilityContext(true, (partial) => {
      if (active) setCity(partial);
    }).then((result) => {
      if (active) setCity(result.data);
    });
    return () => {
      active = false;
    };
  }, []);
  const weather =
    city.weather_conditions.find((r) => r.is_demo === false) ??
    city.weather_conditions[0];
  const [choice, setChoice] = useState<"inside" | "outside">("outside");
  const route = useMemo<Journey>(() => {
    const branch = choice === "inside" ? inside : outside;
    return {
      id: "walking-experience",
      title: "City Center walking experience",
      minutes: Math.ceil(
        (pathLength(approach) + pathLength(branch) + pathLength(finish)) / 75,
      ),
      distance: pathLength(approach) + pathLength(branch) + pathLength(finish),
      walking: pathLength(approach) + pathLength(branch) + pathLength(finish),
      cost: 0,
      transfers: 0,
      shade: null,
      isDemo: true,
      isApproximate: true,
      source: model.source,
      warning: model.warning,
      legs:
        choice === "inside"
          ? [
              {
                mode: "walk",
                name: "Towards City Center Doha",
                minutes: 1,
                distance: pathLength(approach),
                coordinates: approach,
                geometry: "concept",
                environment: "outdoor",
              },
              {
                mode: "walk",
                name: "Indoor passage illustration",
                minutes: 5,
                distance: pathLength(inside),
                coordinates: inside,
                geometry: "concept",
                environment: "indoor",
              },
              {
                mode: "walk",
                name: "After the exit",
                minutes: 1,
                distance: pathLength(finish),
                coordinates: finish,
                geometry: "concept",
                environment: "outdoor",
              },
            ]
          : [
              {
                mode: "walk",
                name: "City Center Doha · around or through?",
                minutes: Math.ceil(
                  (pathLength(approach) +
                    pathLength(outside) +
                    pathLength(finish)) /
                    75,
                ),
                distance:
                  pathLength(approach) +
                  pathLength(outside) +
                  pathLength(finish),
                coordinates: [
                  ...approach,
                  ...outside.slice(1),
                  ...finish.slice(1),
                ],
                geometry: "concept",
                environment: "outdoor",
              },
            ],
    };
  }, [choice]);
  return (
    <main className="walking-experience-page">
      <header className="demo-header">
        <Link href="/">
          smarter<span>qatar.</span>
        </Link>
        <Link href="/plan">
          Plan a journey <ArrowRight size={16} />
        </Link>
      </header>
      <div className="walking-experience-intro">
        <span className="eyebrow">SEE YOUR WALK DIFFERENTLY</span>
        <h1>
          From the map.
          <br />
          Into your walking shoes.
        </h1>
        <p>
          Tap the walking line to move down to eye level. Watch the street pass,
          compare sun and shade, and choose your way through City Center Doha.
        </p>
        <span className="walking-scene-status">
          INTERACTIVE SIMULATION · ILLUSTRATIVE SCENERY & MALL ACCESS
        </span>
      </div>
      <div className="map-weather-summary">
        {weather ? (
          <>
            <Sun size={17} />
            <strong>{weather.temperature_c ?? "—"}°C</strong>
            <span>
              Feels like {weather.feels_like_c ?? "—"}°C ·{" "}
              {weather.heat_stress_level ?? "—"} heat stress · weather reference
            </span>
          </>
        ) : (
          <span>Weather reference available when connected</span>
        )}
        <Link href="/conditions">Weather details ↗</Link>
      </div>
      <div className="walking-experience-map">
        <Map
          data={empty}
          from={start}
          to={end}
          route={route}
          conceptOnly
          mobility={city}
          walkingWeather={weather}
          conceptFootprint={model.footprint as Point[]}
          walkingMall={{
            name: model.name,
            atMetres: pathLength(approach),
            exitAtMetres: pathLength(approach) + pathLength(outside),
          }}
          onWalkChoice={setChoice}
        />
        <span className="walking-map-invitation">
          Tap a walking line, or choose “Walk view” ↗
        </span>
      </div>
      <div className="walking-experience-features">
        <div>
          <Footprints />
          <strong>A street-level perspective</strong>
          <p>
            Grey buildings and an advancing path put you in the walking scene.
          </p>
        </div>
        <div>
          <Sun />
          <strong>See the difference shade makes</strong>
          <p>
            Switch between sunny and shaded scene styles while the ground moves
            past.
          </p>
        </div>
        <div>
          <DoorOpen />
          <strong>A choice at the mall</strong>
          <p>
            Pause at the entrance, go through or around, and return to the map
            afterwards.
          </p>
        </div>
      </div>
      <details className="walking-recording">
        <summary>Watch the walking experience</summary>
        <video
          controls
          preload="none"
          poster="/images/walking-view-poster.png"
          src="/videos/eye-level-walk.mp4"
          aria-label="Recorded first-person walking simulation"
        />
        <a className="secondary" href="/videos/eye-level-walk.mp4" download>
          Download walkthrough
        </a>
      </details>
      <p className="data-note">
        City Center Doha’s location/outline is mapped from OpenStreetMap. The
        buildings, entrances, indoor corridor, shadows and movement in this
        experience are illustrative, not surveyed access, street imagery or live
        GPS.{" "}
        <Link href="/plan">
          Use the journey planner for mapped walking routes →
        </Link>
      </p>
    </main>
  );
}
