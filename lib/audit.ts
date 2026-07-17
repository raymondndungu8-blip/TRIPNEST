import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export type AuditEventType =
  | 'auth.sign_in'
  | 'auth.sign_up'
  | 'auth.sign_out'
  | 'auth.failed_login'
  | 'auth.password_change'
  | 'auth.phone_verify'
  | 'auth.2fa_enable'
  | 'auth.2fa_verify'
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.callback_received'
  | 'payment.amount_mismatch'
  | 'ride.booked'
  | 'ride.cancelled'
  | 'ride.completed'
  | 'wallet.top_up'
  | 'wallet.withdrawal'
  | 'wallet.balance_check'
  | 'security.suspicious_activity'
  | 'security.rate_limit'
  | 'security.sql_injection_attempt'
  | 'security.bot_detected'
  | 'security.session_hijack_attempt'
  | 'admin.action'
  | 'admin.login'

export interface AuditLogEntry {
  event_type: AuditEventType
  user_id?: string
  ip_address: string
  user_agent: string
  metadata?: Record<string, unknown>
  success: boolean
  severity: 'info' | 'warning' | 'critical'
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = getServiceClient()

    await supabase.from('audit_logs').insert({
      event_type: entry.event_type,
      user_id: entry.user_id,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      metadata: entry.metadata || {},
      success: entry.success,
      severity: entry.severity,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[AUDIT] Failed to log event:', error)
  }
}

export async function getAuditLogs(
  userId: string,
  options: {
    limit?: number
    offset?: number
    eventType?: AuditEventType
    severity?: string
    startDate?: Date
    endDate?: Date
  } = {}
): Promise<AuditLogEntry[]> {
  const supabase = getServiceClient()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options.eventType) {
    query = query.eq('event_type', options.eventType)
  }

  if (options.severity) {
    query = query.eq('severity', options.severity)
  }

  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString())
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString())
  }

  query = query.range(
    options.offset || 0,
    (options.offset || 0) + (options.limit || 50) - 1
  )

  const { data, error } = await query

  if (error) {
    console.error('[AUDIT] Failed to fetch logs:', error)
    return []
  }

  return data || []
}

export async function getSecuritySummary(
  userId: string
): Promise<{
  totalEvents: number
  failedLogins: number
  suspiciousActivity: number
  recentCritical: AuditLogEntry[]
}> {
  const supabase = getServiceClient()

  const { count: totalEvents } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { count: failedLogins } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'auth.failed_login')

  const { count: suspiciousActivity } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('severity', 'critical')

  const { data: recentCritical } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('severity', 'critical')
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    totalEvents: totalEvents || 0,
    failedLogins: failedLogins || 0,
    suspiciousActivity: suspiciousActivity || 0,
    recentCritical: recentCritical || [],
  }
}
