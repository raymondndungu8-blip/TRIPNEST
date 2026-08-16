import { NextRequest, NextResponse } from "next/server"
import {
  getRawDocument,
  isAdminConfigured,
  setRawDocument,
  verifyIdToken,
} from "@/lib/server/firebase-rest"
import { createIntaSendCheckoutLink } from "@/lib/server/intasend"
import { normalizePhone } from "@/lib/phone"

export const runtime = "nodejs"

/**
 * POST /api/checkout-link
 * The ride owner generates an IntaSend payment link they can settle with
 * M-Pesa or a card — an escape hatch for the driver-triggered STK push. The
 * amount and customer are re-derived from Firestore server-side (never from
 * the request body), and the caller must own the ride.
 *
 * Body: { ride_id }
 * Auth: Bearer <Firebase ID token>
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? ""
    const idToken = authHeader.replace(/^Bearer\s+/i, "")
    const verified = idToken ? await verifyIdToken(idToken) : null
    if (!verified?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured (missing service account)." },
        { status: 503 }
      )
    }

    if (!process.env.INTASEND_PUBLISHABLE_KEY) {
      return NextResponse.json(
        { error: "IntaSend is not configured for this environment." },
        { status: 503 }
      )
    }

    const body = (await request.json()) as { ride_id?: string }
    if (!body?.ride_id) {
      return NextResponse.json({ error: "ride_id is required" }, { status: 400 })
    }

    // 1) Re-derive the ride + owner from Firestore.
    const ride = await getRawDocument(`rides/${body.ride_id}`)
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 })
    const ownerId =
      (ride.clientId as string | undefined) ?? (ride.client_id as string)
    const assignedDriverId =
      (ride.driverId as string | undefined) ?? (ride.driver_id as string)
    if (ownerId !== verified.uid && assignedDriverId !== verified.uid) {
      return NextResponse.json(
        { error: "Not allowed to request payment for this ride" },
        { status: 403 }
      )
    }
    if (ride.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This ride is already paid for" },
        { status: 409 }
      )
    }

    const clientId = ownerId
    const client = clientId ? await getRawDocument(`clients/${clientId}`) : null

    const phone = client?.phone as string | undefined
    const email = client?.email as string | undefined
    let fullName = (client?.name as string | undefined) ?? ""
    let [firstName = "", ...rest] = fullName.split(" ")
    const lastName = rest.join(" ") || undefined

    const amount = Math.max(1, Math.round(Number(ride.budget)))
    const origin = request.nextUrl.origin

    // 2) Create the hosted payment page.
    const checkout = await createIntaSendCheckoutLink({
      amount,
      first_name: firstName || "TripNest",
      last_name: lastName || "Rider",
      email,
      phone_number: phone ? normalizePhone(phone).replace(/\D/g, "") : undefined,
      api_ref: body.ride_id,
      redirect_url: `${origin}/client?paid=1`,
      comment: `TripNest ride payment (${body.ride_id})`,
    })

    // 3) Persist the link so the webhook can resolve it by invoice_id when
    //    api_ref is not echoed back, and for a paper trail.
    await setRawDocument(`checkoutRequests/${checkout.id}`, {
      rideId: body.ride_id,
      clientId,
      amount,
      currency: "KES",
      apiRef: body.ride_id,
      status: "created",
      createdAt: new Date().toISOString(),
    })
    await setRawDocument(`rides/${body.ride_id}`, {
      checkoutId: checkout.id,
    })

    return NextResponse.json({ ok: true, url: checkout.url, checkoutId: checkout.id })
  } catch (err) {
    // Never leak IntaSend internals to the rider.
    console.error("[checkout-link] error", err)
    return NextResponse.json(
      { error: "Could not create the payment link. Try again." },
      { status: 500 }
    )
  }
}