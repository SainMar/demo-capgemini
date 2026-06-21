/**
 * App integration tests — the reveal (architect-plan §3 re-render model, §6 Step 6).
 *
 * App owns the view toggle ('team' | 'manager') and a `version` counter. Switching views
 * renders TeamTodo or ManagerDashboard. The load-bearing integration: check off a task in
 * Team view, switch to Manager, and the current-week point / doneThisWeek reflects the new
 * done event (7 → 8). This exercises the version bump end-to-end (both views recompute from
 * the store on bump).
 *
 * Reads the live store, so we freeze the demo clock (2026-06-20) and reset modules per test.
 * Recharts gets a measured box (jsdom has no layout).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'

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
  // Fake ONLY Date so vi.setSystemTime freezes the demo clock (mutations land in the
  // current ISO week) while real setTimeout stays intact — events are dispatched via
  // fireEvent (not userEvent), so the userEvent+fake-timer deadlock is avoided entirely
  // and TaskRow's ~320ms check-off animation timer never hangs the test.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-06-20T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

async function renderApp() {
  const { default: App } = await import('./App')
  return render(<App />)
}

describe('App — view toggle wiring (§6 Step 6)', () => {
  it('switches from Team view to Manager view via the toggle', async () => {
    await renderApp()

    // Team view first: the quick-add input is the tell.
    expect(screen.getByLabelText('Add a task')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /manager/i }))

    // Manager view: the headline value is visible.
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('THE REVEAL: checking off a task in Team view ticks the Manager headline 7 → 8', async () => {
    await renderApp()

    // task-31 is a 'todo' seed task; advance it twice (todo→in-progress→done).
    // The status control is the click target on each row. Re-query the row + its control
    // after each advance: the version bump re-renders the row and the control's accessible
    // name changes as the stage advances (todo→in-progress→done). fireEvent dispatches
    // synchronously and does not await timers — no userEvent+fake-timer deadlock.
    const findControl = () => {
      const row = screen
        .getByText('Schedule user interviews for next sprint')
        .closest('li, div') as HTMLElement
      return within(row).getByRole('button', { name: /advance|mark|status|to do|progress|done/i })
    }

    fireEvent.click(findControl()) // todo → in-progress
    fireEvent.click(findControl()) // in-progress → done

    // Switch to Manager: the done event from this week pushes the headline 7 → 8.
    fireEvent.click(screen.getByRole('button', { name: /manager/i }))
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
