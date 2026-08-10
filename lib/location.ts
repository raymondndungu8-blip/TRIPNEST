import { docs, patchDocument } from "./db"
import type { LngLat } from "./geo"

/**
 * Maximum age in ms for a driver's last ping to still count as "live" when
 * the client is drawing them on the map.
 */
export const POSITION_TTL_MS = 60_000

export interface LivePosition {
  lng: number
  lat: number
  timestamp: number
}

/**
 * Start publishing the driver's real GPS position to their Firestore doc
 * while they're online. Returns a stop function. Throttled to one write per
 * interval, and only when online.
 */
export function startLivePositionPublishing(driverId: string): {
  stop: () => void
} {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { stop: () => undefined }
  }

  let lastPublished = 0
  const MIN_INTERVAL = 10_000 // no more than one write / 10s
  let watchId: number | null = null

  async function publish(pos: GeolocationPosition) {
    const now = Date.now()
    if (now - lastPublished < MIN_INTERVAL) return
    lastPublished = now

    const lng = pos.coords.longitude
    const lat = pos.coords.latitude
    const payload = {
      lng,
      lat,
      lastPingAt: new Date(now).toISOString(),
    }
    try {
      await patchDocument(docs.driver(driverId), payload)
    } catch (err) {
      // Firestore rate limits / transient network issues are non-fatal:
      // the next ping will retry.
      console.warn("[gps] publish failed", err)
    }
  }

  watchId = navigator.geolocation.watchPosition(
    publish,
    (err) => console.warn("[gps] watch error", err.code, err.message),
    { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
  )

  return {
    stop: () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    },
  }
}

/**
 * Whether a stored position should be treated as live (recent ping).
 */
export function isPositionFresh(pos: { lat: number; lng: number } | null | undefined, lastPingAt: string | null | undefined): boolean {
  if (!pos || pos.lat == null || pos.lng == null) return false
  if (!lastPingAt) return false
  return Date.now() - new Date(lastPingAt).getTime() < POSITION_TTL_MS
}

/** Convert a live position pair to the [lng, lat] format literals in geo.ts. */
export function toLngLat(pos: { lat: number; lng: number }): LngLat {
  return [pos.lng, pos.lat]
}

/** One-shot snapshot of the current device position (for "use my location"). */
export function getCurrentPositionOnce(): Promise<LivePosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          timestamp: pos.timestamp,
        }),
      (err) => reject(new Error(`geo:${err.code}`)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    )
  })
}