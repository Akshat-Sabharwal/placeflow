import { authorizeRequest } from '@/lib/auth'
import { createCommunityMessageSchema, uuidSchema } from '@/lib/contracts/schemas'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid group id.')
    const body = await parseJson(request, createCommunityMessageSchema)
    const admin = createAdminClient()
    const { data: membership } = await admin.from('community_members').select('status').eq('group_id', id).eq('user_id', viewer.userId).maybeSingle()
    if (membership?.status !== 'active') throw new RouteError(403, 'FORBIDDEN', 'Join this group before sending messages.')
    const { data, error } = await admin.from('community_messages').insert({ group_id: id, author_id: viewer.userId, body: body.body, reply_to_id: body.replyToId ?? null }).select('*').single()
    if (error || !data) throw new Error(error?.message ?? 'Message creation failed')
    const { data: profile } = await admin.from('profiles').select('full_name,avatar_url').eq('id', viewer.userId).single()
    return apiData({ id: data.id, groupId: data.group_id, authorId: data.author_id, authorName: profile?.full_name ?? 'PlaceFlow member', authorAvatarUrl: profile?.avatar_url ?? null, replyToId: data.reply_to_id, body: data.body, createdAt: data.created_at, updatedAt: data.updated_at }, { status: 201, headers: PRIVATE_NO_STORE_HEADERS })
  })
}
