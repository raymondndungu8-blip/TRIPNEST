import { docs, collections, getDocument, queryDocuments, createDocument, patchDocument } from "./db"
import { where, orderBy } from "firebase/firestore"
import { runTransaction } from "firebase/firestore"
import { db } from "./firestore"
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
  eventId?: string | null
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
  }
}

function toClient(data: Record<string, unknown>): Client {
  return {
    id: data.id as string,
    name: data.name as string,
    phone: data.phone as string,
    email: data.email as string,
    avatar_url: (data.avatarUrl as string) ?? null,
    emergency_contact: (data.emergencyContact as string) ?? null,
    share_rides: data.shareRides as boolean,
    created_at: data.createdAt as string,
  }
}

function toDriver(data: Record<string, unknown>): Driver {
  return {
    id: data.id as string,
    name: data.name as string,
    phone: data.phone as string,
    vehicle_type: data.vehicleType as string,
    plate_number: data.plateNumber as string,
    current_location: (data.currentLocation as string) ?? null,
    frequent_location: (data.frequentLocation as string) ?? null,
    vehicle_category: data.vehicleCategory as VehicleCategory,
    is_available: data.isAvailable as boolean,
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
  const data = { ...input, status: "requested", createdAt: new Date().toISOString() }
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

export async function fetchOpenRequests(
  driverId: string
): Promise<RideWithRelations[]> {
  const raw = await queryDocuments<Record<string, unknown>>(
    collections.rides(),
    where("status", "==", "requested"),
    orderBy("createdAt", "desc")
  )
  const unclaimed = raw.filter((r) => !r.driverId)
  const rides = await populateRideRelations(unclaimed)
  return rides.filter((r) => !(r.rejected_by ?? []).includes(driverId))
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
