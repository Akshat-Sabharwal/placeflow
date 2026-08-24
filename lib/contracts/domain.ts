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
export type CommunityVisibility = 'public' | 'private'
export type CommunityMemberRole = 'owner' | 'moderator' | 'member'
export type CommunityMemberStatus = 'pending' | 'active' | 'rejected'
export type ThemePreference = 'light' | 'dark'
export type ProfileVisibility = 'public' | 'private'

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
  profileVisibility: ProfileVisibility
  showGroupMemberships: boolean
  themePreference: ThemePreference
  defaultGroupVisibility: CommunityVisibility
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

export type StudentDashboardDTO = {
  viewer: ViewerDTO
  profile: ProfileDTO
  drives: DriveDTO[]
  applications: ApplicationDTO[]
}

export type SignedDocumentUrlDTO = { signedUrl: string; expiresAt: string }

export type SettingsDTO = {
  profileVisibility: ProfileVisibility
  showGroupMemberships: boolean
  themePreference: ThemePreference
  defaultGroupVisibility: CommunityVisibility
}

export type CommunityGroupDTO = {
  id: string
  name: string
  slug: string
  description: string
  visibility: CommunityVisibility
  ownerId: string
  ownerName: string
  memberCount: number
  viewerRole: CommunityMemberRole | null
  viewerStatus: CommunityMemberStatus | null
  pendingCount: number
  createdAt: string
}

export type CommunityMemberDTO = {
  userId: string
  fullName: string
  avatarUrl: string | null
  role: CommunityMemberRole
  status: CommunityMemberStatus
  requestedAt: string
  joinedAt: string | null
}

export type CommunityMessageDTO = {
  id: string
  groupId: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  replyToId: string | null
  body: string
  createdAt: string
  updatedAt: string
}

export type CommunityGroupDetailDTO = CommunityGroupDTO & {
  members: CommunityMemberDTO[]
  messages: CommunityMessageDTO[]
}

export type ProfileGraphNodeDTO = {
  id: string
  label: string
  role: AppRole
  branch: string | null
  graduationYear: number | null
  avatarUrl: string | null
  groupCount: number
  isViewer: boolean
}

export type ProfileGraphEdgeDTO = {
  source: string
  target: string
  sharedGroups: number
}

export type ProfileGraphDTO = {
  nodes: ProfileGraphNodeDTO[]
  edges: ProfileGraphEdgeDTO[]
}
