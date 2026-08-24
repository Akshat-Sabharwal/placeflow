export type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

export type MeaningfulEvent =
  | { kind: 'drive_published' | 'drive_updated'; record: Record<string, unknown> }
  | { kind: 'application_status_changed'; record: Record<string, unknown> }

const changed = (payload: WebhookPayload, field: string) =>
  payload.old_record?.[field] !== payload.record?.[field]

export function classifyWebhook(payload: WebhookPayload): MeaningfulEvent | null {
  if (payload.schema !== 'public' || !payload.record) return null

  if (payload.table === 'drives') {
    const status = payload.record.status
    if (payload.type === 'INSERT' && status === 'published') {
      return { kind: 'drive_published', record: payload.record }
    }
    if (payload.type === 'UPDATE' && payload.old_record?.status !== 'published' && status === 'published') {
      return { kind: 'drive_published', record: payload.record }
    }
    if (
      payload.type === 'UPDATE' &&
      ((status === 'cancelled' && changed(payload, 'status')) ||
        (status === 'published' && ['registration_deadline', 'drive_date', 'location'].some((field) => changed(payload, field))))
    ) {
      return { kind: 'drive_updated', record: payload.record }
    }
  }

  if (
    payload.table === 'applications' &&
    payload.type === 'UPDATE' &&
    changed(payload, 'status') &&
    ['shortlisted', 'selected', 'rejected'].includes(String(payload.record.status))
  ) {
    return { kind: 'application_status_changed', record: payload.record }
  }

  return null
}
