import type { Stage, Task } from '../data/store'
import { TaskRow } from './TaskRow'

interface StageSectionProps {
  stage: Stage
  tasks: Task[]
  onAdvance: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

const STAGE_LABEL: Record<Stage, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

const EMPTY_LINE: Record<Stage, string> = {
  todo: 'Nothing to do',
  'in-progress': 'Nothing in progress',
  done: 'Nothing done yet',
}

export function StageSection({ stage, tasks, onAdvance, onRename, onDelete }: StageSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {STAGE_LABEL[stage]}
        </h2>
        {tasks.length > 0 && (
          <span className="text-xs font-semibold tabular-nums text-slate-400">{tasks.length}</span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {tasks.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">{EMPTY_LINE[stage]}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onAdvance={onAdvance}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
