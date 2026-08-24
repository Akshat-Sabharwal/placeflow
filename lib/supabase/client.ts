'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'
import { getPublicSupabaseEnv } from './env'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (!browserClient) {
    const { url, publishableKey } = getPublicSupabaseEnv()
    browserClient = createBrowserClient<Database>(url, publishableKey)
  }
  return browserClient
}
