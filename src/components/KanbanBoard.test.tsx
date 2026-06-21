/**
 * KanbanBoard tests — TDD source of truth (architect-plan-kanban §3, §6.3, §7 Step 2.3).
 *
 * KanbanBoard replaces TeamTodo as the team view: header + ViewToggle, owns the DndContext,
 * renders 3 KanbanColumns, and holds the mutation handlers that call the store then bump().
 *
 * THE DROP SEAM (architect §6.3 — load-bearing, documented for the implementer)
 * ----------------------------------------------------------------------------
 * jsdom has no layout/pointer geometry, so we do NOT simulate a real pointer drag. Instead we
 * test the DATA OUTCOME by invoking the board's drag-end handler directly with a synthetic
 * dnd-kit DragEndEvent and asserting it calls `moveTask(id, targetStage)` exactly once.
 *
 * The board MUST expose its drag-end logic as a PURE, EXPORTED function so it is unit-testable
 * without mounting the DndContext:
 *
 *     export function resolveDragEnd(event: DragEndEvent): { id: string; stage: Stage } | null
 *
 *   - Input: a dnd-kit DragEndEvent `{ active, over }`.
 *       active.id      = the dragged card's id (e.g. "task-31")
 *       over           = the drop target; null when dropped outside any droppable.
 *   - Target stage resolution: the column droppables are registered with `id === stage`
 *       ('todo' | 'in-progress' | 'done'). The target stage is `over.id` when it is a column
 *       id; otherwise (dropped over another CARD) it is that card's column, exposed via
 *       `over.data.current.stage`.
 *   - Returns `{ id, stage }` to move, or `null` when: no `over`, or the target stage equals
 *       the card's current stage (a same-column drop is a no-op — `over.data.current` may carry
 *       the active card's `currentStage` so the seam can short-circuit; if absent the store's
 *       moveTask same-stage no-op covers it).
 *
 * The board's onDragEnd then does: `const r = resolveDragEnd(e); if (r) { moveTask(r.id, r.stage); bump() }`.
 * We assert resolveDragEnd's mapping here (the pure seam) and assert per-column add routes
 * through addTask (→ todo) by exercising a column's QuickAddInput.
 *
 * If the implementer prefers a different seam name/shape, they may rename it — but it MUST be
 * an exported, drag-free, unit-testable mapping from DragEndEvent to a (id, stage) move so this
 * contract (one moveTask call per drop, correct target stage, no-op on same column / no over)
 * holds without a real pointer drag.
 *
 * Demo clock frozen + modules reset per test (the board reads the live store). fireEvent for
 * the add interaction (no userEvent + fake-timer deadlock).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { DragEndEvent } from '@dnd-kit/core'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-06-20T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

/** Build a synthetic dnd-kit DragEndEvent. `over` is a column droppable (id === stage). */
function dropOverColumn(activeId: string, targetStage: string, currentStage?: string): DragEndEvent {
  return {
    active: {
      id: activeId,
      data: { current: currentStage ? { stage: currentStage } : undefined },
    },
    over: {
      id: targetStage,
      data: { current: { stage: targetStage } },
    },
  } as unknown as DragEndEvent
}

describe('KanbanBoard — drop seam: resolveDragEnd (§7 Step 2.3)', () => {
  it('dropping a card over a different column resolves to { id, targetStage }', async () => {
    const { resolveDragEnd } = await import('./KanbanBoard')
    // task-31 (todo) dropped over the "done" column.
    const result = resolveDragEnd(dropOverColumn('task-31', 'done', 'todo'))
    expect(result).toEqual({ id: 'task-31', stage: 'done' })
  })

  it('dropping over the SAME column is a no-op → returns null', async () => {
    const { resolveDragEnd } = await import('./KanbanBoard')
    const result = resolveDragEnd(dropOverColumn('task-31', 'todo', 'todo'))
    expect(result).toBeNull()
  })

  it('dropping outside any droppable (over = null) returns null', async () => {
    const { resolveDragEnd } = await import('./KanbanBoard')
    const event = { active: { id: 'task-31', data: { current: { stage: 'todo' } } }, over: null } as unknown as DragEndEvent
    expect(resolveDragEnd(event)).toBeNull()
  })
})

