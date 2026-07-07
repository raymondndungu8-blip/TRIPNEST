// M-Pesa Daraja STK Push initiator — triggers an M-Pesa PIN prompt on the
// customer's phone when the driver confirms arrival.
//
// Secrets MUST be set via `supabase secrets set` / Dashboard → Edge Functions
// → Secrets. No hardcoded fallback — the function fails closed if missing.
//
// verify_jwt=true: only an authenticated session may call this. Beyond that,
// we re-derive every fact server-side instead of trusting the request body:
// the caller must be the *assigned driver* on the ride, the ride must be
// `in_progress` with no payment already in flight, the charged amount comes
// from the ride's own budget (never from the request), and the phone number
// is checked against the client's phone on file — so this can't be used to
// blast arbitrary amounts/numbers with M-Pesa prompts.

const ENV = Deno.env.get("MPESA_ENV") ?? "sandbox";
const BASE = ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
const KEY = Deno.env.get("MPESA_CONSUMER_KEY");
const SECRET = Deno.env.get("MPESA_CONSUMER_SECRET");
const SHORTCODE = Deno.env.get("MPESA_SHORTCODE") ?? "174379";
// Daraja's published sandbox passkey is intentionally public test data per
// Safaricom's own docs — safe to default in sandbox mode only.
const PASSKEY =
  Deno.env.get("MPESA_PASSKEY") ??
  (ENV === "sandbox" ? "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" : undefined);
const CALLBACK =
  Deno.env.get("MPESA_CALLBACK_URL") ??
  "https://frqlxatryxlsjntzqdgn.supabase.co/functions/v1/mpesa-callback";
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function svc() {
  return { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
}
function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function msisdn(p: string) {
  let s = String(p).replace(/\D/g, "");
  if (s.startsWith("0")) s = "254" + s.slice(1);
  if (s.startsWith("7") || s.startsWith("1")) s = "254" + s;
  return s;
}

/** verify_jwt=true already validated this token at the gateway — safe to trust `sub`. */
function getUserIdFromAuthHeader(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (!KEY || !SECRET || !PASSKEY) {
      return json({ error: "M-Pesa is not configured" }, 500);
    }

    const userId = getUserIdFromAuthHeader(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { ride_id } = await req.json();
    if (!ride_id) return json({ error: "ride_id is required" }, 400);

    // Re-derive everything from the DB — never trust amount/phone from the client.
    const rideRes = await fetch(`${SUPA_URL}/rest/v1/rides?id=eq.${ride_id}&select=*`, { headers: svc() });
    const ride = (await rideRes.json())?.[0];
    if (!ride) return json({ error: "Ride not found" }, 404);

    const driverRes = await fetch(`${SUPA_URL}/rest/v1/drivers?user_id=eq.${userId}&select=id`, { headers: svc() });
    const driver = (await driverRes.json())?.[0];
    if (!driver || driver.id !== ride.driver_id) {
      return json({ error: "Only the assigned driver can request payment for this ride" }, 403);
    }

    if (ride.status !== "in_progress") {
      return json({ error: "Ride is not in progress" }, 400);
    }
    if (ride.payment_status === "paid" || ride.payment_status === "pending") {
      return json({ error: "Payment already requested or completed for this ride" }, 409);
    }

    const clientRes = await fetch(`${SUPA_URL}/rest/v1/clients?id=eq.${ride.client_id}&select=phone`, {
      headers: svc(),
    });
    const clientPhone = (await clientRes.json())?.[0]?.phone;
    if (!clientPhone) return json({ error: "Client phone not on file" }, 400);

    const partyA = msisdn(clientPhone);
    const amt = Math.max(1, Math.round(Number(ride.budget)));

    // 1) OAuth token
    const tokenRes = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` },
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return json({ error: "Failed to get M-Pesa token", detail: tokenData }, 502);

    // 2) STK push
    const ts = timestamp();
    const password = btoa(`${SHORTCODE}${PASSKEY}${ts}`);

    const stkRes = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: SHORTCODE,
        Password: password,
        Timestamp: ts,
        TransactionType: "CustomerPayBillOnline",
        Amount: amt,
        PartyA: partyA,
        PartyB: SHORTCODE,
        PhoneNumber: partyA,
        CallBackURL: CALLBACK,
        AccountReference: "TripNest",
        TransactionDesc: "TripNest ride payment",
      }),
    });
    const stk = await stkRes.json();
    console.log("[mpesa-stk] response:", JSON.stringify(stk));

    if (stk.ResponseCode !== "0") {
      return json(
        { ok: false, error: stk.errorMessage || stk.ResponseDescription || "STK push failed", detail: stk },
        400
      );
    }

    // 3) Record pending payment + mark ride pending
    await fetch(`${SUPA_URL}/rest/v1/payments`, {
      method: "POST",
      headers: { ...svc(), Prefer: "return=minimal" },
      body: JSON.stringify({
        ride_id,
        client_id: ride.client_id,
        amount: amt,
        phone: partyA,
        merchant_request_id: stk.MerchantRequestID,
        checkout_request_id: stk.CheckoutRequestID,
        status: "pending",
      }),
    });
    await fetch(`${SUPA_URL}/rest/v1/rides?id=eq.${ride_id}`, {
      method: "PATCH",
      headers: { ...svc(), Prefer: "return=minimal" },
      body: JSON.stringify({ payment_status: "pending" }),
    });

    return json({ ok: true, checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage });
  } catch (err) {
    console.error("[mpesa-stk] error", err);
    return json({ error: String(err) }, 500);
  }
});