import type { ApplicationDTO } from '@/lib/contracts/domain'
import { authorizeRequest } from '@/lib/auth'
import { apiCollection, handleRoute } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toApplicationDTO } from '@/lib/server/dto'

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest('student')
    const admin = createAdminClient()
    const { data: applications, error } = await admin.from('applications').select('*').eq('student_id', viewer.userId).order('updated_at', { ascending: false }).limit(50)
    if (error) throw new Error(error.message)
    const driveIds = [...new Set((applications ?? []).map((item) => item.drive_id))]
    const { data: drives } = driveIds.length
      ? await admin.from('drives').select('id,company_name,job_role,drive_date').in('id', driveIds)
      : { data: [] }
    const byId = new Map((drives ?? []).map((drive) => [drive.id, drive]))
    const result: ApplicationDTO[] = (applications ?? []).map((row) => {
      const dto = toApplicationDTO(row)
      const drive = byId.get(row.drive_id)
      if (drive) {
        dto.companyName = drive.company_name
        dto.jobRole = drive.job_role
        dto.driveDate = drive.drive_date
      }
      return dto
    })
    return apiCollection(result)
  })
}
