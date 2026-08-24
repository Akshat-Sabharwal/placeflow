import { describe, expect, it } from 'vitest'
import { evaluateEligibility } from './eligibility'

const student = {
  onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
  branch: ' computer   science ',
  graduationYear: 2027,
  cgpa: 8,
  backlogs: 0,
}
const drive = {
  status: 'published' as const,
  registrationDeadline: '2026-12-01T00:00:00.000Z',
  eligibleBranches: ['COMPUTER SCIENCE'],
  eligibleYears: [2027],
  minimumCgpa: 8,
  maximumBacklogs: 0,
}
const now = new Date('2026-08-01T00:00:00.000Z')

describe('evaluateEligibility', () => {
  it('accepts equality boundaries and normalized branches', () => {
    expect(evaluateEligibility(student, drive, now)).toEqual({ eligible: true, reasons: [] })
  })

  it.each([
    [{ ...student, onboardingCompletedAt: null }, 'PROFILE_INCOMPLETE'],
    [{ ...student, branch: 'ECE' }, 'BRANCH_NOT_ELIGIBLE'],
    [{ ...student, graduationYear: 2028 }, 'YEAR_NOT_ELIGIBLE'],
    [{ ...student, cgpa: 7.99 }, 'CGPA_TOO_LOW'],
    [{ ...student, backlogs: 1 }, 'TOO_MANY_BACKLOGS'],
  ] as const)('rejects a student mismatch', (candidate, reason) => {
    expect(evaluateEligibility(candidate, drive, now).reasons).toContain(reason)
  })

  it('rejects non-published and expired drives', () => {
    expect(evaluateEligibility(student, { ...drive, status: 'draft' }, now).reasons).toContain('DRIVE_NOT_OPEN')
    expect(evaluateEligibility(student, drive, new Date(drive.registrationDeadline)).reasons).toContain('DEADLINE_PASSED')
  })
})
