"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, CarFront, Radar } from "lucide-react";
import { useNearbyDrivers } from "@/hooks/use-rides";
import { geocode, haversineKm, type LngLat } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Client, Driver, VehicleCategory } from "@/lib/types";

// A driver is considered "nearby" within this radius of the client.
const RADIUS_KM = 10;
const NAIROBI: LngLat = [36.8219, -1.2921];

// Google Maps raster tiles (same source the ride map uses). We dark-theme only
// the tile canvas via a CSS filter so the driver markers keep true colours.
const GOOGLE_STYLE: import("maplibre-gl").StyleSpecification = {
  version: 8,
  sources: {
    "google-maps": {
      type: "raster",
      tiles: [
        "https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
    },
  },
  layers: [{ id: "google-maps-layer", type: "raster", source: "google-maps" }],
};

const CANVAS_FILTER =
  "invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.2)";

// Cache text→coord lookups so we don't re-geocode the same town repeatedly.
const geoCache = new Map<string, LngLat>();

/** Deterministic sub-km offset so several drivers in one town don't stack. */
function jitter(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const dx = ((h % 1000) / 1000 - 0.5) * 0.03;
  const dy = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.03;
  return [dx, dy];
}

async function geocodeDriver(driver: Driver): Promise<LngLat | null> {
  const loc = driver.current_location || driver.frequent_location;
  if (!loc) return null;
  const key = loc.trim().toLowerCase();
  let base = geoCache.get(key);
  if (!base) {
    base = await geocode(loc);
    geoCache.set(key, base);
  }
  const [dx, dy] = jitter(driver.id);
  return [base[0] + dx, base[1] + dy];
}

function driverMarkerEl(online: boolean, distanceKm: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.gap = "6px";
  el.style.cursor = "pointer";
  el.style.filter = online ? "none" : "saturate(0.7)";
  el.innerHTML = `
    <span style="
      width:32px;
      height:32px;
      display:grid;
      place-items:center;
      border-radius:9999px;
      background:${online ? "linear-gradient(135deg,#22c55e,#15803d)" : "linear-gradient(135deg,#64748b,#334155)"};
      box-shadow:${online ? "0 0 0 4px rgba(34,197,94,0.28), 0 8px 18px rgba(0,0,0,0.65)" : "0 0 0 4px rgba(100,116,139,0.26), 0 8px 18px rgba(0,0,0,0.55)"};
      ${online ? "animation:pulse-dot 1.8s ease-in-out infinite;" : "opacity:.86;"}
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-5h9L18 17M7 12l1-3h8l1 3"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg>
    </span>
    <span style="
      white-space:nowrap;
      border-radius:9999px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(2,6,23,.78);
      color:${online ? "#eaffff" : "#cbd5e1"};
      padding:5px 8px;
      font:700 11px system-ui,sans-serif;
      letter-spacing:.01em;
      box-shadow:0 8px 22px rgba(0,0,0,.45);
      backdrop-filter:blur(10px);
    ">${distanceKm.toFixed(1)} km</span>
  `;
  return el;
}

function clientMarkerEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.borderRadius = "9999px";
  el.style.background = "#38bdf8";
  el.style.border = "3px solid #ffffff";
  el.style.boxShadow =
    "0 0 0 6px rgba(56,189,248,0.25), 0 2px 8px rgba(0,0,0,0.6)";
  el.style.animation = "pulse-dot 2s ease-in-out infinite";
  return el;
}

function popupHtml(driver: Driver, distanceKm: number): string {
  const online = driver.is_available;
  const status = online ? "Online now" : "Offline";
  const color = online ? "#16a34a" : "#64748b";
  const safe = (s: string) =>
    s.replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string
    );
  return `
    <div style="font-family:system-ui,sans-serif;min-width:150px;line-height:1.3">
      <div style="font-weight:700;font-size:13px;color:#0f172a">${safe(
        driver.name
      )}</div>
      <div style="font-size:12px;color:#475569">${safe(
        driver.vehicle_type
      )} · ${safe(driver.plate_number)}</div>
      <div style="margin-top:4px;font-size:12px;font-weight:600;color:${color}">
        ● ${status} · ${distanceKm.toFixed(1)} km away
      </div>
    </div>`;
}

interface Point {
  driver: Driver;
  coord: LngLat;
  distanceKm: number;
}

