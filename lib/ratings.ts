import {
  collection,
  doc,
  setDoc,
  getDoc,
  runTransaction,
  query,
  where,
  getDocs,
} from "firebase/firestore"
import { db } from "./firestore"

export const RATINGS_COLLECTION = "ratings"

export interface Rating {
  id: string
  rideId: string
  raterId: string
  /** The user being rated (driver or client uid). */
  targetId: string
  targetRole: "driver" | "client"
  stars: number
  comment: string
  createdAt: string
}

function ratingKey(rideId: string, raterId: string): string {
  return `${rideId}__${raterId}`
}

export async function getRating(
  rideId: string,
  raterId: string
): Promise<Rating | null> {
  const snap = await getDoc(doc(db, RATINGS_COLLECTION, ratingKey(rideId, raterId)))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Rating) : null
}

/**
 * Submit a rating for a completed ride. Stored once per ride+rater (idempotent
 * — a second call updates the existing one). Aggregates are recomputed and
 * written onto the target user's profile in the same batch.
 */
export async function submitRating(input: {
  rideId: string
  raterId: string
  targetId: string
  targetRole: "driver" | "client"
  stars: number
  comment?: string
}): Promise<void> {
  const stars = Math.min(5, Math.max(1, Math.round(input.stars)))
  const key = ratingKey(input.rideId, input.raterId)
  const ratingRef = doc(db, RATINGS_COLLECTION, key)
  const targetRef = doc(db, input.targetRole === "driver" ? "drivers" : "clients", input.targetId)
  const created = new Date().toISOString()

  await runTransaction(db, async (transaction) => {
    const ratingSnap = await transaction.get(ratingRef)
    const targetSnap = await transaction.get(targetRef)
    if (!targetSnap.exists()) throw new Error("target_not_found")

    const target = targetSnap.data()
    const oldStars = ratingSnap.exists() ? (ratingSnap.data().stars as number) : null
    const prevCount = (target.ratingCount as number) ?? 0
    const prevAvg = (target.ratingAvg as number) ?? 0

    let newAvg: number
    let newCount: number
    if (oldStars == null) {
      newCount = prevCount + 1
      newAvg = prevCount === 0 ? stars : (prevAvg * prevCount + stars) / newCount
    } else {
      newCount = prevCount
      newAvg = prevCount === 0 ? stars : prevAvg + (stars - oldStars) / prevCount
    }

    transaction.set(ratingRef, {
      rideId: input.rideId,
      raterId: input.raterId,
      targetId: input.targetId,
      targetRole: input.targetRole,
      stars,
      comment: (input.comment ?? "").trim().slice(0, 500),
      createdAt: created,
    })
    transaction.update(targetRef, {
      ratingAvg: Math.round(newAvg * 10) / 10,
      ratingCount: newCount,
    })
  })
}

/** Loads all ratings given by a rater (e.g. to show what they rated). */
export async function fetchRatingsByRater(
  raterId: string
): Promise<Rating[]> {
  const q = query(
    collection(db, RATINGS_COLLECTION),
    where("raterId", "==", raterId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Rating)
}