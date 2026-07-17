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

export function verifyMpesaCallback(
  requestBody: Record<string, unknown>,
  expectedSignature: string
): boolean {
  const dataToVerify = JSON.stringify(requestBody)
  const hmac = crypto.createHmac('sha256', process.env.MPESA_CALLBACK_SECRET || '')
  hmac.update(dataToVerify)
  const calculatedSignature = hmac.digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(expectedSignature)
  )
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
