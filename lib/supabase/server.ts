import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'
import { getPublicSupabaseEnv } from './env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getPublicSupabaseEnv()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // page refresh cookies are written by the proxy.
        }
      },
    },
  })
}
