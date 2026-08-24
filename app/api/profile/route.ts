import { updateProfileSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
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
    const viewer = await authorizeRequest('student')
    const body = await parseJson(request, updateProfileSchema)
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .update({
        full_name: body.fullName,
        roll_number: body.rollNumber,
        branch: body.branch,
        graduation_year: body.graduationYear,
        cgpa: body.cgpa,
        backlogs: body.backlogs,
        linkedin_url: body.linkedinUrl || null,
        github_url: body.githubUrl || null,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', viewer.userId)
      .select()
      .single()

    if (error?.code === '23505') throw new RouteError(409, 'CONFLICT', 'That roll number is already in use.')
    if (error || !data) throw new Error(error?.message ?? 'Profile update failed')
    return apiData(toProfileDTO(data))
  })
}
