import { deletePushSubscriptionSchema, pushSubscriptionSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { apiData, assertSameOrigin, handleRoute, parseJson } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const body = await parseJson(request, pushSubscriptionSchema)
    const { error } = await createAdminClient().from('push_subscriptions').upsert({
      user_id: viewer.userId,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    if (error) throw new Error(error.message)
    return apiData({ registered: true }, { status: 201 })
  })
}

export async function DELETE(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest()
    const body = await parseJson(request, deletePushSubscriptionSchema)
    const { error } = await createAdminClient().from('push_subscriptions').delete().eq('endpoint', body.endpoint).eq('user_id', viewer.userId)
    if (error) throw new Error(error.message)
    return new Response(null, { status: 204 })
  })
}
