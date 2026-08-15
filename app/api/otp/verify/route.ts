import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { normalizePhone, isValidPhone } from "@/lib/phone"
import {
  getRawDocument,
  setRawDocument,
  deleteRawDocument,
  getOrCreatePhoneUser,
  signCustomToken,
} from "@/lib/server/firebase-rest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_ATTEMPTS = 5
const SECRET = process.env.ENCRYPTION_KEY ?? "tripnest-otp"

function hashCode(code: string): string {
  return createHash("sha256").update(`${code}:${SECRET}`).digest("hex")
}

function otpDocId(phone: string): string {
  return createHash("sha256").update(phone).digest("hex").slice(0, 32)
}

interface OtpDoc {
  phone: string
  codeHash: string
  expiresAt: number
  attempts: number
}

/**
 * POST /api/otp/verify — checks the submitted code against the hashed stored
 * one (expiry + attempt-count guarded), then binds/links the phone to a stable
 * Firebase account and returns a custom token that signs the driver in.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const phone = normalizePhone(String(body?.phone ?? ""))
    const code = String(body?.code ?? "").trim()
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 })
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 })
    }

    const docId = otpDocId(phone)
    const doc = (await getRawDocument(`otpCodes/${docId}`)) as OtpDoc | null
    if (!doc) {
      return NextResponse.json(
        { error: "No code was requested for this number. Request a new one." },
        { status: 400 }
      )
    }
    if (doc.expiresAt < Date.now()) {
      await deleteRawDocument(`otpCodes/${docId}`)
      return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 })
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
      await deleteRawDocument(`otpCodes/${docId}`)
      return NextResponse.json(
        { error: "Too many failed attempts. Request a new code." },
        { status: 429 }
      )
    }

    if (doc.codeHash !== hashCode(code)) {
      await setRawDocument(`otpCodes/${docId}`, {
        ...doc,
        attempts: (doc.attempts ?? 0) + 1,
      })
      return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 })
    }

    await deleteRawDocument(`otpCodes/${docId}`)

    const account = await getOrCreatePhoneUser(phone)
    if (!account?.uid) {
      return NextResponse.json(
        { error: "Could not finish signing you in. Please try again." },
        { status: 500 }
      )
    }

    const customToken = signCustomToken(account.uid)
    if (!customToken) {
      return NextResponse.json(
        { error: "Sign-in is not configured. Contact support." },
        { status: 503 }
      )
    }

    return NextResponse.json({ ok: true, customToken })
  } catch (err) {
    console.error("[otp/verify] error", err)
    return NextResponse.json(
      { error: "Could not verify the code. Try again." },
      { status: 500 }
    )
  }
}