/**
 * Minimal in-memory rate limiter for API routes that must stay callable
 * without a signed-in user (OTP send/verify, push fan-out). Backed by a
 * module-level map — safe for the single server instance this prototype runs
 * on; swap for a store when scaling horizontally.
 */

const buckets = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }
  bucket.count++
  const allowed = bucket.count <= max
  const retryAfterSeconds = Math.max(0, Math.ceil((bucket.resetAt - now) / 1000))
  return { allowed, retryAfterSeconds }
}

/** Best-effort client IP from proxy headers (set by the host / middleware). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? ""
  const ip =
    forwarded.split(",")[0].trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  return ip
}