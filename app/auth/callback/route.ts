import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/supabase/env'

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')
  const appUrl = getAppUrl()
  if (!code) return NextResponse.redirect(`${appUrl}/auth/auth-code-error`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  return NextResponse.redirect(error ? `${appUrl}/auth/auth-code-error` : `${appUrl}/post-auth`)
}
