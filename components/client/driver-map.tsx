"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, CarFront, Radar } from "lucide-react";
import { useNearbyDrivers } from "@/hooks/use-rides";
import { geocode, haversineKm, type LngLat } from "@/lib/geo";
import { isPositionFresh } from "@/lib/location";
import { MAP_STYLE, markerEl, boundsOf } from "@/lib/map";
import { cn } from "@/lib/utils";
import type { Client, Driver, VehicleCategory } from "@/lib/types";

type Gmaps = any;

// A driver is considered "nearby" within this radius of the client.
const RADIUS_KM = 10;
const NAIROBI: LngLat = [36.8219, -1.2921];

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
  if (
    driver.lat != null &&
    driver.lng != null &&
    isPositionFresh({ lat: driver.lat, lng: driver.lng }, driver.last_ping_at)
  ) {
    return [driver.lng, driver.lat];
  }
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

function driverSvg(online: boolean, distanceKm: number) {
  const body = online ? "#22c55e" : "#64748b";
  const ring = online ? "rgba(34,197,94,0.35)" : "rgba(100,116,139,0.3)";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r="21" fill="${body}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="23" cy="23" r="25" fill="none" stroke="${ring}" stroke-width="4"/>
      <path d="M17 28h12l-1-5H18l-1 5zM18.5 22l1-2.6h7l1 2.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="19" cy="28" r="1.8" fill="#fff"/><circle cx="27" cy="28" r="1.8" fill="#fff"/>
      <text x="23" y="40" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff" font-family="system-ui">${distanceKm.toFixed(1)}km</text>
    </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function clientSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="14" fill="#38bdf8" fill-opacity="0.28"/>
      <circle cx="15" cy="15" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
    </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

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
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE as never,
      center: { lng: NAIROBI[0], lat: NAIROBI[1] },
      zoom: 11,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.once("load", () => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Resolve driver coords whenever the list or centre changes.
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

    // Clear old markers + any open popup.
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    popupRef.current?.remove();
    popupRef.current = null;

    new maplibregl.Marker({ element: markerEl(clientSvg(), 30) })
      .setLngLat({ lng: center[0], lat: center[1] })
      .addTo(map)
      .getElement();

    for (const p of points) {
      const el = markerEl(driverSvg(p.driver.is_available, p.distanceKm), 46);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat({ lng: p.coord[0], lat: p.coord[1] })
        .addTo(map);
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const status = p.driver.is_available ? "Online now" : "Offline";
        const color = p.driver.is_available ? "#16a34a" : "#64748b";
        const safe = (s: string) =>
          s.replace(/[&<>"]/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string
          );
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({
          offset: 26,
          closeButton: false,
        })
          .setLngLat({ lng: p.coord[0], lat: p.coord[1] })
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;min-width:150px;line-height:1.35;color:#0f172a">
              <div style="font-weight:800;font-size:13px">${safe(p.driver.name)}</div>
              <div style="font-size:12px;color:#475569">${safe(
                p.driver.vehicle_type
              )} · ${safe(p.driver.plate_number)}</div>
              <div style="margin-top:5px;font-size:12px;font-weight:700;color:${color}">
                ● ${status} · ${p.distanceKm.toFixed(1)} km away
              </div>
            </div>`
          )
          .addTo(map);
      });
      markersRef.current.push(marker);
    }

    const near = points.filter(
      (p) => p.driver.is_available && p.distanceKm <= RADIUS_KM
    );
    const frame: LngLat[] = [center, ...near.map((p) => p.coord)];
    if (frame.length > 1) {
      const bbox = boundsOf(frame);
      if (bbox) {
        map.fitBounds(
          [
            [bbox.lng[0], bbox.lat[0]],
            [bbox.lng[1], bbox.lat[1]],
          ],
          { padding: 64, maxZoom: 13 }
        );
        return;
      }
    }
    map.setCenter({ lng: center[0], lat: center[1] });
    map.setZoom(12);
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
