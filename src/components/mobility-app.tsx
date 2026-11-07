"use client";
import ShadeDemoPanel from "./shade-demo-panel";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownUp,
  TrainFront,
  Footprints,
  Sun,
  MapPin,
  Bookmark,
  Bell,
  ParkingCircle,
  Menu,
  X,
  ChevronDown,
  Check,
  Trash2,
  LogOut,
  UserRound,
  Navigation,
  Leaf,
  Compass,
  MoveUpRight,
  Clock,
  Wallet,
  Info,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type {
  Collection,
  Journey,
  Location,
  Priority,
  Rows,
  Json,
  LiveFix,
} from "@/types/database";
import { supabase, isDemo } from "@/lib/supabase";
import { demo } from "@/data/demo";
import { loadDataset } from "@/services/data";
import { plan, rank, walkingMinutes, walkingLimit } from "@/services/planner";
import { distance } from "@/services/geo";
import { normalizePriority, storedPriority } from "@/services/preferences";
import LocationSearch from "./location-search";
import StatsCounter from "./ui/stats-counter";
import HeroVideo from "./hero-video";
import WalkingAssistant from "./walking-assistant";
import indoorRecords from "@/data/indoor-passages.json";
import { validatePassages, relevantPassages } from "@/services/navigation";
const indoorPassages = validatePassages(indoorRecords);
import StaggerText from "./ui/stagger-text";
const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparing your city map…</div>,
});
const priorities: Priority[] = [
  "Balanced",
  "Fastest",
  "Shortest",
  "Most comfortable",
  "Budget-friendly",
];
const links = [
  ["plan", "Plan a journey"],
  ["explore", "Explore Qatar"],
  ["comfort", "Comfortable routes"],
  ["demand", "Demand alerts"],
  ["parking", "Find parking"],
] as const;
type Saved = {
  id: string;
  from: Location;
  to: Location;
  priority: Priority;
  route: Journey;
};
const initialPrefs = {
  preferred_priority: "Fastest" as string,
  max_walking_minutes: 20,
  avoid_direct_sun: true,
  prefer_public_transport: true,
  budget_limit: 20 as number | null,
};
const date = (v: string) =>
  new Date(v).toLocaleString("en-GB", {
    timeZone: "Asia/Qatar",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }) + " (Qatar)";
