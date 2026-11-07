"use client";
import { useState } from "react";
import { Car, ExternalLink } from "lucide-react";
import type { Location } from "@/types/database";
export default function RideChoices({
  from,
  to,
}: {
  from: Location;
  to: Location;
}) {
  const [provider, setProvider] = useState<"karwa" | "uber" | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <section
      className="ride-choices"
      aria-label="Taxi and ride-hailing options"
    >
      <div className="ride-choice-buttons">
        <span>Or take a ride</span>
        {(["karwa", "uber"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={provider === p}
            onClick={() => {
              setProvider(provider === p ? null : p);
              setCopied(false);
            }}
          >
            <Car size={17} />
            {p === "karwa" ? "Karwa Taxi" : "Uber"}
          </button>
        ))}
      </div>
      {provider && (
        <div className="ride-provider-panel">
          <strong>
            {provider === "karwa" ? "Karwa Taxi" : "Uber"} · {from.name} →{" "}
            {to.name}
          </strong>
          <p>
            {provider === "karwa"
              ? "Driving-route estimates appear in journey results when a driving provider is connected. Get a confirmed price and book through Karwa."
              : "Get your live fare and vehicle options directly from Uber. Confirm pickup and destination in their app."}
          </p>
          <div className="ride-provider-actions">
            <a
              href={
                provider === "karwa"
                  ? "https://www.mowasalat.com/"
                  : "https://m.uber.com/"
              }
              target="_blank"
              rel="noreferrer"
            >
              Open {provider === "karwa" ? "Karwa booking options" : "Uber"}{" "}
              <ExternalLink size={15} />
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `From: ${from.name} (${from.latitude}, ${from.longitude})\nTo: ${to.name} (${to.latitude}, ${to.longitude})`,
                  );
                  setCopied(true);
                  setCopyError(false);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Trip copied" : "Copy trip details"}
            </button>
          </div>
          {copyError && (
            <p role="status">
              Clipboard unavailable. Use the origin and destination shown above
              in the provider’s app.
            </p>
          )}
          <small>Booking and live prices are confirmed by the provider.</small>
        </div>
      )}
    </section>
  );
}
