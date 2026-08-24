import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Server Components need Proxy to persist refreshed cookies. Route Handlers
  // can write their own refresh cookies, so running Proxy for /api would verify
  // every API request twice.
  matcher: ['/student/:path*', '/coordinator/:path*', '/post-auth'],
}
