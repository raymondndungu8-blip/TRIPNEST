import type { RideType, VehicleCategory } from "./types";
import { collections, queryDocuments, where } from "./db";

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
 * Flat-rate fare table (KES) — the price the client is quoted for a ride,
 * regardless of distance. Private is a solo ride; cost sharing splits the
 * trip between riders, so it is priced lower.
 */
export const FLAT_RIDE_RATES: Record<
  RideType,
  Record<VehicleCategory, number>
> = {
  private: { standard: 1500, xl: 2500, premium: 4000 },
  cost_sharing: { standard: 900, xl: 1500, premium: 2400 },
};

/**
 * The flat rate for a ride given the vehicle tier and ride type. Used to quote
 * an upfront price (events, airport) instead of asking the client for a budget.
 */
export function flatRate(
  category: VehicleCategory,
  rideType: RideType
): number {
  return FLAT_RIDE_RATES[rideType]?.[category] ?? FLAT_RIDE_RATES.private[category];
}

/** Max passengers a vehicle category can carry. */
export const VEHICLE_SEATS: Record<VehicleCategory, number> = {
  standard: 4,
  xl: 6,
  premium: 8,
};

/**
 * How much EACH rider pays on a cost-sharing ride. The total fare stays the
 * same (the driver receives `flatRate`); it is simply split evenly across the
 * group. Private rides are always charged as a single person.
 */
export function perPersonFare(
  category: VehicleCategory,
  rideType: RideType,
  passengers: number
): number {
  const total = flatRate(category, rideType);
  if (rideType !== "cost_sharing") return total;
  const n = Math.max(1, Math.min(passengers, VEHICLE_SEATS[category]));
  return Math.ceil(total / n / 10) * 10;
}

/**
 * Calculate the client-facing fare from a resolved road estimate.
 * Returns null until a destination route has been calculated, so the UI never
 * shows a placeholder fare before the rider enters a destination.
 */
export function perPersonFareFromEstimate(
  category: VehicleCategory,
  rideType: RideType,
  passengers: number,
  estimate: TripEstimate | null
): number | null {
  if (!estimate) return null;

  const total = computeFare(category, estimate.distanceKm, estimate.durationMin);
  if (rideType !== "cost_sharing") return total;

  const n = Math.max(1, Math.min(passengers, VEHICLE_SEATS[category]));
  return Math.ceil(total / n / 10) * 10;
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

/**
 * Demand-driven surge pricing.
 *
 * Compares the number of open (unclaimed) requests in a category against the
 * available online drivers supplying it. When requests outnumber drivers,
 * a surge multiplier between 1.0x and 1.8x is applied so fares reflect demand
 * (closest-driver matching stays fair). Results are cached briefly so the
 * estimate flow doesn't hammer Firestore on every keystroke.
 */
const SURGE_CACHE_TTL_MS = 120_000;
const MAX_SURGE = 1.8;
let surgeCache: { key: string; multiplier: number; at: number } | null = null;

export async function getSurgeMultiplier(
  category: VehicleCategory
): Promise<number> {
  const now = Date.now();
  if (
    surgeCache &&
    surgeCache.key === category &&
    now - surgeCache.at < SURGE_CACHE_TTL_MS
  ) {
    return surgeCache.multiplier;
  }
  try {
    const [openRides, available] = await Promise.all([
      queryDocuments<{ driverId?: string | null }>(
        collections.rides(),
        where("status", "==", "requested"),
        where("vehicleCategory", "==", category)
      ),
      queryDocuments(
        collections.drivers(),
        where("isAvailable", "==", true),
        where("vehicleCategory", "==", category)
      ),
    ]);
    const demand = openRides.filter((r) => !r.driverId).length;
    const supply = Math.max(1, available.length);
    const multiplier = Math.min(MAX_SURGE, 1 + (demand / supply) * 0.2);
    surgeCache = { key: category, multiplier, at: now };
    return multiplier;
  } catch {
    surgeCache = { key: category, multiplier: 1, at: now };
    return 1;
  }
}
