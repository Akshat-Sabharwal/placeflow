import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { AppRole, ViewerDTO } from '@/lib/contracts/domain'
import type { Database } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'

export class AuthAccessError extends Error {
  constructor(public readonly kind: 'UNAUTHENTICATED' | 'FORBIDDEN') {
    super(kind)
  }
}

export async function getVerifiedViewer(
  suppliedClient?: SupabaseClient<Database>,
): Promise<(ViewerDTO & { supabase: SupabaseClient<Database> }) | null> {
  const supabase = suppliedClient ?? (await createClient())
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return null

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (roleError || !roleRow) return null
  return {
    userId,
    email: typeof claimsData.claims.email === 'string' ? claimsData.claims.email : null,
    role: roleRow.role,
    supabase,
  }
}

export async function authorizeRequest(role?: AppRole) {
  const viewer = await getVerifiedViewer()
  if (!viewer) throw new AuthAccessError('UNAUTHENTICATED')
  if (role && viewer.role !== role) throw new AuthAccessError('FORBIDDEN')
  return viewer
}

export async function requireUser() {
  const viewer = await getVerifiedViewer()
  if (!viewer) redirect('/login')
  return viewer
}

async function requireRole(role: AppRole) {
  const viewer = await requireUser()
  if (viewer.role !== role) redirect('/post-auth')
  return viewer
}

export const requireStudent = () => requireRole('student')
export const requireCoordinator = () => requireRole('coordinator')
