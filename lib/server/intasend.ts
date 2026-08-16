/**
 * IntaSend Checkout API — creates a hosted payment link that the customer
 * opens to complete payment with M-Pesa or a card. Server-side only (the
 * publishable key is safe to ship to the browser, but keeping the call here
 * lets us re-derive amount/customer from Firestore server-side).
 *
 * Docs: https://developers.intasend.com/docs/checkout-links
 */

const BASE =
  process.env.INTASEND_ENV === "live"
    ? "https://payment.intasend.com"
    : "https://sandbox.intasend.com"

export interface IntaSendCheckoutInput {
  amount: number
  first_name?: string
  last_name?: string
  email?: string
  phone_number?: string
  /** Our own tracking reference — echoed back on the webhook as `api_ref`. */
  api_ref: string
  /** URL to redirect the customer to after a successful payment. */
  redirect_url: string
  /** Short line shown on the checkout page. */
  comment?: string
}

export interface IntaSendCheckoutResult {
  /** The hosted payment page to send the customer to. */
  url: string
  /** Stable reference IntaSend assigns to the checkout. */
  id: string
}

/**
 * Create a checkout link. Throws on missing config or a non-2xx response;
 * callers translate that into a friendly error for the user.
 */
export async function createIntaSendCheckoutLink(
  input: IntaSendCheckoutInput
): Promise<IntaSendCheckoutResult> {
  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY
  if (!publishableKey) {
    throw new Error("IntaSend is not configured")
  }

  const res = await fetch(`${BASE}/api/v1/checkout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      public_key: publishableKey,
      amount: Math.max(1, Math.round(input.amount)),
      currency: "KES",
      first_name: input.first_name || undefined,
      last_name: input.last_name || undefined,
      email: input.email || undefined,
      phone_number: input.phone_number || undefined,
      country: "KE",
      api_ref: input.api_ref,
      redirect_url: input.redirect_url,
      comment: input.comment || undefined,
      // Business absorbs the processing fees so the rider pays a round amount.
      card_tarrif: "BUSINESS-PAYS",
      mobile_tarrif: "BUSINESS-PAYS",
    }),
  })

  const data = (await res.json().catch(() => ({}))) as {
    url?: string
    id?: string
    non_field_errors?: string[]
    error?: string
  }

  if (!res.ok || !data.url) {
    const detail =
      data.non_field_errors?.join("; ") ||
      data.error ||
      `IntaSend checkout failed (${res.status})`
    throw new Error(detail)
  }

  return { url: data.url, id: data.id ?? "" }
}