export function DriverMap({
  client,
  category,
  pickup,
  pickupCoords,
}: {
  client: Client;
  category: VehicleCategory;
  pickup: string;
  pickupCoords: { lat: number; lng: number } | null;
}) {
  const { drivers } = useNearbyDrivers(client.id, category);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<import("maplibre-gl").Marker[]>([]);

  const [center, setCenter] = useState<LngLat | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Resolve the client's map centre from their pickup (coords or free text).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c: LngLat = pickupCoords
        ? [pickupCoords.lng, pickupCoords.lat]
        : await geocode(pickup.trim() || "Nairobi");
      if (!cancelled) setCenter(c);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickup, pickupCoords]);

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (cancelled || !containerRef.current) return;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: GOOGLE_STYLE,
          center: NAIROBI,
          zoom: 11,
          attributionControl: { compact: true },
        });
        mapRef.current = map;
        map.on("error", (e) =>
          console.warn("[driver-map] maplibre error", e?.error || e)
        );
        map.on("load", () => {
          if (cancelled) return;
          map.getCanvas().style.filter = CANVAS_FILTER;
          setReady(true);
        });
      } catch (err) {
        console.error("[driver-map] init failed", err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Geocode drivers whenever the list or centre changes.
  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        drivers.map(async ({ driver }) => {
          const coord = await geocodeDriver(driver);
          if (!coord) return null;
          return { driver, coord, distanceKm: haversineKm(center, coord) };
        })
      );
      if (!cancelled)
        setPoints(resolved.filter((p): p is Point => p !== null));
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, center]);

  // (Re)draw markers and frame the view whenever points/centre change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !center) return;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const clientMarker = new maplibregl.Marker({ element: clientMarkerEl() })
        .setLngLat(center)
        .addTo(map);
      markersRef.current.push(clientMarker);

      for (const p of points) {
        const popup = new maplibregl.Popup({
          offset: 18,
          closeButton: false,
        }).setHTML(popupHtml(p.driver, p.distanceKm));
        const marker = new maplibregl.Marker({
          element: driverMarkerEl(p.driver.is_available, p.distanceKm),
        })
          .setLngLat(p.coord)
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }

      const near = points.filter(
        (p) => p.driver.is_available && p.distanceKm <= RADIUS_KM
      );
      const frame: LngLat[] = [center, ...near.map((p) => p.coord)];
      if (frame.length > 1) {
        const bounds = frame.reduce(
          (bb, c) => bb.extend(c),
          new maplibregl.LngLatBounds(frame[0], frame[0])
        );
        map.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: 700 });
      } else {
        map.easeTo({ center, zoom: 12, duration: 500 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [points, ready, center]);

  const stats = useMemo(() => {
    const online = points.filter((p) => p.driver.is_available);
    const nearby = online.filter((p) => p.distanceKm <= RADIUS_KM);
    const nearest = nearby.length
      ? Math.min(...nearby.map((p) => p.distanceKm))
      : null;
    return { onlineCount: online.length, nearby: nearby.length, nearest };
  }, [points]);

  return (
    <div className="relative w-full overflow-hidden rounded-[1.35rem] border border-cyan-400/15 bg-[#050912] shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
      <div ref={containerRef} className="h-[252px] w-full" />

      {/* Nearby banner */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold shadow-[0_10px_26px_rgba(0,0,0,0.45)] backdrop-blur-md",
            stats.nearby > 0
              ? "border-emerald-300/20 bg-emerald-500/75 text-white"
              : "border-white/10 bg-background/78 text-muted-foreground"
          )}
        >
          {stats.nearby > 0 ? (
            <>
              <Radar className="h-3.5 w-3.5" />
              {stats.nearby} driver{stats.nearby > 1 ? "s" : ""} nearby
              {stats.nearest != null && ` · ~${stats.nearest.toFixed(1)} km`}
            </>
          ) : stats.onlineCount > 0 ? (
            <>
              <CarFront className="h-3.5 w-3.5" />
              {stats.onlineCount} online · none within {RADIUS_KM} km
            </>
          ) : (
            <>
              <CarFront className="h-3.5 w-3.5" />
              No active drivers nearby
            </>
          )}
        </span>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute inset-x-4 bottom-3 z-10 flex items-center gap-3 rounded-xl border border-white/10 bg-[#060a13]/78 px-3 py-2 text-[12px] font-semibold text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.42)] backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          Online
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#64748b]" />
          Offline
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#38bdf8]" />
          You
        </span>
      </div>

      {!ready && !failed && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-[#050912]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 animate-pulse text-accent" />
            Finding drivers near you…
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-[#050912] px-6 text-center">
          <p className="text-xs text-muted-foreground">Map unavailable</p>
        </div>
      )}
    </div>
  );
}
