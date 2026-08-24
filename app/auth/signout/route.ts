import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppUrl } from '@/lib/supabase/env'
import { assertSameOrigin, handleRoute } from '@/lib/server/http'

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: 'local' })
    return NextResponse.redirect(`${getAppUrl()}/login`, { status: 303 })
  })
}
