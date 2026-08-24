import { authorizeRequest } from '@/lib/auth'
import { documentMetadataSchema } from '@/lib/contracts/schemas'
import { apiData, assertSameOrigin, handleRoute, parseJson, RouteError } from '@/lib/server/http'
import { createAdminClient } from '@/lib/server/supabase-admin'
import { toDocumentDTO } from '@/lib/server/dto'

const BUCKET = 'student-documents'

export async function POST(request: Request) {
  return handleRoute(async () => {
    assertSameOrigin(request)
    const viewer = await authorizeRequest('student')
    const body = await parseJson(request, documentMetadataSchema)
    const expected = new RegExp(`^${viewer.userId}/${body.type}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.pdf$`, 'i')
    if (!expected.test(body.storagePath)) {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Document path does not match your immutable upload namespace.', { field: 'storagePath' })
    }

    const admin = createAdminClient()
    const { data: info, error: infoError } = await admin.storage.from(BUCKET).info(body.storagePath)
    if (infoError || !info) throw new RouteError(404, 'STORAGE_OBJECT_MISSING', 'The uploaded file could not be verified.')
    if (info.size !== undefined && info.size !== body.sizeBytes) {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Uploaded file size does not match its metadata.', { field: 'sizeBytes' })
    }
    if (info.contentType && info.contentType !== 'application/pdf') {
      throw new RouteError(400, 'VALIDATION_ERROR', 'Only PDF documents can be registered.', { field: 'mimeType' })
    }

    const { data, error } = await admin.from('documents').insert({
      student_id: viewer.userId,
      type: body.type,
      storage_path: body.storagePath,
      original_name: body.originalName,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes,
    }).select().single()

    if (error?.code === '23505') throw new RouteError(409, 'CONFLICT', 'This uploaded object is already registered.')
    if (error || !data) {
      await admin.storage.from(BUCKET).remove([body.storagePath])
      throw new Error(error?.message ?? 'Document metadata creation failed')
    }
    return apiData(toDocumentDTO(data), { status: 201 })
  })
}
