import type { ReactNode } from 'react'
import { ChakraProvider, Input, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from './async-state'
import { ConfirmDialog } from './confirm-dialog'
import { EligibilityPanel } from './eligibility-panel'
import { FormField } from './form-field'
import { StatusBadge } from './status-badge'

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

  it('runs the confirm action and exposes a cancel action', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    renderUi(<ConfirmDialog open onOpenChange={onOpenChange} title="Publish this drive?" description="Students will see it." confirmLabel="Publish drive" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publish drive' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalled()
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
