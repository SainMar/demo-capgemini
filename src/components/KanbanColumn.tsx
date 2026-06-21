import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Stage, Task } from '../data/store'
import { Card } from './Card'
import { QuickAddInput } from './QuickAddInput'

interface KanbanColumnProps {
  stage: Stage
  tasks: Task[]
  justDoneId?: string | null
  onAdd: (title: string, stage: Stage) => Task | null
  onAdvance?: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

const COLUMN_LABEL: Record<Stage, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

export function KanbanColumn({
  stage,
  tasks,
  justDoneId,
  onAdd,
  onAdvance,
  onRename,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { stage } })
  const label = COLUMN_LABEL[stage]
  const handleAdvance = onAdvance ?? (() => {})

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} column`}
      className={`flex min-h-[120px] flex-col gap-2 rounded-2xl border bg-white p-3 ${
        isOver ? 'border-slate-300 bg-slate-50' : 'border-slate-200'
      }`}
    >
      <header className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="text-xs tabular-nums text-slate-400">{tasks.length}</span>
      </header>

      <QuickAddInput onAdd={(title) => onAdd(title, stage)} />

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-slate-400">Nothing here yet</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <Card
                key={task.id}
                task={task}
                justDone={justDoneId === task.id}
                onAdvance={handleAdvance}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </SortableContext>
    </section>
  )
}