export default function MobilityApp({
  initialSection = "home",
}: {
  initialSection?: string;
}) {
  const router = useRouter(),
    reduced = useReducedMotion();
  const [includeDemo, setIncludeDemo] = useState(false);
  const [presentationShade, setPresentationShade] = useState<
    import("@/services/shade").ShadeObservation[] | null
  >(null);
  const [livePosition, setLivePosition] = useState<LiveFix | null>(null);
  const [selectedPassage, setSelectedPassage] = useState<string | null>(null);
  const [data, setData] = useState<Collection | null>(null),
    [dataError, setDataError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [from, setFrom] = useState<Location>(
      isDemo
        ? demo.places[0]
        : {
            id: "empty-from",
            name: "Choose an origin",
            latitude: 25.2855,
            longitude: 51.5294,
          },
    ),
    [to, setTo] = useState<Location>(
      isDemo
        ? demo.places[1]
        : {
            id: "empty-to",
            name: "Choose a destination",
            latitude: 25.2855,
            longitude: 51.5294,
          },
    ),
    [priority, setPriority] = useState<Priority>("Fastest"),
    [routes, setRoutes] = useState<Journey[]>([]),
    [selected, setSelected] = useState<string>("");
  const [menu, setMenu] = useState(false),
    [dropdown, setDropdown] = useState<string | null>(null),
    [pick, setPick] = useState<"from" | "to" | null>(null),
    [filter, setFilter] = useState("All");
  const [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(!supabase),
    [demoUser, setDemoUser] = useState(false),
    [saved, setSaved] = useState<Saved[]>([]),
    [prefs, setPrefs] = useState(initialPrefs),
    [fullName, setFullName] = useState(""),
    [authMode, setAuthMode] = useState("login"),
    [authBusy, setAuthBusy] = useState(false);
  const notify = useCallback((s: string) => setMessage(s), []);
  const signed = !!user || (isDemo && demoUser);
  const refresh = useCallback(() => {
    setDataError("");
    loadDataset({ includeDemo })
      .then((d) => {
        setData(d);
        const locations = [...d.places, ...d.transport_stops];
        if (!isDemo && locations.length) {
          setFrom(locations[0]);
          setTo(locations[1] || locations[0]);
        }
      })
      .catch((e) => setDataError(e.message));
  }, [includeDemo]);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    if (!supabase) {
      try {
        setDemoUser(localStorage.getItem("sq-demo-user") === "true");
        setPrefs({
          ...initialPrefs,
          ...JSON.parse(localStorage.getItem("sq-demo-prefs") || "{}"),
        });
        setSaved(JSON.parse(localStorage.getItem("sq-demo-saved") || "[]"));
      } catch {
        notify("Local demo data could not be read.");
      }
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update");
        router.push("/auth");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [notify, router]);
  useEffect(() => {
    if (!user || !supabase) {
      if (!isDemo) setSaved([]);
      return;
    }
    let active = true;
    async function fetchPrivate() {
      const db = supabase!;
      const [s, p, profile] = await Promise.all([
        db.from("saved_journeys").select("*").eq("user_id", user!.id),
        db
          .from("user_preferences")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle(),
        db.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      ]);
      if (!active) return;
      if (s.error || p.error || profile.error) {
        notify(
          "Personal data could not load. Check the shared tables and RLS policies.",
        );
        return;
      }
      setSaved(
        (s.data || []).map((r) => ({
          id: r.id,
          from: {
            id: "saved-from",
            name: r.origin_name,
            latitude: r.origin_latitude,
            longitude: r.origin_longitude,
          },
          to: {
            id: "saved-to",
            name: r.destination_name,
            latitude: r.destination_latitude,
            longitude: r.destination_longitude,
          },
          priority: normalizePriority(r.selected_priority),
          route: r.route_snapshot as unknown as Journey,
        })),
      );
      if (p.data) {
        setPrefs({
          ...p.data,
          preferred_priority: normalizePriority(p.data.preferred_priority),
        });
        setPriority(normalizePriority(p.data.preferred_priority));
      }
      setFullName(profile.data?.full_name || "");
    }
    void fetchPrivate();
    return () => {
      active = false;
    };
  }, [user, notify]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 9000);
    return () => clearTimeout(t);
  }, [message]);
  const sorted = rank(
      routes.filter(
        (r) => walkingMinutes(r) <= walkingLimit(prefs.max_walking_minutes),
      ),
      priority,
    ),
    route = sorted.find((r) => r.id === selected) || sorted[0];
  const current = initialSection;
  async function search() {
    if (!data) return;
    setBusy(true);
    setRoutes([]);
    setPresentationShade(null);
    try {
      const result = await plan(from, to, data, isDemo, {
        maxWalkingMinutes: prefs.max_walking_minutes,
      });
      setRoutes(result);
      setSelected(rank(result, priority)[0]?.id || "");
      if (current === "home") {
        sessionStorage.setItem(
          "sq-active",
          JSON.stringify({ from, to, routes: result, priority }),
        );
        router.push("/plan");
      }
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  // Preserve selected endpoints through normal App Router navigation without a global store.
  useEffect(() => {
    if (current !== "plan" || !data) return;
    const stored = sessionStorage.getItem("sq-active");
    if (stored) {
      try {
        const active = JSON.parse(stored);
        setFrom(active.from);
        setTo(active.to);
        setPriority(active.priority);
        setRoutes(active.routes);
        setSelected(active.routes[0]?.id || "");
        sessionStorage.removeItem("sq-active");
        return;
      } catch {
        sessionStorage.removeItem("sq-active");
      }
    }
    const q = new URLSearchParams(window.location.search),
      a = [...data.places, ...data.transport_stops].find(
        (p) => p.id === q.get("from"),
      ),
      b = [...data.places, ...data.transport_stops].find(
        (p) => p.id === q.get("to"),
      );
    if (a && b) {
      setFrom(a);
      setTo(b);
      setBusy(true);
      plan(a, b, data, isDemo, { maxWalkingMinutes: prefs.max_walking_minutes })
        .then((r) => {
          setRoutes(r);
          setSelected(r[0]?.id || "");
        })
        .catch((e) => notify(e.message))
        .finally(() => setBusy(false));
    }
  }, [current, data, notify]);
  async function saveJourney() {
    if (!route) return;
    if (!signed) {
      notify("Sign in or open a local demo profile to save journeys.");
      router.push("/auth");
      return;
    }
    const item: Saved = { id: crypto.randomUUID(), from, to, priority, route };
    if (supabase && user) {
      const { data: insert, error } = await supabase
        .from("saved_journeys")
        .insert({
          user_id: user.id,
          origin_name: from.name,
          origin_latitude: from.latitude,
          origin_longitude: from.longitude,
          destination_name: to.name,
          destination_latitude: to.latitude,
          destination_longitude: to.longitude,
          selected_priority: storedPriority(priority),
          route_snapshot: route as unknown as Json,
        })
        .select()
        .single();
      if (error) {
        notify(error.message);
        return;
      }
      item.id = insert.id;
    }
    const next = [item, ...saved];
    setSaved(next);
    if (isDemo) localStorage.setItem("sq-demo-saved", JSON.stringify(next));
    notify(
      isDemo ? "Saved on this browser in your demo profile." : "Journey saved.",
    );
  }
  async function removeSaved(id: string) {
    if (supabase) {
      const { error } = await supabase
        .from("saved_journeys")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) {
        notify(error.message);
        return;
      }
    }
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    if (isDemo) localStorage.setItem("sq-demo-saved", JSON.stringify(next));
  }
  async function logout() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        notify(error.message);
        return;
      }
    } else {
      setDemoUser(false);
      localStorage.removeItem("sq-demo-user");
    }
    setUser(null);
    router.push("/");
  }
  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    const f = new FormData(e.currentTarget),
      email = String(f.get("email") || ""),
      password = String(f.get("password") || "");
    try {
      if (authMode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) throw error;
        notify("Check your email for a reset link.");
      } else if (authMode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        notify("Password updated.");
        router.push("/profile");
      } else if (authMode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(f.get("name")) },
            emailRedirectTo: window.location.origin + "/profile",
          },
        });
        if (error) throw error;
        notify("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/profile");
      }
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }
  async function savePreferences(e: React.FormEvent) {
    e.preventDefault();
    if (supabase && user) {
      const { data: existing, error: readError } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (readError) {
        notify(readError.message);
        return;
      }
      const payload = {
        ...prefs,
        preferred_priority: storedPriority(prefs.preferred_priority),
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      const { error } = existing
        ? await supabase
            .from("user_preferences")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", user.id)
        : await supabase.from("user_preferences").insert(payload);
      if (error) {
        notify(error.message);
        return;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, email: user.email, full_name: fullName });
      if (profileError) {
        notify(profileError.message);
        return;
      }
    } else localStorage.setItem("sq-demo-prefs", JSON.stringify(prefs));
    setPriority(normalizePriority(prefs.preferred_priority));
    notify(
      "Travel preferences saved. Ranking uses your default priority; other preferences are advisory until provider data supports them.",
    );
  }
  function reopen(s: Saved) {
    setFrom(s.from);
    setTo(s.to);
    setPriority(s.priority);
    setRoutes([s.route]);
    setSelected(s.route.id);
    sessionStorage.setItem(
      "sq-active",
      JSON.stringify({
        from: s.from,
        to: s.to,
        routes: [s.route],
        priority: s.priority,
      }),
    );
    router.push("/plan");
  }
  const planner = (
    <div className="planner-form">
      <div className="planner-inputs">
        <LocationSearch
          label="From"
          value={from}
          onChange={(p) => {
            setFrom(p);
            setRoutes([]);
          }}
          places={
            data
              ? [
                  ...data.places,
                  ...data.transport_stops.map((s) => ({
                    ...s,
                    category: `${s.mode} station`,
                  })),
                ]
              : []
          }
          onError={notify}
        />
        <button
          className="swap"
          aria-label="Swap origin and destination"
          onClick={() => {
            setFrom(to);
            setTo(from);
            setRoutes([]);
          }}
        >
          <ArrowDownUp size={18} />
        </button>
        <LocationSearch
          label="To"
          value={to}
          onChange={(p) => {
            setTo(p);
            setRoutes([]);
          }}
          places={
            data
              ? [
                  ...data.places,
                  ...data.transport_stops.map((s) => ({
                    ...s,
                    category: `${s.mode} station`,
                  })),
                ]
              : []
          }
          onError={notify}
        />
      </div>
      <label className="walking-budget">
        Total walking budget{" "}
        <select
          aria-label="Total walking budget"
          value={walkingLimit(prefs.max_walking_minutes)}
          onChange={(e) =>
            setPrefs({ ...prefs, max_walking_minutes: Number(e.target.value) })
          }
        >
          {![15, 20].includes(walkingLimit(prefs.max_walking_minutes)) && (
            <option value={walkingLimit(prefs.max_walking_minutes)}>
              {walkingLimit(prefs.max_walking_minutes)} minutes
            </option>
          )}
          <option value={15}>15 minutes</option>
          <option value={20}>20 minutes</option>
        </select>
      </label>
      <div className="planner-bottom">
        <span>
          <Clock size={15} /> Estimates · no live departures
        </span>
        <button className="primary" disabled={busy || !data} onClick={search}>
          {busy ? "Finding your way…" : "Find my journey"}
          <ArrowRight size={19} />
        </button>
      </div>
    </div>
  );
  const mapArea = data ? (
    <Map
      data={
        presentationShade
          ? { ...data, shade_segments: presentationShade }
          : data
      }
      from={from}
      to={to}
      route={route}
      showConceptRoute={!!presentationShade}
      livePosition={livePosition}
      passages={route ? relevantPassages(route, indoorPassages) : []}
      selectedPassage={selectedPassage}
      onPassage={setSelectedPassage}
      onPick={
        pick
          ? (p) => {
              (pick === "from" ? setFrom : setTo)(p);
              setRoutes([]);
              setPick(null);
              notify(
                "Location selected. Plan your journey to compare options.",
              );
            }
          : undefined
      }
    />
  ) : (
    <div className="map-loading">Loading geographical data…</div>
  );
  const picks = (
    <div className="map-picks">
      <span>Select on map:</span>
      <button
        aria-pressed={pick === "from"}
        onClick={() => setPick(pick === "from" ? null : "from")}
      >
        Origin
      </button>
      <button
        aria-pressed={pick === "to"}
        onClick={() => setPick(pick === "to" ? null : "to")}
      >
        Destination
      </button>
      {pick && <small>Click a marker or map point</small>}
    </div>
  );
  function guard(children: React.ReactNode) {
    if (!authReady)
      return <div className="empty-state">Checking your session…</div>;
    return signed ? (
      children
    ) : (
      <div className="empty-state">
        <Bookmark size={38} />
        <h2>Your journeys, all together.</h2>
        <p>Sign in to keep your saved journeys and travel preferences.</p>
        <Link className="primary" href="/auth">
          Sign in <ArrowRight size={18} />
        </Link>
      </div>
    );
  }
  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <Link href="/" className="brand" aria-label="Smarter Qatar home">
          <span className="brand-symbol">
            <Navigation size={26} strokeWidth={2.5} />
          </span>
          <span>
            smarter
            <span className="brand-qatar">
              qatar<span className="brand-dot">.</span>
            </span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className={menu ? "nav mobile-open" : "nav"}
        >
          <Link className={current === "plan" ? "active" : ""} href="/plan">
            Plan a journey
          </Link>
          <div
            className="nav-dropdown"
            onMouseEnter={() => setDropdown("explore")}
            onMouseLeave={() => setDropdown(null)}
          >
            <button
              aria-expanded={dropdown === "explore"}
              onClick={() => setDropdown(dropdown ? "" : "explore")}
              onKeyDown={(e) => {
                if (e.key === "Escape") setDropdown(null);
              }}
            >
              Discover <ChevronDown size={14} />
            </button>
            <AnimatePresence>
              {dropdown === "explore" && (
                <motion.div
                  className="dropdown-panel"
                  initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {links.slice(1).map(([url, title]) => (
                    <Link
                      key={url}
                      href={"/" + url}
                      onClick={() => setDropdown(null)}
                    >
                      {title}
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link href="/saved">Saved journeys</Link>
          <Link href="/demo">Walking demo</Link>
          <Link href="/demand" className="nav-alert">
            <Bell size={17} />
            <span className="sr-only">Demand alerts</span>
          </Link>
          <Link className="account-link" href={signed ? "/profile" : "/auth"}>
            <UserRound size={17} />
            {signed ? "My profile" : "Sign in"}
            <ArrowUpRight size={15} />
          </Link>
        </nav>
        <button
          className="mobile-toggle icon-button"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main id="main">
        <div className="mode-bar">
          <span>
            <span className="status-dot" />
            {isDemo
              ? "DEMO EXPLORER"
              : dataError
                ? "BACKEND NEEDS ATTENTION"
                : data
                  ? includeDemo
                    ? "SUPABASE · DEMO RECORDS INCLUDED"
                    : "CONNECTED TO SUPABASE"
                  : "CONNECTING TO SUPABASE"}
          </span>
          <p>
            {isDemo
              ? "A working prototype. Sample journeys, no live feeds."
              : "Imported data · provider availability may vary."}
          </p>
          {!isDemo && (
            <button
              className="text-button"
              aria-pressed={includeDemo}
              onClick={() => {
                setIncludeDemo(!includeDemo);
                setPresentationShade(null);
                setRoutes([]);
              }}
            >
              {includeDemo ? "Hide demo records" : "Include demo records"}
            </button>
          )}
          <Link href="/explore">
            About the data <ArrowUpRight size={13} />
          </Link>
        </div>
        {dataError && (
          <div className="error-banner" role="alert">
            Data could not load: {dataError}
            <button onClick={refresh}>Retry</button>
          </div>
        )}
        {!isDemo &&
          data &&
          !data.places.length &&
          !data.transport_stops.length && (
            <div className="info-box" role="status">
              <Info size={22} />
              <div>
                <strong>
                  Supabase connected · no destinations in this data view
                </strong>
                <p>
                  No destinations or stops match the current data filter.
                  Demo-labelled records are hidden by default; try “Include demo
                  records” above. If the view stays empty, check imports and
                  public read policies. Map selection and walking within the
                  Doha pilot remain available.
                </p>
              </div>
            </div>
          )}
        {current === "home" && (
          <>
            <section className="hero hero-with-video">
              <HeroVideo />
              <div className="hero-copy">
                <div className="eyebrow">
                  <span /> LESS GUESSWORK. MORE QATAR.
                </div>
                <motion.h1
                  initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <StaggerText>Where do you</StaggerText>
                  <br />
                  <StaggerText delay={0.15}>want to</StaggerText>{" "}
                  <span>go?</span>
                  <svg
                    viewBox="0 0 150 15"
                    className="headline-stroke"
                    aria-hidden="true"
                  >
                    <path d="M3 10 Q65 -2 145 8" />
                  </svg>
                </motion.h1>
                <p className="hero-intro">
                  A better way from here to there. Connect your journey with
                  Metro, walking and a little local intelligence.
                </p>
                {planner}
                <div className="quick-places">
                  <span>A little inspiration</span>
                  {(data?.places || []).slice(2, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setTo(p);
                        notify(`${p.name} selected as your destination.`);
                      }}
                    >
                      <MapPin size={13} />
                      {p.name}
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="hero-art">
                <div className="hero-video-caption">
                  <span>YOUR CITY. YOUR NEXT CONNECTION.</span>
                  <strong>
                    A better way
                    <br />
                    to get there.
                  </strong>
                </div>
                <div className="floating-route">
                  <span className="floating-icon">
                    <TrainFront size={20} />
                  </span>
                  <div>
                    A smarter connection<small>Walk. Ride. Discover.</small>
                  </div>
                  <span className="floating-check">
                    <Check size={15} />
                  </span>
                </div>
                <div className="round-stamp">
                  A LITTLE SMARTER
                  <Navigation size={25} />
                  EVERY JOURNEY
                </div>
                <span className="art-spark">✳</span>
              </div>
            </section>
            <section
              className="stats-row"
              aria-label="Current dataset statistics"
            >
              {[
                [
                  data?.transport_stops.length || 0,
                  "transport stops",
                  TrainFront,
                ],
                [
                  data?.transit_routes.length || 0,
                  "transport routes",
                  Navigation,
                ],
                [
                  data?.parking_locations.length || 0,
                  "parking locations",
                  ParkingCircle,
                ],
                [signed ? saved.length : 0, "saved journeys", Bookmark],
              ].map(([n, label, Icon]) => (
                <div key={String(label)}>
                  <span className="stat-icon">
                    {typeof Icon !== "string" && typeof Icon !== "number" && (
                      <Icon size={22} />
                    )}
                  </span>
                  <strong>
                    <StatsCounter value={Number(n)} duration={0.8} />
                  </strong>
                  <span>
                    {String(label)}
                    <small>
                      {label === "saved journeys"
                        ? "In your profile"
                        : isDemo
                          ? "In the demo dataset"
                          : "In the available dataset"}
                    </small>
                  </span>
                </div>
              ))}
            </section>
            <section className="features-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">MADE FOR THE WAY YOU MOVE</span>
                  <h2>Your journey. A little smarter.</h2>
                </div>
                <p>
                  Less time figuring it out.
                  <br />
                  More time getting out there.
                </p>
              </div>
              <div className="feature-grid">
                {[
                  {
                    href: "plan",
                    icon: TrainFront,
                    title: "One journey. More possibilities.",
                    text: "Find the connections that make public transport work for you.",
                    class: "aqua",
                  },
                  {
                    href: "comfort",
                    icon: Sun,
                    title: "Take the comfortable way.",
                    text: "Compare walking options with shade data, where available.",
                    class: "sand",
                  },
                  {
                    href: "parking",
                    icon: ParkingCircle,
                    title: "Park with a plan.",
                    text: "Find nearby parking, then make the last stretch on foot.",
                    class: "lavender",
                  },
                ].map((f) => (
                  <Link
                    className={"feature " + f.class}
                    key={f.href}
                    href={"/" + f.href}
                  >
                    <f.icon size={29} />
                    <ArrowUpRight className="feature-arrow" size={22} />
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </Link>
                ))}
              </div>
            </section>
            <section className="bottom-callout">
              <span>
                <Bell size={24} />
              </span>
              <div>
                <h3>A heads-up before you head out.</h3>
                <p>
                  Explore area demand forecasts and choose a departure time that
                  works for you.
                </p>
              </div>
              <Link href="/demand">
                Explore demand alerts <ArrowRight size={18} />
              </Link>
            </section>
          </>
        )}
        {current !== "home" && (
          <div
            className={`interior ${current === "plan" ? "planner-dashboard" : ""}`}
          >
            <div className="page-heading">
              <span className="eyebrow">YOUR CITY, CONNECTED</span>
              <h1>
                {
                  {
                    plan: "Find your better way.",
                    explore: "A little closer to Qatar.",
                    comfort: "More shade. A gentler journey.",
                    demand: "A heads-up for your journey.",
                    parking: "Park near your next stop.",
                    saved: "Good journeys, worth keeping.",
                    profile: "Make it your journey.",
                    auth: "Welcome to a smarter way.",
                  }[current]
                }
              </h1>
              <p>
                {
                  {
                    plan: "Compare what matters to you. All estimates and data limitations are shown.",
                    explore:
                      "Discover the places and connections in the available dataset.",
                    comfort:
                      "Compare walking comfort where shade information supports it.",
                    demand:
                      "Forecasts are guidance. They are not live ride-hailing availability.",
                    parking:
                      "Discover parking locations. Space availability needs a verified feed.",
                    saved:
                      "Reopen a route, find your way again, or make room for a new favourite.",
                    profile: "Your travel preferences, your pace.",
                    auth: "Save your favourite journeys and set your travel preferences.",
                  }[current]
                }
              </p>
            </div>
            {(current === "plan" || current === "comfort") && (
              <>
                {planner}
                <div className="priority-row">
                  <span>Your priority</span>
                  {priorities.map((p) => (
                    <button
                      key={p}
                      aria-pressed={priority === p}
                      onClick={() => setPriority(p)}
                    >
                      {p === "Most comfortable" ? (
                        <Sun size={15} />
                      ) : p === "Budget-friendly" ? (
                        <Wallet size={15} />
                      ) : p === "Shortest" ? (
                        <Footprints size={15} />
                      ) : (
                        <Clock size={15} />
                      )}
                      {p}
                    </button>
                  ))}
                </div>
                {!isDemo &&
                  data &&
                  (!data.transport_stops.length ||
                    !data.transit_routes.length ||
                    !data.transit_route_stops.length ||
                    !data.transit_schedules.length) && (
                    <div className="info-box" role="status">
                      <TrainFront size={22} />
                      <div>
                        <strong>
                          Transit planning needs connected data in this view
                        </strong>
                        <p>
                          Loaded {data.transport_stops.length} stops,{" "}
                          {data.transit_routes.length} routes,{" "}
                          {data.transit_route_stops.length} route links and{" "}
                          {data.transit_schedules.length} schedules. The MVP
                          needs all four, with matching IDs and forward stop
                          order. Demo records may be hidden; use the toggle
                          above. Your teammate should check imports and read
                          policies. Walking uses the bundled Doha pilot network;
                          external providers are optional.
                        </p>
                      </div>
                    </div>
                  )}
                {current === "comfort" && (
                  <ShadeDemoPanel
                    maxWalkingMinutes={walkingLimit(prefs.max_walking_minutes)}
                    onShow={(a, b, r, segments) => {
                      setPresentationShade(segments);
                      setFrom(a);
                      setTo(b);
                      setRoutes([r]);
                      setSelected(r.id);
                      notify(
                        "Synthetic shade demonstration selected. Review the map and source labels below.",
                      );
                    }}
                  />
                )}
                {current === "comfort" && (
                  <div className="info-box">
                    <Sun size={22} />
                    <div>
                      <strong>
                        {isDemo
                          ? "Comfort comparison · demonstration"
                          : "Shade observations · spatial estimate"}
                      </strong>
                      <p>
                        {isDemo
                          ? "Walking follows mapped roads and paths. The shade presentation above uses explicitly synthetic labels and a documented coverage model; it does not measure heat protection."
                          : `${data?.shade_segments.length ?? 0} shade segments loaded in the current data mode. Switch on Shade overlay on the map. High/medium/low labels are spatially matched to walking paths; numeric percentages stay unknown without numeric coverage. Enable demo records to inspect supplied synthetic observations.`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="journey-layout">
                  <div className="route-options">
                    {busy ? (
                      <div className="empty-state">Comparing your options…</div>
                    ) : !sorted.length ? (
                      <div className="empty-state">
                        <Compass size={35} />
                        <h3>Your next journey starts here.</h3>
                        <p>
                          Select two places and find your journey. Demo coverage
                          is limited to central Doha and the illustrative Katara
                          corridor.
                        </p>
                      </div>
                    ) : (
                      sorted.map((r, i) => (
                        <button
                          className={
                            "route-card " +
                            (r.id === route?.id ? "selected" : "")
                          }
                          key={r.id}
                          onClick={() => setSelected(r.id)}
                        >
                          <div className="route-top">
                            <span className="pill">
                              {i === 0
                                ? "First for your priority"
                                : "Another way"}
                            </span>
                            <span>
                              {r.isDemo
                                ? "DEMO"
                                : r.isApproximate
                                  ? "MVP APPROXIMATION"
                                  : "ESTIMATE"}
                            </span>
                          </div>
                          <h3>{r.title}</h3>
                          <div className="route-metrics">
                            <strong>
                              {r.minutes}
                              <small> min</small>
                            </strong>
                            <span>
                              {r.cost === null
                                ? "Fare unknown"
                                : r.cost === 0
                                  ? "Free"
                                  : `QAR ${r.cost}`}
                              <small>
                                {(r.distance / 1000).toFixed(1)} km total
                              </small>
                            </span>
                          </div>
                          <div className="route-modes">
                            {r.legs.map((l, j) => (
                              <span key={j}>
                                {l.mode === "walk" ? (
                                  <Footprints size={17} />
                                ) : (
                                  <TrainFront size={17} />
                                )}
                                <small>{l.minutes}′</small>
                                {j < r.legs.length - 1 && (
                                  <ArrowRight size={13} />
                                )}
                              </span>
                            ))}
                          </div>
                          <div className="walking-summary">
                            <strong>
                              {r.legs
                                .filter((l) => l.mode === "walk")
                                .reduce((n, l) => n + l.minutes, 0)}{" "}
                              min on foot
                            </strong>
                            <span>
                              {r.legs.filter((l) => l.mode === "walk").length}{" "}
                              walking sections · {(r.walking / 1000).toFixed(1)}{" "}
                              km
                            </span>
                            <span>
                              {r.legs.some((l) => l.environment === "indoor")
                                ? "Includes a mapped indoor passage"
                                : "Outdoor walking · shade unverified"}
                            </span>
                          </div>
                          {r.shadeInfo && (
                            <div className="shade-card-indicator">
                              <Sun size={15} />
                              <span>
                                {r.shadeInfo.highPercent}% of walk matched to
                                high-shade labels ·{" "}
                                {r.shadeInfo.observedPercent}% observed
                                {r.shadeInfo.synthetic
                                  ? " · SYNTHETIC"
                                  : " · categorical estimate"}
                              </span>
                            </div>
                          )}
                          {r.id === "walking-shade" &&
                            routes.find((a) => a.id === "walking") && (
                              <p className="data-note">
                                {r.minutes -
                                  (routes.find((a) => a.id === "walking")
                                    ?.minutes ?? r.minutes)}{" "}
                                min difference from the standard walking route ·
                                categorical shade preference
                              </p>
                            )}
                          <div className="route-sub">
                            {(r.walking / 1000).toFixed(1)} km walking ·{" "}
                            {r.transfers} transfers
                            {r.shade !== null
                              ? ` · ${r.shade}% synthetic model shade`
                              : " · shade % unknown"}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div>
                    {picks}
                    {route && (
                      <WalkingAssistant
                        route={route}
                        maxWalkingMinutes={prefs.max_walking_minutes}
                        passages={indoorPassages}
                        selectedId={selectedPassage}
                        onSelect={setSelectedPassage}
                        onPosition={setLivePosition}
                        onError={notify}
                        onReplace={(updated) =>
                          setRoutes((previous) =>
                            previous.map((r) =>
                              r.id === updated.id ? updated : r,
                            ),
                          )
                        }
                        onReroute={async (fix) => {
                          if (!data) return;
                          const origin = {
                            id: "gps",
                            name: "Your current location",
                            latitude: fix.latitude,
                            longitude: fix.longitude,
                          };
                          setBusy(true);
                          try {
                            const next = await plan(origin, to, data, isDemo, {
                              maxWalkingMinutes: prefs.max_walking_minutes,
                            });
                            setFrom(origin);
                            setRoutes(next);
                            setSelected(next[0]?.id || "");
                          } catch (error) {
                            notify((error as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    )}
                    {mapArea}
                    {route && (
                      <div className="detail-panel">
                        <div className="detail-title">
                          <h3>Your journey, step by step</h3>
                          <button className="secondary" onClick={saveJourney}>
                            <Bookmark size={16} />
                            Save journey
                          </button>
                        </div>
                        <ol className="legs">
                          {route.legs.map((l, i) => (
                            <li key={i}>
                              <span className={"leg-icon " + l.mode}>
                                {l.mode === "walk" ? (
                                  <Footprints size={18} />
                                ) : (
                                  <TrainFront size={18} />
                                )}
                              </span>
                              <div>
                                <strong>{l.name}</strong>
                                <small>
                                  {l.minutes} min ·{" "}
                                  {(l.distance / 1000).toFixed(2)} km ·
                                  estimated
                                </small>
                              </div>
                            </li>
                          ))}
                        </ol>
                        <p className="data-note">
                          <Info size={16} />
                          {route.warning}
                        </p>
                        <small>Source: {route.source}</small>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {current === "explore" && (
              <>
                <div className="filter-row">
                  {["All", "Places", "Metro", "Tram", "Bus", "Parking"].map(
                    (f) => (
                      <button
                        aria-pressed={filter === f}
                        onClick={() => setFilter(f)}
                        key={f}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
                <div className="explore-layout">
                  <div className="place-list">
                    {data &&
                      [
                        ...(filter === "All" || filter === "Places"
                          ? data.places
                          : []),
                        ...data.transport_stops.filter(
                          (p) =>
                            filter === "All" || p.mode === filter.toLowerCase(),
                        ),
                        ...(filter === "All" || filter === "Parking"
                          ? data.parking_locations.map((p) => ({
                              ...p,
                              category: "Parking",
                            }))
                          : []),
                      ].map((p) => (
                        <button
                          key={p.id}
                          className="place-row"
                          onClick={() => {
                            setTo(p);
                            setPick(null);
                            notify(
                              `${p.name} selected. Open Plan a journey to route here.`,
                            );
                          }}
                        >
                          <span className="place-icon">
                            <MapPin size={21} />
                          </span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>
                              {"category" in p
                                ? p.category
                                : "mode" in p
                                  ? p.mode
                                  : "Location"}{" "}
                              · {p.is_demo ? "Demo" : "Imported"}
                            </small>
                          </span>
                          <ArrowUpRight size={17} />
                        </button>
                      ))}
                    {data &&
                      filter === "Bus" &&
                      !data.transport_stops.some((p) => p.mode === "bus") && (
                        <p className="empty-state">
                          No bus stops in this dataset.
                        </p>
                      )}
                  </div>
                  <div>
                    {picks}
                    {mapArea}
                  </div>
                </div>
                <div className="source-panel">
                  <h3>Know your data.</h3>
                  {data?.data_sources.map((s) => (
                    <p key={s.id}>
                      <strong>{s.name}</strong> · {s.licence_status}
                      <br />
                      {s.description} · Updated {date(s.last_updated)}{" "}
                      {s.source_url && (
                        <a
                          href={
                            /^https?:\/\//.test(s.source_url)
                              ? s.source_url
                              : "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit source ↗
                        </a>
                      )}
                    </p>
                  ))}
                  <p>
                    Photography: “Doha skyline” by Haakon S. Krohn, Wikimedia
                    Commons, CC BY-SA 3.0. Displayed as cropped images. No
                    restricted census boundaries are included. Map ©
                    OpenStreetMap contributors. Transit fixtures are
                    illustrative, not an official route map.
                  </p>
                </div>
              </>
            )}
            {current === "demand" && (
              <>
                <div className="info-box">
                  <Bell size={23} />
                  <div>
                    <strong>
                      {isDemo
                        ? "Demonstration forecasts · fixed sample dates"
                        : "Imported demand forecasts"}
                    </strong>
                    <p>
                      No live Uber prices, surge multipliers, driver counts or
                      guaranteed waiting times. Forecasts may be stale; check
                      the timestamp before using them.
                    </p>
                  </div>
                </div>
                <div className="demand-grid">
                  {data?.demand_forecasts.map((d) => (
                    <article className="demand-card" key={d.id}>
                      <div className="route-top">
                        <span
                          className={
                            "pill " + (d.demand_level === "High" ? "coral" : "")
                          }
                        >
                          {d.demand_level} demand
                        </span>
                        <span>{d.is_demo ? "DEMO FORECAST" : "FORECAST"}</span>
                      </div>
                      <h2>{d.area_name}</h2>
                      <p className="forecast-date">
                        <Clock size={17} />
                        {date(d.forecast_for)}
                      </p>
                      <p>
                        {d.price_pressure}. Consider leaving earlier or
                        comparing public transport options.
                      </p>
                      <dl>
                        <div>
                          <dt>Estimated wait</dt>
                          <dd>
                            {d.estimated_wait_minutes === null
                              ? "Unavailable"
                              : `${d.estimated_wait_minutes} min (estimate)`}
                          </dd>
                        </div>
                        <div>
                          <dt>Confidence</dt>
                          <dd>
                            {d.confidence === null
                              ? "Not supplied"
                              : `${d.confidence} (source scale)`}
                          </dd>
                        </div>
                      </dl>
                      <p className="data-note">
                        Source: {d.source}
                        <br />
                        Added {date(d.created_at)}
                      </p>
                      <Link href="/plan">
                        Compare your journey <ArrowRight size={17} />
                      </Link>
                    </article>
                  ))}
                </div>
                {data && !data.demand_forecasts.length && (
                  <div className="empty-state">
                    No demand forecasts are available in the connected dataset.
                  </div>
                )}
              </>
            )}
            {current === "parking" && (
              <>
                <div className="parking-search">
                  <LocationSearch
                    label="Destination"
                    value={to}
                    onChange={setTo}
                    places={
                      data
                        ? [
                            ...data.places,
                            ...data.transport_stops.map((s) => ({
                              ...s,
                              category: `${s.mode} station`,
                            })),
                          ]
                        : []
                    }
                    onError={notify}
                  />
                  <span>Sorted by approximate proximity</span>
                </div>
                <div className="explore-layout">
                  <div>
                    {data?.parking_locations
                      .filter((p) => p.is_public)
                      .map((p) => ({ p, meters: Math.round(distance(p, to)) }))
                      .sort((a, b) => a.meters - b.meters)
                      .map(({ p, meters }) => {
                        const status = data.parking_status
                          .filter((s) => s.parking_location_id === p.id)
                          .sort(
                            (a, b) =>
                              Date.parse(b.observed_at) -
                              Date.parse(a.observed_at),
                          )[0];
                        const fresh =
                          status &&
                          Date.now() - Date.parse(status.observed_at) >= 0 &&
                          Date.now() - Date.parse(status.observed_at) < 300000;
                        const verified =
                          status?.is_live && !status.is_demo && fresh;
                        return (
                          <article className="parking-card" key={p.id}>
                            <div className="route-top">
                              <ParkingCircle size={25} />
                              <span className="pill">
                                {verified
                                  ? `${status.available_spaces ?? "Unknown"} spaces · live feed`
                                  : "Availability unverified"}
                              </span>
                            </div>
                            <h3>{p.name}</h3>
                            <p>
                              {p.parking_type} · Capacity{" "}
                              {p.capacity ?? "not supplied"}
                            </p>
                            <strong>
                              {meters < 1000
                                ? `${meters} m`
                                : `${(meters / 1000).toFixed(1)} km`}{" "}
                              straight-line distance
                            </strong>
                            <small>
                              Walking time requires a pedestrian route.
                            </small>
                            <button
                              className="text-button"
                              onClick={async () => {
                                setFrom({ ...p, id: "parking-" + p.id });
                                setRoutes([]);
                                if (!data) return;
                                setBusy(true);
                                try {
                                  const r = await plan(p, to, data, false, {
                                    maxWalkingMinutes:
                                      prefs.max_walking_minutes,
                                  });
                                  setRoutes(r);
                                  setSelected(r[0]?.id || "");
                                } catch (e) {
                                  notify((e as Error).message);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Show walking route <ArrowRight size={16} />
                            </button>
                            <p className="data-note">
                              {p.is_demo
                                ? "Demo location"
                                : "Imported location"}{" "}
                              · {p.source}
                              <br />
                              {status
                                ? `Status observed ${date(status.observed_at)} · ${status.source}`
                                : "Location update time not supplied · no status feed"}
                              {status?.occupancy_status === "full"
                                ? " · Full at last observation; compare the alternatives below."
                                : ""}
                            </p>
                          </article>
                        );
                      })}
                    {data && !data.parking_locations.length && (
                      <div className="empty-state">
                        No parking locations available.
                      </div>
                    )}
                  </div>
                  <div>
                    {mapArea}
                    {route && (
                      <div className="detail-panel">
                        <h3>Walking to {to.name}</h3>
                        <p>
                          {route.minutes} min ·{" "}
                          {(route.distance / 1000).toFixed(1)} km · estimated
                        </p>
                        <p>{route.warning}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {current === "saved" &&
              guard(
                <div className="saved-grid">
                  {saved.map((s) => (
                    <article className="saved-card" key={s.id}>
                      <Bookmark size={25} />
                      <h3>
                        {s.from.name}
                        <ArrowRight size={17} />
                        {s.to.name}
                      </h3>
                      <p>
                        {s.priority} · {s.route.minutes} min ·{" "}
                        {s.route.isDemo ? "Demo snapshot" : "Saved estimate"}
                      </p>
                      <div>
                        <button className="secondary" onClick={() => reopen(s)}>
                          Reopen <ArrowRight size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete journey to ${s.to.name}`}
                          onClick={() => removeSaved(s.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {!saved.length && (
                    <div className="empty-state">
                      <Bookmark size={35} />
                      <h3>Your first favourite is waiting.</h3>
                      <p>
                        Find a journey, then save it from the details panel.
                      </p>
                      <Link className="primary" href="/plan">
                        Plan a journey <ArrowRight size={17} />
                      </Link>
                    </div>
                  )}
                </div>,
              )}
            {current === "profile" &&
              guard(
                <form className="settings-form" onSubmit={savePreferences}>
                  <div className="profile-heading">
                    <span className="profile-avatar">
                      <UserRound size={30} />
                    </span>
                    <div>
                      <h2>{isDemo ? "Local demo profile" : user?.email}</h2>
                      <p>
                        {isDemo
                          ? "Stored only in this browser. No real account is created."
                          : "Personal settings protected by your Supabase session and RLS."}
                      </p>
                    </div>
                  </div>
                  <label>
                    Full name
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <div className="settings-grid">
                    <label>
                      Default journey priority
                      <select
                        value={prefs.preferred_priority}
                        onChange={(e) =>
                          setPrefs({
                            ...prefs,
                            preferred_priority: e.target.value,
                          })
                        }
                      >
                        {priorities.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Preferred maximum walking time (minutes)
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={prefs.max_walking_minutes}
                        onChange={(e) =>
                          setPrefs({
                            ...prefs,
                            max_walking_minutes: Math.min(
                              20,
                              Math.max(1, Number(e.target.value)),
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Budget preference (QAR)
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={prefs.budget_limit ?? ""}
                        onChange={(e) =>
                          setPrefs({
                            ...prefs,
                            budget_limit:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={prefs.avoid_direct_sun}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          avoid_direct_sun: e.target.checked,
                        })
                      }
                    />
                    Prefer to avoid direct sunlight
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={prefs.prefer_public_transport}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          prefer_public_transport: e.target.checked,
                        })
                      }
                    />
                    Prefer public transport
                  </label>
                  <p className="data-note">
                    The planner ranks by your chosen priority. Walking, budget
                    and sunlight settings are saved preferences; hard
                    constraints require complete provider coverage.
                  </p>
                  <div className="settings-actions">
                    <button className="primary" type="submit">
                      Save preferences <Check size={17} />
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={logout}
                    >
                      <LogOut size={17} />
                      Sign out
                    </button>
                  </div>
                </form>,
              )}
            {current === "auth" && (
              <div className="auth-layout">
                <div className="auth-art">
                  <Navigation size={55} />
                  <h2>
                    A better way
                    <br />
                    starts with you.
                  </h2>
                  <p>
                    Your city. Your pace.
                    <br />
                    Your smarter journey.
                  </p>
                </div>
                <div className="auth-form">
                  {isDemo ? (
                    <>
                      <span className="pill">LOCAL DEMO</span>
                      <h2>Try it out. Make it yours.</h2>
                      <p>
                        Supabase authentication is not configured. Open a local
                        demo profile to try saved journeys and preferences on
                        this browser.
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          setDemoUser(true);
                          localStorage.setItem("sq-demo-user", "true");
                          router.push("/profile");
                        }}
                      >
                        Open demo profile <ArrowRight size={18} />
                      </button>
                      <small>
                        No password, email or real account required.
                      </small>
                    </>
                  ) : (
                    <form onSubmit={auth}>
                      <h2>
                        {authMode === "register"
                          ? "Create an account"
                          : authMode === "reset"
                            ? "Reset your password"
                            : authMode === "update"
                              ? "Set a new password"
                              : "Good to see you again."}
                      </h2>
                      {authMode === "register" && (
                        <label>
                          Full name
                          <input name="name" required autoComplete="name" />
                        </label>
                      )}
                      {authMode !== "update" && (
                        <label>
                          Email
                          <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                          />
                        </label>
                      )}
                      {authMode !== "reset" && (
                        <label>
                          Password
                          <input
                            type="password"
                            name="password"
                            minLength={8}
                            required
                            autoComplete={
                              authMode === "login"
                                ? "current-password"
                                : "new-password"
                            }
                          />
                        </label>
                      )}
                      <button
                        className="primary"
                        disabled={authBusy}
                        type="submit"
                      >
                        {authBusy
                          ? "Please wait…"
                          : authMode === "register"
                            ? "Create account"
                            : authMode === "reset"
                              ? "Send reset email"
                              : authMode === "update"
                                ? "Update password"
                                : "Sign in"}
                        <ArrowRight size={17} />
                      </button>
                      <div className="auth-switch">
                        {["login", "register", "reset"]
                          .filter((m) => m !== authMode)
                          .map((m) => (
                            <button
                              type="button"
                              key={m}
                              onClick={() => setAuthMode(m)}
                            >
                              {m === "login"
                                ? "Sign in"
                                : m === "register"
                                  ? "Create account"
                                  : "Forgot password?"}
                            </button>
                          ))}
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <footer>
        <Link href="/" className="footer-brand">
          smarter qatar<span>.</span>
        </Link>
        <p>Made for a better way around Qatar.</p>
        <div>
          <Link href="/explore">Data & attribution</Link>
          <a href="https://www.qr.com.qa/" target="_blank" rel="noreferrer">
            Qatar Rail <ArrowUpRight size={13} />
          </a>
          <span>
            {isDemo ? "Prototype · demonstration data" : "Connected prototype"}
          </span>
        </div>
      </footer>
      <AnimatePresence>
        {message && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Info size={20} />
            <p>{message}</p>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setMessage("")}
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
