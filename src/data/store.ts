import rawTasks from './tasks.json'

export type Stage = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  stage: Stage
  createdAt: string
  doneAt: string | null
}

export interface DoneTombstone {
  taskId: string
  doneAt: string
}

export interface WeeklyPoint {
  week: string
  completed: number
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

let tasks: Task[] = rawTasks as Task[]
let tombstones: DoneTombstone[] = []

let idCounter = tasks.reduce((max, t) => {
  const n = Number(t.id.replace(/^task-/, ''))
  return Number.isFinite(n) && n > max ? n : max
}, 0)

function nextId(): string {
  do {
    idCounter += 1
  } while (tasks.some((t) => t.id === `task-${String(idCounter).padStart(2, '0')}`))
  return `task-${String(idCounter).padStart(2, '0')}`
}

export function getTasks(): Task[] {
  return tasks
}

export function moveTask(id: string, stage: Stage): Task | null {
  const task = tasks.find((t) => t.id === id)
  if (!task) return null

  if (stage === task.stage) return task

  const entering = stage === 'done' && task.stage !== 'done'
  const leaving = task.stage === 'done' && stage !== 'done'

  task.stage = stage
  if (entering) task.doneAt = today()
  if (leaving) task.doneAt = null

  tasks = [...tasks]
  return task
}

export function addTask(title: string, stage: Stage = 'todo'): Task | null {
  const t = title.trim()
  if (t === '') return null

  const task: Task = {
    id: nextId(),
    title: t,
    stage,
    createdAt: today(),
    doneAt: stage === 'done' ? today() : null,
  }
  tasks = [...tasks, task]
  return task
}

export function renameTask(id: string, title: string): Task | null {
  const task = tasks.find((t) => t.id === id)
  if (!task) return null

  const t = title.trim()
  if (t === '') return task

  task.title = t
  tasks = [...tasks]
  return task
}

export function deleteTask(id: string): void {
  const task = tasks.find((t) => t.id === id)
  if (!task) return

  if (task.stage === 'done' && task.doneAt) {
    tombstones = [...tombstones, { taskId: id, doneAt: task.doneAt }]
  }
  tasks = tasks.filter((t) => t.id !== id)
}

function completions(): Array<{ doneAt: string }> {
  return [
    ...tasks
      .filter((t) => t.stage === 'done' && t.doneAt)
      .map((t) => ({ doneAt: t.doneAt! })),
    ...tombstones,
  ]
}

export function doneThisWeek(): number {
  const currentWeek = weekKey(new Date())
  return completions().filter((c) => weekKey(new Date(c.doneAt)) === currentWeek).length
}

export function inProgressCount(): number {
  return tasks.filter((t) => t.stage === 'in-progress').length
}

export function weeklyProgress(): WeeklyPoint[] {
  const byWeek: Record<string, number> = {}

  for (const c of completions()) {
    const key = weekKey(new Date(c.doneAt))
    byWeek[key] = (byWeek[key] ?? 0) + 1
  }

  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, completed]) => ({ week, completed }))
}

export function weeklyDelta(points: WeeklyPoint[]): number {
  if (points.length < 2) return 0
  return points[points.length - 1].completed - points[points.length - 2].completed
}

function weekKey(date: Date): string {
  return getMonday(date).toISOString().split('T')[0]
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}
