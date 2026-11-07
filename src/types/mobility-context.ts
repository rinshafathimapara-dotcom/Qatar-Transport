export interface MobilityRows {
  shade_demo_routes: {
    id: string;
    route_name: string;
    corridor_group: string;
    optimization_profile: string;
    total_walking_distance_m: number | null;
    estimated_walking_duration_min: number | null;
    shade_coverage_percent: number | null;
    shaded_distance_m: number | null;
    exposed_distance_m: number | null;
    segment_ids: string[] | null;
    is_demo: boolean | null;
    created_at: string | null;
  };
  weather_conditions: {
    id: string;
    scenario_name: string | null;
    district: string | null;
    temperature_c: number | null;
    feels_like_c: number | null;
    humidity_percent: number | null;
    uv_index: number | null;
    weather_condition: string | null;
    heat_stress_level: string | null;
    shade_weight_multiplier: number | null;
    recorded_at: string | null;
    data_source_id: string | null;
    is_demo: boolean | null;
  };
  accessibility_features: {
    id: string;
    feature_name: string | null;
    feature_type: string | null;
    district: string | null;
    latitude: number | null;
    longitude: number | null;
    is_step_free: boolean | null;
    notes: string | null;
    data_source_id: string | null;
    is_demo: boolean | null;
  };
  real_time_vehicle_telemetry: {
    id: string;
    vehicle_id: string | null;
    line_name: string | null;
    previous_stop: string | null;
    next_stop: string | null;
    latitude: number | null;
    longitude: number | null;
    speed_kmh: number | null;
    passenger_occupancy_percent: number | null;
    service_status: string | null;
    last_updated: string | null;
    is_demo: boolean | null;
    note: string | null;
  };
  traffic_incidents: {
    id: string;
    incident_code: string | null;
    location_description: string | null;
    latitude: number | null;
    longitude: number | null;
    traffic_condition: string | null;
    description: string | null;
    recorded_at: string | null;
    is_demo: boolean | null;
  };
  historical_journey_analytics: {
    id: string;
    journey_profile: string | null;
    average_duration_min: number | null;
    average_cost_qar: number | null;
    average_walking_km: number | null;
    average_comfort_score_out_of_100: number | null;
    journey_success_rate_percent: number | null;
    sample_size_count: number | null;
    is_demo: boolean | null;
  };
}
export type MobilityContext = { [K in keyof MobilityRows]: MobilityRows[K][] };
export const emptyMobilityContext: MobilityContext = {
  shade_demo_routes: [],
  weather_conditions: [],
  accessibility_features: [],
  real_time_vehicle_telemetry: [],
  traffic_incidents: [],
  historical_journey_analytics: [],
};
