import { docs, collections, getDocument, queryDocuments, createDocument, patchDocument } from "./db"
import { where, orderBy } from "firebase/firestore"
import { runTransaction } from "firebase/firestore"
import { db } from "./firestore"
import { haversineKm } from "./geo"
import type { LngLat } from "./geo"
import type {
  Ride,
  RideType,
  RideWithRelations,
  VehicleCategory,
  RideStatus,
  PaymentStatus,
  Client,
  Driver,
  EventItem,
} from "./types"

export interface CreateRideInput {
  clientId: string
  pickup: string
  destination: string
  scheduledAt: string | null
  vehicleCategory: VehicleCategory
  rideType: RideType
  budget: number
  passengers?: number
  eventId?: string | null
  pickupLat?: number | null
  pickupLng?: number | null
}

function toRide(data: Record<string, unknown>): Ride {
  return {
    id: data.id as string,
    client_id: (data.clientId as string) ?? null,
    driver_id: (data.driverId as string) ?? null,
    event_id: (data.eventId as string) ?? null,
    pickup: data.pickup as string,
    destination: data.destination as string,
    scheduled_at: (data.scheduledAt as string) ?? null,
    vehicle_category: data.vehicleCategory as VehicleCategory,
    ride_type: data.rideType as RideType,
    budget: data.budget as number,
    status: data.status as RideStatus,
    rejected_by: (data.rejectedBy as string[]) ?? [],
    verification_code: (data.verificationCode as string) ?? "",
    payment_status: (data.paymentStatus as PaymentStatus) ?? "unpaid",
    mpesa_receipt: (data.mpesaReceipt as string) ?? null,
    created_at: data.createdAt as string,
    pickup_lat: (data.pickupLat as number) ?? null,
    pickup_lng: (data.pickupLng as number) ?? null,
    passengers: (data.passengers as number) ?? 1,
  }
}

export function toClient(data: Record<string, unknown>): Client {
  return {
    id: data.id as string,
    name: data.name as string,
    phone: data.phone as string,
    email: data.email as string,
    avatar_url: (data.avatarUrl as string) ?? null,
    emergency_contact: (data.emergencyContact as string) ?? null,
    share_rides: data.shareRides as boolean,
    rating_avg: (data.ratingAvg as number) ?? null,
    rating_count: (data.ratingCount as number) ?? 0,
    created_at: data.createdAt as string,
  }
}

export function toDriver(data: Record<string, unknown>): Driver {
  return {
    id: data.id as string,
    name: data.name as string,
    phone: data.phone as string,
    avatar_url: (data.avatarUrl as string) ?? null,
    vehicle_type: data.vehicleType as string,
    seats: (data.seats as number) ?? 0,
    vehicle_image_url: (data.vehicleImageUrl as string) ?? null,
    plate_number: data.plateNumber as string,
    current_location: (data.currentLocation as string) ?? null,
    frequent_location: (data.frequentLocation as string) ?? null,
    vehicle_category: data.vehicleCategory as VehicleCategory,
    is_available: data.isAvailable as boolean,
    rating_avg: (data.ratingAvg as number) ?? null,
    rating_count: (data.ratingCount as number) ?? 0,
    license_front_url: (data.licenseFrontUrl as string) ?? null,
    license_back_url: (data.licenseBackUrl as string) ?? null,
    national_id_url: (data.nationalIdUrl as string) ?? null,
    documents_submitted:
      typeof data.documentsSubmitted === "boolean"
        ? data.documentsSubmitted
        : !!(data.licenseFrontUrl && data.licenseBackUrl && data.nationalIdUrl),
    lng: (data.lng as number) ?? null,
    lat: (data.lat as number) ?? null,
    last_ping_at: (data.lastPingAt as string) ?? null,
    created_at: data.createdAt as string,
  }
}

function toEventItem(data: Record<string, unknown>): EventItem {
  return {
    id: data.id as string,
    name: data.name as string,
    location: data.location as string,
    event_date: data.eventDate as string,
    estimated_budget: data.estimatedBudget as number,
    image_url: (data.imageUrl as string) ?? null,
    created_at: data.createdAt as string,
  }
}

