import { supabase } from "./supabase";

export interface PayInput {
  ride_id: string;
}

export interface PayResult {
  ok: boolean;
  checkoutRequestId?: string;
  customerMessage?: string;
  error?: string;
}

/**
 * Trigger an M-Pesa STK Push (PIN prompt on the customer's phone) via the
 * mpesa-stk edge function. The amount and phone are derived server-side from
 * the ride record — the function no longer accepts them from the client, so
 * only `ride_id` is sent. The mpesa-callback function later flips the ride's
 * payment_status to paid/failed (picked up live by useClientRides).
 */
export async function payWithMpesa(input: PayInput): Promise<PayResult> {
  const { data, error } = await supabase.functions.invoke("mpesa-stk", {
    body: input,
  });

  if (error) {
    let message = "Could not start the M-Pesa payment. Please try again.";
    // supabase-js attaches the failed Response as error.context
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch {
      /* keep default message */
    }
    return { ok: false, error: message };
  }

  return data as PayResult;
}
