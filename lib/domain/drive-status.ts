import type { DriveStatus } from '@/lib/contracts/domain'

export const DRIVE_STATUS_TRANSITIONS: Readonly<Record<DriveStatus, readonly DriveStatus[]>> = {
  draft: ['published', 'cancelled'],
  published: ['registration_closed', 'cancelled'],
  registration_closed: ['ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function canTransitionDrive(from: DriveStatus, to: DriveStatus): boolean {
  return from === to || DRIVE_STATUS_TRANSITIONS[from].includes(to)
}
