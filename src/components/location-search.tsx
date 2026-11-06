"use client";
import { useEffect, useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import type { Location } from "@/types/database";
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
  useEffect(() => setQuery(value.name), [value]);
  useEffect(() => {
    if (!open || query.length < 3) return;
    const c = new AbortController();
    const t = setTimeout(() => {
      geocoder
        .search(query, c.signal)
        .then(setRemote)
        .catch((e) => {
          if (e.name !== "AbortError") onError(e.message);
        });
    }, 500);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [query, open, onError]);
  const options = [
    ...places.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        query === value.name,
    ),
    ...remote,
  ]
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
    .slice(0, 7);
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
                setQuery(value.name);
              }, 180)
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, options.length - 1));
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
                  <small>{p.category || "Location"}</small>
                </span>
              </button>
            </li>
          ))}
          {!options.length && (
            <li className="empty-suggestion">
              No dataset match. Select on the map or configure geocoding.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
