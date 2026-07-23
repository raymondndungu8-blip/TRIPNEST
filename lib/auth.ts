import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  signOut as fbSignOut,
  type ConfirmationResult,
} from "firebase/auth"
import { auth } from "./firebase"

let confirmationResult: ConfirmationResult | null = null

export function normalizePhone(input: string): string {
  let p = input.replace(/[\s-]/g, "").trim()
  if (p.startsWith("+")) return p
  if (p.startsWith("0")) return "+254" + p.slice(1)
  if (p.startsWith("254")) return "+" + p
  if (p.length === 9) return "+254" + p
  return "+" + p
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  await signInWithPopup(auth, provider)
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<void> {
  await createUserWithEmailAndPassword(auth, email.trim(), password)
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  const appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
  })
  confirmationResult = await signInWithPhoneNumber(
    auth,
    normalizePhone(phone),
    appVerifier
  )
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!confirmationResult) throw new Error("No OTP request found")
  const result = await confirmationResult.confirm(token.trim())
  return result.user
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
