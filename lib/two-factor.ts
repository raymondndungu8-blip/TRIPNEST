import * as otpauth from 'otpauth'

export interface TwoFactorSecret {
  secret: string
  uri: string
}

export function generateTwoFactorSecret(
  email: string,
  issuer: string = 'TRIPNEST'
): TwoFactorSecret {
  const totp = new otpauth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new otpauth.Secret({ size: 20 }),
  })

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  }
}

export function verifyTwoFactorToken(
  secret: string,
  token: string
): boolean {
  const totp = new otpauth.TOTP({
    issuer: 'TRIPNEST',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: otpauth.Secret.fromBase32(secret),
  })

  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 10).toString()
    ).join('')
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

export function hashBackupCode(code: string): string {
  const cleaned = code.replace('-', '')
  let hash = 0
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
