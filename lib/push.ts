import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"
import { db } from "./firestore"

export const PUSH_COLLECTION = "pushSubscriptions"

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
}

export interface StoredPushSubscription {
  userId: string
  role: "client" | "driver"
  subscription: PushSubscriptionJSON
  updatedAt: string
}

export async function isPushSupported(): Promise<boolean> {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export async function hasPushPermission(): Promise<NotificationPermission> {
  return Notification.permission
}

/**
 * Ask for permission and subscribe the current device, then persist the
 * subscription in Firestore under `pushSubscriptions/{userId}` so the server
 * can reach it. Returns true on success.
 */
export async function subscribeToPush(
  userId: string,
  role: "client" | "driver"
): Promise<boolean> {
  if (!(await isPushSupported())) return false

  const registration = await navigator.serviceWorker.ready
  const publicKey = getVapidPublicKey()
  if (!publicKey) return false

  await Notification.requestPermission()

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast needed: DOMPushManager types want ArrayBufferView<ArrayBuffer>;
      // urlBase64ToUint8Array returns Uint8Array<ArrayBufferLike>.
      applicationServerKey: urlBase64ToUint8Array(
        publicKey
      ) as unknown as BufferSource,
    })
  }

  const stored: StoredPushSubscription = {
    userId,
    role,
    subscription: subscription.toJSON(),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(db, PUSH_COLLECTION, userId), stored, { merge: true })
  return true
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!(await isPushSupported())) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()
  await deleteDoc(doc(db, PUSH_COLLECTION, userId)).catch(() => undefined)
}

export async function getStoredPushSubscription(
  userId: string
): Promise<StoredPushSubscription | null> {
  const snap = await getDoc(doc(db, PUSH_COLLECTION, userId))
  return snap.exists() ? (snap.data() as StoredPushSubscription) : null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}