import type { ApplicationStatus } from '@/lib/contracts/domain'

export const APPLICATION_STATUS_TRANSITIONS: Readonly<
  Record<ApplicationStatus, readonly ApplicationStatus[]>
> = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['selected', 'rejected'],
  selected: [],
  rejected: [],
}

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return from === to || APPLICATION_STATUS_TRANSITIONS[from].includes(to)
}
