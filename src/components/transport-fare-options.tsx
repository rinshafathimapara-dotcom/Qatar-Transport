import { qatarTransportFares as fares } from "@/data/qatarTransportFares";
import { money } from "@/services/fares";
export default function TransportFareOptions({
  hasTaxi,
  drivingReason,
}: {
  hasTaxi: boolean;
  drivingReason: string;
}) {
  return (
    <section
      className="additional-fares"
      aria-label="Additional transport fare information"
    >
      <h2>More ways to travel</h2>
      <div className="additional-fare-grid">
        {!hasTaxi && (
          <article>
            <span className="data-status">Unavailable</span>
            <h3>Karwa Taxi</h3>
            <strong>Fare unavailable · QAR</strong>
            <p>
              {drivingReason ||
                "Plan a journey to request a driving route. A driving distance is required before an indicative fare can be calculated."}
            </p>
            <p>Walking distance is not used as a taxi road distance.</p>
            <a
              href="https://www.mowasalat.com/"
              target="_blank"
              rel="noreferrer"
            >
              Check Karwa ↗
            </a>
          </article>
        )}
        <article>
          <span className="data-status">
            Ticket references · confirm current conditions
          </span>
          <h3>Public buses</h3>
          <strong>Journey fare unavailable · QAR</strong>
          <p>
            Fare currently unavailable — check the official Karwa journey
            planner.
          </p>
          <details>
            <summary>Published bus ticket options</summary>
            <ul>
              <li>
                Classic Smart Card · {money(fares.bus.classicCard)} ·
                purchase/usage conditions need confirmation
              </li>
              <li>
                Limited · {money(fares.bus.limitedCard)} · two journeys in 24
                hours
              </li>
              <li>
                Unlimited · {money(fares.bus.unlimitedCard)} · unlimited
                journeys in 24 hours
              </li>
              <li>Metrolink · QAR 0 only on an eligible feeder service</li>
            </ul>
            <p>
              Bus cards and Metro tickets are separate. A missing bus fare is
              not free travel.
            </p>
            <a href={fares.bus.sourceUrl} target="_blank" rel="noreferrer">
              Hukoomi ticket reference ↗
            </a>
          </details>
        </article>
        <article>
          <span className="data-status">Provider quote required</span>
          <h3>{fares.rideHailing.providers.join(" · ")}</h3>
          <strong>Live fare unavailable · QAR</strong>
          <p>Live fare unavailable — check the provider’s app.</p>
          <p>No Karwa tariff is applied to another provider.</p>
          <a
            href={fares.rideHailing.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Ministry provider list ↗
          </a>
        </article>
      </div>
    </section>
  );
}
