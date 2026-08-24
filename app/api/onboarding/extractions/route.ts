import { authorizeRequest } from '@/lib/auth'
import { createOnboardingExtractionSchema } from '@/lib/contracts/schemas'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import {
  requireOwnedOnboardingDocument,
  requireUnlockedStudentProfile,
  toDocumentExtractionDTO,
  toOnboardingRecordDTO,
} from '@/lib/server/onboarding'
import { createAdminClient } from '@/lib/server/supabase-admin'

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const body = await parseJson(request, createOnboardingExtractionSchema)
    const admin = createAdminClient()
    await requireUnlockedStudentProfile(admin, viewer.userId)
    const document = await requireOwnedOnboardingDocument(admin, viewer.userId, body.documentId)

    const recordLookup = await admin
      .from('onboarding_records')
      .select('*')
      .eq('student_id', viewer.userId)
      .maybeSingle()
    if (recordLookup.error) throw new Error(recordLookup.error.message)
    let record = recordLookup.data

    if (!record) {
      const inserted = await admin
        .from('onboarding_records')
        .insert({ student_id: viewer.userId, status: 'draft' })
        .select('*')
        .single()
      if (inserted.error?.code === '23505') {
        const existing = await admin
          .from('onboarding_records')
          .select('*')
          .eq('student_id', viewer.userId)
          .single()
        if (existing.error || !existing.data) throw new Error(existing.error?.message ?? 'Onboarding record lookup failed')
        record = existing.data
      } else if (inserted.error || !inserted.data) {
        throw new Error(inserted.error?.message ?? 'Onboarding record creation failed')
      } else {
        record = inserted.data
      }
    }

    if (record.status === 'submitted') {
      throw new RouteError(409, 'PROFILE_LOCKED', 'Your placement profile is already locked.')
    }
    if (record.status === 'cancelled') {
      const restarted = await admin
        .from('onboarding_records')
        .update({ status: 'draft' })
        .eq('id', record.id)
        .select('*')
        .single()
      if (restarted.error || !restarted.data) throw new Error(restarted.error?.message ?? 'Onboarding restart failed')
      record = restarted.data
    }

    const completedAt = new Date().toISOString()
    const { data: extraction, error: extractionError } = await admin
      .from('document_extractions')
      .insert({
        onboarding_record_id: record.id,
        document_id: document.id,
        student_id: viewer.userId,
        status: 'succeeded',
        trust: 'client_asserted',
        extractor_name: body.extractorName,
        extractor_version: body.extractorVersion ?? null,
        source_original_name: document.original_name,
        source_mime_type: document.mime_type,
        source_size_bytes: document.size_bytes,
        source_sha256: body.sourceSha256 ?? null,
        extracted_fields: body.extractedFields,
        field_confidence: body.fieldConfidence,
        completed_at: completedAt,
      })
      .select('*')
      .single()
    if (extractionError || !extraction) throw new Error(extractionError?.message ?? 'Extraction provenance creation failed')

    const extracted = body.extractedFields
    const { data: updatedRecord, error: updateError } = await admin
      .from('onboarding_records')
      .update({
        source_document_id: document.id,
        accepted_extraction_id: null,
        status: 'review_required',
        staged_full_name: extracted.fullName ?? null,
        staged_roll_number: extracted.rollNumber ?? null,
        staged_branch: extracted.branch ?? null,
        staged_graduation_year: extracted.graduationYear ?? null,
        staged_cgpa: extracted.cgpa ?? null,
        staged_backlogs: extracted.backlogs ?? null,
        staged_linkedin_url: extracted.linkedinUrl || null,
        staged_github_url: extracted.githubUrl || null,
      })
      .eq('id', record.id)
      .eq('student_id', viewer.userId)
      .eq('updated_at', record.updated_at)
      .select('*')
      .maybeSingle()
    if (updateError) throw new Error(updateError.message)
    if (!updatedRecord) {
      throw new RouteError(409, 'STALE_WRITE', 'This onboarding draft changed in another tab. Reload it before extracting again.')
    }

    const snapshot = {
      record: toOnboardingRecordDTO(updatedRecord),
      latestExtraction: toDocumentExtractionDTO(extraction),
    }
    return apiData(snapshot, { status: 201, headers: PRIVATE_NO_STORE_HEADERS })
  })
}
