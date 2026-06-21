/**
 * StatCard tests — TDD source of truth (architect-plan §3, §6 Step 5).
 *
 * One component, reused twice; the asymmetry carries the pitch.
 *  - emphasis='headline' → big value (text-6xl), shows '▲ +N' ONLY when delta > 0.
 *  - emphasis='soft'     → smaller (text-4xl), muted, NO delta line ever.
 *
 * We assert the value renders and the presence/absence of the delta chrome — not pixels.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

describe('StatCard — headline (§6 Step 5)', () => {
  it('renders the value at headline size', () => {
    const { container } = render(
      <StatCard label="Done this week" value={7} emphasis="headline" delta={1} />,
    )
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(container.querySelector('.text-6xl')).toBeTruthy()
  })

  it('shows "▲ +N" when delta > 0', () => {
    render(<StatCard label="Done this week" value={7} emphasis="headline" delta={1} />)
    expect(screen.getByText(/▲\s*\+?1/)).toBeInTheDocument()
  })

  it('does NOT show the delta line when delta = 0', () => {
    render(<StatCard label="Done this week" value={7} emphasis="headline" delta={0} />)
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument()
  })
})

describe('StatCard — soft (§6 Step 5)', () => {
  it('renders smaller (text-4xl) and never shows a delta', () => {
    const { container } = render(
      <StatCard label="In progress" value={3} emphasis="soft" caption="tasks moving" delta={5} />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(container.querySelector('.text-4xl')).toBeTruthy()
    // Soft cards never render the delta chrome, even if a delta prop is passed.
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument()
  })
})
