/**
 * App integration tests — the bidirectional reveal (architect-plan-kanban §3.4, §7 Step 3).
 *
 * App owns the view toggle ('team' | 'manager') and a `version` counter. In v2 the team view
 * renders the KanbanBoard (not TeamTodo). The load-bearing integration: mutate tasks in the
 * board, switch to Manager, and the headline reflects net-current state. Now BIDIRECTIONAL:
 *   - REVEAL (rise): advance a todo card to done via the forward-only click control → 7 → 8.
 *   - DIP (fall): drag a current-week done card back out of Done → 7 → 6 (via the board's
 *     drag-end seam `commitDragEnd`, since jsdom can't do a real pointer drag — architect §6.3).
 *
 * Reads the live store, so we freeze the demo clock (2026-06-20) and reset modules per test.
 * Recharts gets a measured box (jsdom has no layout). fireEvent (not userEvent) avoids the
 * userEvent + fake-timer deadlock with the card's check-off settle timer.
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

describe('App — view toggle wiring (§7 Step 3)', () => {
  it('team view renders the KanbanBoard (its 3 quick-add inputs are the tell)', async () => {
    await renderApp()
    // KanbanBoard renders one QuickAddInput per column → 3 inputs (TeamTodo rendered 1).
    expect(screen.getAllByLabelText('Add a task')).toHaveLength(3)
  })

  it('switches from Team view to Manager view via the toggle', async () => {
    await renderApp()
    expect(screen.getAllByLabelText('Add a task').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /manager/i }))
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('THE REVEAL (rise): advancing a task to done in the board ticks the Manager headline 7 → 8', async () => {
    await renderApp()

    // task-31 is a 'todo' seed task; advance it twice (todo→in-progress→done) via the card's
    // forward-only status control. Re-query the card + its control after each advance (the
    // version bump re-renders and the control's accessible name changes as the stage advances).
    const findControl = () => {
      const card = screen
        .getByText('Schedule user interviews for next sprint')
        .closest('li, div') as HTMLElement
      return within(card).getByRole('button', { name: /advance|mark|status|to do|progress|done/i })
    }

    fireEvent.click(findControl()) // todo → in-progress
    fireEvent.click(findControl()) // in-progress → done

    fireEvent.click(screen.getByRole('button', { name: /manager/i }))
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('THE DIP (fall): dragging a done card back out of Done ticks the Manager headline 7 → 6', async () => {
    const { commitDragEnd } = await import('./components/KanbanBoard')
    await renderApp()

    // Drag-back via the board's drag-end seam (no real pointer drag in jsdom). task-21 is a
    // current-week done card; dropping it over the "todo" column retracts its completion.
    const event = {
      active: { id: 'task-21', data: { current: { stage: 'done' } } },
      over: { id: 'todo', data: { current: { stage: 'todo' } } },
    }
    commitDragEnd(event as never, () => {})

    fireEvent.click(screen.getByRole('button', { name: /manager/i }))
    expect(screen.getByText('6')).toBeInTheDocument()
  })
})
