import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithCustomToken,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth"
import { auth } from "./firebase"
import { normalizePhone } from "./phone"

export { normalizePhone }

// ── Phone OTP (driver sign-in) ────────────────────────────────────────────
//
// SMS delivery + verification is handled by our own API routes so it works on
// any origin (LAN IP, in-app browsers) instead of depending on the reCAPTCHA
// requirements of Firebase phone auth. On success the route returns a Firebase
// custom token which signs the driver straight into a stable account.

export interface SendOtpResult {
  ok: boolean;
  delivered: boolean;
  /** Only returned in development so the code can be read/tested. */
  devCode?: string;
}

export async function sendPhoneOtp(
  phone: string
): Promise<SendOtpResult | undefined> {
  const res = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })
  const body = (await res.json().catch(() => ({}))) as SendOtpResult & {
    error?: string;
  }
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? "Could not send the code. Please try again.")
  }
  return body
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<User> {
  const res = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: token.trim() }),
  })
  const body = (await res.json().catch(() => ({}))) as {
    customToken?: string;
    error?: string;
  }
  if (!res.ok || !body.customToken) {
    throw new Error(body.error ?? "Incorrect or expired code. Try again.")
  }
  const cred = await signInWithCustomToken(auth, body.customToken)
  return cred.user
}

export async function signInWithGoogle(): Promise<void> {
  // Redirect flow: popups are blocked by many in-app/phone browsers, and the
  // app already handles the return via /auth/callback + onAuthStateChanged.
  const provider = new GoogleAuthProvider()
  await signInWithRedirect(auth, provider)
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<User> {
  // Return the credential's user (NOT auth.currentUser, which can briefly be
  // null right after the operation resolves) so callers can reliably get the
  // uid and create the profile document.
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  return cred.user
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim())
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error("No authenticated user")
  await fbUpdatePassword(auth.currentUser, newPassword)
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}
