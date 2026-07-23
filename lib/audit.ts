import { type QueryConstraint } from "firebase/firestore"
import {
  createDocument,
  queryDocuments,
  collections,
  where,
  orderBy,
  limit,
  getDocs,
  query,
  Timestamp,
} from "./db"

export type AuditEventType =
  | "auth.sign_in"
  | "auth.sign_up"
  | "auth.sign_out"
  | "auth.failed_login"
  | "auth.password_change"
  | "auth.phone_verify"
  | "auth.2fa_enable"
  | "auth.2fa_verify"
  | "payment.initiated"
  | "payment.completed"
  | "payment.failed"
  | "payment.callback_received"
  | "payment.amount_mismatch"
  | "ride.booked"
  | "ride.cancelled"
  | "ride.completed"
  | "wallet.top_up"
  | "wallet.withdrawal"
  | "wallet.balance_check"
  | "security.suspicious_activity"
  | "security.rate_limit"
  | "security.sql_injection_attempt"
  | "security.bot_detected"
  | "security.session_hijack_attempt"
  | "admin.action"
  | "admin.login"

export interface AuditLogEntry {
  eventType: AuditEventType
  userId?: string
  ipAddress: string
  userAgent: string
  metadata?: Record<string, unknown>
  success: boolean
  severity: "info" | "warning" | "critical"
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await createDocument(collections.auditLogs(), {
      eventType: entry.eventType,
      userId: entry.userId ?? null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata || {},
      success: entry.success,
      severity: entry.severity,
      createdAt: Timestamp.now(),
    })
  } catch (error) {
    console.error("[AUDIT] Failed to log event:", error)
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
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  ]

  if (options.eventType) {
    constraints.push(where("eventType", "==", options.eventType))
  }

  if (options.severity) {
    constraints.push(where("severity", "==", options.severity))
  }

  if (options.startDate) {
    constraints.push(where("createdAt", ">=", Timestamp.fromDate(options.startDate)))
  }

  if (options.endDate) {
    constraints.push(where("createdAt", "<=", Timestamp.fromDate(options.endDate)))
  }

  const fetchLimit = (options.offset || 0) + (options.limit || 50)
  constraints.push(limit(fetchLimit))

  const results = await queryDocuments<AuditLogEntry>(
    collections.auditLogs(),
    ...constraints
  )

  return results.slice(options.offset || 0)
}

export async function getSecuritySummary(
  userId: string
): Promise<{
  totalEvents: number
  failedLogins: number
  suspiciousActivity: number
  recentCritical: AuditLogEntry[]
}> {
  const [totalSnap, failedSnap, suspiciousSnap] = await Promise.all([
    getDocs(query(collections.auditLogs(), where("userId", "==", userId))),
    getDocs(
      query(
        collections.auditLogs(),
        where("userId", "==", userId),
        where("eventType", "==", "auth.failed_login")
      )
    ),
    getDocs(
      query(
        collections.auditLogs(),
        where("userId", "==", userId),
        where("severity", "==", "critical")
      )
    ),
  ])

  const recentCritical = await queryDocuments<AuditLogEntry>(
    collections.auditLogs(),
    where("userId", "==", userId),
    where("severity", "==", "critical"),
    orderBy("createdAt", "desc"),
    limit(10)
  )

  return {
    totalEvents: totalSnap.size,
    failedLogins: failedSnap.size,
    suspiciousActivity: suspiciousSnap.size,
    recentCritical,
  }
}
