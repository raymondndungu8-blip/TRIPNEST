import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const suspiciousIps = new Map<string, { count: number; lastSeen: number }>()

export async function isIpBlocked(ip: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_ips')
    .select('ip')
    .eq('ip', ip)
    .single()
  return !!data
}

export async function blockIp(ip: string, reason?: string): Promise<void> {
  await supabase.from('blocked_ips').upsert({ ip, reason: reason || 'manual', blocked_at: new Date().toISOString() })
  console.log(`[IP BLOCK] Blocked ${ip}. Reason: ${reason || 'manual'}`)
}

export async function unblockIp(ip: string): Promise<void> {
  await supabase.from('blocked_ips').delete().eq('ip', ip)
  console.log(`[IP UNBLOCK] Unblocked ${ip}`)
}

export async function getBlockedIps(): Promise<string[]> {
  const { data } = await supabase.from('blocked_ips').select('ip')
  return (data || []).map((row: { ip: string }) => row.ip)
}

export function trackSuspiciousActivity(ip: string): boolean {
  const now = Date.now()
  const record = suspiciousIps.get(ip)

  if (!record) {
    suspiciousIps.set(ip, { count: 1, lastSeen: now })
    return false
  }

  const timeSinceLastSeen = now - record.lastSeen
  if (timeSinceLastSeen > 3600000) {
    suspiciousIps.set(ip, { count: 1, lastSeen: now })
    return false
  }

  record.count++
  record.lastSeen = now

  if (record.count >= 10) {
    blockIp(ip, 'Excessive suspicious activity')
    return true
  }

  return record.count >= 5
}

export async function checkAbuseIpdb(ip: string): Promise<{
  isKnownAbuser: boolean
  confidenceScore: number
  abuseReports: number
}> {
  const apiKey = process.env.ABUSEIPDB_API_KEY

  if (!apiKey) {
    return { isKnownAbuser: false, confidenceScore: 0, abuseReports: 0 }
  }

  try {
    const response = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`,
      {
        headers: {
          Key: apiKey,
          Accept: 'application/json',
        },
      }
    )

    if (!response.ok) {
      return { isKnownAbuser: false, confidenceScore: 0, abuseReports: 0 }
    }

    const data = await response.json()

    return {
      isKnownAbuser: data.data?.isPublic || false,
      confidenceScore: data.data?.abuseConfidenceScore || 0,
      abuseReports: data.data?.totalReports || 0,
    }
  } catch (error) {
    console.error('[ABUSEIPDB] Check failed:', error)
    return { isKnownAbuser: false, confidenceScore: 0, abuseReports: 0 }
  }
}

export function clearSuspiciousActivity(): void {
  suspiciousIps.clear()
}
