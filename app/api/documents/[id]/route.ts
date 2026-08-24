import { uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { assertSameOrigin, handleRoute, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'

type Context = { params: Promise<{ id: string }> }

export async function DELETE(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid document id.')
    const admin = createAdminClient()
    const { data: document } = await admin.from('documents').select('*').eq('id', id).eq('student_id', viewer.userId).maybeSingle()
    if (!document) throw new RouteError(404, 'NOT_FOUND', 'Document not found.')
    const [applicationLookup, onboardingLookup, extractionLookup] = await Promise.all([
      admin.from('applications').select('id').eq('resume_document_id', id).limit(1).maybeSingle(),
      admin.from('onboarding_records').select('id').eq('source_document_id', id).limit(1).maybeSingle(),
      admin.from('document_extractions').select('id').eq('document_id', id).limit(1).maybeSingle(),
    ])
    const lookupError = applicationLookup.error ?? onboardingLookup.error ?? extractionLookup.error
    if (lookupError) throw new Error(lookupError.message)
    if (applicationLookup.data || onboardingLookup.data || extractionLookup.data) {
      throw new RouteError(409, 'DOCUMENT_IN_USE', 'This document is part of an application or onboarding record and cannot be deleted.')
    }
    const { error: storageError } = await admin.storage.from('student-documents').remove([document.storage_path])
    if (storageError) throw new Error(storageError.message)
    const { error } = await admin.from('documents').delete().eq('id', id).eq('student_id', viewer.userId)
    if (error) throw new Error(error.message)
    return new Response(null, { status: 204 })
  })
}
