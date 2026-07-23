export interface PayInput {
  ride_id: string;
}

export interface PayResult {
  ok: boolean;
  checkoutRequestId?: string;
  customerMessage?: string;
  error?: string;
}

export async function payWithMpesa(input: PayInput): Promise<PayResult> {
  try {
    const response = await fetch("/api/mpesa-stk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      let message = "Could not start the M-Pesa payment. Please try again."
      try {
        const body = await response.json()
        if (body?.error) message = body.error
      } catch {
        /* keep default message */
      }
      return { ok: false, error: message }
    }

    const data = await response.json()
    return data as PayResult
  } catch (error) {
    return {
      ok: false,
      error: "Could not start the M-Pesa payment. Please try again.",
    }
  }
}
