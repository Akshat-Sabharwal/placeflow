import { describe, expect, it } from 'vitest'
import { createDriveSchema, updateProfileSchema } from './schemas'

describe('request contracts', () => {
  it('normalizes branches and optional URLs', () => {
    const result = updateProfileSchema.parse({
      fullName: 'A Student', rollNumber: '42', branch: ' computer   science ',
      graduationYear: 2027, cgpa: 8.25, backlogs: 0, linkedinUrl: '', githubUrl: null,
    })
    expect(result.branch).toBe('COMPUTER SCIENCE')
  })

  it('rejects authority fields and impossible date order', () => {
    const base = {
      companyName: 'Acme', jobRole: 'Engineer', description: '', eligibleBranches: ['CSE'],
      eligibleYears: [2027], minimumCgpa: 7, maximumBacklogs: 0,
      registrationDeadline: '2026-10-02T00:00:00.000Z',
      driveDate: '2026-10-01T00:00:00.000Z', status: 'draft' as const,
    }
    expect(createDriveSchema.safeParse(base).success).toBe(false)
    expect(createDriveSchema.safeParse({ ...base, driveDate: '2026-10-03T00:00:00.000Z', createdBy: 'spoofed' }).success).toBe(false)
  })
})
