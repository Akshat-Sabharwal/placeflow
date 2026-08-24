import { z } from 'zod'
import { normalizeBranch } from './branches'

const optionalUrl = z.union([z.url(), z.literal(''), z.null()]).optional()
const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max)
const isoDateTime = z.iso.datetime({ offset: true })
export const uuidSchema = z.uuid()

export const updateProfileSchema = z
  .object({
    fullName: trimmed(1, 120),
    rollNumber: trimmed(1, 64),
    branch: trimmed(1, 64).transform(normalizeBranch),
    graduationYear: z.number().int().min(2000).max(2100),
    cgpa: z.number().min(0).max(10),
    backlogs: z.number().int().min(0).max(99),
    linkedinUrl: optionalUrl,
    githubUrl: optionalUrl,
  })
  .strict()

const driveFieldsSchema = z.object({
  companyName: trimmed(1, 160),
  jobRole: trimmed(1, 160),
  description: z.string().trim().max(10000),
  location: z.union([z.string().trim().max(200), z.literal(''), z.null()]).optional(),
  packageText: z.union([z.string().trim().max(200), z.literal(''), z.null()]).optional(),
  eligibleBranches: z
    .array(trimmed(1, 64).transform(normalizeBranch))
    .min(1)
    .max(50)
    .transform((values) => [...new Set(values)]),
  eligibleYears: z.array(z.number().int().min(2000).max(2100)).min(1).max(20).transform((v) => [...new Set(v)]),
  minimumCgpa: z.number().min(0).max(10),
  maximumBacklogs: z.number().int().min(0).max(99),
  registrationDeadline: isoDateTime,
  driveDate: z.union([isoDateTime, z.null()]).optional(),
}).strict()

export const createDriveSchema = driveFieldsSchema
  .extend({ status: z.enum(['draft', 'published']) })
  .strict()
  .superRefine((value, ctx) => {
    if (value.driveDate && new Date(value.driveDate) < new Date(value.registrationDeadline)) {
      ctx.addIssue({ code: 'custom', path: ['driveDate'], message: 'Drive date must be after the registration deadline.' })
    }
  })

export const updateDriveSchema = driveFieldsSchema
  .partial()
  .extend({ status: z.enum(['draft', 'published', 'registration_closed', 'ongoing', 'completed', 'cancelled']).optional() })
  .strict()

export const applySchema = z.object({ resumeDocumentId: uuidSchema }).strict()
export const changeApplicationStatusSchema = z
  .object({ status: z.enum(['shortlisted', 'selected', 'rejected']) })
  .strict()

export const documentMetadataSchema = z
  .object({
    storagePath: trimmed(1, 500),
    originalName: trimmed(1, 255),
    mimeType: z.enum([
      'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/csv', 'application/rtf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ]),
    sizeBytes: z.number().int().positive().max(50 * 1024 * 1024),
    type: z.enum(['resume', 'marksheet', 'other']),
  })
  .strict()

export const updateSettingsSchema = z.object({
  profileVisibility: z.enum(['public', 'private']),
  showGroupMemberships: z.boolean(),
  themePreference: z.enum(['light', 'dark']),
  defaultGroupVisibility: z.enum(['public', 'private']),
}).strict()

export const createCommunityGroupSchema = z.object({
  name: trimmed(2, 80),
  description: z.string().trim().max(1000),
  visibility: z.enum(['public', 'private']),
}).strict()

export const createCommunityMessageSchema = z.object({
  body: trimmed(1, 4000),
  replyToId: uuidSchema.nullable().optional(),
}).strict()

export const moderateCommunityMemberSchema = z.object({
  userId: uuidSchema,
  action: z.enum(['approve', 'reject']),
}).strict()

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.url().max(3000),
    keys: z.object({ p256dh: trimmed(16, 512), auth: trimmed(8, 512) }).strict(),
  })
  .strict()
export const deletePushSubscriptionSchema = z.object({ endpoint: z.url().max(3000) }).strict()

export const driveListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'registration_closed', 'ongoing', 'completed', 'cancelled']).optional(),
  cursor: z.string().max(500).optional(),
}).strict()
export const notificationQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
}).strict()
