import { notificationQuerySchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { apiCollection, handleRoute, RouteError } from '@/lib/server/http'
import { toNotificationDTO } from '@/lib/server/dto'

export async function GET(request: Request) {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const parsed = notificationQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid notification filters.', { fieldErrors: parsed.error.flatten().fieldErrors })
    let query = viewer.supabase.from('notifications').select('*').eq('user_id', viewer.userId).order('created_at', { ascending: false }).limit(50)
    if (parsed.data.unreadOnly === 'true') query = query.is('read_at', null)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return apiCollection((data ?? []).map(toNotificationDTO))
  })
}
