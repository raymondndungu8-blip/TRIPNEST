import { NextResponse } from "next/server"
import {
  getRawDocument,
  isAdminConfigured,
  readPushSubscription,
  setRawDocument,
} from "@/lib/server/firebase-rest"
import { sendPushToSubscription } from "@/lib/server/webpush"

export const runtime = "nodejs"

/**
 * POST /api/mpesa-callback
 * Safaricom POSTs the STK payment result here. Must be public (verify_jwt is
 * not applied) and always answers 200 so Safaricom won't retry. Resolution:
 *
 *   payments/{CheckoutRequestID}  →  status / mpesa_receipt
 *   rides/{rideId}                →  payment_status + status (completed on pay)
 */

interface StkCallbackItem {
  Name?: string
  Value?: string
}

export async function POST(request: Request) {
  try {
    // Firestore-first design: the callback handler needs Admin access, so if
    // no service account is configured there is nothing meaningful to do.
    if (!isAdminConfigured()) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    const rawBody = await request.text()
    const body = JSON.parse(rawBody || "{}") as {
      Body?: {
        stkCallback?: {
          CheckoutRequestID?: string
          ResultCode?: number
          ResultDesc?: string
          CallbackMetadata?: { Item?: StkCallbackItem[] }
        }
      }
    }
    const cb = body?.Body?.stkCallback
    if (!cb?.CheckoutRequestID) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
    }

    const checkoutRequestId = cb.CheckoutRequestID
    const resultCode = cb.ResultCode
    let receipt: string | null = null
    if (resultCode === 0 && Array.isArray(cb.CallbackMetadata?.Item)) {
      for (const item of cb.CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") receipt = item.Value ?? null
      }
    }
    const status = resultCode === 0 ? "paid" : "failed"

    // Look up which ride this payment belonged to.
    const payment = await getRawDocument(`payments/${checkoutRequestId}`)
    const rideId = typeof payment?.rideId === "string" ? payment.rideId : null

    if (payment) {
      await setRawDocument(`payments/${checkoutRequestId}`, {
        status,
        mpesaReceipt: receipt,
        resultCode,
        resultDesc: cb.ResultDesc ?? "",
        updatedAt: new Date().toISOString(),
      })
    }

    if (rideId) {
      const rideDone =
        status === "paid"
          ? {
              paymentStatus: "paid",
              mpesaReceipt: receipt,
              status: "completed",
            }
          : { paymentStatus: "failed" }
      await setRawDocument(`rides/${rideId}`, rideDone)

      // Let the rider know their trip is paid and done. Best-effort: a hiccup
      // here (VAPID unset, no stored subscription, retired endpoint) must
      // never affect the 200 Safaricom needs back.
      if (status === "paid") {
        try {
          const ride = await getRawDocument(`rides/${rideId}`)
          const clientId =
            typeof ride?.clientId === "string"
              ? ride.clientId
              : typeof ride?.client_id === "string"
                ? ride.client_id
                : null
          if (clientId) {
            const sub = await readPushSubscription(clientId)
            if (sub) {
              await sendPushToSubscription(sub, {
                title: "TripNest — Payment received",
                body: `Your ride is complete. M-Pesa receipt ${receipt ?? "received"} — see the app for details.`,
                url: "/client",
              })
            }
          }
        } catch (err) {
          console.error("[mpesa-callback] push skipped", err)
        }
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  } catch (err) {
    // Never let Safaricom retry a storm because we failed to parse.
    console.error("[mpesa-callback] error", err)
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
  }
}