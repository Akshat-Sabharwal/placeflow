import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { getPublicSupabaseEnv, getSupabaseSecretKey } from '@/lib/supabase/env'

export function createAdminClient() {
  const { url } = getPublicSupabaseEnv()
  return createClient<Database>(url, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
