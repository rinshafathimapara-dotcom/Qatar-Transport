// Central, auditable fare references. These do not assert a live/current tariff.
export const qatarTransportFares = {
  currency: "QAR",
  rail: {
    standard: { single: 2, day: 6, weekly: 40, card: 10 },
    gold: { single: 10, day: 30, weekly: null, card: 100 },
    interchangeMinutes: 30,
    dayPassEnds: "02:59 Qatar time",
    weeklyDays: 7,
    policyDate: "2024-08-05",
    source: "Qatar Rail fare policy supplied by the team",
    sourceUrl:
      "https://www.qr.com.qa/media/Qatar%20Rail%20Fares%20Policy%20-%20ENG%20-%2005-08-2024.pdf",
    status: "published_reference",
    verification:
      "Supplied 2024 policy reference; primary PDF retrieval failed during 2026-11-07 verification. Confirm current conditions with Qatar Rail.",
  },
  bus: {
    ordinaryFare: null,
    classicCard: 30,
    limitedCard: 10,
    unlimitedCard: 20,
    metrolink: 0,
    sourceUrl:
      "https://hukoomi.gov.qa/en/services/karwa-smart-card-for-using-public-bus-services",
    plannerUrl: "https://www.mowasalat.com/",
    status: "needs_current_verification",
    note: "Published card references; verify current conditions. Classic card purchase is not a per-journey fare. Limited: two journeys within 24 hours. Unlimited: unlimited journeys within 24 hours.",
  },
  taxi: {
    flagFall: 4,
    minimum: 10,
    dayRate: 1.6,
    nightRate: 1.9,
    outsideRate: 1.9,
    airportFlagFall: 25,
    waitingBlockMinutes: 15,
    waitingBlockCharge: 8,
    telephoneDoha: 5,
    telephoneToAirport: 8,
    dayStarts: 4,
    nightStarts: 23,
    status: "indicative_estimate",
    sourceUrls: [
      "https://www.mot.gov.qa/sites/default/files/2025-02/VOLUME%201_%20English_1.pdf",
      "https://www.qatarliving.com/en/article/karwa-taxi-ride-hailing-qatar-options-apps-costs",
    ],
    note: "Configurable historical/published tariff assumptions, not a confirmed current meter tariff. Waiting and telephone fees are optional reference assumptions.",
  },
  rideHailing: {
    providers: ["Uber", "Badrgo", "Ryde"],
    sourceUrl:
      "https://www.mot.gov.qa/en/announcement/announcement-official-list-authorized-ride-hailing-companies-qatar",
  },
} as const;
