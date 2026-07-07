export type LngLat = [number, number];

/** Common Kenyan places — instant, reliable geocoding for the demo. */
const KNOWN: { match: string; coord: LngLat }[] = [
  { match: "jkia", coord: [36.9278, -1.3192] },
  { match: "jomo kenyatta", coord: [36.9278, -1.3192] },
  { match: "westlands", coord: [36.8108, -1.2649] },
  { match: "cbd", coord: [36.8219, -1.2864] },
  { match: "nairobi", coord: [36.8219, -1.2921] },
  { match: "karen", coord: [36.7062, -1.3194] },
  { match: "kilimani", coord: [36.7836, -1.2906] },
  { match: "thika", coord: [37.0693, -1.0333] },
  { match: "mombasa", coord: [39.6682, -4.0435] },
  { match: "diani", coord: [39.5762, -4.2767] },
  { match: "nakuru", coord: [36.0667, -0.3031] },
  { match: "kisumu", coord: [34.7617, -0.0917] },
  { match: "eldoret", coord: [35.2698, 0.5143] },
];

const NAIROBI: LngLat = [36.8219, -1.2921];

/** Geocode free text to [lng, lat]. Tries known places, then Nominatim, then a Nairobi fallback. */
export async function geocode(query: string): Promise<LngLat> {
  const q = query.trim().toLowerCase();
  if (!q) return NAIROBI;

  const known = KNOWN.find((k) => q.includes(k.match));
  if (known) return known.coord;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ke&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = (await res.json()) as { lon: string; lat: string }[];
    if (data?.[0]) return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  } catch {
    // ignore and fall through
  }
  return NAIROBI;
}

export function haversineKm(a: LngLat, b: LngLat): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface RouteResult {
  coordinates: LngLat[];
  distanceKm: number;
  durationMin: number;
}

/** Road route via the public OSRM server, with a straight-line fallback. */
export async function getRoute(a: LngLat, b: LngLat): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (route?.geometry?.coordinates?.length) {
      return {
        coordinates: route.geometry.coordinates as LngLat[],
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      };
    }
  } catch {
    // ignore and fall back
  }
  const distanceKm = haversineKm(a, b);
  return {
    coordinates: [a, b],
    distanceKm,
    durationMin: (distanceKm / 32) * 60, // ~32 km/h average city speed
  };
}

/**
 * Get the device's current position via the browser Geolocation API.
 * Resolves to `{ lat, lng }`; rejects with a clear Error if geolocation is
 * unsupported, denied, or times out.
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Please allow location access.",
          2: "Your location is currently unavailable.",
          3: "Timed out while getting your location.",
        };
        reject(new Error(messages[err.code] ?? "Unable to get your location."));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Reverse-geocode coordinates to a human-readable address using Nominatim
 * (same provider as `geocode`). Falls back to a "lat, lng" string when no
 * address is returned or the request fails.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = (await res.json()) as { display_name?: string };
    if (data?.display_name) return data.display_name;
  } catch {
    // ignore and fall through
  }
  return fallback;
}

/**
 * Get the current position and its human-readable label in one call.
 */
export async function getCurrentLocationLabel(): Promise<{
  coords: { lat: number; lng: number };
  label: string;
}> {
  const coords = await getCurrentPosition();
  const label = await reverseGeocode(coords.lat, coords.lng);
  return { coords, label };
}
