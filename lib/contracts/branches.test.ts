import { describe, expect, it } from 'vitest'
import { normalizeBranch } from './branches'

describe('branch normalization', () => {
  it.each([
    [' cse ', 'CSE'],
    ['computer    science', 'COMPUTER SCIENCE'],
    ['Information\tTechnology', 'INFORMATION TECHNOLOGY'],
    ['ECE', 'ECE'],
    ['', ''],
  ])('normalizes %j', (value, expected) => {
    expect(normalizeBranch(value)).toBe(expected)
  })
})
