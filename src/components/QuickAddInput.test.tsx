/**
 * QuickAddInput tests — TDD source of truth (architect-plan §3, §6 Step 4).
 *
 * The <5s adoption gate: type + Enter adds, clears, and KEEPS focus so you can fire
 * several in a row without the mouse. Empty/whitespace Enter is a no-op. Has a real
 * aria-label (placeholder is not a label).
 *
 * `onAdd` returns Task | null; the field clears only when a Task is returned.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Task } from '../data/store'
import { QuickAddInput } from './QuickAddInput'

function fakeTask(title: string): Task {
  return { id: 'task-new', title, stage: 'todo', createdAt: '2026-06-20', doneAt: null }
}

describe('QuickAddInput (§6 Step 4)', () => {
  it('has aria-label "Add a task"', () => {
    render(<QuickAddInput onAdd={vi.fn()} />)
    expect(screen.getByLabelText('Add a task')).toBeInTheDocument()
  })

  it('type + Enter calls onAdd with the trimmed value, then clears and retains focus', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn((title: string) => fakeTask(title))
    render(<QuickAddInput onAdd={onAdd} />)

    const input = screen.getByLabelText('Add a task') as HTMLInputElement
    await user.click(input)
    await user.type(input, '  Buy milk  {Enter}')

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('Buy milk')
    expect(input.value).toBe('') // cleared on success
    expect(input).toHaveFocus() // stays focused for the next add
  })

  it('empty / whitespace + Enter does NOT call onAdd', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<QuickAddInput onAdd={onAdd} />)

    const input = screen.getByLabelText('Add a task')
    await user.click(input)
    await user.type(input, '{Enter}') // empty
    await user.type(input, '   {Enter}') // whitespace only

    expect(onAdd).not.toHaveBeenCalled()
  })
})
