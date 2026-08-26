import { changeApplicationStatusSchema, uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { canTransitionApplication } from '@/lib/domain/application-status'
import { apiData, assertSameOrigin, handleRoute, parseJson, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toApplicationDTO } from '@/lib/server/dto'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('coordinator')
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid application id.')
    const body = await parseJson(request, changeApplicationStatusSchema)
    const admin = createAdminClient()
    const { data: current } = await admin.from('applications').select('*').eq('id', id).maybeSingle()
    if (!current) throw new RouteError(404, 'NOT_FOUND', 'Application not found.')
    const { data: managedDrive } = await admin.from('drives').select('id').eq('id', current.drive_id).eq('created_by', viewer.userId).maybeSingle()
    if (!managedDrive) throw new RouteError(404, 'NOT_FOUND', 'Application not found.')
    if (!canTransitionApplication(current.status, body.status)) {
      throw new RouteError(409, 'INVALID_STATUS_TRANSITION', `Cannot move an application from ${current.status} to ${body.status}.`)
    }
    if (body.status === 'selected' && current.candidate_response === 'declined') {
      throw new RouteError(409, 'INVALID_STATUS_TRANSITION', 'This candidate declined the next step and cannot be selected.')
    }
    const { data, error } = await admin.from('applications').update({ status: body.status }).eq('id', id).eq('status', current.status).eq('updated_at', current.updated_at).select().maybeSingle()
    if (error?.code === '23514') throw new RouteError(409, 'INVALID_STATUS_TRANSITION', 'The requested status transition is no longer valid.')
    if (error) throw new Error(error.message)
    if (!data) throw new RouteError(409, 'CONFLICT', 'The application changed while you were updating it. Refresh and try again.')
    return apiData(toApplicationDTO(data))
  })
}
