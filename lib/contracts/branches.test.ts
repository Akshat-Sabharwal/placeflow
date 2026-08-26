import { describe, expect, it } from 'vitest'
import { normalizeBranch } from './branches'

describe('branch normalization', () => {
  it.each([
    [' cse ', 'CSE'],
    ['computer    science', 'COMPUTER SCIENCE'],
    ['Information\tTechnology', 'INFORMATION TECHNOLOGY'],
    ['DEMO-CSE', 'CSE'],
    [' demo-ece ', 'ECE'],
    ['ECE', 'ECE'],
    ['', ''],
  ])('normalizes %j', (value, expected) => {
    expect(normalizeBranch(value)).toBe(expected)
  })
})
