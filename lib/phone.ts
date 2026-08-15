/**
 * Normalize a local Kenyan/global number into +<country><number> form so it
 * can be passed to Firebase Auth, Africa's Talking SMS, etc. Pure module — safe
 * to import from both client and server code.
 */
export function normalizePhone(input: string): string {
  let p = input.replace(/[\s-]/g, "").trim()
  if (p.startsWith("+")) return p
  if (p.startsWith("0")) return "+254" + p.slice(1)
  if (p.startsWith("254")) return "+" + p
  if (p.length === 9) return "+254" + p
  return "+" + p
}

/** Loose phone shape check: 8–15 digits after the leading +. */
export function isValidPhone(input: string): boolean {
  const digits = input.replace(/[^\d]/g, "")
  return digits.length >= 9 && digits.length <= 15
}