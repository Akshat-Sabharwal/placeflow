import { authorizeRequest } from '@/lib/auth'
import { submitOnboardingSchema } from '@/lib/contracts/schemas'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import { toProfileDTO } from '@/lib/server/dto'
import { createAdminClient } from '@/lib/server/supabase-admin'

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const body = await parseJson(request, submitOnboardingSchema)
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('submit_onboarding_record', {
      p_record_id: body.recordId,
      p_student_id: viewer.userId,
      p_expected_updated_at: body.expectedUpdatedAt,
    })

    if (error?.code === '23505') throw new RouteError(409, 'CONFLICT', 'That roll number is already in use.')
    if (error?.message.includes('ONBOARDING_NOT_FOUND')) {
      throw new RouteError(404, 'NOT_FOUND', 'Onboarding record not found.')
    }
    if (error?.message.includes('ONBOARDING_STALE')) {
      throw new RouteError(409, 'STALE_WRITE', 'This onboarding draft changed in another tab. Reload it before submitting.')
    }
    if (error?.message.includes('ONBOARDING_NOT_READY') || error?.message.includes('ONBOARDING_INCOMPLETE')) {
      throw new RouteError(409, 'ONBOARDING_NOT_READY', 'Review and confirm every required field before submitting.')
    }
    if (error?.message.includes('PROFILE_ALREADY_LOCKED')) {
      throw new RouteError(409, 'PROFILE_LOCKED', 'Your placement profile is already locked.')
    }
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Onboarding submission did not return a profile')
    return apiData(toProfileDTO(data), { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
