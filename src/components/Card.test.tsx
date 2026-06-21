/**
 * Card tests — TDD source of truth (architect-plan-kanban §3.1/§3.2, design-spec §2, §7 Step 2.1).
 *
 * The Card adapts v1's TaskRow into a draggable board tile. It has FOUR zones (design §2.1):
 *   drag handle (⠿) · status control (○◐✓) · title (click→rename) · delete (🗑, hover/focus revealed).
 *
 * Two affordances with separated semantics (architect §3.2, human-locked):
 *   - Click status control = FORWARD-ONLY advance (todo→in-progress→done). Clicking a DONE
 *     card's control is a NO-OP (no forward stage past done; backward is drag-only).
 *   - Drag handle = any-direction move (tested at the board/store level, not here). Here we only
 *     assert the handle is present, focus-reachable, and labelled (/move/i) — the keyboard-DnD
 *     smoke test. We do NOT simulate a full pointer drag (jsdom has no layout — architect §6.3).
 *
 * Done card carries the blue-600 accent treatment (control fill) AND line-through title.
 *
 * No fake timers here → userEvent is safe (the userEvent+fake-timer deadlock only bites when
 * Date/timers are faked; these tests fake neither).
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Task } from '../data/store'
import { Card } from './Card'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-01',
    title: 'Sketch logo concepts',
    stage: 'todo',
    createdAt: '2026-06-15',
    doneAt: null,
    ...overrides,
  }
}

function setup(task: Task) {
  const onAdvance = vi.fn()
  const onRename = vi.fn()
  const onDelete = vi.fn()
  render(<Card task={task} onAdvance={onAdvance} onRename={onRename} onDelete={onDelete} />)
  return { onAdvance, onRename, onDelete }
}

describe('Card — forward-only click control (§3.2)', () => {
  it('clicking the status control calls onAdvance(id) once for a todo card', async () => {
    const user = userEvent.setup()
    const { onAdvance } = setup(makeTask({ id: 'task-31', stage: 'todo' }))

    await user.click(screen.getByRole('button', { name: /advance|mark|status|to do|progress|done/i }))

    expect(onAdvance).toHaveBeenCalledTimes(1)
    expect(onAdvance).toHaveBeenCalledWith('task-31')
  })

  it('clicking the status control calls onAdvance(id) once for an in-progress card', async () => {
    const user = userEvent.setup()
    const { onAdvance } = setup(makeTask({ id: 'task-28', stage: 'in-progress' }))

    await user.click(screen.getByRole('button', { name: /advance|mark|status|progress|done/i }))

    expect(onAdvance).toHaveBeenCalledTimes(1)
    expect(onAdvance).toHaveBeenCalledWith('task-28')
  })

  it('clicking a DONE card status control is a NO-OP (forward-only terminal)', async () => {
    const user = userEvent.setup()
    const { onAdvance } = setup(makeTask({ id: 'task-01', stage: 'done', doneAt: '2026-06-18' }))

    const control = screen.getByRole('button', { name: /done|completed|advance|status/i })
    await user.click(control)

    expect(onAdvance).not.toHaveBeenCalled()
  })
})

describe('Card — inline rename (design §2.2)', () => {
  it('clicking the title reveals an input; Enter calls onRename(id, newTitle)', async () => {
    const user = userEvent.setup()
    const { onRename } = setup(makeTask({ id: 'task-28', title: 'Old title' }))

    await user.click(screen.getByText('Old title'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'New title{Enter}')

    expect(onRename).toHaveBeenCalledWith('task-28', 'New title')
  })

  it('Esc cancels the edit without calling onRename', async () => {
    const user = userEvent.setup()
    const { onRename } = setup(makeTask({ id: 'task-28', title: 'Old title' }))

    await user.click(screen.getByText('Old title'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Discarded{Escape}')

    expect(onRename).not.toHaveBeenCalled()
  })

  it('blur saves the edited title', async () => {
    const user = userEvent.setup()
    const { onRename } = setup(makeTask({ id: 'task-28', title: 'Old title' }))

    await user.click(screen.getByText('Old title'))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Saved on blur')
    await user.tab() // moves focus away → blur

    expect(onRename).toHaveBeenCalledWith('task-28', 'Saved on blur')
  })
})

describe('Card — delete + a11y (design §2.2, §4.3)', () => {
  it('the delete control calls onDelete(id) and is focus-reachable', async () => {
    const user = userEvent.setup()
    const { onDelete } = setup(makeTask({ id: 'task-30' }))

    const del = screen.getByRole('button', { name: /delete|remove/i })
    del.focus()
    expect(del).toHaveFocus() // reachable via focus (a11y)
    await user.click(del)

    expect(onDelete).toHaveBeenCalledWith('task-30')
  })
})

describe('Card — done treatment (accent rhyme, design §2.3)', () => {
  it('a done card renders the title muted + line-through', () => {
    setup(makeTask({ id: 'task-01', title: 'Finished work', stage: 'done', doneAt: '2026-06-18' }))
    const title = screen.getByText('Finished work')
    expect(title.className).toMatch(/line-through/)
  })

  it('a done card carries the blue-600 done treatment on its status control', () => {
    setup(makeTask({ id: 'task-01', title: 'Finished work', stage: 'done', doneAt: '2026-06-18' }))
    // The accent rhyme: the done control fill is blue-600 (mirrors the chart line).
    const control = screen.getByRole('button', { name: /done|completed|status/i })
    expect(control.className).toMatch(/blue-600/)
  })
})

describe('Card — drag handle (keyboard-DnD smoke, architect §5/§6.3)', () => {
  it('exposes a focus-reachable drag handle labelled /move/i (no full pointer drag simulated)', () => {
    setup(makeTask({ id: 'task-01', title: 'Sketch logo concepts' }))

    // dnd-kit KeyboardSensor requires a real, focusable handle with an accessible name.
    const handle = screen.getByRole('button', { name: /move/i })
    expect(handle).toBeInTheDocument()
    handle.focus()
    expect(handle).toHaveFocus() // focus-reachable → keyboard pick-up is possible
  })
})