async function populateRideRelations(
  raw: Record<string, unknown>[]
): Promise<RideWithRelations[]> {
  const clientIds = new Set<string>()
  const driverIds = new Set<string>()
  const eventIds = new Set<string>()

  for (const r of raw) {
    if (r.clientId) clientIds.add(r.clientId as string)
    if (r.driverId) driverIds.add(r.driverId as string)
    if (r.eventId) eventIds.add(r.eventId as string)
  }

  const [clients, drivers, events] = await Promise.all([
    Promise.all(
      Array.from(clientIds).map((id) =>
        getDocument<Record<string, unknown>>(docs.client(id))
      )
    ),
    Promise.all(
      Array.from(driverIds).map((id) =>
        getDocument<Record<string, unknown>>(docs.driver(id))
      )
    ),
    Promise.all(
      Array.from(eventIds).map((id) =>
        getDocument<Record<string, unknown>>(docs.event(id))
      )
    ),
  ])

  const clientMap = new Map(
    clients.filter(Boolean).map((c) => [c!.id, toClient(c!)])
  )
  const driverMap = new Map(
    drivers.filter(Boolean).map((d) => [d!.id, toDriver(d!)])
  )
  const eventMap = new Map(
    events.filter(Boolean).map((e) => [e!.id, toEventItem(e!)])
  )

  return raw.map((r) => {
    const ride = toRide(r) as RideWithRelations
    if (r.clientId) ride.client = clientMap.get(r.clientId as string) ?? null
    if (r.driverId) ride.driver = driverMap.get(r.driverId as string) ?? null
    if (r.eventId) ride.event = eventMap.get(r.eventId as string) ?? null
    return ride
  })
}

export async function createRide(input: CreateRideInput): Promise<Ride> {
  // 4-digit ride verification code — generated here so it's never empty and
  // the client can prove pickup by sharing it with the driver.
  const verificationCode = String(Math.floor(1000 + Math.random() * 9000))
  const data = {
    ...input,
    status: "requested",
    verificationCode,
    createdAt: new Date().toISOString(),
  }
  const id = await createDocument(collections.rides(), data)
  return toRide({ id, ...data })
}

