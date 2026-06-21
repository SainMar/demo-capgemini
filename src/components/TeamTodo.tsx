import { addTask, deleteTask, getTasks, renameTask, updateTaskStage } from '../data/store'
import type { Stage } from '../data/store'
import { QuickAddInput } from './QuickAddInput'
import { StageSection } from './StageSection'
import { ViewToggle } from './ViewToggle'
import type { View } from './ViewToggle'

interface TeamTodoProps {
  view: View
  onViewChange: (view: View) => void
  bump: () => void
}

const ADVANCE: Record<Stage, Stage> = {
  todo: 'in-progress',
  'in-progress': 'done',
  done: 'done',
}

export function TeamTodo({ view, onViewChange, bump }: TeamTodoProps) {
  const tasks = getTasks()
  const todo = tasks.filter((t) => t.stage === 'todo')
  const inProgress = tasks.filter((t) => t.stage === 'in-progress')
  const done = tasks.filter((t) => t.stage === 'done')

  function handleAdd(title: string) {
    const created = addTask(title)
    if (created) bump()
    return created
  }

  function handleAdvance(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    updateTaskStage(id, ADVANCE[task.stage])
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My tasks</h1>
          <p className="mt-1 text-sm tabular-nums text-slate-500">
            {todo.length} to do · {inProgress.length} in progress
          </p>
        </div>
        <ViewToggle value={view} onChange={onViewChange} />
      </header>

      <QuickAddInput onAdd={handleAdd} />

      <StageSection
        stage="todo"
        tasks={todo}
        onAdvance={handleAdvance}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <StageSection
        stage="in-progress"
        tasks={inProgress}
        onAdvance={handleAdvance}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <StageSection
        stage="done"
        tasks={done}
        onAdvance={handleAdvance}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  )
}
