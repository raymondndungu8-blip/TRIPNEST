import { createPrivateKey, sign } from "node:crypto"

/**
 * Firebase Server access WITHOUT the Admin SDK.
 *
 * The Admin SDK ships jwks-rsa -> jose (ESM-only), which Vercel serverless
 * functions reject at runtime with ERR_REQUIRE_ESM (firebase-admin is on
 * Next.js's always-external list, so it can't be bundled to fix the interop).
 * This module reproduces the two operations the push route needs using the
 * public REST endpoints + a service-account JWT minted with node:crypto:
 *
 *   1. verifyIdToken    -> Firebase Auth REST  (validates a client ID token)
 *   2. readPushSubscription -> Cloud Firestore REST (reads a subscription doc)
 */

interface ServiceAccount {
  project_id?: string
  client_email?: string
  private_key?: string
}

function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  try {
    return JSON.parse(raw) as ServiceAccount
  } catch {
    return null
  }
}

/** True when a usable service account is configured (push delivery enabled). */
export function isAdminConfigured(): boolean {
  const sa = getServiceAccount()
  return Boolean(sa?.client_email && sa?.private_key)
}

const b64url = (data: string | Buffer): string =>
  Buffer.from(data).toString("base64url")

/** Cached OAuth2 access token minted from the service account. */
let tokenCache: { token: string; expiresAt: number } | null = null

/**
 * Mint a short-lived Google OAuth2 access token by signing a JWT with the
 * service account private key (node:crypto only, no external libraries).
 */
export async function getAccessToken(): Promise<string | null> {
  const sa = getServiceAccount()
  if (!sa?.client_email || !sa?.private_key) return null

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claim = {
    iss: sa.client_email,
    scope:
      "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3599,
  }

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(
    JSON.stringify(claim)
  )}`
  const key = createPrivateKey(sa.private_key)
  const sig = sign("RSA-SHA256", Buffer.from(signingInput), key)
  const assertion = `${signingInput}.${sig.toString("base64url")}`

  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }).toString()

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  })
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`)

  const data = (await res.json()) as {
    access_token: string
    expires_in?: number
  }
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
  return tokenCache.token
}

export interface VerifiedUser {
  uid: string
  email?: string
  emailVerified?: boolean
}

/**
 * Validate a Firebase ID token against Firebase Auth's REST endpoint and
 * return the owning user (or null when the token is invalid/expired).
 */
export async function verifyIdToken(
  idToken: string
): Promise<VerifiedUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) return null

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  )
  if (!res.ok) return null
  const data = (await res.json()) as {
    users?: Array<{ localId: string; email?: string; emailVerified?: boolean }>
  }
  const user = data?.users?.[0]
  if (!user?.localId) return null
  return { uid: user.localId, email: user.email, emailVerified: user.emailVerified }
}

export interface StoredSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
  expirationTime: number | null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function decodeValue(value: any): any {
  if (!value) return null
  if ("stringValue" in value) return value.stringValue
  if ("booleanValue" in value) return value.booleanValue
  if ("integerValue" in value) return Number(value.integerValue)
  if ("doubleValue" in value) return Number(value.doubleValue)
  if ("timestampValue" in value) return value.timestampValue
  if ("nullValue" in value) return null
  if ("arrayValue" in value)
    return (value.arrayValue.values ?? []).map(decodeValue)
  if ("mapValue" in value) {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value.mapValue.fields ?? {})) {
      out[key] = decodeValue(val)
    }
    return out
  }
  return null
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Read the stored push subscription for a user via the Firestore REST API.
 * Returns null when no subscription exists or the service account is missing.
 */
export async function readPushSubscription(
  userId: string
): Promise<StoredSubscription | null> {
  const sa = getServiceAccount()
  const projectId =
    sa?.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""
  if (!projectId) return null

  const token = await getAccessToken()
  if (!token) return null

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/pushSubscriptions/${encodeURIComponent(
    userId
  )}`
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`firestore read failed (${res.status})`)

  const doc = (await res.json()) as { fields?: Record<string, any> }
  const sub = doc.fields ? decodeValue({ mapValue: { fields: doc.fields } }) : null
  const stored = sub?.subscription as StoredSubscription | undefined
  if (
    !stored?.endpoint ||
    !stored?.keys?.p256dh ||
    !stored?.keys?.auth
  ) {
    return null
  }
  return stored
}