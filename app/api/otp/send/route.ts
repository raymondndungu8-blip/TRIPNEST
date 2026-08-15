import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { normalizePhone, isValidPhone } from "@/lib/phone"
import { sendOtpSms } from "@/lib/sms"
import {
  getRawDocument,
  setRawDocument,
} from "@/lib/server/firebase-rest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CODE_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_ATTEMPTS = 5
const SECRET = process.env.ENCRYPTION_KEY ?? "tripnest-otp"

function hashCode(code: string): string {
  return createHash("sha256").update(`${code}:${SECRET}`).digest("hex")
}

/** Stable, derivable doc id per phone so codes never collide per user. */
function otpDocId(phone: string): string {
  return createHash("sha256").update(phone).digest("hex").slice(0, 32)
}

interface OtpDoc {
  phone: string
  codeHash: string
  expiresAt: number
  attempts: number
  cooldownUntil: number
  createdAt: number
}

/**
 * POST /api/otp/send  — generates a 6-digit code, stores it hashed with an
 * expiry/resend-cooldown, and delivers it via Africa's Talking SMS. In
 * development it also returns the code so local devices can test without a
 * live SMS route.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const phone = normalizePhone(String(body?.phone ?? ""))
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 })
    }

    const docId = otpDocId(phone)
    const existing = (await getRawDocument(`otpCodes/${docId}`)) as
      | (OtpDoc & { cooldownUntil: number })
      | null
    if (existing && existing.cooldownUntil > Date.now()) {
      const wait = Math.ceil((existing.cooldownUntil - Date.now()) / 1000)
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another code` },
        { status: 429 }
      )
    }

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const createdAt = Date.now()
    await setRawDocument(`otpCodes/${docId}`, {
      phone,
      codeHash: hashCode(code),
      expiresAt: createdAt + CODE_TTL_MS,
      attempts: 0,
      cooldownUntil: createdAt + RESEND_COOLDOWN_MS,
      createdAt,
    })

    let delivered = false
    if (codeHashIsSendable()) {
      delivered = await sendOtpSms(phone, code)
    }
    if (!delivered && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "SMS sending is not configured for this environment." },
        { status: 503 }
      )
    }

    return NextResponse.json({
      ok: true,
      delivered,
      ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
    })
  } catch (err) {
    console.error("[otp/send] error", err)
    return NextResponse.json(
      { error: "Could not send the code. Try again." },
      { status: 500 }
    )
  }
}

function codeHashIsSendable(): boolean {
  const key = process.env.AT_API_KEY
  const user = process.env.AT_USERNAME
  return Boolean(key && user && key.length > 10)
}