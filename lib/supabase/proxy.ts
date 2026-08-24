import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database.types'
import { getPublicSupabaseEnv } from './env'

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getPublicSupabaseEnv()
  let response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  if (data?.claims?.sub) response.headers.set('Cache-Control', 'private, no-store')
  return response
}
