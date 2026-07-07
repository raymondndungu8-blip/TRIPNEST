// Secrets MUST be set via `supabase secrets set` / Dashboard → Edge Functions
// → Secrets. No hardcoded fallback — the function fails closed if missing.
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WA_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

interface RequestBody {
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

/** Basic E.164-ish check — rejects obviously malformed input before we spend an API call. */
function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  if (!TWILIO_SID || !TWILIO_TOKEN) {
    console.error("[send-ride-code] TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not configured");
    return json({ ok: false, error: "Messaging is not configured" }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const { phone, code, pickup, destination } = body;

  if (!phone || !code || !pickup || !destination) {
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