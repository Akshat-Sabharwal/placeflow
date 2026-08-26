import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, formatDateTime, formatEligibilityRequirements, titleCase } from './format'

describe('display formatting', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [2.25 * 1024 * 1024, '2.3 MB'],
  ])('formats %s bytes', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  it.each([null, undefined, '', 'not-a-date'])('returns a stable fallback for %s', (value) => {
    expect(formatDate(value)).toBe('Not set')
    expect(formatDateTime(value)).toBe('Not set')
  })

  it('formats valid dates in the product locale', () => {
    expect(formatDate('2026-08-24T12:30:00.000Z')).toMatch(/24 Aug 2026/)
    expect(formatDateTime('2026-08-24T12:30:00.000Z')).toMatch(/24 Aug 2026/)
  })

  it.each([
    ['registration_closed', 'Registration Closed'],
    ['selected', 'Selected'],
    ['two words', 'Two Words'],
    ['', ''],
  ])('turns %s into title copy', (value, expected) => {
    expect(titleCase(value)).toBe(expected)
  })

  it('formats every concrete drive eligibility requirement', () => {
    expect(formatEligibilityRequirements({
      eligibleBranches: ['CSE', 'ECE'],
      eligibleYears: [2027, 2028],
      minimumCgpa: 8,
      maximumBacklogs: 1,
    })).toBe('Branches: CSE, ECE · Years: 2027, 2028 · CGPA: 8+ · 1 backlog max')
  })
})
