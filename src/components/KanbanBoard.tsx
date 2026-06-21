import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  Announcements,
  DragEndEvent,
  DragStartEvent,
  ScreenReaderInstructions,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  addTask,
  deleteTask,
  getTasks,
  moveTask,
  renameTask,
} from '../data/store'
import type { Stage, Task } from '../data/store'
import { Card } from './Card'
import { KanbanColumn } from './KanbanColumn'
import { ViewToggle } from './ViewToggle'
import type { View } from './ViewToggle'

interface KanbanBoardProps {
  view: View
  onViewChange: (view: View) => void
  bump: () => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const STAGES: Stage[] = ['todo', 'in-progress', 'done']

const COLUMN_LABEL: Record<Stage, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

const ADVANCE: Record<Stage, Stage> = {
  todo: 'in-progress',
  'in-progress': 'done',
  done: 'done',
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'To pick up a task, press Space or Enter on its move handle. While dragging, use the arrow keys to move the task between columns and positions. Press Space or Enter again to drop, or Escape to cancel.',
}

function columnLabelFor(overId: unknown, dataStage: unknown): string {
  const stage = (STAGES.includes(overId as Stage) ? overId : dataStage) as Stage | undefined
  return stage ? COLUMN_LABEL[stage] : 'board'
}

/** Resolve a dragged/over task's title from the store by id (falls back to the id). */
function titleFor(id: unknown): string {
  const task = getTasks().find((t) => t.id === String(id))
  return task ? task.title : String(id)
}

/** Resolve the target stage + 1-based position/total for an over target, for SR position cues. */
function positionFor(overId: unknown, dataStage: unknown): { position: number; total: number } | null {
  const stage = (STAGES.includes(overId as Stage) ? overId : dataStage) as Stage | undefined
  if (!stage) return null
  const inColumn = getTasks().filter((t) => t.stage === stage)
  const idx = inColumn.findIndex((t) => t.id === String(overId))
  const position = idx >= 0 ? idx + 1 : inColumn.length || 1
  return { position, total: inColumn.length || 1 }
}

/** SR announcements resolve the task TITLE (design spec §4.4), not the raw id. */
const announcements: Announcements = {
  onDragStart({ active }) {
    return `Picked up task ${titleFor(active.id)}.`
  },
  onDragOver({ active, over }) {
    if (!over) return undefined
    const column = columnLabelFor(over.id, over.data?.current?.stage)
    const pos = positionFor(over.id, over.data?.current?.stage)
    return pos
      ? `Task ${titleFor(active.id)} moved to the ${column} column, position ${pos.position} of ${pos.total}.`
      : `Task ${titleFor(active.id)} moved to the ${column} column.`
  },
  onDragEnd({ active, over }) {
    if (!over) {
      return `Movement cancelled. Task ${titleFor(active.id)} returned.`
    }
    const column = columnLabelFor(over.id, over.data?.current?.stage)
    const pos = positionFor(over.id, over.data?.current?.stage)
    return pos
      ? `Task ${titleFor(active.id)} dropped into the ${column} column, position ${pos.position} of ${pos.total}.`
      : `Task ${titleFor(active.id)} dropped into the ${column} column.`
  },
  onDragCancel({ active }) {
    return `Movement cancelled. Task ${titleFor(active.id)} returned.`
  },
}

/** Pure, unit-testable seam: map a DragEndEvent to the move to perform, or null. */
export function resolveDragEnd(event: DragEndEvent): { id: string; stage: Stage } | null {
  const { active, over } = event
  if (!over) return null

  const overStage = STAGES.includes(over.id as Stage)
    ? (over.id as Stage)
    : (over.data?.current?.stage as Stage | undefined)
  if (!overStage) return null

  const currentStage = active.data?.current?.stage as Stage | undefined
  if (currentStage && overStage === currentStage) return null

  return { id: String(active.id), stage: overStage }
}

/** Commits a drag: resolves the move, applies it to the store, and bumps the reveal. */
export function commitDragEnd(event: DragEndEvent, bump: () => void): void {
  const resolved = resolveDragEnd(event)
  if (resolved) {
    moveTask(resolved.id, resolved.stage)
    bump()
  }
}

export function KanbanBoard({ view, onViewChange, bump }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [justDoneId, setJustDoneId] = useState<string | null>(null)
  const reduce = prefersReducedMotion()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    // Detect a move INTO Done (and not already done) BEFORE the store mutates, so the
    // dragged card plays the same blue settle beat as the click path. The seam contract
    // (one moveTask + one bump) stays inside commitDragEnd, untouched.
    const resolved = resolveDragEnd(event)
    const wasDone = resolved
      ? getTasks().find((t) => t.id === resolved.id)?.stage === 'done'
      : false
    commitDragEnd(event, bump)
    if (resolved && resolved.stage === 'done' && !wasDone && !reduce) {
      setJustDoneId(resolved.id)
      window.setTimeout(() => setJustDoneId(null), 320)
    }
  }

  const tasks = getTasks()
  const byStage: Record<Stage, Task[]> = {
    todo: tasks.filter((t) => t.stage === 'todo'),
    'in-progress': tasks.filter((t) => t.stage === 'in-progress'),
    done: tasks.filter((t) => t.stage === 'done'),
  }

  const activeCard = activeId ? tasks.find((t) => t.id === activeId) ?? null : null

  function handleAdd(title: string, stage: Stage): Task | null {
    const created = addTask(title, stage)
    if (created) bump()
    return created
  }

  function handleAdvance(id: string) {
    const task = getTasks().find((t) => t.id === id)
    if (!task) return
    moveTask(id, ADVANCE[task.stage])
    bump()
  }

  function handleRename(id: string, title: string) {
    renameTask(id, title)
    bump()
  }

  function handleDelete(id: string) {
    deleteTask(id)
    bump()
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My tasks</h1>
          <p className="mt-1 text-sm tabular-nums text-slate-500">
            {byStage.todo.length} to do · {byStage['in-progress'].length} in progress
          </p>
        </div>
        <ViewToggle value={view} onChange={onViewChange} />
      </header>

      <DndContext
        sensors={sensors}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              tasks={byStage[stage]}
              justDoneId={justDoneId}
              onAdd={handleAdd}
              onAdvance={handleAdvance}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <Card
              task={activeCard}
              overlay
              onAdvance={handleAdvance}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
