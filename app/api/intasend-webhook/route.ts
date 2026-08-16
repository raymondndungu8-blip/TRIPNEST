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
 * POST /api/intasend-webhook
 * IntaSend POSTs collection events here whenever a checkout link changes
 * state. Must be public (not JWT-gated) and always answers 200 so IntaSend
 * won't retry. On `state: COMPLETE` the linked ride is marked paid.
 *
 * Authentication: the webhook endpoint is configured with a static
 * `challenge` string that IntaSend echoes on every payload. When
 * `INTASEND_WEBHOOK_CHALLENGE` is set the payload must carry it, otherwise
 * the event is rejected so nobody can cheaply fake a "paid" state. If it's
 * unset the check is skipped with a loud warning (dev fallback).
 *
 * Correlation: `api_ref` is set to the ride id when the link is created and
 * echoed back on the event; `invoice_id` is a fallback that resolves through
 * the `checkoutRequests/{id}` record we saved at creation time.
 */

interface IntaSendEvent {
  state?: string
  invoice_id?: string
  api_ref?: string
  provider?: string
  value?: string
  net_amount?: string
  currency?: string
  mpesa_receipt?: string
  challenge?: string
  transaction?: IntaSendEvent
  [key: string]: unknown
}

function pick(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export async function POST(request: Request) {
  try {
    // Server writes need the service account; without it there is nothing to do.
    if (!isAdminConfigured()) {
      return NextResponse.json({ status: "ok" })
    }

    const rawBody = await request.text()
    let body: IntaSendEvent = {}
    try {
      body = JSON.parse(rawBody || "{}")
    } catch {
      console.error("[intasend-webhook] rejecting malformed JSON body")
      return NextResponse.json({ status: "ok" })
    }

    // Challenge check (skip loudly when unset — local dev convenience).
    const challenge = process.env.INTASEND_WEBHOOK_CHALLENGE
    if (challenge) {
      if (body.challenge !== challenge) {
        console.error("[intasend-webhook] rejected: wrong challenge")
        return NextResponse.json({ status: "ok" })
      }
    } else {
      console.warn(
        "[intasend-webhook] INTASEND_WEBHOOK_CHALLENGE is not set — skipping challenge check"
      )
    }

    // Some IntaSend payloads wrap the transaction object; be lenient about it.
    const txn: IntaSendEvent = body.transaction && typeof body.transaction === "object"
      ? { ...body, ...body.transaction }
      : body

    const state = (pick(txn.state) ?? "UNKNOWN").toUpperCase()

    if (state !== "COMPLETE" && state !== "FAILED") {
      // PROCESSING/PENDING etc. — nothing to resolve yet.
      return NextResponse.json({ status: "ok" })
    }

    // Resolve the ride: api_ref first (ride id), then invoice_id via the
    // checkoutRequests record we wrote at creation time, then via the
    // payments record an STK push writes.
    let rideId = pick(txn.api_ref)
    if (!rideId) {
      const invoiceId = pick(txn.invoice_id)
      if (invoiceId) {
        const req = await getRawDocument(`checkoutRequests/${invoiceId}`)
        rideId = typeof req?.rideId === "string" ? req.rideId : undefined
        if (!rideId) {
          const pmt = await getRawDocument(`payments/${invoiceId}`)
          rideId = typeof pmt?.rideId === "string" ? pmt.rideId : undefined
        }
      }
    }
    if (!rideId) {
      console.error("[intasend-webhook] could not resolve ride from event")
      return NextResponse.json({ status: "ok" })
    }

    // Record the collection event for the audit trail (best-effort).
    try {
      const invoiceId = pick(txn.invoice_id)
      if (invoiceId) {
        const patch = {
          state,
          provider: pick(txn.provider) ?? "",
          value: pick(txn.value) ?? "",
          updatedAt: new Date().toISOString(),
        }
        const pmt = await getRawDocument(`payments/${invoiceId}`)
        if (pmt?.rideId) {
          await setRawDocument(`payments/${invoiceId}`, patch)
        } else {
          await setRawDocument(`checkoutRequests/${invoiceId}`, patch)
        }
      }
    } catch (err) {
      console.error("[intasend-webhook] audit write skipped", err)
    }

    if (state === "FAILED") {
      await setRawDocument(`rides/${rideId}`, { paymentStatus: "failed" })
      return NextResponse.json({ status: "ok" })
    }

    // COMPLETE — mark the ride paid and completed.
    const ride = await getRawDocument(`rides/${rideId}`)
    if (!ride) return NextResponse.json({ status: "ok" })
    if (ride.paymentStatus !== "paid") {
      await setRawDocument(`rides/${rideId}`, {
        paymentStatus: "paid",
        mpesaReceipt:
          pick(txn.mpesa_receipt) ?? pick(txn.reference) ?? null,
        intasendInvoiceId: pick(txn.invoice_id) ?? null,
        status: "completed",
      })
    }

    // Let the rider know their trip is paid and done. Best-effort: a hiccup
    // here (VAPID unset, no stored subscription) must never affect the 200
    // IntaSend needs back.
    try {
      const clientId =
        (ride.clientId as string | undefined) ?? (ride.client_id as string)
      if (clientId) {
        const sub = await readPushSubscription(clientId)
        if (sub) {
          await sendPushToSubscription(sub, {
            title: "TripNest — Payment received",
            body: "Your ride is complete and your payment went through. Ride on with TripNest!",
            url: "/client",
          })
        }
      }
    } catch (err) {
      console.error("[intasend-webhook] push skipped", err)
    }

    return NextResponse.json({ status: "ok" })
  } catch (err) {
    // Never let a retry storm happen because we failed to process.
    console.error("[intasend-webhook] error", err)
    return NextResponse.json({ status: "ok" })
  }
}