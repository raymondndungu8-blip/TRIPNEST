import type { VehicleCategory } from "./types";

/** A geographic point in {lat, lng} form. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Per-tier fare constants, all amounts in KES. */
export interface TierRate {
  /** Flat base fare charged on every trip. */
  base: number;
  /** Price per kilometre travelled. */
  perKm: number;
  /** Price per minute of trip duration. */
  perMin: number;
  /** Minimum fare — the raw fare is never allowed below this. */
  min: number;
}

/**
 * Fare model per vehicle tier (KES).
 * Based on Nov-2025 mandated Uber/Bolt Kenya rate research.
 */
export const TIER_PRICING: Record<VehicleCategory, TierRate> = {
  standard: { base: 120, perKm: 38, perMin: 4, min: 300 },
  xl: { base: 200, perKm: 60, perMin: 6, min: 500 },
  premium: { base: 300, perKm: 85, perMin: 9, min: 800 },
};

/** Road-distance multiplier applied to great-circle distance. */
const ROAD_FACTOR = 1.4;
/** Assumed average speeds (km/h) used to estimate trip duration. */
const AVG_SPEED_PEAK = 15;
const AVG_SPEED_OFFPEAK = 20;
/** Earth radius in kilometres. */
const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two {lat,lng} points, in kilometres. */
function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Rounds a number to the nearest multiple of 10. */
function roundToNearest10(n: number): number {
  return Math.round(n / 10) * 10;
}

/** Result of a trip estimate: road distance and estimated duration. */
export interface TripEstimate {
  distanceKm: number;
  durationMin: number;
}

/**
 * Estimate the road distance and duration between two points.
 * Uses haversine distance scaled by a road factor, and a fixed average
 * speed (lower during peak hours) to derive duration.
 */
export function estimateTrip(
  pickup: LatLng,
  dropoff: LatLng,
  opts?: { peak?: boolean }
): TripEstimate {
  const distanceKm = haversineKm(pickup, dropoff) * ROAD_FACTOR;
  const avgSpeed = opts?.peak ? AVG_SPEED_PEAK : AVG_SPEED_OFFPEAK;
  const durationMin = avgSpeed > 0 ? (distanceKm / avgSpeed) * 60 : 0;
  return { distanceKm, durationMin };
}

/**
 * Compute the fare for a tier given distance and duration.
 * Applies base + distance + time, enforces the tier minimum, applies the
 * surge multiplier, then rounds the final amount to the nearest 10 KES.
 */
export function computeFare(
  category: VehicleCategory,
  distanceKm: number,
  durationMin: number,
  surge = 1.0
): number {
  const rate = TIER_PRICING[category];
  const rawFare =
    rate.base + rate.perKm * distanceKm + rate.perMin * durationMin;
  const fare = Math.max(rawFare, rate.min);
  return roundToNearest10(fare * surge);
}

/**
 * Convenience helper: estimate the trip then compute the fare for a tier.
 */
export function estimateFare(
  category: VehicleCategory,
  pickup: LatLng,
  dropoff: LatLng,
  opts?: { peak?: boolean; surge?: number }
): number {
  const { distanceKm, durationMin } = estimateTrip(pickup, dropoff, opts);
  return computeFare(category, distanceKm, durationMin, opts?.surge);
}

/**
 * Format an amount as Kenyan Shillings, e.g. `formatKes(1330) === "KES 1,330"`.
 * No decimal places; thousands separated by commas.
 */
export function formatKes(amount: number): string {
  const rounded = Math.round(amount);
  return `KES ${rounded.toLocaleString("en-KE")}`;
}

/**
 * Rough pickup ETA (minutes) for driver arrival display.
 * Defaults to a small base plus a factor of distance when provided.
 */
export function estimateEtaMinutes(distanceKm?: number): number {
  const base = 3;
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    return base;
  }
  return Math.max(1, Math.round(base + distanceKm * 0.8));
}
