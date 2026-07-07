import { supabase } from "./supabase";
import type {
  Ride,
  RideType,
  RideWithRelations,
  VehicleCategory,
} from "./types";

const RIDE_SELECT =
  "*, client:clients(*), driver:drivers(*), event:events(*)";

export interface CreateRideInput {
  client_id: string;
  pickup: string;
  destination: string;
  scheduled_at: string | null;
  vehicle_category: VehicleCategory;
  ride_type: RideType;
  budget: number;
  event_id?: string | null;
}

export async function createRide(input: CreateRideInput): Promise<Ride> {
  const { data, error } = await supabase
    .from("rides")
    .insert({ ...input, status: "requested" })
    .select()
    .single();
  if (error) throw error;
  return data as Ride;
}

export async function sendRideCodeWhatsApp(
  phone: string,
  code: string,
  pickup: string,
  destination: string
): Promise<void> {
  await supabase.functions.invoke("send-ride-code", {
    body: { phone, code, pickup, destination },
  });
}

/**
 * Accept a ride. Guards against two drivers grabbing the same request:
 * the update only succeeds while the ride is still `requested` with no driver.
 * Returns false if another driver got there first.
 */
export async function acceptRide(
  rideId: string,
  driverId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("rides")
    .update({ driver_id: driverId, status: "accepted" })
    .eq("id", rideId)
    .eq("status", "requested")
    .is("driver_id", null)
    .select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Reject a ride for this driver. The request stays `requested` so it can
 * move on to another available driver; we just record who passed.
 */
export async function rejectRide(
  rideId: string,
  driverId: string
): Promise<void> {
  const { data: existing, error: readErr } = await supabase
    .from("rides")
    .select("rejected_by")
    .eq("id", rideId)
    .single();
  if (readErr) throw readErr;
  const rejected = new Set<string>(existing?.rejected_by ?? []);
  rejected.add(driverId);
  const { error } = await supabase
    .from("rides")
    .update({ rejected_by: Array.from(rejected) })
    .eq("id", rideId);
  if (error) throw error;
}

export async function completeRide(rideId: string): Promise<void> {
  const { error } = await supabase
    .from("rides")
    .update({ status: "completed" })
    .eq("id", rideId);
  if (error) throw error;
}

/**
 * Start a ride: the driver enters the client's verification code at pickup.
 * Atomic — succeeds (true) only if the ride is still `accepted` AND the code
 * matches. Moves the ride to `in_progress`. Returns false for a wrong code.
 */
export async function startRideWithCode(
  rideId: string,
  code: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("rides")
    .update({ status: "in_progress" })
    .eq("id", rideId)
    .eq("status", "accepted")
    .eq("verification_code", code.trim())
    .select();
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function cancelRide(rideId: string): Promise<void> {
  const { error } = await supabase
    .from("rides")
    .update({ status: "cancelled" })
    .eq("id", rideId);
  if (error) throw error;
}

export async function fetchClientRides(
  clientId: string
): Promise<RideWithRelations[]> {
  const { data, error } = await supabase
    .from("rides")
    .select(RIDE_SELECT)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RideWithRelations[];
}

/** Open requests an available driver can act on (not yet taken, not rejected by them). */
export async function fetchOpenRequests(
  driverId: string
): Promise<RideWithRelations[]> {
  const { data, error } = await supabase
    .from("rides")
    .select(RIDE_SELECT)
    .eq("status", "requested")
    .is("driver_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RideWithRelations[]).filter(
    (r) => !(r.rejected_by ?? []).includes(driverId)
  );
}

/** Rides this driver has accepted / completed. */
export async function fetchDriverRides(
  driverId: string
): Promise<RideWithRelations[]> {
  const { data, error } = await supabase
    .from("rides")
    .select(RIDE_SELECT)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RideWithRelations[];
}
