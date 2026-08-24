import { authorizeRequest } from '@/lib/auth'
import { createCommunityGroupSchema } from '@/lib/contracts/schemas'
import { listCommunityGroups } from '@/lib/server/community'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 62) || 'group'

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    return apiData(await listCommunityGroups(createAdminClient(), viewer.userId), { headers: PRIVATE_NO_STORE_HEADERS })
  })
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const body = await parseJson(request, createCommunityGroupSchema)
    const admin = createAdminClient()
    const slug = `${slugify(body.name)}-${crypto.randomUUID().slice(0, 7)}`
    const { data, error } = await admin.from('community_groups').insert({ owner_id: viewer.userId, name: body.name, slug, description: body.description, visibility: body.visibility }).select('id').single()
    if (error?.code === '23505') throw new RouteError(409, 'CONFLICT', 'A group with that identity already exists.')
    if (error || !data) throw new Error(error?.message ?? 'Community creation failed')
    const group = (await listCommunityGroups(admin, viewer.userId)).find((item) => item.id === data.id)
    if (!group) throw new Error('Created community could not be loaded')
    return apiData(group, { status: 201, headers: PRIVATE_NO_STORE_HEADERS })
  })
}