describe('KanbanBoard — a drop drives exactly one moveTask + bump (§7 Step 2.3)', () => {
  it('the onDragEnd path calls moveTask(id, targetStage) once and bumps the manager reveal', async () => {
    vi.resetModules()
    // Spy on the store BEFORE the board imports it, so the board's handler hits the spy.
    const store = await import('../data/store')
    const moveSpy = vi.spyOn(store, 'moveTask')

    const { KanbanBoard, resolveDragEnd } = await import('./KanbanBoard')
    const bump = vi.fn()
    render(<KanbanBoard view="team" onViewChange={vi.fn()} bump={bump} />)

    // Drive the seam: resolve a synthetic drop, then perform the move the board would perform.
    // (We assert the board WIRES resolveDragEnd → moveTask + bump; the seam mapping itself is
    //  covered above. Here we confirm the wiring contract via the exported handler.)
    const resolved = resolveDragEnd(dropOverColumn('task-31', 'done', 'todo'))
    expect(resolved).toEqual({ id: 'task-31', stage: 'done' })

    // The board exposes its committed handler so the wiring (move + bump) is testable without
    // a real pointer drag. If named differently, it must still call moveTask once + bump once.
    const board = await import('./KanbanBoard')
    expect(typeof board.commitDragEnd).toBe('function')
    board.commitDragEnd(dropOverColumn('task-31', 'done', 'todo'), bump)

    expect(moveSpy).toHaveBeenCalledTimes(1)
    expect(moveSpy).toHaveBeenCalledWith('task-31', 'done')
    expect(bump).toHaveBeenCalledTimes(1)

    moveSpy.mockRestore()
  })
})

describe('KanbanBoard — per-column add routes through addTask(title, columnStage) (§7 Step 2.3)', () => {
  // NEW CONTRACT: a card added in a column appears in THAT column. Each column's quick-add must
  // call addTask(title, thatColumnStage). The 3 'Add a task' inputs are in column order:
  //   [0] = todo, [1] = in-progress, [2] = done.
  // IMPLEMENTER MUST WIRE: KanbanColumn passes its own stage into the add handler, which calls
  // addTask(title, stage). Asserting the observable contract here (spy args per column).
  it('the To-do column quick-add calls addTask(title, "todo") → card lands in To-do', async () => {
    const store = await import('../data/store')
    const addSpy = vi.spyOn(store, 'addTask')

    const { KanbanBoard } = await import('./KanbanBoard')
    render(<KanbanBoard view="team" onViewChange={vi.fn()} bump={vi.fn()} />)

    // Column order: [0] todo, [1] in-progress, [2] done.
    const todoInput = screen.getAllByLabelText('Add a task')[0]
    fireEvent.change(todoInput, { target: { value: 'Brand new task' } })
    fireEvent.keyDown(todoInput, { key: 'Enter', code: 'Enter' })

    expect(addSpy).toHaveBeenCalledWith('Brand new task', 'todo')
    const created = addSpy.mock.results[0]?.value
    expect(created?.stage).toBe('todo')

    addSpy.mockRestore()
  })

  it('a non-todo column quick-add passes ITS stage: the Done column calls addTask(title, "done")', async () => {
    const store = await import('../data/store')
    const addSpy = vi.spyOn(store, 'addTask')

    const { KanbanBoard } = await import('./KanbanBoard')
    render(<KanbanBoard view="team" onViewChange={vi.fn()} bump={vi.fn()} />)

    // Column order: [0] todo, [1] in-progress, [2] done → index 2 is the Done column.
    const doneInput = screen.getAllByLabelText('Add a task')[2]
    fireEvent.change(doneInput, { target: { value: 'Done from the column' } })
    fireEvent.keyDown(doneInput, { key: 'Enter', code: 'Enter' })

    expect(addSpy).toHaveBeenCalledWith('Done from the column', 'done')
    const created = addSpy.mock.results[0]?.value
    expect(created?.stage).toBe('done')

    addSpy.mockRestore()
  })
})

describe('KanbanBoard — keyboard-DnD smoke (§7 Step 2.4)', () => {
  it('every card exposes a focus-reachable drag handle labelled /move/i', async () => {
    const { KanbanBoard } = await import('./KanbanBoard')
    render(<KanbanBoard view="team" onViewChange={vi.fn()} bump={vi.fn()} />)

    const handles = screen.getAllByRole('button', { name: /move/i })
    expect(handles.length).toBeGreaterThan(0)
    handles[0].focus()
    expect(handles[0]).toHaveFocus()
  })
})
