import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { AuthAccessError } from '@/lib/auth'
import {
  PRIVATE_NO_STORE_HEADERS,
  RouteError,
  apiCollection,
  apiData,
  assertSameOrigin,
  handleRoute,
  parseJson,
  parseValue,
  requireData,
} from './http'

describe('route helpers', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('wraps successful data without changing the supplied response status', async () => {
    const response = apiData({ id: 'one' }, { status: 201 })
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ data: { id: 'one' } })
  })

  it('wraps collections with private cache headers and a cursor', async () => {
    const response = apiCollection([1, 2], 'next')
    expect(response.headers.get('cache-control')).toBe(PRIVATE_NO_STORE_HEADERS['Cache-Control'])
    expect(response.headers.get('vary')).toBe('Cookie')
    await expect(response.json()).resolves.toEqual({ data: [1, 2], meta: { nextCursor: 'next' } })
  })

  it.each([
    [undefined, false],
    ['https://placeflow.test', false],
    ['https://evil.test', true],
  ])('checks mutation origin %s', (origin, rejected) => {
    const headers = origin ? { origin } : undefined
    const action = () => assertSameOrigin(new Request('https://placeflow.test/api/profile', { headers }))
    if (rejected) expect(action).toThrowError(expect.objectContaining({ status: 403, code: 'FORBIDDEN' }))
    else expect(action).not.toThrow()
  })

  it('parses and transforms valid JSON', async () => {
    const request = new Request('https://placeflow.test/api', { method: 'POST', body: JSON.stringify({ name: '  PlaceFlow  ' }) })
    await expect(parseJson(request, z.object({ name: z.string().trim() }))).resolves.toEqual({ name: 'PlaceFlow' })
  })

  it('reports malformed JSON distinctly', async () => {
    const request = new Request('https://placeflow.test/api', { method: 'POST', body: '{' })
    await expect(parseJson(request, z.object({}))).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request body must be valid JSON.',
    })
  })

  it('returns field-level details for invalid JSON data', async () => {
    const request = new Request('https://placeflow.test/api', { method: 'POST', body: JSON.stringify({ count: -1 }) })
    const error = await parseJson(request, z.object({ count: z.number().positive() })).catch((caught) => caught)
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(error.details.fieldErrors.count).toHaveLength(1)
  })

  it('parses direct values or preserves the Zod error', () => {
    expect(parseValue('42', z.coerce.number())).toBe(42)
    expect(() => parseValue('nope', z.number())).toThrow(z.ZodError)
  })

  it.each([
    [new RouteError(409, 'DUPLICATE_APPLICATION', 'Already applied.'), 409, 'DUPLICATE_APPLICATION'],
    [new AuthAccessError('UNAUTHENTICATED'), 401, 'UNAUTHENTICATED'],
    [new AuthAccessError('FORBIDDEN'), 403, 'FORBIDDEN'],
    [new Error('unexpected'), 500, 'INTERNAL_ERROR'],
  ])('maps known failures into stable API envelopes', async (failure, status, code) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await handleRoute(async () => { throw failure })
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code } })
  })

  it('maps synchronous Zod failures to validation responses', async () => {
    const error = z.object({ id: z.uuid() }).safeParse({ id: 'bad' }).error!
    const response = await handleRoute(async () => { throw error })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('returns data or raises a not-found route error', () => {
    expect(requireData('value')).toBe('value')
    expect(() => requireData(null, 'Missing.')).toThrowError(expect.objectContaining({ status: 404, message: 'Missing.' }))
  })
})
