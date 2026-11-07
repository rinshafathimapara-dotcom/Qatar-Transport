import type { MobilityRows } from "./mobility-context";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Base = { id: string; created_at: string };
export interface Rows extends MobilityRows {
  admin_users: { user_id: string; created_at: string };
  profiles: Base & { full_name: string; email: string };
  user_preferences: Base & {
    user_id: string;
    preferred_priority: string;
    max_walking_minutes: number;
    avoid_direct_sun: boolean;
    prefer_public_transport: boolean;
    budget_limit: number | null;
    updated_at: string;
  };
  places: Base & {
    name: string;
    category: string;
    address: string;
    latitude: number;
    longitude: number;
    source: string;
    source_license: string;
    is_demo: boolean;
  };
  transport_stops: {
    id: string;
    name: string;
    mode: string;
    line_name: string;
    latitude: number;
    longitude: number;
    source: string;
    is_demo: boolean;
  };
  transit_routes: {
    id: string;
    mode: string;
    route_code: string;
    route_name: string;
    operator: string;
    color: string;
    is_active: boolean;
    source: string;
    is_demo: boolean;
  };
  transit_route_stops: {
    id: string;
    route_id: string;
    stop_id: string;
    stop_sequence: number;
  };
  transit_schedules: {
    id: string;
    route_id: string;
    from_stop_id: string;
    to_stop_id: string;
    departure_time: string;
    arrival_time: string;
    days_of_week: Json[] | null;
    valid_from?: string | null;
    valid_until?: string | null;
    source?: string | null;
    is_demo?: boolean | null;
  };
  parking_locations: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    capacity: number | null;
    parking_type: string;
    is_public: boolean;
    source: string;
    is_demo: boolean;
  };
  parking_status: {
    id: string;
    parking_location_id: string;
    available_spaces: number | null;
    occupancy_status: string;
    observed_at: string;
    source: string;
    is_live: boolean;
    is_demo: boolean;
  };
  shade_segments: {
    id: string;
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
    shade_level: string;
    data_source: string;
    is_demo: boolean;
  };
  demand_forecasts: Base & {
    area_name: string;
    latitude: number;
    longitude: number;
    forecast_for: string;
    demand_level: string;
    estimated_wait_minutes: number | null;
    price_pressure: string;
    confidence: number | null;
    source: string;
    is_demo: boolean;
  };
  saved_journeys: Base & {
    user_id: string;
    origin_name: string;
    origin_latitude: number;
    origin_longitude: number;
    destination_name: string;
    destination_latitude: number;
    destination_longitude: number;
    selected_priority: string;
    route_snapshot: Json;
  };
  data_sources: Base & {
    name: string;
    source_url: string;
    licence_status: string;
    description: string;
    last_updated: string;
  };
  dataset_imports: {
    id: string;
    filename: string;
    target_table: string;
    records_processed: number;
    records_imported: number;
    records_rejected: number;
    import_status: string;
    error_summary: string | null;
    imported_at: string;
  };
}
export type Database = {
  public: {
    Tables: {
      [K in keyof Rows]: {
        Row: Rows[K];
        Insert: Partial<Rows[K]>;
        Update: Partial<Rows[K]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export type Location = {
  address?: string;
  aliases?: string;
  priority?: number;
  source?: string;
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  is_demo?: boolean;
};
export type Priority =
  "Balanced" | "Fastest" | "Shortest" | "Most comfortable" | "Budget-friendly";
export type Leg = {
  mode: "walk" | "metro" | "tram" | "bus" | "taxi";
  name: string;
  minutes: number;
  distance: number;
  coordinates: [number, number][];
  routeName?: string;
  routeCode?: string;
  fareConnection?: {
    previousLegIndex: number;
    minutes: number;
    verifiedInterchange: boolean;
    sourceUrl: string;
  };
  fareEligibility?: { metrolink: boolean; sourceUrl: string };
  geometry?:
    | "routed"
    | "verified-indoor"
    | "mapped-transit"
    | "schematic"
    | "concept"
    | "routed-driving";
  environment?: "outdoor" | "indoor";
  instructions?: WalkingInstruction[];
};
export type WalkingInstruction = { text: string; pointIndex: number };
export type LiveFix = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};
export type IndoorPassage = {
  id: string;
  name: string;
  entry: Location;
  exit: Location;
  coordinates: [number, number][];
  footprint: [number, number][];
  schedule: { days: number[]; opens: string; closes: string }[];
  source: string;
  verifiedAt: string;
  validUntil: string;
  publicAccess: boolean;
  airConditioned: boolean;
  isDemo: boolean;
  notes: string;
};
export type Journey = {
  id: string;
  title: string;
  minutes: number;
  distance: number;
  walking: number;
  cost: number | null;
  fare?: import("./fares").FareResult;
  distanceMode?: "driving" | "walking" | "mixed";
  drivingMinutes?: number;
  serviceCalendarKnown?: boolean;
  transfers: number;
  shade: number | null;
  shadeInfo?: import("@/services/shade").ShadeSummary;
  shadeDetails?: {
    shadedDistance: number | null;
    exposedDistance: number | null;
    basis: string;
  };
  isDemo: boolean;
  isApproximate?: boolean;
  legs: Leg[];
  warning: string;
  source: string;
};
export type Dataset = Pick<
  Rows,
  | "places"
  | "transport_stops"
  | "transit_routes"
  | "transit_route_stops"
  | "transit_schedules"
  | "parking_locations"
  | "parking_status"
  | "shade_segments"
  | "demand_forecasts"
  | "data_sources"
>;
export type Collection = { [K in keyof Dataset]: Dataset[K][] };
