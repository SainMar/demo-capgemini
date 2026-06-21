/**
 * ViewToggle tests — TDD source of truth (architect-plan §3, §6 Step 6).
 *
 * Segmented Team · Manager control. Controlled by the parent (value + onChange).
 * Keyboard-operable; clicking the inactive option fires onChange with the other value.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewToggle } from './ViewToggle'

describe('ViewToggle (§6 Step 6)', () => {
  it('renders both options', () => {
    render(<ViewToggle value="team" onChange={vi.fn()} />)
    expect(screen.getByText(/team/i)).toBeInTheDocument()
    expect(screen.getByText(/manager/i)).toBeInTheDocument()
  })

  it('is controlled: clicking Manager fires onChange("manager")', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ViewToggle value="team" onChange={onChange} />)

    await user.click(screen.getByText(/manager/i))
    expect(onChange).toHaveBeenCalledWith('manager')
  })
})
