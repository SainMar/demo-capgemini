/**
 * TaskRow tests — TDD source of truth (architect-plan §3, §6 Step 3).
 *
 * TaskRow is presentational: props in, callbacks out. It owns transient editing state.
 * The status control is the ONLY advance target. A 'done' row's control is inert
 * (forward-only terminal). We assert behavior via callback spies and accessible roles,
 * never pixel geometry.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Task } from '../data/store'
import { TaskRow } from './TaskRow'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-01',
    title: 'Sketch logo concepts',
    stage: 'todo',
    createdAt: '2026-06-15',
    completedAt: null,
    ...overrides,
  }
}

function setup(task: Task) {
  const onAdvance = vi.fn()
  const onRename = vi.fn()
  const onDelete = vi.fn()
  render(
    <TaskRow task={task} onAdvance={onAdvance} onRename={onRename} onDelete={onDelete} />,
  )
  return { onAdvance, onRename, onDelete }
}

describe('TaskRow — advance (§6 Step 3)', () => {
  it('clicking the status control calls onAdvance(id) once for a todo row', async () => {
    const user = userEvent.setup()
    const { onAdvance } = setup(makeTask({ id: 'task-31', stage: 'todo' }))

    await user.click(screen.getByRole('button', { name: /advance|mark|status|to do|done/i }))

    expect(onAdvance).toHaveBeenCalledTimes(1)
    expect(onAdvance).toHaveBeenCalledWith('task-31')
  })

  it('clicking a done row status control is a NO-OP (onAdvance not called)', async () => {
    const user = userEvent.setup()
    const { onAdvance } = setup(
      makeTask({ id: 'task-01', stage: 'done', completedAt: '2026-06-18' }),
    )

    // The status indicator may still render as a button/element; clicking it does nothing.
    const control = screen.getByRole('button', { name: /done|completed|advance|status/i })
    await user.click(control)

    expect(onAdvance).not.toHaveBeenCalled()
  })
})

describe('TaskRow — inline rename (§6 Step 3)', () => {
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

describe('TaskRow — delete + a11y (§6 Step 3)', () => {
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

describe('TaskRow — done styling (§6 Step 3)', () => {
  it('a done row renders the title muted + line-through', () => {
    setup(makeTask({ id: 'task-01', title: 'Finished work', stage: 'done', completedAt: '2026-06-18' }))
    const title = screen.getByText('Finished work')
    expect(title.className).toMatch(/line-through/)
  })
})
