// Secrets MUST be set via `supabase secrets set` / Dashboard → Edge Functions
// → Secrets. No hardcoded fallback — the function fails closed if missing.
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WA_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  ride_id: string;
  phone: string;
  code: string;
  pickup: string;
  destination: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function svc() {
  return { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
}

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

/** Basic E.164-ish check — rejects obviously malformed input before we spend an API call. */
function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  if (!TWILIO_SID || !TWILIO_TOKEN || !SUPA_URL || !SERVICE) {
    console.error("[send-ride-code] Missing required secrets");
    return json({ ok: false, error: "Messaging is not configured" }, 500);
  }

  const userId = getUserIdFromAuthHeader(req);
  if (!userId) return json({ ok: false, error: "Unauthorized" }, 401);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { ride_id, phone, code, pickup, destination } = body;

  if (!ride_id || !phone || !code || !pickup || !destination) {
    return json({ ok: false, error: "Missing required fields" }, 400);
  }
  if (!isValidPhone(phone)) {
    return json({ ok: false, error: "Invalid phone number" }, 400);
  }
  if (!/^\d{4,6}$/.test(code)) {
    return json({ ok: false, error: "Invalid code" }, 400);
  }
  if (pickup.length > 200 || destination.length > 200) {
    return json({ ok: false, error: "Location text too long" }, 400);
  }

  // Verify the caller is the assigned driver for this ride
  const rideRes = await fetch(`${SUPA_URL}/rest/v1/rides?id=eq.${ride_id}&select=driver_id,status`, { headers: svc() });
  const ride = (await rideRes.json())?.[0];
  if (!ride) return json({ ok: false, error: "Ride not found" }, 404);

  const driverRes = await fetch(`${SUPA_URL}/rest/v1/drivers?user_id=eq.${userId}&select=id`, { headers: svc() });
  const driver = (await driverRes.json())?.[0];
  if (!driver || driver.id !== ride.driver_id) {
    return json({ ok: false, error: "Only the assigned driver can send ride codes" }, 403);
  }

  if (ride.status !== "in_progress" && ride.status !== "active") {
    return json({ ok: false, error: "Ride is not active" }, 400);
  }

  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;

  const message =
    `🚗 *TripNest Ride Confirmed*\n\n` +
    `Your ride verification code is:\n\n` +
    `*${code}*\n\n` +
    `📍 *Pickup:* ${pickup}\n` +
    `📍 *Destination:* ${destination}\n\n` +
    `Share this code *only* with your assigned driver at pickup. ` +
    `Never share it with anyone else.\n\n` +
    `Safe travels! — TripNest`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: TWILIO_WA_FROM, To: to, Body: message }),
      }
    );

    const result = await res.json().catch(() => ({}));
    console.log("[send-ride-code] Twilio:", res.status, JSON.stringify(result));

    if (!res.ok) {
      return json({ ok: false, error: result?.message || "WhatsApp send failed" }, 422);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("[send-ride-code] error:", err);
    return json({ ok: false, error: "Internal error" }, 500);
  }
});