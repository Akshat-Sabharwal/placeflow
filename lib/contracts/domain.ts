export type AppRole = 'student' | 'coordinator'
export type DriveStatus =
  | 'draft'
  | 'published'
  | 'registration_closed'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected'
export type DocumentType = 'resume' | 'marksheet' | 'other'

export type ViewerDTO = {
  userId: string
  email: string | null
  role: AppRole
}

export type ProfileDTO = {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  primaryProvider: string | null
  rollNumber: string | null
  branch: string | null
  graduationYear: number | null
  cgpa: number | null
  backlogs: number | null
  linkedinUrl: string | null
  githubUrl: string | null
  onboardingCompletedAt: string | null
  createdAt: string
  updatedAt: string
}

export const ELIGIBILITY_REASONS = [
  'PROFILE_INCOMPLETE',
  'DRIVE_NOT_OPEN',
  'DEADLINE_PASSED',
  'BRANCH_NOT_ELIGIBLE',
  'YEAR_NOT_ELIGIBLE',
  'CGPA_TOO_LOW',
  'TOO_MANY_BACKLOGS',
] as const
export type EligibilityReason = (typeof ELIGIBILITY_REASONS)[number]
export type EligibilityDTO = { eligible: boolean; reasons: EligibilityReason[] }

export type DriveDTO = {
  id: string
  createdBy: string
  companyName: string
  jobRole: string
  description: string
  location: string | null
  packageText: string | null
  eligibleBranches: string[]
  eligibleYears: number[]
  minimumCgpa: number
  maximumBacklogs: number
  registrationDeadline: string
  driveDate: string | null
  status: DriveStatus
  createdAt: string
  updatedAt: string
  eligibility?: EligibilityDTO
  alreadyApplied?: boolean
  applicationCount?: number
  resumes?: DocumentDTO[]
}

export type ApplicationDTO = {
  id: string
  studentId: string
  driveId: string
  resumeDocumentId: string
  status: ApplicationStatus
  appliedAt: string
  updatedAt: string
  companyName?: string
  jobRole?: string
  driveDate?: string | null
}

export type ApplicantDTO = {
  applicationId: string
  studentId: string
  fullName: string | null
  rollNumber: string | null
  branch: string | null
  graduationYear: number | null
  cgpa: number | null
  backlogs: number | null
  applicationStatus: ApplicationStatus
  resumeDocumentId: string
  appliedAt: string
  updatedAt: string
}

export type DocumentDTO = {
  id: string
  type: DocumentType
  originalName: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export type NotificationDTO = {
  id: string
  type: string
  title: string
  body: string
  url: string
  driveId: string | null
  applicationId: string | null
  readAt: string | null
  createdAt: string
}

export type ProfileResponseDTO = {
  viewer: ViewerDTO
  profile: ProfileDTO
}

export type SignedDocumentUrlDTO = { signedUrl: string; expiresAt: string }
