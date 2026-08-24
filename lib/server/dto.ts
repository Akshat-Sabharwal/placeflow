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
  onboardingCompletedAt: row.onboarding_completed_at,
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
