import type { User } from "firebase/auth"
import { getDocument, docs, setDocument } from "./db"
import { toClient } from "./rides"
import type { Client } from "./types"

/**
 * Guarantees a client profile exists for an authenticated user. If a profile
 * document already exists it is returned untouched; otherwise a minimal one is
 * created from whatever the auth provider gave us (Google name/email/photo).
 *
 * This powers "sign in ⇒ straight to the dashboard": every authenticated user
 * without a driver account is treated as a client automatically.
 */
export async function ensureClientProfile(u: User): Promise<Client> {
  const existing = await getDocument<Record<string, unknown>>(docs.client(u.uid))
  if (existing) return toClient({ id: u.uid, ...existing })

  const createdAt = new Date().toISOString()
  const raw: Record<string, unknown> = {
    userId: u.uid,
    name: u.displayName || u.email?.split("@")[0] || "TripNest User",
    phone: u.phoneNumber || "",
    email: (u.email ?? "").toLowerCase(),
    avatarUrl: u.photoURL || null,
    emergencyContact: null,
    mpesaPhone: null,
    cardReady: false,
    shareRides: false,
    ratingAvg: null,
    ratingCount: 0,
    createdAt,
  }

  await setDocument(docs.client(u.uid), raw, { merge: true })
  return toClient({ id: u.uid, ...raw })
}