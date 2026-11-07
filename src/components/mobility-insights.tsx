"use client";
import { useState } from "react";
import {
  CloudSun,
  Thermometer,
  Accessibility,
  Bus,
  TriangleAlert,
  ChartNoAxesCombined,
} from "lucide-react";
import type { MobilityContext, MobilityRows } from "@/types/mobility-context";
import type { Rows } from "@/types/database";
import {
  dataStatus,
  displayNumber as n,
  qatarTimestamp as stamp,
} from "@/services/provenance";
type Props = {
  data: MobilityContext;
  sources: Rows["data_sources"][];
  loading: boolean;
  issues: string[];
  onRetry: () => void;
  mode?: "weather" | "all" | "traffic" | "accessibility";
  weatherId?: string;
  onWeather?: (r: MobilityRows["weather_conditions"]) => void;
};
function Source({
  row,
  sources,
}: {
  row:
    MobilityRows["weather_conditions"] | MobilityRows["accessibility_features"];
  sources: Rows["data_sources"][];
}) {
  const source = sources.find((s) => s.id === row.data_source_id);
  return (
    <details className="record-source">
      <summary>
        Source & status · {dataStatus(row, source?.description)}
      </summary>
      <p>{source?.name ?? "Source reference not supplied"}</p>
      {source?.description && <p>{source.description}</p>}
      {source?.source_url &&
        /^https?:\/\//.test(source.source_url) &&
        !source.source_url.includes(".local") && (
          <a href={source.source_url} target="_blank" rel="noreferrer">
            View source ↗
          </a>
        )}
    </details>
  );
}
function RecordGrid({
  title,
  children,
  count,
}: {
  title: string;
  children: React.ReactNode[];
  count: number;
}) {
  const [all, setAll] = useState(false);
  return (
    <section className="context-section">
      <h2>
        {title} <small>{count} records</small>
      </h2>
      {count ? (
        <>
          <div className="context-grid">
            {all ? children : children.slice(0, 6)}
          </div>
          {count > 6 && (
            <button className="text-button" onClick={() => setAll(!all)}>
              {all ? "Show fewer" : `Show all ${count}`}
            </button>
          )}
        </>
      ) : (
        <p className="context-empty">No records in this data view.</p>
      )}
    </section>
  );
}
export default function MobilityInsights({
  data,
  sources,
  loading,
  issues,
  onRetry,
  mode = "all",
  weatherId,
  onWeather,
}: Props) {
  const weather =
    data.weather_conditions.find((r) => r.id === weatherId) ??
    data.weather_conditions.find((r) => r.is_demo === false) ??
    data.weather_conditions[0];
  const weatherSource = sources.find((s) => s.id === weather?.data_source_id);
  if (loading && !data.weather_conditions.length)
    return (
      <div className="context-loading" role="status">
        Loading city conditions…
      </div>
    );
  return (
    <div className="mobility-insights">
      {issues.length > 0 && (
        <div className="info-box" role="status">
          <div>
            <strong>Some city information could not load</strong>
            <details>
              <summary>View affected datasets</summary>
              {issues.map((s) => (
                <p key={s}>{s}</p>
              ))}
            </details>
            <button className="text-button" onClick={onRetry}>
              Retry city data
            </button>
          </div>
        </div>
      )}
      {(mode === "all" || mode === "weather") && (
        <section
          className="weather-panel"
          aria-label="Weather and heat reference"
        >
          <div className="weather-title">
            <CloudSun size={28} />
            <div>
              <span className="eyebrow">WEATHER & WALKING COMFORT</span>
              <h2>{weather?.district ?? "City conditions"}</h2>
            </div>
            <span className="data-status">
              {weather
                ? dataStatus(weather, weatherSource?.description)
                : "No record"}
            </span>
          </div>
          {weather ? (
            <>
              <label className="weather-select">
                Weather reference
                <select
                  aria-label="Weather reference"
                  value={weather.id}
                  onChange={(e) => {
                    const next = data.weather_conditions.find(
                      (r) => r.id === e.target.value,
                    );
                    if (next) onWeather?.(next);
                  }}
                  disabled={!onWeather}
                >
                  {data.weather_conditions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.scenario_name ?? r.district ?? "Weather record"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="weather-metrics">
                <strong>
                  {n(weather.temperature_c, "°C")}
                  <small>
                    {weather.weather_condition ?? "Weather reference"}
                  </small>
                </strong>
                <span>
                  Feels like <b>{n(weather.feels_like_c, "°C")}</b>
                </span>
                <span>
                  Humidity <b>{n(weather.humidity_percent, "%")}</b>
                </span>
                <span>
                  UV index <b>{n(weather.uv_index)}</b>
                </span>
                <span>
                  Heat stress{" "}
                  <b>{weather.heat_stress_level ?? "Not supplied"}</b>
                </span>
              </div>
              <p className="heat-guidance">
                <Thermometer size={18} />
                {["high", "extreme"].includes(weather.heat_stress_level ?? "")
                  ? "This high-heat reference favours shade more strongly when you replan. Consider a shorter walk, water and breaks."
                  : "Compare shade and walking time using this weather reference."}{" "}
                Your walking budget stays at 20 minutes or less.
              </p>
              <p className="data-note">
                Recorded {stamp(weather.recorded_at)} · reference/scenario, not
                a live weather feed
                {weather.shade_weight_multiplier !== null
                  ? ` · supplied shade weight ${weather.shade_weight_multiplier}×`
                  : ""}
              </p>
              <Source row={weather} sources={sources} />
            </>
          ) : (
            <p>No weather records in this data view.</p>
          )}
        </section>
      )}
      {(mode === "all" || mode === "accessibility") && (
        <RecordGrid
          title="Accessibility along the way"
          count={data.accessibility_features.length}
        >
          {data.accessibility_features.map((r) => (
            <article className="context-card" key={r.id}>
              <Accessibility size={21} />
              <span className="data-status">
                {dataStatus(
                  r,
                  sources.find((s) => s.id === r.data_source_id)?.description,
                )}
              </span>
              <h3>{r.feature_name ?? "Accessibility feature"}</h3>
              <p>
                {r.district} ·{" "}
                {r.is_step_free === true
                  ? "Step-free reported"
                  : r.is_step_free === false
                    ? "Steps or barriers reported"
                    : "Step-free status not supplied"}
              </p>
              <p>{r.notes}</p>
              <Source row={r} sources={sources} />
            </article>
          ))}
        </RecordGrid>
      )}
      {(mode === "all" || mode === "traffic") && (
        <>
          <RecordGrid
            title="Traffic reports"
            count={data.traffic_incidents.length}
          >
            {data.traffic_incidents.map((r) => (
              <article className="context-card" key={r.id}>
                <TriangleAlert size={21} />
                <span className="data-status">{dataStatus(r)}</span>
                <h3>
                  {r.location_description ??
                    r.incident_code ??
                    "Traffic report"}
                </h3>
                <p>{r.traffic_condition?.replaceAll("_", " ")}</p>
                <p>{r.description}</p>
                <small>{stamp(r.recorded_at)}</small>
              </article>
            ))}
          </RecordGrid>
          <RecordGrid
            title="Vehicle snapshots"
            count={data.real_time_vehicle_telemetry.length}
          >
            {data.real_time_vehicle_telemetry.map((r) => (
              <article className="context-card" key={r.id}>
                <Bus size={21} />
                <span className="data-status">{dataStatus(r)}</span>
                <h3>{r.line_name ?? "Transport service"}</h3>
                <p>
                  {r.previous_stop ?? "Previous stop not supplied"} →{" "}
                  {r.next_stop ?? "Next stop not supplied"}
                </p>
                <p>
                  {n(r.speed_kmh, " km/h")} · occupancy{" "}
                  {n(r.passenger_occupancy_percent, "%")}
                </p>
                <p>{r.service_status?.replaceAll("_", " ")}</p>
                <small>{stamp(r.last_updated)}</small>
                {r.note && (
                  <details className="record-source">
                    <summary>Record notes</summary>
                    <p>{r.note}</p>
                  </details>
                )}
              </article>
            ))}
          </RecordGrid>
          <RecordGrid
            title="Journey history"
            count={data.historical_journey_analytics.length}
          >
            {data.historical_journey_analytics.map((r) => (
              <article className="context-card" key={r.id}>
                <ChartNoAxesCombined size={21} />
                <span className="data-status">{dataStatus(r)}</span>
                <h3>{r.journey_profile ?? "Journey profile"}</h3>
                <p>
                  {n(r.average_duration_min, " min")} · QAR{" "}
                  {n(r.average_cost_qar)} ·{" "}
                  {n(r.average_walking_km, " km walking")}
                </p>
                <p>
                  Comfort {n(r.average_comfort_score_out_of_100, "/100")} ·
                  completion {n(r.journey_success_rate_percent, "%")}
                </p>
                <small>Sample count: {n(r.sample_size_count)}</small>
              </article>
            ))}
          </RecordGrid>
        </>
      )}
    </div>
  );
}
