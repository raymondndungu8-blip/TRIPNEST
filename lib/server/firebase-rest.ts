import { createPrivateKey, createHash, sign } from "node:crypto"

/**
 * Firebase Server access WITHOUT the Admin SDK.
 *
 * The Admin SDK ships jwks-rsa -> jose (ESM-only), which Vercel serverless
 * functions reject at runtime with ERR_REQUIRE_ESM (firebase-admin is on
 * Next.js's always-external list, so it can't be bundled to fix the interop).
 * This module reproduces the server operations the app needs using the
 * public REST endpoints + a service-account JWT minted with node:crypto:
 *
 *   1. verifyIdToken          -> Firebase Auth REST  (validates a client ID token)
 *   2. readPushSubscription   -> Cloud Firestore REST (reads a subscription doc)
 *   3. getOrCreatePhoneUser   -> Identity Toolkit REST (driver OTP sign-in)
 *   4. signCustomToken        -> mints a Firebase custom token for the driver
 *   5. otp doc CRUD           -> Cloud Firestore REST (stores OTP codes hashed)
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

// ── Raw Firestore document helpers (used for OTP codes) ───────────────────

function getProjectId(): string {
  return (
    getServiceAccount()?.project_id ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    ""
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function encodeValue(value: unknown): any {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === "boolean") return { booleanValue: value }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value }
  }
  if (typeof value === "string") return { stringValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } }
  }
  if (typeof value === "object") {
    const fields: Record<string, any> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      fields[k] = encodeValue(v)
    }
    return { mapValue: { fields } }
  }
  return { nullValue: null }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Read a Firestore document (path like `otpCodes/abc`), null when missing. */
export async function getRawDocument(
  path: string
): Promise<Record<string, unknown> | null> {
  const projectId = getProjectId()
  if (!projectId) return null
  const token = await getAccessToken()
  if (!token) return null

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${path}`,
    { headers: { authorization: `Bearer ${token}` } }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`firestore read failed (${res.status})`)

  const doc = (await res.json()) as { fields?: Record<string, any> }
  return doc.fields
    ? (decodeValue({ mapValue: { fields: doc.fields } }) as Record<
        string,
        unknown
      >)
    : null
}

/** Create or fully replace a Firestore document (path like `otpCodes/abc`). */
export async function setRawDocument(
  path: string,
  data: Record<string, unknown>
): Promise<void> {
  const projectId = getProjectId()
  if (!projectId) throw new Error("firebase project not configured")
  const token = await getAccessToken()
  if (!token) throw new Error("service account not configured")

  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&")
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${path}?${mask}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, encodeValue(v)])
        ),
      }),
    }
  )
  if (!res.ok) throw new Error(`firestore write failed (${res.status})`)
}

/** Delete a Firestore document; no-op when it doesn't exist. */
export async function deleteRawDocument(path: string): Promise<void> {
  const projectId = getProjectId()
  if (!projectId) return
  const token = await getAccessToken()
  if (!token) return
  await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${path}`,
    { method: "DELETE", headers: { authorization: `Bearer ${token}` } }
  )
}

/**
 * Mint a Firebase Auth custom token signed with the service-account key.
 * The client exchanges it via signInWithCustomToken for a real session.
 */
export function signCustomToken(uid: string): string | null {
  const sa = getServiceAccount()
  if (!sa?.client_email || !sa?.private_key) return null

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claims = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 60 * 60,
    uid,
  }

  const input = `${b64url(JSON.stringify(header))}.${b64url(
    JSON.stringify(claims)
  )}`
  const key = createPrivateKey(sa.private_key)
  const sig = sign("RSA-SHA256", Buffer.from(input), key)
  return `${input}.${sig.toString("base64url")}`
}

/**
 * Resolve the uid to hand the driver a custom token for.
 *
 * The REST `accounts:signUp` endpoint can't create a bare phone-only account
 * (it requires reCAPTCHA-verified SMS material), so we can't pre-create one.
 * Instead:
 *   1. If an existing Firebase Auth account is already bound to this phone
 *      (e.g. someone who signed up before via CE Firebase phone auth), reuse
 *      its uid so their existing driver doc keeps working.
 *   2. Otherwise mint a deterministic uid derived from the phone. The first
 *      signInWithCustomToken creates the account under that uid, and the
 *      driver doc keyed by it is stable across future logins.
 */
export async function getOrCreatePhoneUser(
  phone: string
): Promise<{ uid: string } | null> {
  const sa = getServiceAccount()
  const projectId = sa?.project_id
  if (projectId) {
    try {
      const token = await getAccessToken()
      const query = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(
          projectId
        )}/accounts:query`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ queries: [{ phoneNumber: phone }] }),
        }
      )
      if (query.ok) {
        const qdata = (await query.json()) as {
          users?: Array<{ localId?: string; uid?: string }>
        }
        const existing = qdata.users?.[0]
        const uid = existing?.localId ?? existing?.uid
        if (uid) return { uid }
      } else {
        console.error(
          "[getOrCreatePhoneUser] admin query failed",
          query.status,
          (await query.text().catch(() => "")).slice(0, 300)
        )
      }
    } catch (err) {
      console.error("[getOrCreatePhoneUser] admin query error", err)
    }
  }

  const hash = createHash("sha256").update(phone).digest("hex").slice(0, 26)
  return { uid: `phone_${hash}` }
}