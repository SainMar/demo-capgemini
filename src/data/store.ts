import rawTasks from './tasks.json'

export type Stage = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  stage: Stage
  createdAt: string
  completedAt: string | null
}

export interface StageEvent {
  taskId: string
  from: Stage | null
  to: Stage
  at: string
}

export interface WeeklyPoint {
  week: string
  completed: number
}

const STAGE_ORDER: Stage[] = ['todo', 'in-progress', 'done']

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function seedEvents(seed: Task[]): StageEvent[] {
  const log: StageEvent[] = []
  for (const task of seed) {
    log.push({ taskId: task.id, from: null, to: 'todo', at: task.createdAt })
    if (task.stage === 'in-progress' || task.stage === 'done') {
      log.push({ taskId: task.id, from: 'todo', to: 'in-progress', at: task.createdAt })
    }
    if (task.stage === 'done' && task.completedAt) {
      log.push({ taskId: task.id, from: 'in-progress', to: 'done', at: task.completedAt })
    }
  }
  return log
}

let tasks: Task[] = rawTasks as Task[]
let events: StageEvent[] = seedEvents(rawTasks as Task[])

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

export function updateTaskStage(id: string, stage: Stage): Task | null {
  const task = tasks.find((t) => t.id === id)
  if (!task) return null

  const current = task.stage
  if (STAGE_ORDER.indexOf(stage) <= STAGE_ORDER.indexOf(current)) {
    return task
  }

  const at = today()
  task.stage = stage
  if (stage === 'done') {
    task.completedAt = at
  }
  events = [...events, { taskId: id, from: current, to: stage, at }]
  tasks = [...tasks]
  return task
}

export function addTask(title: string): Task | null {
  const t = title.trim()
  if (t === '') return null

  const task: Task = {
    id: nextId(),
    title: t,
    stage: 'todo',
    createdAt: today(),
    completedAt: null,
  }
  tasks = [...tasks, task]
  events = [...events, { taskId: task.id, from: null, to: 'todo', at: task.createdAt }]
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
  tasks = tasks.filter((t) => t.id !== id)
}

export function doneThisWeek(): number {
  const currentWeek = weekKey(new Date())
  return events.filter((e) => e.to === 'done' && weekKey(new Date(e.at)) === currentWeek).length
}

export function inProgressCount(): number {
  return tasks.filter((t) => t.stage === 'in-progress').length
}

export function weeklyProgress(): WeeklyPoint[] {
  const byWeek: Record<string, number> = {}

  for (const event of events) {
    if (event.to !== 'done') continue
    const key = weekKey(new Date(event.at))
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
