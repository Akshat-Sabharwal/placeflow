import { describe, expect, it } from 'vitest'
import type { Tables } from '@/lib/types/database.types'
import { ONBOARDING_MIME_TYPES, toDocumentExtractionDTO, toOnboardingRecordDTO } from './onboarding'

const timestamp = '2026-08-24T10:00:00.000Z'

describe('onboarding server contracts', () => {
  it('limits onboarding sources to PDFs and common images', () => {
    expect([...ONBOARDING_MIME_TYPES]).toEqual([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ])
    expect(ONBOARDING_MIME_TYPES.has('text/plain')).toBe(false)
  })

  it('maps a staged record without database column names', () => {
    const row: Tables<'onboarding_records'> = {
      id: 'record', student_id: 'student', source_document_id: 'document', accepted_extraction_id: 'extraction',
      status: 'ready', staged_full_name: 'Student One', staged_roll_number: 'PF-1', staged_branch: 'CSE',
      staged_graduation_year: 2027, staged_cgpa: 8.5, staged_backlogs: 0, staged_linkedin_url: null,
      staged_github_url: 'https://github.com/student', submitted_at: null, created_at: timestamp, updated_at: timestamp,
    }
    const result = toOnboardingRecordDTO(row)
    expect(result).toMatchObject({ id: 'record', status: 'ready', sourceDocumentId: 'document' })
    expect(result.fields).toEqual({
      fullName: 'Student One', rollNumber: 'PF-1', branch: 'CSE', graduationYear: 2027,
      cgpa: 8.5, backlogs: 0, linkedinUrl: null, githubUrl: 'https://github.com/student',
    })
    expect(result).not.toHaveProperty('student_id')
  })

  it('filters unknown provenance fields before returning them', () => {
    const row: Tables<'document_extractions'> = {
      id: 'extraction', onboarding_record_id: 'record', document_id: 'document', student_id: 'student',
      status: 'succeeded', trust: 'client_asserted', extractor_name: 'tesseract.js', extractor_version: '7.0.0',
      source_original_name: 'marksheet.png', source_mime_type: 'image/png', source_size_bytes: 100,
      source_sha256: 'a'.repeat(64), extracted_fields: { fullName: 'Student One', role: 'coordinator' },
      field_confidence: { fullName: 0.9, role: 1, cgpa: 2 }, raw_output: { secret: true }, error_code: null,
      error_message: null, completed_at: timestamp, created_at: timestamp,
    }
    const result = toDocumentExtractionDTO(row)
    expect(result.extractedFields).toEqual({ fullName: 'Student One' })
    expect(result.fieldConfidence).toEqual({ fullName: 0.9 })
    expect(result).not.toHaveProperty('rawOutput')
  })
})
