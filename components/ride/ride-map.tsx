"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, Route as RouteIcon, Clock } from "lucide-react";
import { geocode, getRoute, type LngLat } from "@/lib/geo";
import { cn } from "@/lib/utils";

// Google Maps raster tiles styled dark via CSS filter.
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
  layers: [
    {
      id: "google-maps-layer",
      type: "raster",
      source: "google-maps",
    },
  ],
};

function dot(color: string, ring = false) {
  const el = document.createElement("div");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "3px solid #f4eddf";
  el.style.boxShadow = `0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.6)`;
  if (ring) el.style.animation = "pulse-dot 1.6s ease-in-out infinite";
  return el;
}

function carMarker() {
  const el = document.createElement("div");
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.display = "grid";
  el.style.placeItems = "center";
  el.style.borderRadius = "9999px";
  el.style.background = "linear-gradient(135deg,#E2B127,#DD2C11)";
  el.style.boxShadow = "0 0 0 3px rgba(199,66,7,0.35), 0 4px 12px rgba(0,0,0,0.6)";
  el.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-5h9L18 17M7 12l1-3h8l1 3"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg>';
  return el;
}


export function RideMap({
  pickup,
  destination,
  className,
}: {
  pickup: string;
  destination: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<{ km: number; min: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let map: import("maplibre-gl").Map | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        if (cancelled || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: GOOGLE_STYLE,
          center: [36.8219, -1.2921],
          zoom: 11,
          pitch: 0,
          attributionControl: { compact: true },
        });
        const m = map;
        m.on("error", (e) => console.warn("[ride-map] maplibre error", e?.error || e));

        m.on("load", async () => {
          const [a, b] = await Promise.all([geocode(pickup), geocode(destination)]);
          if (cancelled) return;

          new maplibregl.Marker({ element: dot("#dd3a41", true) }).setLngLat(a).addTo(m);
          new maplibregl.Marker({ element: dot("#c47d09") }).setLngLat(b).addTo(m);

          const route = await getRoute(a, b);
          if (cancelled) return;
          setInfo({ km: route.distanceKm, min: route.durationMin });

          const coords = route.coordinates;
          m.addSource("tn-route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: coords },
            },
          });
          m.addLayer({
            id: "tn-route-glow",
            type: "line",
            source: "tn-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#00d4ff", "line-width": 10, "line-opacity": 0.35 },
          });
          m.addLayer({
            id: "tn-route-line",
            type: "line",
            source: "tn-route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#00d4ff", "line-width": 4.5 },
          });

          // Frame the whole route. Pitch in 3D only for short (city) trips so a
          // zoomed-out inter-city route never shows an empty/black horizon.
          const bounds = coords.reduce(
            (bb, c) => bb.extend(c as [number, number]),
            new maplibregl.LngLatBounds(coords[0], coords[0])
          );
          const cam = m.cameraForBounds(bounds, { padding: 48, maxZoom: 15 });
          const zoom = cam?.zoom ?? 12;
          m.easeTo({
            center: cam?.center,
            zoom,
            pitch: zoom >= 12.5 ? 55 : 0,
            bearing: zoom >= 12.5 ? -18 : 0,
            duration: 1100,
          });
          setReady(true);

          if (coords.length > 1) {
            const car = new maplibregl.Marker({ element: carMarker() })
              .setLngLat(coords[0] as LngLat)
              .addTo(m);
            let t = 0;
            const speed = 0.02 * Math.max(1, 60 / coords.length);
            const tick = () => {
              t += speed;
              if (t >= coords.length - 1) t = 0;
              const i = Math.floor(t);
              const f = t - i;
              const c0 = coords[i];
              const c1 = coords[Math.min(i + 1, coords.length - 1)];
              car.setLngLat([c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f]);
              raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
          }
        });
      } catch (err) {
        console.error("[ride-map] failed to init", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map?.remove();
    };
  }, [pickup, destination]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface",
        !className?.includes("h-") && "h-56",
        className
      )}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          width: "100%",
          height: "100%",
          filter: "invert(1) hue-rotate(180deg) brightness(0.95) contrast(1.2)",
        }}
      />

      <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
        Live tracking
      </div>

      {info && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl bg-background/75 px-3.5 py-2 backdrop-blur">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <RouteIcon className="h-4 w-4 text-accent" />
            {info.km.toFixed(1)} km
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-accent" />~{Math.round(info.min)} min
          </span>
        </div>
      )}

      {!ready && !failed && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-surface">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 animate-pulse text-accent" />
            Mapping your route…
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-surface px-6 text-center">
          <div className="space-y-1">
            <Navigation className="mx-auto h-5 w-5 text-accent" />
            <p className="text-sm text-foreground">{pickup} → {destination}</p>
            <p className="text-xs text-muted-foreground">Map preview unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
}
