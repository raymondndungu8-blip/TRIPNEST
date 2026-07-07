// M-Pesa Daraja STK callback. Safaricom POSTs the payment result here.
// Must be public (verify_jwt=false). Always responds 200 so Safaricom won't retry.

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function svc(prefer: string) {
  return {
    apikey: SERVICE,
    Authorization: `Bearer ${SERVICE}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}
function accepted() {
  return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    console.log("[mpesa-callback] body:", JSON.stringify(body));
    const cb = body?.Body?.stkCallback;
    if (!cb) return accepted();

    const checkoutId = cb.CheckoutRequestID;
    const resultCode = cb.ResultCode;
    const resultDesc = cb.ResultDesc;

    let receipt: string | null = null;
    if (resultCode === 0 && Array.isArray(cb.CallbackMetadata?.Item)) {
      for (const it of cb.CallbackMetadata.Item) {
        if (it.Name === "MpesaReceiptNumber") receipt = String(it.Value);
      }
    }
    const status = resultCode === 0 ? "success" : "failed";

    // Update the payment row and learn its ride_id back.
    const res = await fetch(
      `${SUPA_URL}/rest/v1/payments?checkout_request_id=eq.${checkoutId}`,
      {
        method: "PATCH",
        headers: svc("return=representation"),
        body: JSON.stringify({
          status,
          mpesa_receipt: receipt,
          result_code: resultCode,
          result_desc: resultDesc,
        }),
      }
    );
    const rows = await res.json().catch(() => []);
    const rideId = rows?.[0]?.ride_id;

    if (rideId) {
      // On success the ride is paid AND the trip is complete (a success).
      const ridePatch =
        resultCode === 0
          ? { payment_status: "paid", mpesa_receipt: receipt, status: "completed" }
          : { payment_status: "failed" };
      await fetch(`${SUPA_URL}/rest/v1/rides?id=eq.${rideId}`, {
        method: "PATCH",
        headers: svc("return=minimal"),
        body: JSON.stringify(ridePatch),
      });
    }

    return accepted();
  } catch (err) {
    console.error("[mpesa-callback] error", err);
    return accepted();
  }
});
