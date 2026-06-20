/**
 * ManagerDashboard tests — TDD source of truth (architect-plan §3, §6 Step 5).
 *
 * The dashboard reads the store (doneThisWeek, inProgressCount, weeklyProgress, weeklyDelta)
 * and renders two StatCards + the chart. "Done this week" is the headline; "In progress" is
 * the SOFT card (subordinate, no delta).
 *
 * Reads the live store, so we freeze the demo clock (2026-06-20) and reset modules per test.
 * Recharts is given a measured box (jsdom has no layout) — see WeeklyProgressChart.test.tsx.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      return { width: 640, height: 320, top: 0, left: 0, right: 640, bottom: 320, x: 0, y: 0, toJSON() {} }
    },
  })
})

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-20T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

async function renderDashboard() {
  const { ManagerDashboard } = await import('./ManagerDashboard')
  return render(<ManagerDashboard view="manager" onViewChange={vi.fn()} />)
}

describe('ManagerDashboard (§6 Step 5)', () => {
  it('renders both stat cards with the seed values (7 done, 3 in progress)', async () => {
    await renderDashboard()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows the headline delta "▲ +1" for Done this week', async () => {
    await renderDashboard()
    expect(screen.getByText(/▲\s*\+?1/)).toBeInTheDocument()
  })

  it('renders the weekly progress chart', async () => {
    const { container } = await renderDashboard()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('"In progress" is the soft card — no delta chrome attached to it', async () => {
    await renderDashboard()
    // Exactly one delta marker exists across the whole dashboard (the headline's).
    expect(screen.getAllByText(/▲/)).toHaveLength(1)
  })
})
