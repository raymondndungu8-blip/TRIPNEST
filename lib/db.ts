import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type FirestoreError,
} from "firebase/firestore"
import { db } from "./firestore"

export type { FirestoreError }

export { Timestamp, where, orderBy, limit, getDocs, query }

// ── Collection references ──────────────────────────────────────

export const collections = {
  clients: () => collection(db, "clients"),
  drivers: () => collection(db, "drivers"),
  rides: () => collection(db, "rides"),
  events: () => collection(db, "events"),
  messages: () => collection(db, "messages"),
  favorites: () => collection(db, "favorites"),
  blockedIps: () => collection(db, "blockedIps"),
  auditLogs: () => collection(db, "auditLogs"),
}

// ── Document references ────────────────────────────────────────

export const docs = {
  client: (id: string) => doc(db, "clients", id),
  driver: (id: string) => doc(db, "drivers", id),
  ride: (id: string) => doc(db, "rides", id),
  event: (id: string) => doc(db, "events", id),
  message: (id: string) => doc(db, "messages", id),
  favorite: (id: string) => doc(db, "favorites", id),
  blockedIp: (ip: string) => doc(db, "blockedIps", ip),
  auditLog: (id: string) => doc(db, "auditLogs", id),
}

// ── CRUD helpers ────────────────────────────────────────────────

export async function getDocument<T = DocumentData>(
  ref: ReturnType<typeof doc>
): Promise<T | null> {
  const snap = await getDoc(ref)
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null
}

export async function queryDocuments<T = DocumentData>(
  collectionRef: ReturnType<typeof collection>,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const q = query(collectionRef, ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T))
}

export async function createDocument<T extends DocumentData>(
  collectionRef: ReturnType<typeof collection>,
  data: T
): Promise<string> {
  const ref = await addDoc(collectionRef, data)
  return ref.id
}

export async function setDocument<T extends DocumentData>(
  ref: ReturnType<typeof doc>,
  data: T
): Promise<void> {
  await setDoc(ref, data)
}

export async function patchDocument<T extends DocumentData>(
  ref: ReturnType<typeof doc>,
  data: Partial<T>
): Promise<void> {
  await updateDoc(ref, data as DocumentData)
}

export async function removeDocument(
  ref: ReturnType<typeof doc>
): Promise<void> {
  await deleteDoc(ref)
}

export function subscribeQuery<T = DocumentData>(
  collectionRef: ReturnType<typeof collection>,
  constraints: QueryConstraint[],
  onNext: (items: T[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(collectionRef, ...constraints)
  const unsub = onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T))
      onNext(items)
    },
    onError
  )
  return unsub
}
