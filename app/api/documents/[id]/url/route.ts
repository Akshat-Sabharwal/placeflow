import { uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { apiData, handleRoute, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    await authorizeRequest('coordinator')
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid document id.')
    const admin = createAdminClient()
    const [{ data: document }, { data: application }] = await Promise.all([
      admin.from('documents').select('*').eq('id', id).maybeSingle(),
      admin.from('applications').select('id,drive_id').eq('resume_document_id', id).limit(1).maybeSingle(),
    ])
    if (!document || !application) throw new RouteError(404, 'NOT_FOUND', 'Authorized application resume not found.')
    const expiresIn = 120
    const { data, error } = await admin.storage.from('student-documents').createSignedUrl(document.storage_path, expiresIn)
    if (error || !data) throw new Error(error?.message ?? 'Signed URL creation failed')
    return apiData(
      { signedUrl: data.signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  })
}
