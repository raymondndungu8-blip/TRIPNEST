import { z } from 'zod'

export const phoneSchema = z.string()
  .regex(/^\+254[0-9]{9}$/, 'Invalid Kenyan phone number format')

export const emailSchema = z.string()
  .email('Invalid email address')

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const otpSchema = z.string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^[0-9]+$/, 'OTP must contain only numbers')

export const rideBookingSchema = z.object({
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  dropoff_lat: z.number().min(-90).max(90),
  dropoff_lng: z.number().min(-180).max(180),
  ride_type: z.enum(['economy', 'comfort', 'premium']),
  payment_method: z.enum(['mpesa', 'wallet', 'cash']),
})

export const paymentSchema = z.object({
  ride_id: z.string().uuid(),
  amount: z.number().positive().max(100000),
  phone: phoneSchema,
})

export const walletTopUpSchema = z.object({
  amount: z.number().positive().max(50000),
  phone: phoneSchema,
})

export const walletWithdrawalSchema = z.object({
  amount: z.number().positive().max(50000),
  phone: phoneSchema,
})

export const adminActionSchema = z.object({
  action: z.string().min(1).max(100),
  target_user_id: z.string().uuid().optional(),
  reason: z.string().min(1).max(500),
})

export const rateLimitSchema = z.object({
  windowMs: z.number().positive(),
  max: z.number().positive(),
})

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
    /(--|;|\/\*|\*\/|xp_|sp_)/i,
    /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR|CONCAT|CHARINDEX)\b)/i,
    /(\b(CAST|CONVERT|EXEC|EXECUTE)\b)/i,
    /(0x[0-9a-f]+)/i,
  ]

  return sqlPatterns.some(pattern => pattern.test(input))
}

export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<form\b/gi,
    /(data|vbscript):/gi,
  ]

  return xssPatterns.some(pattern => pattern.test(input))
}
