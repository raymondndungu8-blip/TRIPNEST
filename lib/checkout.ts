import { auth } from "./firebase";

export interface CheckoutLinkInput {
  ride_id: string;
}

async function authCurrentToken(): Promise<string | null> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export interface CheckoutLinkResult {
  ok: boolean;
  url?: string;
  checkoutId?: string;
  error?: string;
}

export async function generateCheckoutLink(
  rideId: string
): Promise<CheckoutLinkResult> {
  try {
    const token = await authCurrentToken();
    const response = await fetch("/api/checkout-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ride_id: rideId } satisfies CheckoutLinkInput),
    });

    if (!response.ok) {
      let message = "Could not create the payment link. Please try again.";
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep default message */
      }
      return { ok: false, error: message };
    }

    return (await response.json()) as CheckoutLinkResult;
  } catch {
    return {
      ok: false,
      error: "Could not create the payment link. Please try again.",
    };
  }
}