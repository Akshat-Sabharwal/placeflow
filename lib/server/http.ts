import 'server-only'

import { ZodError, type ZodType } from 'zod'
import type { ApiCollection, ApiErrorBody, ApiErrorCode, ApiSuccess } from '@/lib/contracts/api'
import { AuthAccessError } from '@/lib/auth'

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
} as const

export class RouteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

export function apiData<T>(data: T, init?: ResponseInit) {
  return Response.json({ data } satisfies ApiSuccess<T>, init)
}

export function apiCollection<T>(data: T[], nextCursor: string | null = null) {
  return Response.json(
    { data, meta: { nextCursor } } satisfies ApiCollection<T>,
    { headers: PRIVATE_NO_STORE_HEADERS },
  )
}

export function apiError(error: RouteError) {
  return Response.json(
    { error: { code: error.code, message: error.message, details: error.details } } satisfies ApiErrorBody,
    { status: error.status, headers: PRIVATE_NO_STORE_HEADERS },
  )
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    throw new RouteError(403, 'FORBIDDEN', 'Cross-origin workflow mutations are not allowed.')
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new RouteError(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.')
  }
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new RouteError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fieldErrors: result.error.flatten().fieldErrors,
      formErrors: result.error.flatten().formErrors,
    })
  }
  return result.data
}

export function parseValue<T>(value: unknown, schema: ZodType<T>): T {
  const result = schema.safeParse(value)
  if (!result.success) throw result.error
  return result.data
}

export async function handleRoute(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof RouteError) return apiError(error)
    if (error instanceof AuthAccessError) {
      return apiError(
        error.kind === 'UNAUTHENTICATED'
          ? new RouteError(401, 'UNAUTHENTICATED', 'Please sign in to continue.')
          : new RouteError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'),
      )
    }
    if (error instanceof ZodError) {
      return apiError(new RouteError(400, 'VALIDATION_ERROR', 'Invalid request.', {
        fieldErrors: error.flatten().fieldErrors,
      }))
    }
    console.error('PlaceFlow route failed', { error: error instanceof Error ? error.message : 'unknown error' })
    return apiError(new RouteError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'))
  }
}

export function requireData<T>(data: T | null, message = 'The requested resource was not found.'): T {
  if (data === null) throw new RouteError(404, 'NOT_FOUND', message)
  return data
}
