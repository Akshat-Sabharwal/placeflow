export const API_ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'PROFILE_INCOMPLETE',
  'INELIGIBLE',
  'DRIVE_CLOSED',
  'DEADLINE_PASSED',
  'DUPLICATE_APPLICATION',
  'INVALID_STATUS_TRANSITION',
  'DOCUMENT_IN_USE',
  'STORAGE_OBJECT_MISSING',
  'PROFILE_LOCKED',
  'ONBOARDING_NOT_READY',
  'STALE_WRITE',
  'INTERNAL_ERROR',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export type ApiSuccess<T> = { data: T }
export type ApiCollection<T> = {
  data: T[]
  meta: { nextCursor: string | null }
}

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
    details: Record<string, unknown>
  }
}
