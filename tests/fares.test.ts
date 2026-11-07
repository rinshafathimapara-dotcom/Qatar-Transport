import test from "node:test";
import assert from "node:assert/strict";
import {
  journeyFare,
  taxiFare,
  money,
  recommendTicket,
  taxiPeriodAt,
  withFare,
} from "../src/services/fares";
import { defaultFarePreferences as defaults } from "../src/types/fares";
import type { FarePreferences } from "../src/types/fares";
import type { Journey, Leg } from "../src/types/database";
const leg = (mode: Leg["mode"], extra: Partial<Leg> = {}): Leg => ({
  mode,
  name: mode,
  minutes: 10,
  distance: 8000,
  coordinates: [
    [51.53, 25.28],
    [51.54, 25.29],
  ],
  ...extra,
});
const route = (legs: Leg[]): Journey => ({
  id: "test",
  title: "Test",
  minutes: 20,
  distance: 8000,
  walking: 0,
  cost: null,
  transfers: 0,
  shade: null,
  isDemo: false,
  legs,
  warning: "",
  source: "Test",
});
const prefs = (patch: Partial<FarePreferences> = {}): FarePreferences => ({
  ...structuredClone(defaults),
  ...patch,
});
test("standard and family Metro, Tram and walking fares are prominent finite QAR values", () => {
  assert.equal(journeyFare(route([leg("metro")])).amount, 2);
  assert.equal(journeyFare(route([leg("tram")])).amount, 2);
  assert.equal(
    journeyFare(route([leg("metro")]), prefs({ travelClass: "family" })).amount,
    2,
  );
  assert.equal(journeyFare(route([leg("walk")])).amount, 0);
  assert.equal(money(2), "QAR 2.00");
  assert.equal(money(NaN), "Fare unavailable");
});
test("Gold Metro single and day pass work, Gold Tram and weekly pass are unavailable", () => {
  assert.equal(
    journeyFare(route([leg("metro")]), prefs({ travelClass: "gold" })).amount,
    10,
  );
  assert.equal(
    journeyFare(
      route([leg("metro")]),
      prefs({ travelClass: "gold", ticket: "day" }),
    ).amount,
    30,
  );
  assert.equal(
    journeyFare(route([leg("tram")]), prefs({ travelClass: "gold" })).amount,
    null,
  );
  assert.equal(
    journeyFare(
      route([leg("metro")]),
      prefs({ travelClass: "gold", ticket: "weekly" }),
    ).amount,
    null,
  );
});
test("passes and optional card purchases are distinct from per-journey fare", () => {
  const r = route([leg("metro")]);
  const single = journeyFare(r, prefs({ needsCard: true }));
  assert.equal(single.amount, 2);
  assert.equal(single.cardPurchase, 10);
  assert.equal(journeyFare(r, prefs({ ticket: "day" })).amount, 6);
  assert.equal(journeyFare(r, prefs({ ticket: "weekly" })).amount, 40);
  assert.equal(
    journeyFare(r, prefs({ travelClass: "gold", needsCard: true }))
      .cardPurchase,
    100,
  );
});
test("daily capping is applied only to reusable same-class travel, not missing fares", () => {
  const r = route([leg("metro")]);
  assert.equal(journeyFare(r, prefs({ previousJourneysToday: 2 })).amount, 2);
  assert.equal(journeyFare(r, prefs({ previousJourneysToday: 3 })).amount, 0);
  assert.equal(
    journeyFare(r, prefs({ previousJourneysToday: 3, payment: "ticket" }))
      .amount,
    2,
  );
  assert.equal(
    journeyFare(r, prefs({ previousJourneysToday: 3, needsCard: true })).amount,
    2,
  );
});
test("only a verified qualifying Metro/Tram interchange receives the combined-journey fare", () => {
  const proof = {
    previousLegIndex: 0,
    minutes: 30,
    verifiedInterchange: true,
    sourceUrl: "https://www.qr.com.qa/policy",
  };
  assert.equal(
    journeyFare(route([leg("metro"), leg("tram", { fareConnection: proof })]))
      .amount,
    2,
  );
  assert.equal(
    journeyFare(route([leg("tram"), leg("metro", { fareConnection: proof })]))
      .amount,
    2,
  );
  assert.equal(
    journeyFare(
      route([
        leg("metro"),
        leg("tram", { fareConnection: { ...proof, minutes: 31 } }),
      ]),
    ).amount,
    4,
  );
  const unknown = journeyFare(route([leg("metro"), leg("tram")]));
  assert.equal(unknown.amount, 4);
  assert.equal(unknown.status, "indicative_estimate");
  assert.match(unknown.notes.join(" "), /separate rail/);
  assert.equal(
    journeyFare(
      route([
        leg("metro"),
        leg("tram", {
          fareConnection: { ...proof, sourceUrl: "https://example.com" },
        }),
      ]),
    ).amount,
    4,
  );
});
test("ordinary bus stays unavailable; free Metrolink needs explicit eligible-service provenance", () => {
  assert.equal(journeyFare(route([leg("bus")])).amount, null);
  assert.equal(
    journeyFare(route([leg("bus", { routeName: "Metrolink-looking name" })]))
      .amount,
    null,
  );
  const link = leg("bus", {
    fareEligibility: {
      metrolink: true,
      sourceUrl: "https://www.mowasalat.com/metrolink",
    },
  });
  assert.equal(journeyFare(route([link])).amount, 0);
  assert.equal(journeyFare(route([leg("metro"), link])).amount, 2);
  const mixed = journeyFare(route([leg("metro"), leg("bus")]));
  assert.equal(mixed.amount, null);
  assert.equal(mixed.knownSubtotal, 2);
});
test("8 km taxi estimates use driving distance and distinguish periods, zones and airport pickup", () => {
  const d = { metres: 8000, mode: "driving" };
  assert.equal(taxiFare(d).amount, 16.8);
  assert.equal(taxiFare(d, { ...defaults.taxi, period: "night" }).amount, 19.2);
  assert.equal(taxiFare(d, { ...defaults.taxi, zone: "outside" }).amount, 19.2);
  assert.equal(
    taxiFare(d, { ...defaults.taxi, airportPickup: true }).amount,
    37.8,
  );
  assert.equal(taxiFare({ metres: 100, mode: "driving" }).amount, 10);
  assert.equal(taxiFare(d).status, "indicative_estimate");
});
test("waiting and telephone fees are opt-in and not confused with airport flag fall", () => {
  const d = { metres: 8000, mode: "driving" };
  assert.equal(
    taxiFare(d, { ...defaults.taxi, waitingBlocks: 1, telephone: "doha" })
      .amount,
    29.8,
  );
  assert.equal(
    taxiFare(d, { ...defaults.taxi, telephone: "toAirport" }).amount,
    24.8,
  );
  assert.equal(
    taxiFare(d, {
      ...defaults.taxi,
      airportPickup: true,
      telephone: "toAirport",
    }).amount,
    null,
  );
});
test("missing, non-driving and invalid distances never become zero or NaN fares", () => {
  for (const d of [
    null,
    { metres: 8000, mode: "walking" },
    { metres: 8000, mode: "straight_line" },
    { metres: NaN, mode: "driving" },
    { metres: -1, mode: "driving" },
  ])
    assert.equal(taxiFare(d).amount, null);
  assert.equal(journeyFare(route([])).amount, null);
});
test("ticket recommendations use stated trip counts and taxi waiting time is not added repeatedly", () => {
  assert.equal(
    recommendTicket(prefs({ plannedDays: 7, plannedJourneysPerDay: 3 }))?.name,
    "Weekly pass",
  );
  assert.equal(
    recommendTicket(
      prefs({ plannedDays: 1, plannedJourneysPerDay: 4, payment: "ticket" }),
    )?.name,
    "Day passes",
  );
  const r = {
    ...route([leg("taxi")]),
    distanceMode: "driving" as const,
    drivingMinutes: 10,
  };
  const p = prefs({ taxi: { ...defaults.taxi, waitingBlocks: 1 } });
  assert.equal(withFare(r, p).minutes, 25);
  assert.equal(withFare(withFare(r, p), p).minutes, 25);
  assert.equal(taxiPeriodAt("03:59"), "night");
  assert.equal(taxiPeriodAt("04:00"), "day");
  assert.equal(taxiPeriodAt("23:00"), "night");
});

test("rounded taxi line items add up to the displayed total at half-cent boundaries", () => {
  const fare = taxiFare({ metres: 1253.125, mode: "driving" });
  const total = fare.lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  assert.equal(Math.round(total * 100), Math.round(fare.amount! * 100));
});

test("mixed walking distance is never silently charged at the taxi kilometre rate", () => {
  const r = {
    ...route([leg("walk", { distance: 600 }), leg("taxi")]),
    distanceMode: "driving" as const,
  };
  assert.equal(journeyFare(r).amount, null);
});
