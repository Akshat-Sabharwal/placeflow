import { authorizeRequest } from '@/lib/auth'
import { stageOnboardingSchema } from '@/lib/contracts/schemas'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import {
  loadOnboardingSnapshot,
  requireStudentProfile,
  toOnboardingRecordDTO,
} from '@/lib/server/onboarding'
import { createAdminClient } from '@/lib/server/supabase-admin'

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest('student')
    const snapshot = await loadOnboardingSnapshot(createAdminClient(), viewer.userId)
    return apiData(snapshot, { headers: PRIVATE_NO_STORE_HEADERS })
  })
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const body = await parseJson(request, stageOnboardingSchema)
    const admin = createAdminClient()
    await requireStudentProfile(admin, viewer.userId)

    const [{ data: record, error: recordError }, { data: extraction, error: extractionError }] = await Promise.all([
      admin
        .from('onboarding_records')
        .select('*')
        .eq('id', body.recordId)
        .eq('student_id', viewer.userId)
        .maybeSingle(),
      admin
        .from('document_extractions')
        .select('*')
        .eq('id', body.extractionId)
        .eq('student_id', viewer.userId)
        .maybeSingle(),
    ])
    if (recordError) throw new Error(recordError.message)
    if (extractionError) throw new Error(extractionError.message)
    if (!record) throw new RouteError(404, 'NOT_FOUND', 'Onboarding record not found.')
    if (!extraction || extraction.onboarding_record_id !== record.id || extraction.status !== 'succeeded') {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Choose a successful extraction for this onboarding record.', {
        field: 'extractionId',
      })
    }
    const { data, error } = await admin
      .from('onboarding_records')
      .update({
        source_document_id: extraction.document_id,
        accepted_extraction_id: extraction.id,
        status: 'ready',
        staged_full_name: body.fields.fullName,
        staged_roll_number: body.fields.rollNumber,
        staged_branch: body.fields.branch,
        staged_graduation_year: body.fields.graduationYear,
        staged_cgpa: body.fields.cgpa,
        staged_backlogs: body.fields.backlogs,
        staged_linkedin_url: body.fields.linkedinUrl || null,
        staged_github_url: body.fields.githubUrl || null,
      })
      .eq('id', record.id)
      .eq('student_id', viewer.userId)
      .eq('updated_at', body.expectedUpdatedAt)
      .select('*')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) {
      throw new RouteError(409, 'STALE_WRITE', 'This onboarding draft changed in another tab. Reload it before saving.')
    }
    return apiData(toOnboardingRecordDTO(data), { headers: PRIVATE_NO_STORE_HEADERS })
  })
}
