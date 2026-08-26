import { authorizeRequest } from '@/lib/auth'
import { uuidSchema } from '@/lib/contracts/schemas'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { apiData, assertSameOrigin, handleRoute, RouteError } from '@/lib/server/http'

type Context = { params: Promise<{ id: string }> }

async function driveId(context: Context) {
  const { id } = await context.params
  if (!uuidSchema.safeParse(id).success) {
    throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid drive id.')
  }
  return id
}

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const id = await driveId(context)
    const admin = createAdminClient()
    const { data: drive } = await admin.from('drives').select('id').eq('id', id).maybeSingle()
    if (!drive) throw new RouteError(404, 'NOT_FOUND', 'Drive not found.')
    const { error } = await admin
      .from('pinned_drives')
      .upsert({ student_id: viewer.userId, drive_id: id }, { onConflict: 'student_id,drive_id' })
    if (error) throw new Error(error.message)
    return apiData({ pinned: true })
  })
}

export async function DELETE(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const id = await driveId(context)
    const { error } = await createAdminClient()
      .from('pinned_drives')
      .delete()
      .eq('student_id', viewer.userId)
      .eq('drive_id', id)
    if (error) throw new Error(error.message)
    return apiData({ pinned: false })
  })
}
