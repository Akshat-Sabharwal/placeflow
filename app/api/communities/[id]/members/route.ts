import { authorizeRequest } from '@/lib/auth'
import { moderateCommunityMemberSchema, uuidSchema } from '@/lib/contracts/schemas'
import { getCommunityDetail } from '@/lib/server/community'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid group id.')
    const body = await parseJson(request, moderateCommunityMemberSchema)
    const admin = createAdminClient()
    const { data: moderator } = await admin.from('community_members').select('role,status').eq('group_id', id).eq('user_id', viewer.userId).maybeSingle()
    if (moderator?.status !== 'active' || !['owner', 'moderator'].includes(moderator.role)) throw new RouteError(403, 'FORBIDDEN', 'Only group owners and moderators can review requests.')
    const status = body.action === 'approve' ? 'active' : 'rejected'
    const { data: changed, error } = await admin.from('community_members').update({ status, joined_at: status === 'active' ? new Date().toISOString() : null }).eq('group_id', id).eq('user_id', body.userId).eq('status', 'pending').select('user_id').maybeSingle()
    if (error) throw new Error(error.message)
    if (!changed) throw new RouteError(404, 'NOT_FOUND', 'Pending request not found.')
    const { data: group } = await admin.from('community_groups').select('name').eq('id', id).single()
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', body.userId).single()
    await admin.from('notifications').upsert({ user_id: body.userId, event_key: `community-request-result:${id}:${body.userId}`, type: 'community_join_result', title: body.action === 'approve' ? 'Group request approved' : 'Group request declined', body: body.action === 'approve' ? `You can now chat in ${group?.name ?? 'the group'}.` : `Your request to join ${group?.name ?? 'the group'} was declined.`, url: `/${role?.role ?? 'student'}/community/${id}` }, { onConflict: 'user_id,event_key' })
    const detail = await getCommunityDetail(admin, viewer.userId, id)
    if (!detail) throw new RouteError(404, 'NOT_FOUND', 'Group not found.')
    return apiData(detail, { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
