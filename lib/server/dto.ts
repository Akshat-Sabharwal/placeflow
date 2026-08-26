import type {
  ApplicationDTO,
  DocumentDTO,
  DriveDTO,
  NotificationDTO,
  ProfileDTO,
} from '@/lib/contracts/domain'
import type { Tables } from '@/lib/types/database.types'

export const toProfileDTO = (row: Tables<'profiles'>): ProfileDTO => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
  primaryProvider: row.primary_provider,
  rollNumber: row.roll_number,
  branch: row.branch,
  graduationYear: row.graduation_year,
  cgpa: row.cgpa,
  backlogs: row.backlogs,
  linkedinUrl: row.linkedin_url,
  githubUrl: row.github_url,
  profileVisibility: row.profile_visibility,
  showGroupMemberships: row.show_group_memberships,
  themePreference: row.theme_preference,
  defaultGroupVisibility: row.default_group_visibility,
  onboardingCompletedAt: row.onboarding_completed_at,
  activeProfileDocumentId: row.active_profile_document_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toDriveDTO = (row: Tables<'drives'>): DriveDTO => ({
  id: row.id,
  createdBy: row.created_by,
  companyName: row.company_name,
  jobRole: row.job_role,
  description: row.description,
  location: row.location,
  packageText: row.package_text,
  eligibleBranches: row.eligible_branches,
  eligibleYears: row.eligible_years,
  minimumCgpa: row.minimum_cgpa,
  maximumBacklogs: row.maximum_backlogs,
  registrationDeadline: row.registration_deadline,
  driveDate: row.drive_date,
  rounds: Array.isArray(row.rounds)
    ? row.rounds.flatMap((round) => {
        if (!round || typeof round !== 'object' || Array.isArray(round)) return []
        const name = 'name' in round && typeof round.name === 'string' ? round.name : null
        if (!name) return []
        const description =
          'description' in round && typeof round.description === 'string'
            ? round.description
            : null
        return [{ name, description }]
      })
    : [],
  activeRoundIndex: row.active_round_index,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const toApplicationDTO = (row: Tables<'applications'>): ApplicationDTO => ({
  id: row.id,
  studentId: row.student_id,
  driveId: row.drive_id,
  resumeDocumentId: row.resume_document_id,
  status: row.status,
  candidateResponse: row.candidate_response,
  candidateRespondedAt: row.candidate_responded_at,
  appliedAt: row.applied_at,
  updatedAt: row.updated_at,
})

export const toDocumentDTO = (row: Tables<'documents'>): DocumentDTO => ({
  id: row.id,
  type: row.type,
  originalName: row.original_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  uploadedAt: row.uploaded_at,
})

export const toNotificationDTO = (row: Tables<'notifications'>): NotificationDTO => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  url: row.url,
  driveId: row.drive_id,
  applicationId: row.application_id,
  readAt: row.read_at,
  createdAt: row.created_at,
})
