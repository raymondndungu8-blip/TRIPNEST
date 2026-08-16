import { NextRequest, NextResponse } from "next/server"
import {
  getRawDocument,
  isAdminConfigured,
  setRawDocument,
  verifyIdToken,
} from "@/lib/server/firebase-rest"
import { normalizePhone } from "@/lib/phone"

export const runtime = "nodejs"

// ── M-Pesa Daraja configuration (mirrors the legacy Supabase edge function
//    but reads/writes Firestore, the same store the rest of the app uses). ──

const ENV = process.env.MPESA_ENV ?? "sandbox"
const BASE =
  ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke"
const KEY = process.env.MPESA_CONSUMER_KEY
const SECRET = process.env.MPESA_CONSUMER_SECRET
const SHORTCODE = process.env.MPESA_SHORTCODE ?? "174379"
// Daraja's published sandbox passkey is intentionally public test data per
// Safaricom's own docs — safe to default in sandbox mode only.
const PASSKEY =
  process.env.MPESA_PASSKEY ??
  (ENV === "sandbox"
    ? "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
    : undefined)

function msisdn(p: string): string {
  const s = normalizePhone(p).replace(/[^0-9]/g, "")
  return s.startsWith("254") ? s : "254" + s
}

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/** Sign a JWT with the service-account key (Daraja oauth token request). */
async function getDarajaToken(): Promise<string> {
  if (!KEY || !SECRET) throw new Error("M-Pesa is not configured")
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}` },
  })
  const data = (await res.json()) as { access_token?: string; errorMessage?: string }
  if (!data.access_token) throw new Error(data.errorMessage || "Failed to get M-Pesa token")
  return data.access_token
}

/**
 * POST /api/mpesa-stk
 * The assigned driver confirms arrival → triggers an M-Pesa STK push to the
 * client's phone. Everything is re-derived server-side from the ride & client
 * docs in Firestore (never from the request body), and the caller must be the
 * assigned driver on a ride that is in_progress with no payment in flight.
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

    // 3) Fire the STK push.
    const accessToken = await getDarajaToken()
    const ts = timestamp()
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString("base64")

    const callbackUrl =
      process.env.MPESA_CALLBACK_URL ??
      `${request.nextUrl.origin}/api/mpesa-callback`

    const stkRes = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: msisdn(phone),
        PartyB: SHORTCODE,
        PhoneNumber: msisdn(phone),
        CallBackURL: callbackUrl,
        AccountReference: "TripNest",
        TransactionDesc: "TripNest ride payment",
      }),
    })
    const stk = (await stkRes.json()) as {
      ResponseCode?: string
      MerchantRequestID?: string
      CheckoutRequestID?: string
      CustomerMessage?: string
      ResponseDescription?: string
      errorMessage?: string
    }

    if (stk.ResponseCode !== "0") {
      return NextResponse.json(
        {
          ok: false,
          error: stk.errorMessage || stk.ResponseDescription || "STK push failed",
        },
        { status: 400 }
      )
    }

    // 4) Record the pending payment so the callback can resolve it.
    await setRawDocument(`payments/${stk.CheckoutRequestID}`, {
      rideId: body.ride_id,
      clientId,
      amount,
      phone,
      status: "pending",
      createdAt: new Date().toISOString(),
    })
    await setRawDocument(`rides/${body.ride_id}`, {
      paymentStatus: "pending",
      checkoutRequestId: stk.CheckoutRequestID,
    })

    return NextResponse.json({
      ok: true,
      checkoutRequestId: stk.CheckoutRequestID,
      customerMessage: stk.CustomerMessage ?? "M-Pesa PIN prompt sent",
    })
  } catch (err) {
    // Never leak internals (M-Pesa token errors, stack text, env names).
    console.error("[mpesa-stk] error", err)
    return NextResponse.json(
      { error: "Could not start the payment. Try again." },
      { status: 500 }
    )
  }
}