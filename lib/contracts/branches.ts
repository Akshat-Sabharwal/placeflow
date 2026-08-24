/** Suggestions only; institutions may use other branch names. */
export const BRANCH_SUGGESTIONS = [
  'CSE',
  'IT',
  'ECE',
  'EE',
  'ME',
  'CE',
] as const

export function normalizeBranch(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase()
}
