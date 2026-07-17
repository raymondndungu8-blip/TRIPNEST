import { sendSms, sendSecurityAlert } from './sms'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface SecurityAlert {
  type: string
  severity: AlertSeverity
  message: string
  metadata?: Record<string, unknown>
}

const ADMIN_PHONES = (process.env.ADMIN_PHONES || '').split(',').filter(Boolean)
const CEO_PHONE = process.env.CEO_PHONE || ''
const CTO_PHONE = process.env.CTO_PHONE || ''

export async function sendSecurityAlertSms(
  phone: string,
  alertType: string,
  details: string
): Promise<boolean> {
  return sendSecurityAlert(phone, alertType, details)
}

export async function notifyAdmins(
  alert: SecurityAlert
): Promise<void> {
  const message = `🚨 ${alert.type}: ${alert.message}`

  for (const phone of ADMIN_PHONES) {
    await sendSms(phone, message)
  }

  if (CEO_PHONE) {
    await sendSms(CEO_PHONE, message)
  }

  if (CTO_PHONE) {
    await sendSms(CTO_PHONE, message)
  }
}

export async function alertBruteForce(
  ipAddress: string,
  attempts: number,
  targetEmail?: string
): Promise<void> {
  await notifyAdmins({
    type: 'Brute Force Attack',
    severity: 'critical',
    message: `Multiple failed login attempts from ${ipAddress}. ${attempts} attempts detected. ${targetEmail ? `Target: ${targetEmail}` : ''}`,
    metadata: { ipAddress, attempts, targetEmail },
  })
}

export async function alertSuspiciousPayment(
  rideId: string,
  expectedAmount: number,
  receivedAmount: number
): Promise<void> {
  await notifyAdmins({
    type: 'Payment Amount Mismatch',
    severity: 'critical',
    message: `Payment mismatch detected for ride ${rideId}. Expected: KES ${expectedAmount}, Received: KES ${receivedAmount}`,
    metadata: { rideId, expectedAmount, receivedAmount },
  })
}

export async function alertSqlInjectionAttempt(
  ipAddress: string,
  endpoint: string,
  payload: string
): Promise<void> {
  await notifyAdmins({
    type: 'SQL Injection Attempt',
    severity: 'critical',
    message: `SQL injection attempt from ${ipAddress} on ${endpoint}. Payload detected and blocked.`,
    metadata: { ipAddress, endpoint, payload: payload.substring(0, 200) },
  })
}

export async function alertBotDetected(
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await notifyAdmins({
    type: 'Bot Detected',
    severity: 'warning',
    message: `Automated bot traffic detected from ${ipAddress}. User agent: ${userAgent.substring(0, 100)}`,
    metadata: { ipAddress, userAgent },
  })
}

export async function alertSessionHijackAttempt(
  userId: string,
  originalIp: string,
  newIp: string
): Promise<void> {
  await notifyAdmins({
    type: 'Session Hijack Attempt',
    severity: 'critical',
    message: `Possible session hijacking for user ${userId}. IP changed from ${originalIp} to ${newIp}`,
    metadata: { userId, originalIp, newIp },
  })
}

export async function alertUnauthorizedAdminAccess(
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await notifyAdmins({
    type: 'Unauthorized Admin Access',
    severity: 'critical',
    message: `Unauthorized attempt to access admin panel from ${ipAddress}. User agent: ${userAgent.substring(0, 100)}`,
    metadata: { ipAddress, userAgent },
  })
}
