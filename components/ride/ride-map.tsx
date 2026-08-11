"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Route as RouteIcon, Clock, KeyRound } from "lucide-react";
import { loadGoogleMaps, svgIcon } from "@/lib/google-maps";
import type { LngLat } from "@/lib/geo";
import { cn } from "@/lib/utils";

type Gmaps = any;

const NAIROBI: LngLat = [36.8219, -1.2921];

function pinSvg(color: string, label = "") {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
      <path fill="${color}" stroke="#ffffff" stroke-width="2.5" d="M17 1C8.7 1 2 7.7 2 16c0 11 15 28 15 28s15-17 15-28C32 7.7 25.3 1 17 1z"/>
      <circle cx="17" cy="16" r="7" fill="#ffffff"/>
      ${label ? `<text x="17" y="20" text-anchor="middle" font-size="10" font-weight="700" fill="${color}" font-family="system-ui">${label}</text>` : ""}
    </svg>`
  );
}

function carSvg() {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="19" fill="#E2B127" stroke="#fff" stroke-width="2"/>
      <path d="M13 26h14l-1.4-5H14.4L13 26zM14.5 20l1-3h9l1 3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="15" cy="26" r="2" fill="#fff"/><circle cx="25" cy="26" r="2" fill="#fff"/>
    </svg>`
  );
}

