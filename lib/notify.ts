import { auth } from "./firebase"
import { queryDocuments, collections } from "./db"
import type { Driver, VehicleCategory } from "./types"

export interface NotifyParams {
  targetUserId: string
  title: string
  body: string
  url?: string
}

/**
 * Ask the server to deliver a push notification to a user. The server reads
 * the recipient's push subscription from Firestore via Admin, so callers can
 * only request notifications for users they legitimately interact with.
 * Returns true if the notification was queued for at least one device.
 */
export async function notifyUser(params: NotifyParams): Promise<boolean> {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (!token) return false

    const res = await fetch("/api/push/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (body?.error) console.warn("[notify]", body.error)
      return false
    }
    const data = await res.json()
    return Boolean(data?.delivered)
  } catch (err) {
    console.warn("[notify] failed", err)
    return false
  }
}

/**
 * Notify all currently available drivers (optionally filtered by vehicle
 * category) about a new ride request.
 */
export async function notifyAvailableDrivers(
  params: Omit<NotifyParams, "targetUserId">,
  category?: VehicleCategory
): Promise<number> {
  try {
    const candidates = await queryDocuments<Record<string, unknown>>(
      collections.drivers()
    )
    let matched = 0
    for (const d of candidates) {
      if (!d.userId) continue
      if (!d.isAvailable) continue
      if (category && d.vehicleCategory !== category) continue
      try {
        const ok = await notifyUser({
          targetUserId: d.userId as string,
          ...params,
        })
        if (ok) matched++
      } catch {
        /* keep going */
      }
    }
    return matched
  } catch (err) {
    console.warn("[notify] notifyAvailableDrivers failed", err)
    return 0
  }
}