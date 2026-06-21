/**
 * KanbanColumn tests — TDD source of truth (architect-plan-kanban §3.1, design-spec §1.4/§1.5/§7, §7 Step 2.2).
 *
 * One column = header (label + LIVE count, tabular-nums) + ONE per-column QuickAddInput
 * (aria-label "Add a task") + a droppable card list (one Card per task) + an empty-state
 * line when tasks=[]. Move is handled by the board's DndContext, so the column takes
 * `stage`, `tasks`, `onAdd`, `onRename`, `onDelete` (NO onMove / no onAdvance prop here —
 * advance is wired by the board through the Card; see KanbanBoard.test.tsx).
 *
 * SEAM ASSUMPTION (documented for the implementer): KanbanColumn owns the per-column
 * `SortableContext` so its child Cards' `useSortable` has a provider. The board owns the
 * outer `DndContext`. These tests render KanbanColumn in isolation and therefore assume the
 * column is self-contained enough to render its Cards (it supplies its own SortableContext).
 * If a Card cannot mount without the outer DndContext, the implementer must wrap the column's
 * list so this test renders — the column is the unit under test here.
 *
 * Count must be LIVE = the number of tasks passed in (design §1.4) and use tabular-nums.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Stage, Task } from '../data/store'
import { KanbanColumn } from './KanbanColumn'

function makeTask(id: string, stage: Stage, title: string): Task {
  return {
    id,
    title,
    stage,
    createdAt: '2026-06-15',
    doneAt: stage === 'done' ? '2026-06-18' : null,
  }
}

function renderColumn(stage: Stage, tasks: Task[]) {
  const onAdd = vi.fn(() => null)
  const onRename = vi.fn()
  const onDelete = vi.fn()
  const utils = render(
    <KanbanColumn
      stage={stage}
      tasks={tasks}
      onAdd={onAdd}
      onRename={onRename}
      onDelete={onDelete}
    />,
  )
  return { onAdd, onRename, onDelete, ...utils }
}

describe('KanbanColumn (§7 Step 2.2)', () => {
  it('renders the stage label', () => {
    renderColumn('in-progress', [makeTask('task-28', 'in-progress', 'Redesign pricing')])
    expect(screen.getByText(/in.?progress/i)).toBeInTheDocument()
  })

  it('renders the LIVE count of tasks in the column', () => {
    renderColumn('todo', [
      makeTask('task-31', 'todo', 'A'),
      makeTask('task-32', 'todo', 'B'),
      makeTask('task-33', 'todo', 'C'),
    ])
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('the count uses tabular-nums (numbers stay aligned across changes)', () => {
    renderColumn('todo', [makeTask('task-31', 'todo', 'A')])
    const count = screen.getByText('1')
    expect(count.className).toMatch(/tabular-nums/)
  })

  it('renders exactly ONE QuickAddInput with aria-label "Add a task"', () => {
    renderColumn('todo', [makeTask('task-31', 'todo', 'A')])
    expect(screen.getAllByLabelText('Add a task')).toHaveLength(1)
  })

  it('renders one Card per task (titles present)', () => {
    renderColumn('todo', [
      makeTask('task-31', 'todo', 'Draft Q3 brief'),
      makeTask('task-32', 'todo', 'Email vendor'),
    ])
    expect(screen.getByText('Draft Q3 brief')).toBeInTheDocument()
    expect(screen.getByText('Email vendor')).toBeInTheDocument()
  })

  it('shows an empty-state line when tasks=[]', () => {
    renderColumn('todo', [])
    expect(screen.getByText(/nothing|empty|no tasks|all clear|nothing here yet/i)).toBeInTheDocument()
  })
})
