import { authorizeRequest } from '@/lib/auth'
import { uuidSchema } from '@/lib/contracts/schemas'
import { listCommunityGroups } from '@/lib/server/community'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid group id.')
    const admin = createAdminClient()
    const { data: group } = await admin.from('community_groups').select('*').eq('id', id).maybeSingle()
    if (!group) throw new RouteError(404, 'NOT_FOUND', 'Group not found.')
    const { data: current } = await admin.from('community_members').select('*').eq('group_id', id).eq('user_id', viewer.userId).maybeSingle()
    if (current?.status === 'active') throw new RouteError(409, 'CONFLICT', 'You are already a member of this group.')
    if (current?.status === 'pending') throw new RouteError(409, 'CONFLICT', 'Your join request is already pending.')
    const active = group.visibility === 'public'
    const member = { role: 'member' as const, status: active ? 'active' as const : 'pending' as const, joined_at: active ? new Date().toISOString() : null, requested_at: new Date().toISOString() }
    const mutation = current
      ? admin.from('community_members').update(member).eq('group_id', id).eq('user_id', viewer.userId)
      : admin.from('community_members').insert({ group_id: id, user_id: viewer.userId, ...member })
    const { error } = await mutation
    if (error) throw new Error(error.message)
    if (!active) {
      const { data: ownerRole } = await admin.from('user_roles').select('role').eq('user_id', group.owner_id).single()
      await admin.from('notifications').upsert({ user_id: group.owner_id, event_key: `community-request:${id}:${viewer.userId}`, type: 'community_join_request', title: 'New group join request', body: `Someone requested to join ${group.name}.`, url: `/${ownerRole?.role ?? 'student'}/community/${id}` }, { onConflict: 'user_id,event_key' })
    }
    const result = (await listCommunityGroups(admin, viewer.userId)).find((item) => item.id === id)
    if (!result) throw new Error('Joined community could not be loaded')
    return apiData(result, { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
