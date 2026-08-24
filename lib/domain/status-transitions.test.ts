import { describe, expect, it } from 'vitest'
import type { ApplicationStatus, DriveStatus } from '@/lib/contracts/domain'
import { canTransitionApplication } from './application-status'
import { canTransitionDrive } from './drive-status'

describe('drive transitions', () => {
  const states: DriveStatus[] = ['draft', 'published', 'registration_closed', 'ongoing', 'completed', 'cancelled']
  it('matches the complete transition graph', () => {
    for (const from of states) for (const to of states) {
      const expected = from === to ||
        (from === 'draft' && ['published', 'cancelled'].includes(to)) ||
        (from === 'published' && ['registration_closed', 'cancelled'].includes(to)) ||
        (from === 'registration_closed' && ['ongoing', 'cancelled'].includes(to)) ||
        (from === 'ongoing' && ['completed', 'cancelled'].includes(to))
      expect(canTransitionDrive(from, to)).toBe(expected)
    }
  })
})

describe('application transitions', () => {
  const states: ApplicationStatus[] = ['applied', 'shortlisted', 'selected', 'rejected']
  it('matches the complete transition graph', () => {
    for (const from of states) for (const to of states) {
      const expected = from === to ||
        (from === 'applied' && ['shortlisted', 'rejected'].includes(to)) ||
        (from === 'shortlisted' && ['selected', 'rejected'].includes(to))
      expect(canTransitionApplication(from, to)).toBe(expected)
    }
  })
})
