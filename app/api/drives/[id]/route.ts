import type { TablesUpdate } from '@/lib/types/database.types'
import { updateDriveSchema, uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { canTransitionDrive } from '@/lib/domain/drive-status'
import { evaluateEligibility } from '@/lib/domain/eligibility'
import { apiData, assertSameOrigin, handleRoute, parseJson, PRIVATE_NO_STORE_HEADERS, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toDocumentDTO, toDriveDTO } from '@/lib/server/dto'

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid drive id.')
    const { data: row, error } = await viewer.supabase.from('drives').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) throw new RouteError(404, 'NOT_FOUND', 'Drive not found.')
    const dto = toDriveDTO(row)

    if (viewer.role === 'student') {
      const [{ data: profile }, { data: application }, { data: documents }] = await Promise.all([
        viewer.supabase.from('profiles').select('*').eq('id', viewer.userId).single(),
        viewer.supabase.from('applications').select('id').eq('student_id', viewer.userId).eq('drive_id', id).maybeSingle(),
        viewer.supabase.from('documents').select('*').eq('student_id', viewer.userId).eq('type', 'resume').order('uploaded_at', { ascending: false }),
      ])
      if (profile) dto.eligibility = evaluateEligibility(
        { onboardingCompletedAt: profile.onboarding_completed_at, branch: profile.branch, graduationYear: profile.graduation_year, cgpa: profile.cgpa, backlogs: profile.backlogs },
        { status: dto.status, registrationDeadline: dto.registrationDeadline, eligibleBranches: dto.eligibleBranches, eligibleYears: dto.eligibleYears, minimumCgpa: dto.minimumCgpa, maximumBacklogs: dto.maximumBacklogs },
      )
      dto.alreadyApplied = Boolean(application)
      dto.resumes = (documents ?? []).map(toDocumentDTO)
    }
    return apiData(dto, { headers: PRIVATE_NO_STORE_HEADERS })
  })
}

export async function PATCH(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    await authorizeRequest('coordinator')
    const { id } = await context.params
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid drive id.')
    const body = await parseJson(request, updateDriveSchema)
    const admin = createAdminClient()
    const { data: current } = await admin.from('drives').select('*').eq('id', id).maybeSingle()
    if (!current) throw new RouteError(404, 'NOT_FOUND', 'Drive not found.')
    if (body.status && !canTransitionDrive(current.status, body.status)) {
      throw new RouteError(409, 'INVALID_STATUS_TRANSITION', `Cannot move a drive from ${current.status} to ${body.status}.`)
    }

    const registrationDeadline = body.registrationDeadline ?? current.registration_deadline
    const driveDate = body.driveDate === undefined ? current.drive_date : body.driveDate
    if (body.status === 'published' && new Date(registrationDeadline) <= new Date()) {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Registration deadline must be in the future when publishing.', { field: 'registrationDeadline' })
    }
    if (driveDate && new Date(driveDate) < new Date(registrationDeadline)) {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Drive date must be after the registration deadline.')
    }

    const updates: TablesUpdate<'drives'> = {}
    if (body.companyName !== undefined) updates.company_name = body.companyName
    if (body.jobRole !== undefined) updates.job_role = body.jobRole
    if (body.description !== undefined) updates.description = body.description
    if (body.location !== undefined) updates.location = body.location || null
    if (body.packageText !== undefined) updates.package_text = body.packageText || null
    if (body.eligibleBranches !== undefined) updates.eligible_branches = body.eligibleBranches
    if (body.eligibleYears !== undefined) updates.eligible_years = body.eligibleYears
    if (body.minimumCgpa !== undefined) updates.minimum_cgpa = body.minimumCgpa
    if (body.maximumBacklogs !== undefined) updates.maximum_backlogs = body.maximumBacklogs
    if (body.registrationDeadline !== undefined) updates.registration_deadline = body.registrationDeadline
    if (body.driveDate !== undefined) updates.drive_date = body.driveDate
    if (body.status !== undefined) updates.status = body.status

    const { data, error } = await admin.from('drives').update(updates).eq('id', id).eq('updated_at', current.updated_at).select().maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new RouteError(409, 'CONFLICT', 'The drive changed while you were editing it. Refresh and try again.')
    return apiData(toDriveDTO(data))
  })
}
