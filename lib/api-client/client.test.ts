import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getErrorMessage } from './errors'
import { apiCollection, apiRequest } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('api client envelopes', () => {
  it('returns data and sends JSON mutation defaults', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 'one' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ id: string }>('/api/example', { method: 'POST', body: '{}' })).resolves.toEqual({ id: 'one' })
    expect(fetchMock).toHaveBeenCalledWith('/api/example', expect.objectContaining({
      method: 'POST',
      body: '{}',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('preserves caller headers over mutation defaults', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: true })))
    vi.stubGlobal('fetch', fetchMock)
    await apiRequest('/api/example', { body: '{}', headers: { 'Content-Type': 'application/problem+json', 'X-Test': 'yes' } })
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/problem+json', 'X-Test': 'yes' })
  })

  it('returns collection metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [1, 2], meta: { nextCursor: 'three' } }))))
    await expect(apiCollection<number>('/api/items')).resolves.toEqual({ data: [1, 2], meta: { nextCursor: 'three' } })
  })

  it.each([
    [403, { error: { code: 'FORBIDDEN', message: 'No access.', details: { role: 'student' } } }, 'FORBIDDEN', 'No access.'],
    [500, {}, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'],
  ])('turns an error response into ApiError', async (status, body, code, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
    const error = await apiRequest('/api/items').catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status, code, message })
  })

  it('rejects a successful response without a data envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })))
    await expect(apiRequest('/api/items')).rejects.toMatchObject({ status: 200, code: 'INTERNAL_ERROR' })
  })

  it('selects human error messages safely', () => {
    expect(getErrorMessage(new Error('specific'))).toBe('specific')
    expect(getErrorMessage('unknown')).toBe('Something went wrong. Please try again.')
  })
})
