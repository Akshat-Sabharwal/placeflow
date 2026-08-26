import 'server-only'

import type {
  DocumentExtractionDTO,
  OnboardingProfileFieldsDTO,
  OnboardingRecordDTO,
  OnboardingSnapshotDTO,
} from '@/lib/contracts/domain'
import type { Json, Tables } from '@/lib/types/database.types'
import { RouteError } from './http'
import type { createAdminClient } from './supabase-admin'

type AdminClient = ReturnType<typeof createAdminClient>

export const ONBOARDING_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

const profileFieldNames = [
  'fullName',
  'rollNumber',
  'branch',
  'graduationYear',
  'cgpa',
  'backlogs',
  'linkedinUrl',
  'githubUrl',
] as const

function safeJsonObject(value: Json): Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function toExtractedFields(value: Json): Partial<OnboardingProfileFieldsDTO> {
  const source = safeJsonObject(value)
  const result: Partial<OnboardingProfileFieldsDTO> = {}
  for (const key of ['fullName', 'rollNumber', 'branch', 'linkedinUrl', 'githubUrl'] as const) {
    const field = source[key]
    if (field === null || typeof field === 'string') result[key] = field
  }
  for (const key of ['graduationYear', 'cgpa', 'backlogs'] as const) {
    const field = source[key]
    if (field === null || typeof field === 'number') result[key] = field
  }
  return result
}

function toFieldConfidence(value: Json): DocumentExtractionDTO['fieldConfidence'] {
  const source = safeJsonObject(value)
  const result: DocumentExtractionDTO['fieldConfidence'] = {}
  for (const key of profileFieldNames) {
    const confidence = source[key]
    if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
      result[key] = confidence
    }
  }
  return result
}

export function toOnboardingRecordDTO(row: Tables<'onboarding_records'>): OnboardingRecordDTO {
  return {
    id: row.id,
    status: row.status,
    sourceDocumentId: row.source_document_id,
    acceptedExtractionId: row.accepted_extraction_id,
    fields: {
      fullName: row.staged_full_name,
      rollNumber: row.staged_roll_number,
      branch: row.staged_branch,
      graduationYear: row.staged_graduation_year,
      cgpa: row.staged_cgpa,
      backlogs: row.staged_backlogs,
      linkedinUrl: row.staged_linkedin_url,
      githubUrl: row.staged_github_url,
    },
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toDocumentExtractionDTO(row: Tables<'document_extractions'>): DocumentExtractionDTO {
  return {
    id: row.id,
    onboardingRecordId: row.onboarding_record_id,
    documentId: row.document_id,
    status: row.status,
    trust: row.trust,
    extractorName: row.extractor_name,
    extractorVersion: row.extractor_version,
    sourceOriginalName: row.source_original_name,
    sourceMimeType: row.source_mime_type,
    sourceSizeBytes: row.source_size_bytes,
    sourceSha256: row.source_sha256,
    extractedFields: toExtractedFields(row.extracted_fields),
    fieldConfidence: toFieldConfidence(row.field_confidence),
    errorCode: row.error_code,
    errorMessage: row.error_message,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}

export async function loadOnboardingSnapshot(
  admin: AdminClient,
  studentId: string,
): Promise<OnboardingSnapshotDTO> {
  const { data: record, error: recordError } = await admin
    .from('onboarding_records')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle()
  if (recordError) throw new Error(recordError.message)
  if (!record) return { record: null, latestExtraction: null }

  const { data: extraction, error: extractionError } = await admin
    .from('document_extractions')
    .select('*')
    .eq('onboarding_record_id', record.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (extractionError) throw new Error(extractionError.message)
  return {
    record: toOnboardingRecordDTO(record),
    latestExtraction: extraction ? toDocumentExtractionDTO(extraction) : null,
  }
}

export async function requireStudentProfile(admin: AdminClient, studentId: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('id,onboarding_completed_at')
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new RouteError(404, 'NOT_FOUND', 'Your profile could not be found.')
}

export async function requireOwnedOnboardingDocument(
  admin: AdminClient,
  studentId: string,
  documentId: string,
) {
  const { data: document, error } = await admin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!document) throw new RouteError(404, 'NOT_FOUND', 'Owned source document not found.')
  if (!ONBOARDING_MIME_TYPES.has(document.mime_type)) {
    throw new RouteError(400, 'VALIDATION_ERROR', 'Onboarding requires a PDF, PNG, JPEG, or WebP source document.', {
      field: 'documentId',
    })
  }
  if (!document.storage_path.startsWith(`${studentId}/`)) {
    throw new RouteError(400, 'VALIDATION_ERROR', 'Source document is outside your private storage namespace.', {
      field: 'documentId',
    })
  }

  const { data: info, error: infoError } = await admin.storage
    .from('student-documents')
    .info(document.storage_path)
  if (infoError || !info) {
    throw new RouteError(404, 'STORAGE_OBJECT_MISSING', 'The onboarding source file could not be verified.')
  }
  if (info.size !== undefined && info.size !== document.size_bytes) {
    throw new RouteError(409, 'CONFLICT', 'The onboarding source file no longer matches its registered metadata.')
  }
  if (info.contentType && info.contentType.split(';')[0] !== document.mime_type) {
    throw new RouteError(409, 'CONFLICT', 'The onboarding source file type no longer matches its registered metadata.')
  }
  return document
}