export async function sendRideCodeWhatsApp(
  phone: string,
  code: string,
  pickup: string,
  destination: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_URL ?? process.env.VITE_FUNCTIONS_URL ?? ""
  // No external WhatsApp function configured — the code is still shown
  // in-app, so silently skip rather than throw on a bogus relative URL.
  if (!baseUrl) return
  const res = await fetch(`${baseUrl}/send-ride-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, pickup, destination }),
  })
  if (!res.ok) throw new Error(`send-ride-code failed: ${res.status}`)
}

export async function acceptRide(
  rideId: string,
  driverId: string
): Promise<boolean> {
  try {
    await runTransaction(db, async (transaction) => {
      const ref = docs.ride(rideId)
      const snap = await transaction.get(ref)
      if (!snap.exists()) throw new Error("not_found")
      const data = snap.data()
      if (data.status !== "requested" || data.driverId) {
        throw new Error("already_taken")
      }
      transaction.update(ref, { driverId, status: "accepted" })
    })
    return true
  } catch (err: unknown) {
    const e = err as { message?: string }
    if (e?.message === "not_found" || e?.message === "already_taken") return false
    throw err
  }
}

export async function rejectRide(
  rideId: string,
  driverId: string
): Promise<void> {
  const existing = await getDocument<Record<string, unknown>>(docs.ride(rideId))
  if (!existing) throw new Error("Ride not found")
  const rejected = new Set<string>((existing.rejectedBy as string[]) ?? [])
  rejected.add(driverId)
  await patchDocument(docs.ride(rideId), { rejectedBy: Array.from(rejected) })
}

export async function completeRide(rideId: string): Promise<void> {
  await patchDocument(docs.ride(rideId), { status: "completed" })
}

export async function startRideWithCode(
  rideId: string,
  code: string
): Promise<boolean> {
  try {
    await runTransaction(db, async (transaction) => {
      const ref = docs.ride(rideId)
      const snap = await transaction.get(ref)
      if (!snap.exists()) throw new Error("not_found")
      const data = snap.data()
      if (data.status !== "accepted" || data.verificationCode !== code.trim()) {
        throw new Error("wrong_code")
      }
      transaction.update(ref, { status: "in_progress" })
    })
    return true
  } catch (err: unknown) {
    const e = err as { message?: string }
    if (e?.message === "not_found" || e?.message === "wrong_code") return false
    throw err
  }
}

export async function cancelRide(rideId: string): Promise<void> {
  await patchDocument(docs.ride(rideId), { status: "cancelled" })
}

export async function fetchClientRides(
  clientId: string
): Promise<RideWithRelations[]> {
  const raw = await queryDocuments<Record<string, unknown>>(
    collections.rides(),
    where("clientId", "==", clientId),
    orderBy("createdAt", "desc")
  )
  return populateRideRelations(raw)
}

/**
 * Open ride requests auto-expire after this long if no driver claims them.
 * A sweeper on the driver dashboard cancels stale ones; the feed also drops
 * anything older than this so nobody accepts a dead request.
 */
export const REQUEST_TTL_SECONDS = 60

function isFutureScheduled(ride: Ride): boolean {
  if (!ride.scheduled_at) return false
  return new Date(ride.scheduled_at).getTime() > Date.now()
}

export async function fetchOpenRequests(
  driverId: string
): Promise<RideWithRelations[]> {
  // Driver position (live ping) used to rank incoming requests nearest-first.
  const driver = await getDocument<{
    lat?: number;
    lng?: number;
  }>(docs.driver(driverId)).catch(() => null);
  const driverPos =
    driver?.lat != null && driver?.lng != null
      ? ([driver.lng, driver.lat] as LngLat)
      : null;

  const raw = await queryDocuments<Record<string, unknown>>(
    collections.rides(),
    where("status", "==", "requested"),
    orderBy("createdAt", "desc")
  )
  const now = Date.now()
  const unclaimed = raw.filter((r) => !r.driverId)
  const rides = await populateRideRelations(unclaimed)
  // Instant feed only: exclude future-dated bookings (they go to the
  // "Scheduled pickups" queue) and requests that have already expired.
  const open = rides.filter((r) => {
    if ((r.rejected_by ?? []).includes(driverId)) return false
    if (isFutureScheduled(r)) return false
    return now - new Date(r.created_at).getTime() <= REQUEST_TTL_SECONDS * 1000
  })

  if (!driverPos) return open

  // Smart matching: rank rides by how far the pickup is from this driver,
  // and only surface requests within the dispatch radius.
  const MAX_RADIUS_KM = 40
  const withDist = open.flatMap((ride) => {
    if (ride.pickup_lat == null || ride.pickup_lng == null) return []
    const distanceKm = haversineKm(driverPos, [ride.pickup_lng, ride.pickup_lat])
    if (distanceKm > MAX_RADIUS_KM) return []
    ride.driver_distance_km = distanceKm
    ride.driver_eta_min = Math.max(1, Math.round(distanceKm * 3))
    return [ride]
  })
  return withDist.sort(
    (a, b) => (a.driver_distance_km ?? Infinity) - (b.driver_distance_km ?? Infinity)
  )
}

export async function fetchDriverRides(
  driverId: string
): Promise<RideWithRelations[]> {
  const raw = await queryDocuments<Record<string, unknown>>(
    collections.rides(),
    where("driverId", "==", driverId),
    orderBy("createdAt", "desc")
  )
  return populateRideRelations(raw)
}

/**
 * Future-dated ride requests available to a driver, sorted by soonest pickup.
 * Unlike the instant feed these don't expire — the client booked ahead and the
 * driver can accept whenever works. Only surfaced to available drivers.
 */
export async function fetchScheduledRequests(
  driverId: string
): Promise<RideWithRelations[]> {
  const raw = await queryDocuments<Record<string, unknown>>(
    collections.rides(),
    where("status", "==", "requested"),
    orderBy("createdAt", "desc")
  )
  const unclaimed = raw.filter((r) => !r.driverId)
  const rides = await populateRideRelations(unclaimed)
  const open = rides.filter(
    (r) =>
      isFutureScheduled(r) && !(r.rejected_by ?? []).includes(driverId)
  )
  return open.sort(
    (a, b) =>
      new Date(a.scheduled_at ?? 0).getTime() -
      new Date(b.scheduled_at ?? 0).getTime()
  )
}

/**
 * Expire a ride request that has been waiting too long. Only a ride still in
 * `requested` with no assigned driver can be expired, so a late accept can
 * never be silently dropped. Returns true when this call performed the expiry.
 */
export async function expireRideRequest(
  rideId: string
): Promise<boolean> {
  try {
    await runTransaction(db, async (transaction) => {
      const ref = docs.ride(rideId)
      const snap = await transaction.get(ref)
      if (!snap.exists()) throw new Error("not_found")
      const data = snap.data()
      if (data.status !== "requested" || data.driverId) {
        throw new Error("already_taken")
      }
      transaction.update(ref, { status: "cancelled", cancelledReason: "expired" })
    })
    return true
  } catch (err: unknown) {
    const e = err as { message?: string }
    if (e?.message === "not_found" || e?.message === "already_taken") return false
    throw err
  }
}
