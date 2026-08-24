import { describe, expect, it } from 'vitest'
import { classifyWebhook, type WebhookPayload } from './events'

const event = (overrides: Partial<WebhookPayload>): WebhookPayload => ({
  type: 'UPDATE', schema: 'public', table: 'drives',
  record: { id: 'drive', status: 'published', updated_at: '2' },
  old_record: { id: 'drive', status: 'draft', updated_at: '1' },
  ...overrides,
})

describe('classifyWebhook', () => {
  it('processes published insert and draft to published', () => {
    expect(classifyWebhook(event({ type: 'INSERT', old_record: null }))?.kind).toBe('drive_published')
    expect(classifyWebhook(event({}))?.kind).toBe('drive_published')
  })
  it('ignores cosmetic and no-op updates', () => {
    expect(classifyWebhook(event({ record: { status: 'published', description: 'b' }, old_record: { status: 'published', description: 'a' } }))).toBeNull()
    expect(classifyWebhook(event({ table: 'applications', record: { status: 'applied' }, old_record: { status: 'applied' } }))).toBeNull()
  })
  it('processes relevant application changes', () => {
    expect(classifyWebhook(event({ table: 'applications', record: { status: 'shortlisted' }, old_record: { status: 'applied' } }))?.kind).toBe('application_status_changed')
  })
})
