export type FareStatus =
  | "published_reference"
  | "indicative_estimate"
  | "live_quote"
  | "unavailable"
  | "free";
export type FarePreferences = {
  travelClass: "standard" | "family" | "gold";
  ticket: "auto" | "single" | "day" | "weekly";
  payment: "reusable" | "ticket";
  previousJourneysToday: number;
  needsCard: boolean;
  plannedJourneysPerDay: number;
  plannedDays: number;
  taxi: {
    period: "day" | "night";
    zone: "doha" | "outside";
    airportPickup: boolean;
    waitingBlocks: number;
    telephone: "none" | "doha" | "toAirport";
  };
};
export const defaultFarePreferences: FarePreferences = {
  travelClass: "standard",
  ticket: "auto",
  payment: "reusable",
  previousJourneysToday: 0,
  needsCard: false,
  plannedJourneysPerDay: 1,
  plannedDays: 1,
  taxi: {
    period: "day",
    zone: "doha",
    airportPickup: false,
    waitingBlocks: 0,
    telephone: "none",
  },
};
export type FareLine = { label: string; amount: number | null };
export type FareResult = {
  amount: number | null;
  knownSubtotal: number;
  status: FareStatus;
  ticket: string;
  lines: FareLine[];
  notes: string[];
  sources: { name: string; url: string }[];
  cardPurchase: number | null;
};
