import crypto from 'crypto'

const MPESA_PASSKEY = process.env.MPESA_PASSKEY || ''
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || ''

export function generateMpesaPassword(): string {
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14)
  const dataToEncode = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  return Buffer.from(dataToEncode).toString('base64')
}

export function getMpesaTimestamp(): string {
  return new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14)
}

/**
 * Verify an M-Pesa callback signature. The HMAC covers the EXACT raw request
 * body bytes with `MPESA_CALLBACK_SECRET`; comparing the raw string avoids
 * whitespace / key-ordering drift that a JSON round-trip would introduce.
 * Returns false whenever the secret or signature is missing, or on any
 * mismatch, so an unauthenticated callback is always rejected.
 */
export function verifyCallbackSignature(
  rawBody: string,
  expectedSignature: string
): boolean {
  const secret = process.env.MPESA_CALLBACK_SECRET || ''
  if (!secret || !expectedSignature) return false
  const hmac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8')
  const calculated = Buffer.from(hmac.digest('hex'), 'utf8')
  const expected = Buffer.from(expectedSignature.trim(), 'utf8')
  if (calculated.length !== expected.length) return false
  return crypto.timingSafeEqual(calculated, expected)
}

export function verifyMpesaCallback(
  requestBody: Record<string, unknown>,
  expectedSignature: string
): boolean {
  return verifyCallbackSignature(JSON.stringify(requestBody), expectedSignature)
}

export function verifyPaymentAmount(
  expectedAmount: number,
  receivedAmount: number,
  tolerance: number = 1
): boolean {
  return Math.abs(expectedAmount - receivedAmount) <= tolerance
}

export function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `txn_${timestamp}_${random}`
}

export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

export function encryptSensitiveData(data: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return `${iv.toString('hex')}:${encrypted}`
}

export function decryptSensitiveData(encryptedData: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'hex')
  const [ivHex, encrypted] = encryptedData.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
