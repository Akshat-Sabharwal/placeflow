import { authorizeRequest } from '@/lib/auth'
import { uuidSchema } from '@/lib/contracts/schemas'
import { getCommunityDetail } from '@/lib/server/community'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, handleRoute, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid group id.')
    const group = await getCommunityDetail(createAdminClient(), viewer.userId, id)
    if (!group) throw new RouteError(404, 'NOT_FOUND', 'Group not found.')
    return apiData(group, { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
