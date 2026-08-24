import { describe, expect, it } from 'vitest'
import type { Tables } from '@/lib/types/database.types'
import { toApplicationDTO, toDocumentDTO, toDriveDTO, toNotificationDTO, toProfileDTO } from './dto'

const timestamp = '2026-08-24T10:00:00.000Z'

describe('database to API mappings', () => {
  it('maps every profile field and omits database spelling', () => {
    const row: Tables<'profiles'> = {
      id: 'user', email: 'student@example.test', full_name: 'Student One', avatar_url: null,
      primary_provider: 'github', roll_number: 'PF-1', branch: 'CSE', graduation_year: 2027,
      cgpa: 8.5, backlogs: 0, linkedin_url: null, github_url: 'https://github.com/student',
      onboarding_completed_at: timestamp, created_at: timestamp, updated_at: timestamp,
    }
    expect(toProfileDTO(row)).toEqual({
      id: 'user', email: 'student@example.test', fullName: 'Student One', avatarUrl: null,
      primaryProvider: 'github', rollNumber: 'PF-1', branch: 'CSE', graduationYear: 2027,
      cgpa: 8.5, backlogs: 0, linkedinUrl: null, githubUrl: 'https://github.com/student',
      onboardingCompletedAt: timestamp, createdAt: timestamp, updatedAt: timestamp,
    })
  })

  it('maps a drive without leaking internal column names', () => {
    const row: Tables<'drives'> = {
      id: 'drive', created_by: 'coordinator', company_name: 'Acme', job_role: 'Engineer',
      description: 'Build systems.', location: 'Remote', package_text: '12 LPA',
      eligible_branches: ['CSE'], eligible_years: [2027], minimum_cgpa: 7,
      maximum_backlogs: 0, registration_deadline: timestamp, drive_date: null,
      status: 'published', created_at: timestamp, updated_at: timestamp,
    }
    expect(toDriveDTO(row)).toMatchObject({ id: 'drive', createdBy: 'coordinator', companyName: 'Acme', jobRole: 'Engineer', eligibleBranches: ['CSE'], eligibleYears: [2027], minimumCgpa: 7, maximumBacklogs: 0 })
    expect(toDriveDTO(row)).not.toHaveProperty('created_by')
  })

  it('maps application, document, and notification timestamps', () => {
    const application: Tables<'applications'> = { id: 'app', student_id: 'student', drive_id: 'drive', resume_document_id: 'doc', status: 'applied', applied_at: timestamp, updated_at: timestamp }
    const document: Tables<'documents'> = { id: 'doc', student_id: 'student', type: 'resume', original_name: 'resume.pdf', mime_type: 'application/pdf', size_bytes: 123, storage_path: 'student/resume/doc.pdf', uploaded_at: timestamp }
    const notification: Tables<'notifications'> = { id: 'notice', user_id: 'student', type: 'status', title: 'Shortlisted', body: 'Update', url: '/student/applications', drive_id: 'drive', application_id: 'app', event_key: 'app:shortlisted', read_at: null, created_at: timestamp }

    expect(toApplicationDTO(application)).toMatchObject({ studentId: 'student', resumeDocumentId: 'doc', appliedAt: timestamp })
    expect(toDocumentDTO(document)).toEqual({ id: 'doc', type: 'resume', originalName: 'resume.pdf', mimeType: 'application/pdf', sizeBytes: 123, uploadedAt: timestamp })
    expect(toNotificationDTO(notification)).toMatchObject({ id: 'notice', driveId: 'drive', applicationId: 'app', readAt: null, createdAt: timestamp })
  })
})
