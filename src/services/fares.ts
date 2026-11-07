import { qatarTransportFares as config } from "@/data/qatarTransportFares";
import type { Journey, Leg } from "@/types/database";
import {
  defaultFarePreferences,
  type FarePreferences,
  type FareResult,
} from "@/types/fares";
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (amount: unknown) =>
  typeof amount === "number" && Number.isFinite(amount) && amount >= 0
    ? `QAR ${amount.toFixed(2)}`
    : "Fare unavailable";
export const fareStatusLabel = (status: FareResult["status"]) =>
  ({
    published_reference: "Published fare reference",
    indicative_estimate: "Indicative estimate",
    live_quote: "Live provider quote",
    unavailable: "Unavailable",
    free: "No transport fare",
  })[status];
export function unavailableFare(note: string): FareResult {
  return {
    amount: null,
    knownSubtotal: 0,
    status: "unavailable",
    ticket: "Fare unavailable",
    lines: [],
    notes: [note],
    sources: [],
    cardPurchase: null,
  };
}
const count = (n: number, min = 0, max = 100) =>
  Number.isInteger(n) && n >= min && n <= max;
export function taxiPeriodAt(time: string): "day" | "night" | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  return h >= config.taxi.dayStarts && h < config.taxi.nightStarts
    ? "day"
    : "night";
}
export function taxiFare(
  distance: { metres: number; mode: string } | null,
  prefs: FarePreferences["taxi"] = defaultFarePreferences.taxi,
): FareResult {
  if (
    !distance ||
    distance.mode !== "driving" ||
    !Number.isFinite(distance.metres) ||
    distance.metres <= 0
  )
    return unavailableFare(
      "A routed driving distance is required for a Karwa estimate; walking and straight-line distances are not substituted.",
    );
  if (
    !["day", "night"].includes(prefs.period) ||
    !["doha", "outside"].includes(prefs.zone) ||
    !count(prefs.waitingBlocks, 0, 48) ||
    !["none", "doha", "toAirport"].includes(prefs.telephone)
  )
    return unavailableFare(
      "Check the taxi tariff and optional-charge selections.",
    );
  if (prefs.airportPickup && prefs.telephone === "toAirport")
    return unavailableFare(
      "Airport pickup and telephone booking to the airport describe different journey directions.",
    );
  if (prefs.zone === "outside" && prefs.telephone !== "none")
    return unavailableFare(
      "The configured telephone-booking references apply to Doha bookings; select no telephone charge for an outside-Doha estimate.",
    );
  const rates = config.taxi,
    rate =
      prefs.zone === "outside"
        ? rates.outsideRate
        : prefs.period === "night"
          ? rates.nightRate
          : rates.dayRate,
    flag = prefs.airportPickup ? rates.airportFlagFall : rates.flagFall,
    km = distance.metres / 1000,
    distanceCharge = cents(km * rate),
    base = flag + distanceCharge,
    minimum = Math.max(0, rates.minimum - base),
    wait = prefs.waitingBlocks * rates.waitingBlockCharge,
    booking =
      prefs.telephone === "doha"
        ? rates.telephoneDoha
        : prefs.telephone === "toAirport"
          ? rates.telephoneToAirport
          : 0;
  const lines = [
    {
      label: prefs.airportPickup
        ? "Airport pickup starting fare (replaces city flag fall)"
        : "City flag fall",
      amount: flag,
    },
    {
      label: `${km.toFixed(2)} km × ${money(rate)}/km · ${prefs.zone === "outside" ? "outside Doha" : prefs.period + "time"}`,
      amount: distanceCharge,
    },
  ];
  if (minimum)
    lines.push({ label: "Minimum-fare adjustment", amount: cents(minimum) });
  if (wait)
    lines.push({
      label: `Selected waiting: ${prefs.waitingBlocks} × 15-minute blocks`,
      amount: wait,
    });
  if (booking)
    lines.push({
      label: "Selected telephone-booking reference",
      amount: booking,
    });
  return {
    amount: cents(Math.max(rates.minimum, base) + wait + booking),
    knownSubtotal: cents(Math.max(rates.minimum, base) + wait + booking),
    status: "indicative_estimate",
    ticket: "Karwa Taxi · indicative meter estimate",
    lines,
    notes: [
      "Indicative estimate — not a live Karwa quote. Final meter fare may differ.",
      rates.note,
    ],
    sources: rates.sourceUrls.map((url, i) => ({
      name: i ? "Published taxi guidance" : "Ministry transport-plan reference",
      url,
    })),
    cardPurchase: null,
  };
}
function validTransfer(previous: Leg, next: Leg, index: number) {
  const proof = next.fareConnection;
  return (
    previous.mode !== next.mode &&
    ["metro", "tram"].includes(previous.mode) &&
    ["metro", "tram"].includes(next.mode) &&
    proof?.previousLegIndex === index &&
    proof.verifiedInterchange === true &&
    Number.isFinite(proof.minutes) &&
    proof.minutes >= 0 &&
    proof.minutes <= config.rail.interchangeMinutes &&
    /^https:\/\/(www\.)?qr\.com\.qa\//.test(proof.sourceUrl)
  );
}
export function journeyFare(
  route: Journey,
  prefs: FarePreferences = defaultFarePreferences,
): FareResult {
  if (!route.legs.length)
    return unavailableFare(
      "Select a supported route before calculating its fare.",
    );
  if (route.legs.some((l) => l.mode === "taxi")) {
    if (route.legs.some((l) => !["walk", "taxi"].includes(l.mode)))
      return unavailableFare(
        "This mixed taxi/transit fare needs separate component quotes.",
      );
    if (route.legs.some((l) => l.mode === "walk" && l.distance > 0))
      return unavailableFare(
        "This mixed walking/taxi journey needs a separate driving-segment quote; total walking distance is not charged as taxi distance.",
      );
    return taxiFare(
      route.distanceMode === "driving"
        ? { metres: route.distance, mode: "driving" }
        : null,
      prefs.taxi,
    );
  }
  if (route.legs.every((l) => l.mode === "walk"))
    return {
      amount: 0,
      knownSubtotal: 0,
      status: "free",
      ticket: "Walking · no ticket",
      lines: [{ label: "Walking", amount: 0 }],
      notes: [],
      sources: [],
      cardPurchase: null,
    };
  const rail = route.legs
      .map((leg, index) => ({ leg, index }))
      .filter((x) => ["metro", "tram"].includes(x.leg.mode)),
    bus = route.legs.filter((l) => l.mode === "bus");
  if (!rail.length && !bus.length)
    return unavailableFare("A fare is not configured for this transport mode.");
  if (
    !["standard", "family", "gold"].includes(prefs.travelClass) ||
    !["auto", "single", "day", "weekly"].includes(prefs.ticket) ||
    !["ticket", "reusable"].includes(prefs.payment) ||
    !count(prefs.previousJourneysToday, 0, 100)
  )
    return unavailableFare("Check the ticket and prior-journey selections.");
  if (prefs.travelClass === "gold" && rail.some((x) => x.leg.mode === "tram"))
    return unavailableFare(
      "Lusail Tram has no Gold class. Select Standard or Family for this route; a mixed-class interchange is not assumed.",
    );
  const result: FareResult = {
    amount: 0,
    knownSubtotal: 0,
    status: "published_reference",
    ticket: "",
    lines: [],
    notes: [],
    sources: [],
    cardPurchase: null,
  };
  let units = 0,
    uncertain = false;
  rail.forEach(({ leg, index }, i) => {
    const prior = rail[i - 1];
    if (
      prior &&
      route.legs
        .slice(prior.index + 1, index)
        .every((l) => l.mode === "walk") &&
      validTransfer(prior.leg, leg, prior.index)
    ) {
      result.notes.push(
        "Qualifying Metro–Tram interchange within 30 minutes counted as one journey.",
      );
      return;
    }
    units++;
    if (prior) {
      uncertain = true;
      result.notes.push(
        "Interchange eligibility is not established; separate rail journey fares are shown conservatively.",
      );
    }
  });
  if (units) {
    const rate =
      prefs.travelClass === "gold" ? config.rail.gold : config.rail.standard;
    let charge = rate.single * units,
      ticket = "Single journey";
    if (prefs.ticket === "weekly") {
      if (rate.weekly === null)
        return unavailableFare(
          "A Gold weekly pass is not available in this policy reference.",
        );
      charge = rate.weekly;
      ticket = "Weekly pass purchase";
      result.notes.push(
        "Valid for seven days from purchase under the supplied policy.",
      );
    } else if (prefs.ticket === "day") {
      charge = rate.day;
      ticket = "Day pass purchase";
      result.notes.push(
        `Unlimited eligible journeys until ${config.rail.dayPassEnds}.`,
      );
    } else if (prefs.payment === "reusable") {
      const previous = prefs.needsCard ? 0 : prefs.previousJourneysToday,
        before = Math.min(rate.day, previous * rate.single),
        after = Math.min(rate.day, (previous + units) * rate.single);
      charge = after - before;
      ticket = "Reusable card · single-journey debit";
      result.notes.push(
        `Daily cap ${money(rate.day)}; ${previous} previous same-class journey(s) supplied for this fare day.`,
      );
      if (charge === 0)
        result.notes.push(
          "No further rail charge: the supplied journey count has already reached the daily cap.",
        );
    }
    if (prefs.ticket === "auto" && charge > rate.day) {
      charge = rate.day;
      ticket = "Day pass purchase";
      result.notes.push(
        "Day pass is cheaper than separate single journeys for this route.",
      );
    }
    result.ticket = `${prefs.travelClass === "gold" ? "Gold" : prefs.travelClass === "family" ? "Family" : "Standard"} · ${ticket}`;
    result.lines.push({ label: result.ticket, amount: cents(charge) });
    result.knownSubtotal += charge;
    result.notes.push(
      "Tap in and tap out. Rail fares are ticket-based, not per kilometre.",
      config.rail.verification,
    );
    result.sources.push({
      name: "Qatar Rail policy reference · 2024",
      url: config.rail.sourceUrl,
    });
    if (prefs.needsCard) result.cardPurchase = rate.card;
  }
  let missing = false;
  for (const leg of bus) {
    const eligible =
      leg.fareEligibility?.metrolink === true &&
      /^https:\/\/(www\.)?(mowasalat\.com|qr\.com\.qa)\//.test(
        leg.fareEligibility.sourceUrl ?? "",
      );
    if (eligible) {
      result.lines.push({
        label: "Eligible Metrolink feeder service",
        amount: 0,
      });
      result.notes.push(
        "Free Metrolink applies only to the confirmed service eligibility supplied with this leg.",
      );
      result.sources.push({
        name: "Metrolink eligibility source",
        url: leg.fareEligibility!.sourceUrl!,
      });
    } else {
      missing = true;
      result.lines.push({ label: "Public bus fare", amount: null });
      result.notes.push(
        "Fare currently unavailable — check the official Karwa journey planner.",
      );
    }
  }
  result.knownSubtotal = cents(result.knownSubtotal);
  result.amount = missing ? null : result.knownSubtotal;
  result.status = missing
    ? "unavailable"
    : uncertain
      ? "indicative_estimate"
      : result.knownSubtotal === 0 && !rail.length
        ? "free"
        : "published_reference";
  if (!rail.length)
    result.ticket = missing
      ? "Public bus · fare unavailable"
      : "Eligible Metrolink feeder";
  if (bus.length)
    result.notes.push(
      "Karwa bus cards are separate from Metro tickets; no free Metro–bus transfer is assumed.",
    );
  return result;
}
export function withFare(
  route: Journey,
  prefs: FarePreferences = defaultFarePreferences,
): Journey {
  const fare = journeyFare(route, prefs);
  const wait =
    route.distanceMode === "driving" && route.drivingMinutes !== undefined
      ? prefs.taxi.waitingBlocks * 15
      : 0;
  return {
    ...route,
    fare,
    cost: fare.amount,
    ...(route.drivingMinutes !== undefined
      ? { minutes: route.drivingMinutes + wait }
      : {}),
  };
}
export function recommendTicket(prefs: FarePreferences) {
  if (
    !count(prefs.plannedJourneysPerDay, 1, 50) ||
    !count(prefs.plannedDays, 1, 7)
  )
    return null;
  const r =
      prefs.travelClass === "gold" ? config.rail.gold : config.rail.standard,
    n = prefs.plannedJourneysPerDay,
    d = prefs.plannedDays;
  const choices = [
    {
      name:
        prefs.payment === "reusable"
          ? "Reusable pay-as-you-go with daily cap"
          : "Separate single tickets",
      amount:
        (prefs.payment === "reusable"
          ? Math.min(r.day, n * r.single)
          : n * r.single) * d,
    },
    { name: "Day passes", amount: r.day * d },
  ];
  if (r.weekly !== null)
    choices.push({ name: "Weekly pass", amount: r.weekly });
  return choices.sort((a, b) => a.amount - b.amount)[0];
}
