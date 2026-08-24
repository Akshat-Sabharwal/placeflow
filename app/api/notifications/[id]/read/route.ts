import { uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { apiData, assertSameOrigin, handleRoute, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toNotificationDTO } from '@/lib/server/dto'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid notification id.')
    const { data, error } = await createAdminClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', viewer.userId).select().maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new RouteError(404, 'NOT_FOUND', 'Notification not found.')
    return apiData(toNotificationDTO(data))
  })
}
