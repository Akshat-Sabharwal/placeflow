import { uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { apiData, handleRoute, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid document id.')
    const admin = createAdminClient()
    const [{ data: document }, { data: application }, { data: activeProfile }] = await Promise.all([
      admin.from('documents').select('*').eq('id', id).maybeSingle(),
      admin.from('applications').select('id,drive_id').eq('resume_document_id', id).limit(1).maybeSingle(),
      admin.from('profiles').select('id').eq('active_profile_document_id', id).maybeSingle(),
    ])
    const ownsDocument = document?.student_id === viewer.userId
    let coordinatorApplicationAccess = false
    if (viewer.role === 'coordinator' && application) {
      const { data: ownedDrive } = await admin
        .from('drives')
        .select('id')
        .eq('id', application.drive_id)
        .eq('created_by', viewer.userId)
        .maybeSingle()
      coordinatorApplicationAccess = Boolean(ownedDrive)
    }
    if (viewer.role === 'coordinator' && activeProfile && !coordinatorApplicationAccess) {
      const { data: relatedApplications } = await admin
        .from('applications')
        .select('drive_id')
        .eq('student_id', activeProfile.id)
        .limit(100)
      const driveIds = [...new Set((relatedApplications ?? []).map((item) => item.drive_id))]
      if (driveIds.length) {
        const { data: ownedDrive } = await admin
          .from('drives')
          .select('id')
          .in('id', driveIds)
          .eq('created_by', viewer.userId)
          .limit(1)
          .maybeSingle()
        coordinatorApplicationAccess = Boolean(ownedDrive)
      }
    }
    if (!document || (!ownsDocument && !coordinatorApplicationAccess)) {
      throw new RouteError(404, 'NOT_FOUND', 'Authorized document not found.')
    }
    const expiresIn = 120
    const { data, error } = await admin.storage.from('student-documents').createSignedUrl(document.storage_path, expiresIn)
    if (error || !data) throw new Error(error?.message ?? 'Signed URL creation failed')
    return apiData(
      { signedUrl: data.signedUrl, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  })
}
