import { describe, expect, it } from 'vitest'
import {
  applySchema,
  changeApplicationStatusSchema,
  createDriveSchema,
  deletePushSubscriptionSchema,
  documentMetadataSchema,
  driveListQuerySchema,
  notificationQuerySchema,
  pushSubscriptionSchema,
  updateDriveSchema,
  updateProfileSchema,
} from './schemas'

const validProfile = {
  fullName: 'A Student',
  rollNumber: '42',
  branch: ' computer   science ',
  graduationYear: 2027,
  cgpa: 8.25,
  backlogs: 0,
  linkedinUrl: '',
  githubUrl: null,
}

const validDrive = {
  companyName: 'Acme',
  jobRole: 'Engineer',
  description: '',
  eligibleBranches: ['CSE'],
  eligibleYears: [2027],
  minimumCgpa: 7,
  maximumBacklogs: 0,
  registrationDeadline: '2026-10-02T00:00:00.000Z',
  driveDate: '2026-10-03T00:00:00.000Z',
  status: 'draft' as const,
}

describe('request contracts', () => {
  it('normalizes branches and optional URLs', () => {
    const result = updateProfileSchema.parse(validProfile)
    expect(result.branch).toBe('COMPUTER SCIENCE')
  })

  it('rejects authority fields and impossible date order', () => {
    expect(createDriveSchema.safeParse({ ...validDrive, driveDate: '2026-10-01T00:00:00.000Z' }).success).toBe(false)
    expect(createDriveSchema.safeParse({ ...validDrive, createdBy: 'spoofed' }).success).toBe(false)
  })

  it.each([
    ['fullName', ''],
    ['fullName', 'x'.repeat(121)],
    ['rollNumber', ''],
    ['branch', ''],
    ['graduationYear', 1999],
    ['graduationYear', 2101],
    ['graduationYear', 2027.5],
    ['cgpa', -0.01],
    ['cgpa', 10.01],
    ['backlogs', -1],
    ['backlogs', 100],
    ['backlogs', 0.5],
    ['githubUrl', 'not-a-url'],
    ['linkedinUrl', 'linkedin.example/user'],
  ])('rejects an invalid profile %s', (field, value) => {
    expect(updateProfileSchema.safeParse({ ...validProfile, [field]: value }).success).toBe(false)
  })

  it.each([
    ['companyName', ''],
    ['jobRole', ''],
    ['description', 'x'.repeat(10_001)],
    ['eligibleBranches', []],
    ['eligibleYears', []],
    ['minimumCgpa', -1],
    ['minimumCgpa', 11],
    ['maximumBacklogs', -1],
    ['maximumBacklogs', 100],
    ['registrationDeadline', 'tomorrow'],
    ['status', 'archived'],
  ])('rejects an invalid drive %s', (field, value) => {
    expect(createDriveSchema.safeParse({ ...validDrive, [field]: value }).success).toBe(false)
  })

  it('deduplicates normalized eligibility lists', () => {
    const result = createDriveSchema.parse({
      ...validDrive,
      eligibleBranches: ['cse', ' CSE ', 'it'],
      eligibleYears: [2027, 2027, 2028],
    })
    expect(result.eligibleBranches).toEqual(['CSE', 'IT'])
    expect(result.eligibleYears).toEqual([2027, 2028])
  })

  it('accepts a sparse drive update but rejects unknown fields', () => {
    expect(updateDriveSchema.parse({ status: 'completed' })).toEqual({ status: 'completed' })
    expect(updateDriveSchema.safeParse({ status: 'completed', createdBy: 'spoofed' }).success).toBe(false)
  })

  it.each([
    [applySchema, { resumeDocumentId: '6df2f929-557b-4f68-bb4d-30c41c3ac777' }, true],
    [applySchema, { resumeDocumentId: 'resume-1' }, false],
    [changeApplicationStatusSchema, { status: 'selected' }, true],
    [changeApplicationStatusSchema, { status: 'applied' }, false],
    [driveListQuerySchema, { status: 'published', cursor: 'next' }, true],
    [driveListQuerySchema, { status: 'open' }, false],
    [notificationQuerySchema, { unreadOnly: 'true' }, true],
    [notificationQuerySchema, { unreadOnly: true }, false],
  ])('validates a focused workflow contract', (schema, input, accepted) => {
    expect(schema.safeParse(input).success).toBe(accepted)
  })

  it('requires private PDF metadata with a bounded positive size', () => {
    const metadata = {
      storagePath: 'user/resume/file.pdf',
      originalName: 'resume.pdf',
      mimeType: 'application/pdf' as const,
      sizeBytes: 500,
      type: 'resume' as const,
    }
    expect(documentMetadataSchema.safeParse(metadata).success).toBe(true)
    expect(documentMetadataSchema.safeParse({ ...metadata, mimeType: 'text/plain' }).success).toBe(false)
    expect(documentMetadataSchema.safeParse({ ...metadata, sizeBytes: 0 }).success).toBe(false)
    expect(documentMetadataSchema.safeParse({ ...metadata, sizeBytes: 10 * 1024 * 1024 + 1 }).success).toBe(false)
  })

  it('validates complete push subscriptions and endpoint deletion', () => {
    const endpoint = 'https://push.example/subscription/1'
    expect(pushSubscriptionSchema.safeParse({ endpoint, keys: { p256dh: 'p'.repeat(16), auth: 'a'.repeat(8) } }).success).toBe(true)
    expect(pushSubscriptionSchema.safeParse({ endpoint, keys: { p256dh: 'short', auth: 'short' } }).success).toBe(false)
    expect(deletePushSubscriptionSchema.safeParse({ endpoint }).success).toBe(true)
    expect(deletePushSubscriptionSchema.safeParse({ endpoint: 'not-a-url' }).success).toBe(false)
  })
})
