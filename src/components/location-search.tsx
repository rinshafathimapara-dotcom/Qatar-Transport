"use client";
import { useEffect, useState, useRef } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import type { Location } from "@/types/database";
import { searchLocations, coordinateLocation } from "@/services/location-index";
import { geocoder } from "@/services/geo";
export default function LocationSearch({
  label,
  value,
  onChange,
  places,
  onError,
}: {
  label: string;
  value: Location;
  onChange: (p: Location) => void;
  places: Location[];
  onError: (s: string) => void;
}) {
  const [query, setQuery] = useState(value.name),
    [open, setOpen] = useState(false),
    [remote, setRemote] = useState<Location[]>([]),
    [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [visible, setVisible] = useState(12);
  const selectedName = useRef(value.name);
  selectedName.current = value.name;
  useEffect(() => setQuery(value.name), [value]);
  useEffect(() => {
    setRemote([]);
    setError("");
    if (!open || query.trim().length < 2) {
      setLoading(false);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      geocoder
        .search(query, c.signal)
        .then((p) => {
          if (!c.signal.aborted) setRemote(p);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query, open]);
  const point = coordinateLocation(query);
  const matches = searchLocations(
    [...(point ? [point] : []), ...places, ...remote],
    query,
    80,
  );
  const options = matches.slice(0, visible);
  function choose(p: Location) {
    onChange(p);
    setQuery(p.name);
    setOpen(false);
  }
  return (
    <div className="location-field">
      <MapPin size={19} />
      <div>
        <label>
          {label}
          <input
            value={query}
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            aria-controls={`list-${label}`}
            aria-activedescendant={open ? `${label}-${index}` : undefined}
            onFocus={() => {
              setOpen(true);
              setIndex(0);
            }}
            onBlur={() =>
              setTimeout(() => {
                setOpen(false);
                setQuery(selectedName.current);
              }, 180)
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
              setVisible(12);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) =>
                  Math.max(0, Math.min(i + 1, options.length - 1)),
                );
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter" && open && options[index]) {
                e.preventDefault();
                choose(options[index]);
              }
            }}
          />
        </label>
      </div>
      {label === "From" && (
        <button
          className="icon-button"
          type="button"
          aria-label="Use my current location"
          onClick={() => {
            if (!navigator.geolocation) {
              onError("Location is unsupported.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (p) =>
                choose({
                  id: "current",
                  name: "Your current location",
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                }),
              () =>
                onError(
                  "Location access unavailable. Choose a dataset place or map point.",
                ),
              { timeout: 10000 },
            );
          }}
        >
          <LocateFixed size={18} />
        </button>
      )}
      {open && (
        <ul className="suggestions" role="listbox" id={`list-${label}`}>
          {options.map((p, i) => (
            <li
              key={p.id}
              role="option"
              id={`${label}-${i}`}
              aria-selected={i === index}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
              >
                <MapPin size={15} />
                <span>
                  {p.name}
                  <small>
                    {p.category || "Location"}
                    {p.address ? ` · ${p.address}` : ""}
                  </small>
                </span>
              </button>
            </li>
          ))}
          {loading && (
            <li className="empty-suggestion" role="presentation">
              Searching Qatar…
            </li>
          )}
          {matches.length > visible && (
            <li role="presentation">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setVisible((v) => v + 12)}
              >
                Show more locations ({matches.length - visible})
              </button>
            </li>
          )}
          {!options.length && !loading && (
            <li className="empty-suggestion">
              {error ||
                "No match. Try a district, landmark, street, Arabic name, or latitude, longitude. You can also select any point on the map."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
