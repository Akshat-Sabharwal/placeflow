import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // page requests use this layer to persist refreshed cookies.
  matcher: ['/student/:path*', '/coordinator/:path*', '/post-auth'],
}
