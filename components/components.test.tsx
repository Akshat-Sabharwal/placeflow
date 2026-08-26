import type { ReactNode } from 'react'
import { ChakraProvider, Input, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from './async-state'
import { ConfirmDialog } from './confirm-dialog'
import { EligibilityPanel } from './eligibility-panel'
import { FormField } from './form-field'
import { ProfileForm } from './profile-form'
import { createGraphLayout } from './profile-graph'
import { StatusBadge } from './status-badge'
import type { ProfileGraphDTO } from '@/lib/contracts/domain'

function renderUi(node: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{node}</ChakraProvider>)
}

describe('shared interface components', () => {
  it.each([
    ['draft', 'Draft'],
    ['registration_closed', 'Registration Closed'],
    ['selected', 'Selected'],
    ['unknown_state', 'Unknown State'],
  ])('renders the %s status semantically', (status, copy) => {
    renderUi(<StatusBadge status={status} />)
    expect(screen.getByText(copy)).toBeVisible()
  })

  it('shows a positive eligibility outcome without failure bullets', () => {
    renderUi(<EligibilityPanel eligible reasons={[]} />)
    expect(screen.getByRole('heading', { name: 'You meet the eligibility rules' })).toBeVisible()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders every eligibility reason as understandable copy', () => {
    renderUi(<EligibilityPanel eligible={false} reasons={['PROFILE_INCOMPLETE', 'DRIVE_NOT_OPEN', 'DEADLINE_PASSED', 'BRANCH_NOT_ELIGIBLE', 'YEAR_NOT_ELIGIBLE', 'CGPA_TOO_LOW', 'TOO_MANY_BACKLOGS']} />)
    expect(screen.getByRole('heading', { name: 'Not eligible right now' })).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(7)
    expect(screen.getByText('Your CGPA is below the required minimum.')).toBeVisible()
  })

  it('gives errors precedence over helper copy', () => {
    renderUi(<FormField label="CGPA" required helper="Use a ten-point scale." error="Enter a value from 0 to 10."><Input aria-label="CGPA input" /></FormField>)
    expect(screen.getByText('Enter a value from 0 to 10.')).toBeVisible()
    expect(screen.queryByText('Use a ten-point scale.')).not.toBeInTheDocument()
  })

  it('shows visual valid feedback only when requested', () => {
    const { rerender } = renderUi(<FormField label="Branch"><Input /></FormField>)
    expect(screen.queryByLabelText('Valid')).not.toBeInTheDocument()
    rerender(<ChakraProvider value={defaultSystem}><FormField label="Branch" valid><Input /></FormField></ChakraProvider>)
    expect(screen.getByLabelText('Valid')).toBeVisible()
  })

  it('keeps missing onboarding numbers blank while preserving an extracted zero', () => {
    renderUi(<ProfileForm prefill={{ fullName: 'Ada Lovelace', backlogs: 0 }} onReviewSubmit={() => undefined} />)
    expect(screen.getByRole('spinbutton', { name: 'Graduation year' })).toHaveValue(null)
    expect(screen.getByRole('spinbutton', { name: 'CGPA' })).toHaveValue(null)
    expect(screen.getByRole('spinbutton', { name: 'Current backlogs' })).toHaveValue(0)
  })

  it('runs the confirm action and exposes a cancel action', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    renderUi(<ConfirmDialog open onOpenChange={onOpenChange} title="Publish this drive?" description="Students will see it." confirmLabel="Publish drive" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish drive' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('keeps community regions and shared profile cards in separate layout slots', () => {
    const nodes = Array.from({ length: 8 }, (_, index) => ({
      id: `profile-${index}`,
      label: `Profile ${index}`,
      role: index === 0 ? 'coordinator' as const : 'student' as const,
      branch: index === 0 ? null : 'CSE',
      graduationYear: index === 0 ? null : 2027,
      avatarUrl: null,
      groupCount: index === 0 ? 4 : 2,
      isViewer: index === 0,
    }))
    const graph = {
      nodes,
      edges: [],
      groups: [
        { id: 'group-1', name: 'Engineering', memberIds: ['profile-0', 'profile-1', 'profile-2', 'profile-3', 'profile-4'] },
        { id: 'group-2', name: 'Placements', memberIds: ['profile-0', 'profile-3', 'profile-4', 'profile-5'] },
        { id: 'group-3', name: 'Design', memberIds: ['profile-0', 'profile-1', 'profile-5', 'profile-6'] },
        { id: 'group-4', name: 'Operations', memberIds: ['profile-0', 'profile-2', 'profile-6', 'profile-7'] },
      ],
    } satisfies ProfileGraphDTO
    const layout = createGraphLayout(graph)
    const overlaps = (first: { x: number; y: number; width: number; height: number }, second: { x: number; y: number; width: number; height: number }) =>
      first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y
    const regions = layout.regions.map(({ x, y, width, height }) => ({ x, y, width, height }))
    const cards = layout.regions.flatMap((region) => region.placements.map((placement) => ({ x: placement.x, y: placement.y, width: 132, height: 58 })))
    const hasOverlap = (rects: typeof regions) => rects.some((rect, index) => rects.slice(index + 1).some((candidate) => overlaps(rect, candidate)))

    expect(layout.regions).toHaveLength(4)
    expect(cards).toHaveLength(13)
    expect(hasOverlap(regions)).toBe(false)
    expect(hasOverlap(cards)).toBe(false)
    expect(cards.every((card) => regions.some((region) => card.x >= region.x && card.y >= region.y && card.x + card.width <= region.x + region.width && card.y + card.height <= region.y + region.height))).toBe(true)
  })

  it('disables destructive dialog actions while pending', () => {
    renderUi(<ConfirmDialog open onOpenChange={() => undefined} title="Delete?" description="Permanent." confirmLabel="Delete" onConfirm={() => undefined} pending destructive />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('renders loading, empty, error, and stale-data feedback accessibly', () => {
    const retry = vi.fn()
    const { rerender } = renderUi(<PageSkeleton rows={2} />)
    expect(screen.getByLabelText('Loading content')).toHaveAttribute('aria-busy', 'true')
    rerender(<ChakraProvider value={defaultSystem}><EmptyState title="No drives" description="Published drives appear here." /></ChakraProvider>)
    expect(screen.getByRole('heading', { name: 'No drives' })).toBeVisible()
    rerender(<ChakraProvider value={defaultSystem}><ApiErrorAlert error={new Error('Network unavailable.')} onRetry={retry} /></ChakraProvider>)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(retry).toHaveBeenCalledOnce()
    rerender(<ChakraProvider value={defaultSystem}><RefreshNotice onRetry={retry} /></ChakraProvider>)
    expect(screen.getByRole('status')).toHaveTextContent('Showing the last available information.')
  })
})
