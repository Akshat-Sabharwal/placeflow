import { applySchema, uuidSchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { evaluateEligibility } from '@/lib/domain/eligibility'
import { apiData, assertSameOrigin, handleRoute, parseJson, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toApplicationDTO } from '@/lib/server/dto'

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const { id: driveId } = await context.params
    if (!uuidSchema.safeParse(driveId).success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid drive id.')
    const body = await parseJson(request, applySchema)

    const [{ data: profile }, { data: drive }, { data: document }, { data: existing }] = await Promise.all([
      viewer.supabase.from('profiles').select('*').eq('id', viewer.userId).single(),
      viewer.supabase.from('drives').select('*').eq('id', driveId).maybeSingle(),
      viewer.supabase.from('documents').select('*').eq('id', body.resumeDocumentId).maybeSingle(),
      viewer.supabase.from('applications').select('id').eq('student_id', viewer.userId).eq('drive_id', driveId).maybeSingle(),
    ])
    if (!profile) throw new RouteError(409, 'PROFILE_INCOMPLETE', 'Complete your placement profile before applying.')
    if (!drive) throw new RouteError(404, 'NOT_FOUND', 'Drive not found.')
    if (existing) throw new RouteError(409, 'DUPLICATE_APPLICATION', 'You have already applied to this drive.')

    const eligibility = evaluateEligibility(
      { onboardingCompletedAt: profile.onboarding_completed_at, branch: profile.branch, graduationYear: profile.graduation_year, cgpa: profile.cgpa, backlogs: profile.backlogs },
      { status: drive.status, registrationDeadline: drive.registration_deadline, eligibleBranches: drive.eligible_branches, eligibleYears: drive.eligible_years, minimumCgpa: drive.minimum_cgpa, maximumBacklogs: drive.maximum_backlogs },
    )
    if (!eligibility.eligible) {
      if (eligibility.reasons.includes('PROFILE_INCOMPLETE')) throw new RouteError(409, 'PROFILE_INCOMPLETE', 'Complete your placement profile before applying.', { reasons: eligibility.reasons })
      if (eligibility.reasons.includes('DEADLINE_PASSED')) throw new RouteError(410, 'DEADLINE_PASSED', 'The registration deadline has passed.', { reasons: eligibility.reasons })
      if (eligibility.reasons.includes('DRIVE_NOT_OPEN')) throw new RouteError(410, 'DRIVE_CLOSED', 'This drive is not accepting applications.', { reasons: eligibility.reasons })
      throw new RouteError(400, 'INELIGIBLE', 'You do not satisfy this drive’s eligibility requirements.', { reasons: eligibility.reasons })
    }
    if (!document || document.student_id !== viewer.userId || document.type !== 'resume' || document.mime_type !== 'application/pdf') {
      throw new RouteError(403, 'FORBIDDEN', 'Choose one of your own PDF resumes.')
    }

    const { data, error } = await createAdminClient().from('applications').insert({
      student_id: viewer.userId,
      drive_id: driveId,
      resume_document_id: body.resumeDocumentId,
      status: 'applied',
    }).select().single()
    if (error?.code === '23505') throw new RouteError(409, 'DUPLICATE_APPLICATION', 'You have already applied to this drive.')
    if (error?.code === '23514') throw new RouteError(409, 'INELIGIBLE', 'Eligibility changed while applying. Refresh and try again.')
    if (error || !data) throw new Error(error?.message ?? 'Application creation failed')
    return apiData(toApplicationDTO(data), { status: 201 })
  })
}
