import type { TablesInsert } from '@/lib/types/database.types'
import type { DriveDTO } from '@/lib/contracts/domain'
import { createDriveSchema, driveListQuerySchema } from '@/lib/contracts/schemas'
import { authorizeRequest } from '@/lib/auth'
import { evaluateEligibility } from '@/lib/domain/eligibility'
import { apiCollection, apiData, assertSameOrigin, handleRoute, parseJson, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toDriveDTO } from '@/lib/server/dto'

export async function GET(request: Request) {
  return handleRoute(async () => {
    const viewer = await authorizeRequest()
    const parsed = driveListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) throw new RouteError(400, 'VALIDATION_ERROR', 'Invalid drive filters.', { fieldErrors: parsed.error.flatten().fieldErrors })

    let query = viewer.supabase.from('drives').select('*').order('registration_deadline').limit(50)
    if (viewer.role === 'coordinator') query = query.eq('created_by', viewer.userId)
    if (parsed.data.status) query = query.eq('status', parsed.data.status)
    const { data: drives, error } = await query
    if (error) throw new Error(error.message)

    const dtos: DriveDTO[] = (drives ?? []).map(toDriveDTO)
    if (viewer.role === 'student' && dtos.length) {
      const [{ data: profile }, { data: applications }, { data: pins }] = await Promise.all([
        viewer.supabase.from('profiles').select('*').eq('id', viewer.userId).single(),
        viewer.supabase.from('applications').select('drive_id').eq('student_id', viewer.userId),
        createAdminClient().from('pinned_drives').select('drive_id').eq('student_id', viewer.userId),
      ])
      const applied = new Set((applications ?? []).map((item) => item.drive_id))
      const pinned = new Set((pins ?? []).map((item) => item.drive_id))
      if (profile) {
        for (const drive of dtos) {
          drive.eligibility = evaluateEligibility(
            { onboardingCompletedAt: profile.onboarding_completed_at, branch: profile.branch, graduationYear: profile.graduation_year, cgpa: profile.cgpa, backlogs: profile.backlogs },
            { status: drive.status, registrationDeadline: drive.registrationDeadline, eligibleBranches: drive.eligibleBranches, eligibleYears: drive.eligibleYears, minimumCgpa: drive.minimumCgpa, maximumBacklogs: drive.maximumBacklogs },
          )
          drive.alreadyApplied = applied.has(drive.id)
          drive.pinned = pinned.has(drive.id)
        }
      }
    }
    return apiCollection(dtos)
  })
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('coordinator')
    const body = await parseJson(request, createDriveSchema)
    if (new Date(body.registrationDeadline) <= new Date()) {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Registration deadline must be in the future.', { field: 'registrationDeadline' })
    }
    const row: TablesInsert<'drives'> = {
      created_by: viewer.userId,
      company_name: body.companyName,
      job_role: body.jobRole,
      description: body.description,
      location: body.location || null,
      package_text: body.packageText || null,
      eligible_branches: body.eligibleBranches,
      eligible_years: body.eligibleYears,
      minimum_cgpa: body.minimumCgpa,
      maximum_backlogs: body.maximumBacklogs,
      registration_deadline: body.registrationDeadline,
      drive_date: body.driveDate ?? null,
      rounds: body.rounds,
      active_round_index: body.activeRoundIndex ?? null,
      status: body.status,
    }
    const { data, error } = await createAdminClient().from('drives').insert(row).select().single()
    if (error || !data) throw new Error(error?.message ?? 'Drive creation failed')
    return apiData(toDriveDTO(data), { status: 201 })
  })
}
