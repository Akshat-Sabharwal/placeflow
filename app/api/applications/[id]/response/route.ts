import { authorizeRequest } from '@/lib/auth'
import { candidateResponseSchema, uuidSchema } from '@/lib/contracts/schemas'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toApplicationDTO } from '@/lib/server/dto'
import { apiData, assertSameOrigin, handleRoute, parseJson, RouteError } from '@/lib/server/http'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid application id.')
    }
    const body = await parseJson(request, candidateResponseSchema)
    const admin = createAdminClient()
    const { data: application, error: applicationError } = await admin
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('student_id', viewer.userId)
      .maybeSingle()
    if (applicationError) throw new Error(applicationError.message)
    if (!application) throw new RouteError(404, 'NOT_FOUND', 'Application not found.')
    if (!['shortlisted', 'selected'].includes(application.status)) {
      throw new RouteError(409, 'INVALID_STATUS_TRANSITION', 'You can respond after being shortlisted.')
    }

    const { data: updated, error } = await admin
      .from('applications')
      .update({ candidate_response: body.response })
      .eq('id', id)
      .eq('student_id', viewer.userId)
      .eq('updated_at', application.updated_at)
      .select('*')
      .maybeSingle()
    if (error?.code === '23514') {
      throw new RouteError(409, 'INVALID_STATUS_TRANSITION', 'This application can no longer receive a candidate response.')
    }
    if (error) throw new Error(error.message)
    if (!updated) throw new RouteError(409, 'STALE_WRITE', 'This application changed in another tab. Refresh and try again.')

    const [{ data: drive }, { data: profile }] = await Promise.all([
      admin.from('drives').select('created_by,company_name,job_role').eq('id', updated.drive_id).single(),
      admin.from('profiles').select('full_name').eq('id', viewer.userId).single(),
    ])
    if (drive) {
      const respondedAt = updated.candidate_responded_at ?? updated.updated_at
      const responseLabel = body.response === 'accepted' ? 'accepted' : 'declined'
      const { error: notificationError } = await admin.from('notifications').upsert({
        user_id: drive.created_by,
        event_key: `candidate-response:${updated.id}:${body.response}:${respondedAt}`,
        type: 'candidate_response_changed',
        title: `Candidate ${responseLabel} the shortlist`,
        body: `${profile?.full_name ?? 'A candidate'} ${responseLabel} the next step for ${drive.company_name} - ${drive.job_role}.`,
        url: `/coordinator/drives/${updated.drive_id}`,
        drive_id: updated.drive_id,
        application_id: updated.id,
      }, { onConflict: 'user_id,event_key' })
      if (notificationError) throw new Error(notificationError.message)
    }
    return apiData(toApplicationDTO(updated))
  })
}
