/**
 * StageSection tests — TDD source of truth (architect-plan §3, §6 Step 3).
 *
 * StageSection renders an uppercase label, a right-aligned count, the row group, and
 * an empty-state line when there are no tasks. Pure presentational (state: none).
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Task } from '../data/store'
import { StageSection } from './StageSection'

function makeTask(id: string, stage: Task['stage'], title: string): Task {
  return { id, title, stage, createdAt: '2026-06-15', completedAt: stage === 'done' ? '2026-06-18' : null }
}

const noop = vi.fn()

function renderSection(stage: Task['stage'], tasks: Task[]) {
  render(
    <StageSection
      stage={stage}
      tasks={tasks}
      onAdvance={noop}
      onRename={noop}
      onDelete={noop}
    />,
  )
}

describe('StageSection (§6 Step 3)', () => {
  it('renders the stage label', () => {
    renderSection('in-progress', [makeTask('task-28', 'in-progress', 'Redesign pricing')])
    expect(screen.getByText(/in.?progress/i)).toBeInTheDocument()
  })

  it('renders the correct count of tasks', () => {
    renderSection('todo', [
      makeTask('task-31', 'todo', 'A'),
      makeTask('task-32', 'todo', 'B'),
      makeTask('task-33', 'todo', 'C'),
    ])
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows an empty-state line when tasks=[]', () => {
    renderSection('todo', [])
    expect(screen.getByText(/nothing|empty|no tasks|all clear|0/i)).toBeInTheDocument()
  })
})