function blueDotSvg() {
  return svgIcon(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#38bdf8" fill-opacity="0.25"/>
      <circle cx="12" cy="12" r="5.5" fill="#1d4ed8" stroke="#ffffff" stroke-width="2"/>
    </svg>`
  );
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
  const mapRef = useRef<Gmaps>(null);
  const carMarkerRef = useRef<Gmaps>(null);
  const userMarkerRef = useRef<Gmaps>(null);
  const userCircleRef = useRef<Gmaps>(null);
  const [info, setInfo] = useState<{ km: number; min: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const orbit = { id: 0, paused: false };

    async function init() {
      let maps: Gmaps;
      try {
        maps = await loadGoogleMaps();
      } catch (err) {
        if (!cancelled)
          setFailed(
            (err as Error).message === "MISSING_GOOGLE_MAPS_KEY"
              ? "no-key"
              : "load"
          );
        return;
      }
      if (cancelled || !containerRef.current) return;

      const config = (await import("@/lib/google-maps")).getGoogleMapsConfig();

      const map = new maps.Map(containerRef.current, {
        center: { lat: NAIROBI[1], lng: NAIROBI[0] },
        zoom: 12,
        tilt: 55,
        heading: 0,
        mapId: config.mapId || undefined,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        clickableIcons: false,
        backgroundColor: "#050912",
      } as any);
      mapRef.current = map;
      busyRef.current = true;

      // Resolve pickup/destination to coordinates (most accurate via Geocoder).
      const geocoder = new maps.Geocoder();
      async function geocodeAddr(text: string) {
        return new Promise<{ lat: number; lng: number }>((resolve) => {
          if (!text) return resolve({ lat: NAIROBI[1], lng: NAIROBI[0] });
          geocoder.geocode({ address: text }, (res: any, status: any) => {
            if (status === "OK" && res?.[0]?.geometry?.location) {
              const loc = res[0].geometry.location;
              resolve({ lat: loc.lat(), lng: loc.lng() });
            } else {
              resolve({ lat: NAIROBI[1], lng: NAIROBI[0] });
            }
          });
        });
      }

      const [a, b] = await Promise.all([
        geocodeAddr(pickup),
        geocodeAddr(destination),
      ]);
      if (cancelled) return;

      new maps.Marker({
        map,
        position: { lat: a.lat, lng: a.lng },
        icon: {
          url: pinSvg("#38bdf8"),
          scaledSize: new maps.Size(26, 35),
          anchor: new maps.Point(13, 35),
        },
        title: pickup,
      });

      const destMarker = new maps.Marker({
        map,
        position: { lat: b.lat, lng: b.lng },
        icon: {
          url: pinSvg("#e11d48", "A"),
          scaledSize: new maps.Size(26, 35),
          anchor: new maps.Point(13, 35),
        },
        title: destination,
      });

      // Accurate road route + real distance/time.
      new maps.DirectionsService().route(
        {
          origin: { lat: a.lat, lng: a.lng },
          destination: { lat: b.lat, lng: b.lng },
          travelMode: maps.TravelMode.DRIVING,
        },
        (res: any, status: any) => {
          if (status !== "OK" || !res?.routes?.[0]) return;
          const leg = res.routes[0].legs[0];
          const renderer = new maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#00d4ff",
              strokeWeight: 6,
              strokeOpacity: 0.95,
            },
            routeIndex: 0,
          });
          renderer.setDirections(res);
          setInfo({
            km: leg?.distance?.value / 1000 || 0,
            min: (leg?.duration?.value || 0) / 60,
          });

          // Frame the whole trip, then tilt in 3D for short (city) trips.
          const path = res.routes[0].overview_path;
          if (path?.length) {
            const bounds = new maps.LatLngBounds();
            path.forEach((p: any) => bounds.extend(p));
            map.fitBounds(bounds, { padding: 56, maxZoom: 15 });
            const zoom = map.getZoom();
            if (zoom >= 12) {
              map.setTilt(55);
              map.setHeading(-20);
            }
          }
        }
      );

      // Car marker for the driver's live position (or the simulated one).
      const carMarker = new maps.Marker({
        map,
        position: { lat: a.lat, lng: a.lng },
        icon: {
          url: carSvg(),
          scaledSize: new maps.Size(40, 40),
          anchor: new maps.Point(20, 20),
        },
        zIndex: 1000,
      });
      carMarkerRef.current = carMarker;
      destMarker.setZIndex(900);

      // Device (rider) GPS — accurate, live blue dot + accuracy circle.
      const userMarker = new maps.Marker({
        map,
        position: { lat: a.lat, lng: a.lng },
        icon: {
          url: blueDotSvg(),
          scaledSize: new maps.Size(24, 24),
          anchor: new maps.Point(12, 12),
        },
        zIndex: 1100,
      });
      const userCircle = new maps.Circle({
        map,
        center: { lat: a.lat, lng: a.lng },
        radius: 60,
        fillColor: "#38bdf8",
        fillOpacity: 0.12,
        strokeColor: "#38bdf8",
        strokeOpacity: 0.3,
        strokeWeight: 1,
      });
      userMarkerRef.current = userMarker;
      userCircleRef.current = userCircle;

      let watchId: number | null = null;
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            userMarker.setPosition({ lat, lng });
            userCircle.setCenter({ lat, lng });
            userCircle.setRadius(pos.coords.accuracy || 40);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
        );
      }

      // Gentle 3D orbit — pauses while the user interacts with the map.
      orbit.paused = false;
      const stepOrbit = () => {
        if (!cancelled && !orbit.paused && mapRef.current) {
          const m = mapRef.current;
          const head = ((m.getHeading?.() ?? 0) + 0.08) % 360;
          if (m.getTilt?.() > 1) m.setHeading(head);
        }
        orbit.id = window.requestAnimationFrame(stepOrbit);
      };
      orbit.id = window.requestAnimationFrame(stepOrbit);
      let pauseTimer: ReturnType<typeof setTimeout> | null = null;
      const pause = () => {
        orbit.paused = true;
        if (pauseTimer) clearTimeout(pauseTimer);
        pauseTimer = setTimeout(() => (orbit.paused = false), 3500);
      };
      map.addListener("dragstart", pause);
      map.addListener("click", pause);

      setReady(true);
      busyRef.current = false;

      return () => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      };
    }

    init();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(orbit.id);
      mapRef.current?.setMap?.(null);
      mapRef.current = null;
      carMarkerRef.current = null;
    };
  }, [pickup, destination]);

  // Move the car marker to the driver's real position as they drive.
  useEffect(() => {
    if (!livePosition || !carMarkerRef.current) return;
    carMarkerRef.current.setPosition({
      lat: livePosition[1],
      lng: livePosition[0],
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

      {failed === "no-key" && (
        <div className="absolute inset-0 z-0 grid place-items-center bg-surface px-6 text-center">
          <div className="space-y-2">
            <KeyRound className="mx-auto h-5 w-5 text-warning" />
            <p className="text-sm font-semibold text-foreground">
              Google Maps needs an API key
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Set <code className="text-accent">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in
              your <code className="text-accent">.env.local</code> to enable live tracking.
            </p>
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
