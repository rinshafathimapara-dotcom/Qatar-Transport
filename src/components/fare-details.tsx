import type { FareResult } from "@/types/fares";
import { fareStatusLabel, money } from "@/services/fares";
export default function FareDetails({ fare }: { fare: FareResult }) {
  return (
    <section className="fare-breakdown" aria-label="Journey fare breakdown">
      <div className="fare-breakdown-heading">
        <div>
          <span className="eyebrow">JOURNEY FARE · QAR</span>
          <h3>{money(fare.amount)}</h3>
        </div>
        <span className="data-status">{fareStatusLabel(fare.status)}</span>
      </div>
      <p>{fare.ticket}</p>
      <dl>
        {fare.lines.map((line, i) => (
          <div key={i}>
            <dt>{line.label}</dt>
            <dd>{money(line.amount)}</dd>
          </div>
        ))}
      </dl>
      {fare.amount === null && fare.knownSubtotal > 0 && (
        <p>
          Known components: <strong>{money(fare.knownSubtotal)}</strong>. The
          total remains unavailable until all components are priced.
        </p>
      )}
      {fare.cardPurchase !== null && (
        <div className="fare-card-purchase">
          <p>
            Optional new travel card:{" "}
            <strong>{money(fare.cardPurchase)}</strong> · one-time purchase,
            separate from this journey.
          </p>
          {fare.amount !== null && (
            <p>
              Journey + new card purchase:{" "}
              <strong>{money(fare.amount + fare.cardPurchase)}</strong>
            </p>
          )}
        </div>
      )}
      <details>
        <summary>Ticket rules, assumptions & sources</summary>
        {fare.notes.map((note, i) => (
          <p key={i}>{note}</p>
        ))}
        {fare.sources.map((source, i) => (
          <a key={i} href={source.url} target="_blank" rel="noreferrer">
            {source.name} ↗
          </a>
        ))}
      </details>
    </section>
  );
}
