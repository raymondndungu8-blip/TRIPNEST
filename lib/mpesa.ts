export interface PayInput {
  ride_id: string;
}

import { auth } from "./firebase";

async function authCurrentToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export interface PayResult {
  ok: boolean;
  checkoutRequestId?: string;
  customerMessage?: string;
  error?: string;
}

export async function payWithMpesa(input: PayInput): Promise<PayResult> {
  try {
    const token = await authCurrentToken();
    const response = await fetch("/api/mpesa-stk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
