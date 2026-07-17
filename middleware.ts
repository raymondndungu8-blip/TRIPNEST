import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityHeaders } from '@/lib/security-headers'

export function middleware(request: NextRequest) {
  const response = securityHeaders(request)

  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const pathname = request.nextUrl.pathname

  response.headers.set('X-Client-IP', clientIp)

  const sensitivePaths = ['/api/payment', '/api/admin', '/api/wallet']
  const isSensitive = sensitivePaths.some(path => pathname.startsWith(path))

  if (isSensitive) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
