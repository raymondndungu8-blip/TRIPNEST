// Supabase "Send SMS" auth hook — delivers the login OTP via WhatsApp
// (Twilio) or SMS (Africa's Talking).
//
// Secrets MUST be set via `supabase secrets set` / Dashboard → Edge Functions
// → Secrets. No hardcoded fallbacks — the function fails closed if missing.
// Signature verification is MANDATORY: without SEND_SMS_HOOK_SECRET configured
// this hook refuses every request rather than silently skipping verification.

interface SendSmsPayload {
  user: { phone?: string };
  sms: { otp: string };
}

const AT_USERNAME = Deno.env.get("AT_USERNAME") ?? "sandbox";
const AT_API_KEY = Deno.env.get("AT_API_KEY");
const AT_SENDER_ID = Deno.env.get("AT_SENDER_ID") ?? "";
const AT_ENV = Deno.env.get("AT_ENV") ?? "sandbox";
const AT_BASE =
  AT_ENV === "production"
    ? "https://api.africastalking.com/version1/messaging"
    : "https://api.sandbox.africastalking.com/version1/messaging";

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WA_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886";
const USE_WHATSAPP = !!(TWILIO_SID && TWILIO_TOKEN);

const HOOK_SECRET = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? Deno.env.get("SEND_SMS_HOOK_SECRETS") ?? "";

function errorResponse(message: string, httpCode = 500) {
  console.error(`[send-sms] ${httpCode}: ${message}`);
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifySignature(
  secret: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const id = headers["webhook-id"];
  const timestamp = headers["webhook-timestamp"];
  const sigHeader = headers["webhook-signature"];
  if (!id || !timestamp || !sigHeader) return false;
  const base64Secret = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  const keyBytes = Uint8Array.from(atob(base64Secret), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return sigHeader.split(" ").some((part) => part.split(",")[1] === expected);
}

async function sendWhatsApp(phone: string, message: string): Promise<Response | null> {
  const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
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
  console.log("[send-sms] Twilio WhatsApp:", res.status, JSON.stringify(result));
  if (!res.ok) return errorResponse(result?.message || "WhatsApp send failed", 422);
  return null;
}

async function sendSms(phone: string, message: string): Promise<Response | null> {
  const body = new URLSearchParams({ username: AT_USERNAME, to: phone, message });
  if (AT_SENDER_ID) body.set("from", AT_SENDER_ID);
  const res = await fetch(AT_BASE, {
    method: "POST",
    headers: { apiKey: AT_API_KEY!, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const result = await res.json().catch(() => ({}));
  console.log("[send-sms] AT SMS:", res.status, JSON.stringify(result));
  const recipient = result?.SMSMessageData?.Recipients?.[0];
  const ok = res.ok && (!recipient || [100, 101].includes(recipient.statusCode));
  if (!ok) return errorResponse(recipient?.status || "SMS provider rejected the message", 422);
  return null;
}

Deno.serve(async (req) => {
  const raw = await req.text();
  const headers = Object.fromEntries([...req.headers].map(([k, v]) => [k.toLowerCase(), v]));

  // Fail closed: without a configured hook secret, refuse everything rather
  // than skip verification (an unverified endpoint is an open SMS-bombing
  // oracle for anyone who finds the URL).
  if (!HOOK_SECRET) {
    return errorResponse("Hook secret not configured", 500);
  }
  const verified = await verifySignature(HOOK_SECRET, headers, raw).catch(() => false);
  if (!verified) return errorResponse("Invalid webhook signature", 401);

  if (!USE_WHATSAPP && !AT_API_KEY) {
    return errorResponse("No messaging provider configured", 500);
  }

  let payload: SendSmsPayload;
  try {
    payload = JSON.parse(raw) as SendSmsPayload;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return errorResponse("Missing phone or otp", 400);

  const message = `${otp} is your TripNest verification code. It expires in 10 minutes. Never share it with anyone.`;

  try {
    const failure = USE_WHATSAPP ? await sendWhatsApp(phone, message) : await sendSms(phone, message);
    if (failure) return failure;
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-sms] send failed", err);
    return errorResponse("Failed to reach the messaging provider", 502);
  }
});