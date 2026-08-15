// Google Maps JavaScript API loader.
// Reads the API key (REQUIRED) and Map ID (optional, enables true 3D buildings)
// from env. The script is injected once and cached so every map shares it.

let cachePromise: Promise<any> | null = null;

export interface GoogleMapsConfig {
  key: string;
  mapId: string;
}

export function getGoogleMapsConfig(): GoogleMapsConfig {
  return {
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "",
    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "",
  };
}

/**
 * Load the Google Maps JS API and resolve with the `google.maps` namespace.
 * Rejects with a descriptive Error when there is no API key or the script fails.
 */
export function loadGoogleMaps(
  libraries = "places,geometry"
): Promise<any> {
  if (cachePromise) return cachePromise;

  if (typeof window === "undefined") {
    return Promise.reject(new Error("client-only"));
  }

  const { key } = getGoogleMapsConfig();
  if (!key) {
    return Promise.reject(new Error("MISSING_GOOGLE_MAPS_KEY"));
  }

  const global = window as any;
  if (global.google?.maps) {
    cachePromise = Promise.resolve(global.google.maps);
    return cachePromise;
  }

  cachePromise = new Promise((resolve, reject) => {
    global.__gmapsReady = () => {
      try {
        resolve(global.google.maps);
      } catch (err) {
        reject(err);
      }
    };
    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&libraries=${libraries}&v=beta&loading=async&callback=__gmapsReady`;
    script.async = true;
    script.defer = true;
    script.dataset.gmaps = "1";
    script.onerror = () => reject(new Error("GOOGLE_MAPS_LOAD_FAILED"));
    document.head.appendChild(script);
  });

  return cachePromise;
}

/** Build a `data:` URL for an inline SVG used as a Google Marker icon. */
export function svgIcon(svg: string): string {
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
