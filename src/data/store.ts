import rawTasks from './tasks.json'

export type Stage = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  stage: Stage
  createdAt: string
  completedAt: string | null
}

export interface WeeklyPoint {
  week: string
  completed: number
}

let tasks: Task[] = rawTasks as Task[]

export function getTasks(): Task[] {
  return tasks
}

export function updateTaskStage(id: string, stage: Stage): Task | null {
  const task = tasks.find((t) => t.id === id)
  if (!task) return null
  task.stage = stage
  task.completedAt = stage === 'done' ? new Date().toISOString().split('T')[0] : null
  tasks = [...tasks]
  return task
}

export function weeklyProgress(): WeeklyPoint[] {
  const done = tasks.filter((t) => t.completedAt)
  const byWeek: Record<string, number> = {}

  for (const task of done) {
    const date = new Date(task.completedAt!)
    const monday = getMonday(date)
    const key = monday.toISOString().split('T')[0]
    byWeek[key] = (byWeek[key] ?? 0) + 1
  }

  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, completed]) => ({ week, completed }))
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}
