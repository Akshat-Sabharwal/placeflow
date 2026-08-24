import { normalizeBranch } from '@/lib/contracts/branches'
import type { DriveStatus, EligibilityDTO } from '@/lib/contracts/domain'

export type EligibilityStudent = {
  onboardingCompletedAt: string | null
  branch: string | null
  graduationYear: number | null
  cgpa: number | null
  backlogs: number | null
}

export type EligibilityDrive = {
  status: DriveStatus
  registrationDeadline: string
  eligibleBranches: string[]
  eligibleYears: number[]
  minimumCgpa: number
  maximumBacklogs: number
}

export function evaluateEligibility(
  student: EligibilityStudent,
  drive: EligibilityDrive,
  now: Date = new Date(),
): EligibilityDTO {
  const reasons: EligibilityDTO['reasons'] = []
  const profileComplete =
    student.onboardingCompletedAt !== null &&
    student.branch !== null &&
    student.graduationYear !== null &&
    student.cgpa !== null &&
    student.backlogs !== null

  if (!profileComplete) reasons.push('PROFILE_INCOMPLETE')
  if (drive.status !== 'published') reasons.push('DRIVE_NOT_OPEN')
  if (now.getTime() >= new Date(drive.registrationDeadline).getTime()) reasons.push('DEADLINE_PASSED')

  if (student.branch !== null) {
    const branch = normalizeBranch(student.branch)
    if (!drive.eligibleBranches.some((candidate) => normalizeBranch(candidate) === branch)) {
      reasons.push('BRANCH_NOT_ELIGIBLE')
    }
  }
  if (student.graduationYear !== null && !drive.eligibleYears.includes(student.graduationYear)) {
    reasons.push('YEAR_NOT_ELIGIBLE')
  }
  if (student.cgpa !== null && student.cgpa < drive.minimumCgpa) reasons.push('CGPA_TOO_LOW')
  if (student.backlogs !== null && student.backlogs > drive.maximumBacklogs) reasons.push('TOO_MANY_BACKLOGS')

  return { eligible: reasons.length === 0, reasons }
}
