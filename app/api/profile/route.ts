import { authorizeRequest } from '@/lib/auth'
import { apiData, assertSameOrigin, handleRoute, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import { toProfileDTO } from '@/lib/server/dto'

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const { data, error } = await viewer.supabase.from('profiles').select('*').eq('id', viewer.userId).single()
    if (error || !data) throw new RouteError(404, 'NOT_FOUND', 'Your profile could not be found.')
    return apiData(
      { viewer: { userId: viewer.userId, email: viewer.email, role: viewer.role }, profile: toProfileDTO(data) },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  })
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    await authorizeRequest('student')
    throw new RouteError(
      403,
      'PROFILE_LOCKED',
      'Placement profile fields can only be populated through document-driven onboarding.',
    )
  })
}
