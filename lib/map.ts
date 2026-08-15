import type { LngLat } from "./geo";

/**
 * MapLibre GL helpers used by the TripNest maps. The project renders with
 * free CARTO/OpenStreetMap tiles so maps work WITHOUT a Google Maps API key.
 * No billing, no key, no 403s — just an inline raster style.
 */

export interface MapStyleSpec {
  version: 8;
  sources: Record<string, unknown>;
  layers: Record<string, unknown>[];
}

/** Dark raster basemap (CARTO dark_matter tiles) that matches the app theme. */
export const MAP_STYLE: MapStyleSpec = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "carto-basemap",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

export interface Bounds {
  lng: [number, number];
  lat: [number, number];
}

/** Bounding box covering a list of [lng, lat] points. */
export function boundsOf(points: LngLat[]): Bounds | null {
  if (points.length === 0) return null;
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  if (minLng === maxLng && minLat === maxLat) return null;
  return { lng: [minLng, maxLng], lat: [minLat, maxLat] };
}

/** Build a DOM element that renders an SVG data-URL as a map marker icon. */
export function markerEl(svgDataUrl: string, size: number): HTMLElement {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundImage = `url(${svgDataUrl})`;
  el.style.backgroundSize = "contain";
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = "center";
  el.style.pointerEvents = "auto";
  return el;
}
