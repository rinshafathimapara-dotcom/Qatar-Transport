"use client";
import type { FarePreferences } from "@/types/fares";
import { money, recommendTicket } from "@/services/fares";
import { qatarTransportFares as rates } from "@/data/qatarTransportFares";
export default function FareSettings({
  value,
  onChange,
}: {
  value: FarePreferences;
  onChange: (p: FarePreferences) => void;
}) {
  const set = <K extends keyof FarePreferences>(
      key: K,
      v: FarePreferences[K],
    ) =>
      onChange({
        ...value,
        ...(key === "travelClass" &&
        (value.travelClass === "gold") !== (v === "gold")
          ? { previousJourneysToday: 0 }
          : {}),
        [key]: v,
      }),
    taxi = (patch: Partial<FarePreferences["taxi"]>) =>
      set("taxi", { ...value.taxi, ...patch }),
    suggestion = recommendTicket(value);
  return (
    <section className="fare-settings" aria-label="Ticket and fare preferences">
      <div className="fare-settings-main">
        <label>
          Travel class
          <select
            aria-label="Travel class"
            value={value.travelClass}
            onChange={(e) =>
              set(
                "travelClass",
                e.target.value as FarePreferences["travelClass"],
              )
            }
          >
            <option value="standard">Standard</option>
            <option value="family">Family · Standard fare</option>
            <option value="gold">Gold · Metro only</option>
          </select>
        </label>
        <label>
          Rail ticket
          <select
            aria-label="Rail ticket"
            value={value.ticket}
            onChange={(e) =>
              set("ticket", e.target.value as FarePreferences["ticket"])
            }
          >
            <option value="auto">Best suitable fare for this route</option>
            <option value="single">Single journey</option>
            <option value="day">Buy a day pass</option>
            <option value="weekly">Buy a weekly pass</option>
          </select>
        </label>
        <label>
          Payment type
          <select
            aria-label="Payment type"
            value={value.payment}
            onChange={(e) =>
              set("payment", e.target.value as FarePreferences["payment"])
            }
          >
            <option value="reusable">Reusable card · daily capping</option>
            <option value="ticket">Separate tickets</option>
          </select>
        </label>
      </div>
      <p className="fare-policy-reference">
        Published single-ticket reference:{" "}
        <strong>
          {money(
            value.travelClass === "gold"
              ? rates.rail.gold.single
              : rates.rail.standard.single,
          )}
        </strong>{" "}
        · day pass{" "}
        {money(
          value.travelClass === "gold"
            ? rates.rail.gold.day
            : rates.rail.standard.day,
        )}
        . Based on the supplied 2024 Qatar Rail policy; confirm current
        conditions.
      </p>
      <details>
        <summary>Pass planning, travel card & taxi assumptions</summary>
        <div className="fare-settings-main">
          <label>
            Previous same-class rail journeys this fare day
            <input
              aria-label="Previous rail journeys"
              type="number"
              min={0}
              max={100}
              step={1}
              value={value.previousJourneysToday}
              onChange={(e) =>
                set(
                  "previousJourneysToday",
                  Math.max(0, Math.min(100, Number(e.target.value))),
                )
              }
            />
          </label>
          <label>
            Planned rail journeys per day
            <input
              aria-label="Planned rail journeys per day"
              type="number"
              min={1}
              max={50}
              value={value.plannedJourneysPerDay}
              onChange={(e) =>
                set(
                  "plannedJourneysPerDay",
                  Math.max(1, Math.min(50, Number(e.target.value))),
                )
              }
            />
          </label>
          <label>
            Days of travel (up to seven)
            <input
              aria-label="Days of travel"
              type="number"
              min={1}
              max={7}
              value={value.plannedDays}
              onChange={(e) =>
                set(
                  "plannedDays",
                  Math.max(1, Math.min(7, Number(e.target.value))),
                )
              }
            />
          </label>
        </div>
        {suggestion && (
          <p className="ticket-suggestion">
            Lowest configured ticket cost for that plan:{" "}
            <strong>
              {suggestion.name} · {money(suggestion.amount)}
            </strong>
            . Projection for the supplied journey counts; this is not added to
            each journey fare.
          </p>
        )}
        <label className="fare-checkbox">
          <input
            type="checkbox"
            checked={value.needsCard}
            onChange={(e) => set("needsCard", e.target.checked)}
          />
          I also need a reusable travel card ·{" "}
          {money(
            value.travelClass === "gold"
              ? rates.rail.gold.card
              : rates.rail.standard.card,
          )}{" "}
          shown separately
        </label>
        <p className="data-note">
          Standard and Family share fares. Tram has no Gold class. Day passes
          end at 02:59 Qatar time; the supplied weekly policy says seven days
          from purchase. Daily capping uses your supplied same-class journey
          count for that fare day.
        </p>
        <h3>Karwa indicative tariff assumptions</h3>
        <div className="fare-settings-main">
          <label>
            Tariff period
            <select
              aria-label="Taxi tariff period"
              value={value.taxi.period}
              onChange={(e) =>
                taxi({ period: e.target.value as "day" | "night" })
              }
            >
              <option value="day">Day · 04:00–23:00 Qatar time</option>
              <option value="night">Night · 23:00–04:00 Qatar time</option>
            </select>
          </label>
          <label>
            Tariff area
            <select
              aria-label="Taxi tariff area"
              value={value.taxi.zone}
              onChange={(e) =>
                taxi({ zone: e.target.value as "doha" | "outside" })
              }
            >
              <option value="doha">Within Doha</option>
              <option value="outside">Outside Doha</option>
            </select>
          </label>
          <label>
            Optional waiting blocks (15 minutes)
            <input
              aria-label="Taxi waiting blocks"
              type="number"
              min={0}
              max={48}
              step={1}
              value={value.taxi.waitingBlocks}
              onChange={(e) =>
                taxi({
                  waitingBlocks: Math.max(
                    0,
                    Math.min(48, Number(e.target.value)),
                  ),
                })
              }
            />
          </label>
          <label>
            Optional telephone booking
            <select
              aria-label="Taxi telephone booking"
              value={value.taxi.telephone}
              onChange={(e) =>
                taxi({
                  telephone: e.target
                    .value as FarePreferences["taxi"]["telephone"],
                })
              }
            >
              <option value="none">None</option>
              <option value="doha">Within Doha · QAR 5 reference</option>
              <option value="toAirport">Doha to HIA · QAR 8 reference</option>
            </select>
          </label>
        </div>
        <label className="fare-checkbox">
          <input
            type="checkbox"
            checked={value.taxi.airportPickup}
            onChange={(e) => taxi({ airportPickup: e.target.checked })}
          />
          Airport pickup · use QAR 25 starting fare instead of QAR 4
        </label>
        <p className="data-note">
          These are configurable indicative references, not live 2026 meter
          rates. Area and period are your selections. Waiting/telephone charges
          apply only when selected. Taxi estimates require a driving route.
        </p>
      </details>
    </section>
  );
}
