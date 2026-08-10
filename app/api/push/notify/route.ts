import { NextResponse } from "next/server"
import {
  isAdminConfigured,
  readPushSubscription,
  verifyIdToken,
} from "@/lib/server/firebase-rest"
import { sendPushToSubscription } from "@/lib/server/webpush"

export const runtime = "nodejs"

interface NotifyBody {
  targetUserId: string
  title: string
  body: string
  url?: string
}

/**
 * POST /api/push/notify
 * Deliver a web push notification to a user's device(s).
 *
 * The caller must present a valid Firebase ID token (`Authorization: Bearer`).
 * The recipient's push subscription is read server-side via Firestore Admin,
 * so a sender can never guess/manipulate another user's subscription.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    const idToken = authHeader.replace(/^Bearer\s+/i, "")
    if (!idToken) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 })
    }

    const verified = await verifyIdToken(idToken)
    if (!verified?.uid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = (await request.json()) as NotifyBody
    if (!body?.targetUserId || !body?.title || !body?.body) {
      return NextResponse.json(
        { error: "targetUserId, title and body are required" },
        { status: 400 }
      )
    }

    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: "Push delivery is not configured (missing service account)." },
        { status: 503 }
      )
    }

    const sub = await readPushSubscription(body.targetUserId)
    if (!sub) {
      return NextResponse.json({ ok: true, delivered: 0 })
    }

    const result = await sendPushToSubscription(
      sub,
      { title: body.title, body: body.body, url: body.url ?? "/" }
    )

    return NextResponse.json({ ok: true, delivered: result === "sent" ? 1 : 0, result })
  } catch (err) {
    console.error("[push/notify] error", err)
    return NextResponse.json(
      { error: "Could not deliver notification" },
      { status: 500 }
    )
  }
}