import Africastalking from 'africastalking'
import crypto from 'crypto'

let africastalkingInstance: ReturnType<typeof Africastalking> | null = null

function getAfricasTalking() {
  if (!africastalkingInstance) {
    africastalkingInstance = Africastalking({
      apiKey: process.env.AT_API_KEY || '',
      username: process.env.AT_USERNAME || 'sandbox',
    })
  }
  return africastalkingInstance
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  try {
    const sms = getAfricasTalking().SMS
    const result = await sms.send({
      to: [to],
      message,
      from: process.env.AT_SENDER_ID || '',
    })

    console.log('[SMS] Send result:', result)
    return true
  } catch (error) {
    console.error('[SMS] Failed to send:', error)
    return false
  }
}

export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const message = `Your TRIPNEST verification code is: ${code}. Valid for 5 minutes. Do not share this code.`
  return sendSms(phone, message)
}

export async function sendSecurityAlert(
  phone: string,
  alertType: string,
  details: string
): Promise<boolean> {
  const message = `🚨 TRIPNEST Security Alert: ${alertType}. ${details}. If this wasn't you, secure your account immediately.`
  return sendSms(phone, message)
}

export async function sendPaymentAlert(
  phone: string,
  amount: number,
  status: 'success' | 'failed'
): Promise<boolean> {
  const emoji = status === 'success' ? '✅' : '❌'
  const message = `${emoji} TRIPNEST Payment: KES ${amount.toLocaleString()} ${status === 'success' ? 'received' : 'failed'}. Check your app for details.`
  return sendSms(phone, message)
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}
