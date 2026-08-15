"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, Route as RouteIcon, Clock } from "lucide-react";
import { geocode, getRoute, type LngLat } from "@/lib/geo";
import { MAP_STYLE, markerEl, boundsOf } from "@/lib/map";
import { cn } from "@/lib/utils";

const NAIROBI: LngLat = [36.8219, -1.2921];

function pinSvg(color: string, label = "") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
      <path fill="${color}" stroke="#ffffff" stroke-width="2.5" d="M17 1C8.7 1 2 7.7 2 16c0 11 15 28 15 28s15-17 15-28C32 7.7 25.3 1 17 1z"/>
      <circle cx="17" cy="16" r="7" fill="#ffffff"/>
      ${label ? `<text x="17" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${color}" font-family="system-ui">${label}</text>` : ""}
    </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function carSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="19" fill="#E2B127" stroke="#fff" stroke-width="2"/>
      <path d="M13 26h14l-1.4-5H14.4L13 26zM14.5 20l1-3h9l1 3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="15" cy="26" r="2" fill="#fff"/><circle cx="25" cy="26" r="2" fill="#fff"/>
    </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function blueDotEl() {
  const el = document.createElement("div");
  el.style.width = "24px";
  el.style.height = "24px";
  el.style.borderRadius = "50%";
  el.style.background = "rgba(56,189,248,0.25)";
  el.style.display = "grid";
  el.style.placeItems = "center";
  const dot = document.createElement("div");
  dot.style.width = "11px";
  dot.style.height = "11px";
  dot.style.borderRadius = "50%";
  dot.style.background = "#1d4ed8";
  dot.style.border = "2px solid #ffffff";
  dot.style.boxShadow = "0 0 0 2px rgba(56,189,248,0.35)";
  el.appendChild(dot);
  return el;
}

export function RideMap({
  pickup,
  destination,
  livePosition,
  className,
}: {
  pickup: string;
  destination: string;
  /** Real-time driver position (lng, lat) — overrides the simulated car. */
  livePosition?: LngLat | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const carMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [info, setInfo] = useState<{ km: number; min: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const container = containerRef.current;
      if (!container) return;

      let map: maplibregl.Map;
      try {
        map = new maplibregl.Map({
          container,
          style: MAP_STYLE as never,
          center: { lng: NAIROBI[0], lat: NAIROBI[1] },
          zoom: 12,
          attributionControl: { compact: true },
        });
      } catch {
        if (!cancelled) setFailed("load");
        return;
      }
      mapRef.current = map;

      try {
        await new Promise<void>((resolve, reject) => {
          const onErr = () => reject(new Error("tiles"));
          map.once("error", onErr);
          map.once("load", () => {
            map.off("error", onErr);
            resolve();
          });
        });
      } catch {
        if (!cancelled) setFailed("load");
        return;
      }
      if (cancelled) return;

      // Resolve pickup/destination to coordinates (free Nominatim geocoding).
      const [a, b] = await Promise.all([
        geocode(pickup.trim() || "Nairobi"),
        geocode(destination.trim() || "Nairobi"),
      ]);
      if (cancelled) return;

      new maplibregl.Marker({ element: markerEl(pinSvg("#38bdf8"), 26) })
        .setLngLat({ lng: a[0], lat: a[1] })
        .addTo(map);

      new maplibregl.Marker({ element: markerEl(pinSvg("#e11d48", "A"), 26) })
        .setLngLat({ lng: b[0], lat: b[1] })
        .addTo(map);

      // Car marker for the driver's live position (or the simulated one).
      const carMarker = new maplibregl.Marker({
        element: markerEl(carSvg(), 40),
      })
        .setLngLat({ lng: a[0], lat: a[1] })
        .addTo(map);
      carMarkerRef.current = carMarker;

      // Accurate road route + real distance/time (free OSRM routing).
      try {
        const route = await getRoute(a, b);
        if (cancelled) return;
        if (route.coordinates.length > 1) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.coordinates,
              },
            },
          });
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#00d4ff",
              "line-width": 5,
              "line-opacity": 0.95,
            },
          });
          const bbox = boundsOf(route.coordinates);
          if (bbox) {
            map.fitBounds(
              [
                [bbox.lng[0], bbox.lat[0]],
                [bbox.lng[1], bbox.lat[1]],
              ],
              { padding: 56, maxZoom: 15 }
            );
          }
        }
        setInfo({ km: route.distanceKm, min: route.durationMin });
      } catch {
        setInfo(null);
      }

      // Device (rider) GPS — live blue dot.
      const userMarker = new maplibregl.Marker({ element: blueDotEl() })
        .setLngLat({ lng: a[0], lat: a[1] })
        .addTo(map);
      userMarkerRef.current = userMarker;

      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            userMarker.setLngLat({
              lng: pos.coords.longitude,
              lat: pos.coords.latitude,
            });
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
        );
      }

      setReady(true);
    }

    init();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      carMarkerRef.current = null;
      userMarkerRef.current = null;
    };
  }, [pickup, destination]);

  // Move the car marker to the driver's real position as they drive.
  useEffect(() => {
    if (!livePosition || !carMarkerRef.current) return;
    carMarkerRef.current.setLngLat({
      lng: livePosition[0],
      lat: livePosition[1],
    });
  }, [livePosition]);

  const tooFewArgs = !pickup || !destination;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface",
        !className?.includes("h-") && "h-56",
        className
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-success" />
        Live GPS tracking
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

      {failed === "load" && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-surface px-6 text-center">
          <div className="space-y-1">
            <Navigation className="mx-auto h-5 w-5 text-accent" />
            <p className="text-sm text-foreground">{pickup} → {destination}</p>
            <p className="text-xs text-muted-foreground">Map failed to load</p>
          </div>
        </div>
      )}

      {tooFewArgs && failed === "" && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-surface px-6 text-center">
          <p className="text-xs text-muted-foreground">Enter a pickup and destination</p>
        </div>
      )}
    </div>
  );
}
