import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/supabase/env'
import { createAdminClient } from '@/lib/server/supabase-admin'
import type { AppRole } from '@/lib/contracts/domain'

function parseRole(value: string | null): AppRole | null {
  return value === 'student' || value === 'coordinator' ? value : null
}

function redirectWithoutCaching(url: string) {
  const response = NextResponse.redirect(url)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const code = searchParams.get('code')
  const selectedRole = parseRole(searchParams.get('role'))
  const appUrl = getAppUrl()
  if (!code) return redirectWithoutCaching(`${appUrl}/auth/auth-code-error`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) {
    return redirectWithoutCaching(`${appUrl}/auth/auth-code-error`)
  }

  if (selectedRole) {
    const selectedAt = new Date().toISOString()
    const { error: roleError } = await createAdminClient()
      .from('user_roles')
      .update({
        role: selectedRole,
        granted_at: selectedAt,
        role_selected_at: selectedAt,
      })
      .eq('user_id', data.user.id)
      .is('role_selected_at', null)

    if (roleError) {
      return redirectWithoutCaching(`${appUrl}/auth/auth-code-error`)
    }
  }

  return redirectWithoutCaching(`${appUrl}/post-auth`)
}
