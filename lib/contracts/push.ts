export const PUSH_TYPES = [
  'drive_published',
  'drive_updated',
  'application_status_changed',
] as const

export type PushPayload = {
  type: (typeof PUSH_TYPES)[number]
  title: string
  body: string
  url: string
  entityId: string
  eventKey: string
}
