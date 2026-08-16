import { NextRequest, NextResponse } from "next/server"
import {
  getRawDocument,
  isAdminConfigured,
  setRawDocument,
  verifyIdToken,
} from "@/lib/server/firebase-rest"
import { createIntaSendStkPush } from "@/lib/server/intasend"
import { normalizePhone } from "@/lib/phone"

export const runtime = "nodejs"

function msisdn(p: string): string {
  const s = normalizePhone(p).replace(/[^0-9]/g, "")
  return s.startsWith("254") ? s : "254" + s
}

/**
 * POST /api/mpesa-stk
 * The assigned driver confirms arrival → triggers an M-Pesa STK push (via
 * IntaSend) to the client's phone. Everything is re-derived server-side from
 * the ride & client docs in Firestore (never from the request body), and the
 * caller must be the assigned driver on a ride that is in_progress with no
 * payment in flight.
 *
 * Body: { ride_id }
 * Auth: Bearer <Firebase ID token>
 */
export async function POST(request: NextRequest) {
  try {
    // 1) Caller must be the assigned driver.
    const authHeader = request.headers.get("authorization") ?? ""
    const idToken = authHeader.replace(/^Bearer\s+/i, "")
    const verified = idToken ? await verifyIdToken(idToken) : null
    if (!verified?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: "M-Pesa is not configured (missing service account)." },
        { status: 503 }
      )
    }

    if (!process.env.INTASEND_SECRET_KEY) {
      return NextResponse.json(
        { error: "IntaSend is not configured for this environment." },
        { status: 503 }
      )
    }

    const body = (await request.json()) as { ride_id?: string }
    if (!body?.ride_id) {
      return NextResponse.json({ error: "ride_id is required" }, { status: 400 })
    }

    // 2) Re-derive the ride, driver, and amount from Firestore.
    const ride = await getRawDocument(`rides/${body.ride_id}`)
    if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 })
    if (ride.driverId !== verified.uid) {
      return NextResponse.json(
        { error: "Only the assigned driver can request payment for this ride" },
        { status: 403 }
      )
    }
    if (ride.status !== "in_progress") {
      return NextResponse.json({ error: "Ride is not in progress" }, { status: 400 })
    }
    if (ride.paymentStatus === "paid" || ride.paymentStatus === "pending") {
      return NextResponse.json(
        { error: "Payment already requested or completed for this ride" },
        { status: 409 }
      )
    }

    const clientId = ride.clientId as string | undefined
    const client = clientId ? await getRawDocument(`clients/${clientId}`) : null
    const phone = client?.phone as string | undefined
    if (!phone) {
      return NextResponse.json({ error: "Client phone not on file" }, { status: 400 })
    }

    const amount = Math.max(1, Math.round(Number(ride.budget)))

    // 3) Fire the STK push through IntaSend. api_ref = ride id so the
    //    webhook can resolve the ride when the event comes back.
    const stk = await createIntaSendStkPush({
      amount,
      phone_number: msisdn(phone),
      api_ref: body.ride_id,
    })

    // 4) Record the pending payment so the webhook can resolve it by
    //    invoice_id (and for the audit trail).
    await setRawDocument(`payments/${stk.invoice_id}`, {
      rideId: body.ride_id,
      clientId,
      amount,
      phone,
      provider: "M-PESA",
      status: "pending",
      createdAt: new Date().toISOString(),
    })
    await setRawDocument(`rides/${body.ride_id}`, {
      paymentStatus: "pending",
      intasendInvoiceId: stk.invoice_id,
    })

    return NextResponse.json({
      ok: true,
      checkoutRequestId: stk.invoice_id,
      customerMessage: "M-Pesa PIN prompt sent",
    })
  } catch (err) {
    // Never leak internals (IntaSend errors, stack text, env names).
    console.error("[mpesa-stk] error", err)
    return NextResponse.json(
      { error: "Could not start the payment. Try again." },
      { status: 500 }
    )
  }
}