import { authorizeRequest } from '@/lib/auth'
import { apiCollection, handleRoute } from '@/lib/server/http'
import { toDocumentDTO } from '@/lib/server/dto'

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest('student')
    const { data, error } = await viewer.supabase.from('documents').select('*').eq('student_id', viewer.userId).order('uploaded_at', { ascending: false })
    if (error) throw new Error(error.message)
    return apiCollection((data ?? []).map(toDocumentDTO))
  })
}
