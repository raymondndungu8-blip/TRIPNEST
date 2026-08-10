import webpush, { type PushSubscription } from "web-push"

// Public key is fine to read from env (it ships to browsers as the application
// server key). The private key MUST come from the environment — never hardcode.
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ""

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:raymondndungu8@gmail.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

/** Number of times we retry a dead push subscription before pruning it. */
const MAX_CONSTANT_FAILURES = 2

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

/**
 * Deliver a push notification to a single stored subscription.
 * Returns a status string for the caller (e.g. "sent" | "gone" | "failed").
 */
export async function sendPushToSubscription(
  sub: PushSubscription,
  payload: PushPayload,
  failures = 0
): Promise<"sent" | "gone" | "failed"> {
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
        icon: payload.icon ?? "/pwa/icon-192",
      }),
      { TTL: 86400 }
    )
    return "sent"
  } catch (err) {
    const anyErr = err as { statusCode?: number }
    const unauthGone = [404, 410]
    const invalid = [400, 401, 403]
    if (unauthGone.includes(anyErr.statusCode ?? 0)) return "gone"
    if (invalid.includes(anyErr.statusCode ?? 0) || failures >= MAX_CONSTANT_FAILURES) {
      return "failed"
    }
    // Transient (429, 500) — let the caller decide to retry.
    return "failed"
  }
}

export { webpush }
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}