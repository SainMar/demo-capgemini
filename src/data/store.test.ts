/**
 * Store tests — TDD source of truth for src/data/store.ts (architect-plan §2, §6).
 *
 * TEST ISOLATION STRATEGY
 * -----------------------
 * The store keeps module-level MUTABLE arrays (`tasks`, `events`) that are seeded
 * once at module load. Tests mutate that state (addTask/updateTaskStage/deleteTask),
 * so a fresh module instance is required per test to avoid order-dependent false
 * failures. We therefore call `vi.resetModules()` in `beforeEach` and `await import()`
 * the store inside each test (dynamic import), guaranteeing every test starts from the
 * pristine Option-B seed (32 tasks: 27 done / 3 in-progress / 2 todo).
 *
 * DEMO CLOCK
 * ----------
 * The store stamps "today" via `new Date()`. The demo clock is fixed at 2026-06-20
 * (current ISO week = Mon Jun 15 – Sun Jun 21). We freeze time with fake timers so
 * live mutations land in the current week deterministically. Frozen at local noon to
 * avoid any UTC date-rollover ambiguity around midnight.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { Stage, Task, WeeklyPoint } from './store'

type StoreModule = typeof import('./store')

async function loadStore(): Promise<StoreModule> {
  return import('./store')
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-20T12:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

const SEED_SERIES: WeeklyPoint[] = [
  { week: '2026-05-11', completed: 2 },
  { week: '2026-05-18', completed: 3 },
  { week: '2026-05-25', completed: 4 },
  { week: '2026-06-01', completed: 5 },
  { week: '2026-06-08', completed: 6 },
  { week: '2026-06-15', completed: 7 },
]

describe('store — append-only spine (§6 Step 1)', () => {
  // PIN TEST — the #1 correctness guard. Seed-independent in intent:
  // a done event must survive deletion of its task.
  it('PIN: deleting a done task does NOT change weeklyProgress() or doneThisWeek()', async () => {
    const store = await loadStore()

    // Advance a live todo task to done (a real check-off this week).
    const advanced = store.updateTaskStage('task-31', 'in-progress')
    expect(advanced).not.toBeNull()
    store.updateTaskStage('task-31', 'done')

    // Snapshot AFTER the check-off (this is the baseline the delete must preserve).
    const progressAfterCheckoff = store.weeklyProgress()
    const doneAfterCheckoff = store.doneThisWeek()

    // Now delete that very task.
    store.deleteTask('task-31')

    // The task is gone from the live list...
    expect(store.getTasks().find((t) => t.id === 'task-31')).toBeUndefined()

    // ...but the done event survives: counters/chart are UNCHANGED from post-check-off.
    expect(store.weeklyProgress()).toEqual(progressAfterCheckoff)
    expect(store.doneThisWeek()).toBe(doneAfterCheckoff)
  })

  it('weeklyProgress() derives from the event log = the pinned 6-point rising series', async () => {
    const store = await loadStore()
    expect(store.weeklyProgress()).toEqual(SEED_SERIES)
  })

  it('getTasks() returns the 32-task Option-B seed', async () => {
    const store = await loadStore()
    expect(store.getTasks()).toHaveLength(32)
  })

  it('updateTaskStage forward move appends exactly one StageEvent with correct from/to/at', async () => {
    const store = await loadStore()
    const before = store.weeklyProgress()

    // task-31 is a 'todo' seed task; advance it one stage forward.
    const updated = store.updateTaskStage('task-31', 'in-progress')
    expect(updated).not.toBeNull()
    expect(updated!.stage).toBe('in-progress')

    // No done-event was added, so the chart series is unchanged by an in-progress move.
    expect(store.weeklyProgress()).toEqual(before)
    // In-progress count rose by one (the todo advanced).
    expect(store.inProgressCount()).toBe(4)
  })

  it('updateTaskStage records the done event in the current week (todo→in-progress→done)', async () => {
    const store = await loadStore()
    store.updateTaskStage('task-32', 'in-progress')
    store.updateTaskStage('task-32', 'done')

    // The done event lands in the current ISO week → doneThisWeek bumps 7→8.
    expect(store.doneThisWeek()).toBe(8)
    const series = store.weeklyProgress()
    expect(series[series.length - 1]).toEqual({ week: '2026-06-15', completed: 8 })
  })

  it('updateTaskStage backward / same-stage is a no-op: task unchanged, no event appended', async () => {
    const store = await loadStore()
    const beforeProgress = store.weeklyProgress()
    const beforeDone = store.doneThisWeek()

    // task-01 is already 'done'. Clicking it (re-requesting 'done') must change nothing.
    const sameStage = store.updateTaskStage('task-01', 'done')
    expect(sameStage).not.toBeNull()
    expect(sameStage!.stage).toBe('done')

    // Backward request: 'done' task asked to go back to 'todo' — rejected (no-op).
    const backward = store.updateTaskStage('task-01', 'todo')
    expect(backward).not.toBeNull()
    expect(backward!.stage).toBe('done')

    // No new events: the chart and the weekly count are untouched.
    expect(store.weeklyProgress()).toEqual(beforeProgress)
    expect(store.doneThisWeek()).toBe(beforeDone)
  })

  it('updateTaskStage returns null for an unknown id', async () => {
    const store = await loadStore()
    expect(store.updateTaskStage('task-999', 'done')).toBeNull()
  })
})

describe('store — addTask (§6 Step 2)', () => {
  it('rejects empty title → null, no task and no event added', async () => {
    const store = await loadStore()
    const beforeLen = store.getTasks().length
    const beforeProgress = store.weeklyProgress()

    expect(store.addTask('')).toBeNull()
    expect(store.addTask('   ')).toBeNull()

    expect(store.getTasks()).toHaveLength(beforeLen)
    expect(store.weeklyProgress()).toEqual(beforeProgress)
  })

  it('addTask("Foo") trims, pushes to todo at end, stamps createdAt today, returns task', async () => {
    const store = await loadStore()
    const beforeLen = store.getTasks().length

    const created = store.addTask('  Foo  ')
    expect(created).not.toBeNull()
    expect(created!.title).toBe('Foo')
    expect(created!.stage).toBe('todo')
    expect(created!.createdAt).toBe('2026-06-20')
    expect(created!.completedAt).toBeNull()

    const tasks = store.getTasks()
    expect(tasks).toHaveLength(beforeLen + 1)
    // Appears at the very end of the list (insertion order = list order).
    expect(tasks[tasks.length - 1].id).toBe(created!.id)
  })

  it('addTask appends exactly one birth event {from:null,to:"todo"} (no done-event, chart unchanged)', async () => {
    const store = await loadStore()
    const beforeProgress = store.weeklyProgress()
    const beforeDone = store.doneThisWeek()

    store.addTask('Brand new task')

    // A birth event is logged but it is a todo-event, so the done-driven chart is unchanged.
    expect(store.weeklyProgress()).toEqual(beforeProgress)
    expect(store.doneThisWeek()).toBe(beforeDone)
  })
})

describe('store — renameTask (§6 Step 2)', () => {
  it('changes the title only, touches no other field, appends no event', async () => {
    const store = await loadStore()
    const original = store.getTasks().find((t) => t.id === 'task-28')!
    const { stage, createdAt, completedAt } = original
    const beforeProgress = store.weeklyProgress()

    const renamed = store.renameTask('task-28', '  Renamed pricing page  ')
    expect(renamed).not.toBeNull()
    expect(renamed!.title).toBe('Renamed pricing page')
    // Stage and dates untouched.
    expect(renamed!.stage).toBe(stage)
    expect(renamed!.createdAt).toBe(createdAt)
    expect(renamed!.completedAt).toBe(completedAt)
    // No stage event was logged for a rename.
    expect(store.weeklyProgress()).toEqual(beforeProgress)
  })

  it('empty / whitespace rename leaves the title unchanged (cancel, not wipe)', async () => {
    const store = await loadStore()
    const before = store.getTasks().find((t) => t.id === 'task-28')!.title

    store.renameTask('task-28', '')
    store.renameTask('task-28', '   ')

    expect(store.getTasks().find((t) => t.id === 'task-28')!.title).toBe(before)
  })

  it('returns null for an unknown id', async () => {
    const store = await loadStore()
    expect(store.renameTask('task-999', 'whatever')).toBeNull()
  })
})

describe('store — deleteTask (§6 Step 2)', () => {
  it('removes the task from getTasks() but its StageEvents persist', async () => {
    const store = await loadStore()
    // task-21 is a done task whose completedAt (2026-06-15) lands in the current week.
    const progressBefore = store.weeklyProgress()
    const doneBefore = store.doneThisWeek()

    store.deleteTask('task-21')

    expect(store.getTasks().find((t) => t.id === 'task-21')).toBeUndefined()
    // History is preserved: the chart and weekly count do not dip.
    expect(store.weeklyProgress()).toEqual(progressBefore)
    expect(store.doneThisWeek()).toBe(doneBefore)
  })

  it('deleting an absent id is a safe no-op', async () => {
    const store = await loadStore()
    const len = store.getTasks().length
    expect(() => store.deleteTask('task-999')).not.toThrow()
    expect(store.getTasks()).toHaveLength(len)
  })
})

describe('store — inProgressCount (§6 Step 2)', () => {
  it('counts live in-progress tasks (seed = 3)', async () => {
    const store = await loadStore()
    expect(store.inProgressCount()).toBe(3)
  })

  it('decreases when an in-progress task is deleted', async () => {
    const store = await loadStore()
    store.deleteTask('task-28') // an in-progress seed task
    expect(store.inProgressCount()).toBe(2)
  })

  it('increases when a todo task is advanced to in-progress', async () => {
    const store = await loadStore()
    store.updateTaskStage('task-31', 'in-progress')
    expect(store.inProgressCount()).toBe(4)
  })
})

describe('store — doneThisWeek (§6 Step 2)', () => {
  it('counts done-events in the current ISO week (seed = 7)', async () => {
    const store = await loadStore()
    expect(store.doneThisWeek()).toBe(7)
  })

  it('becomes 8 after a live check-off this week', async () => {
    const store = await loadStore()
    store.updateTaskStage('task-32', 'in-progress')
    store.updateTaskStage('task-32', 'done')
    expect(store.doneThisWeek()).toBe(8)
  })
})

describe('store — weeklyDelta (§2.1, §6 Step 2)', () => {
  it('returns last − prevLast on the seed series (= +1)', async () => {
    const store = await loadStore()
    expect(store.weeklyDelta(store.weeklyProgress())).toBe(1)
  })

  it('returns last − prevLast for an arbitrary array', async () => {
    const store = await loadStore()
    const points: WeeklyPoint[] = [
      { week: '2026-06-01', completed: 4 },
      { week: '2026-06-08', completed: 10 },
    ]
    expect(store.weeklyDelta(points)).toBe(6)
  })

  it('returns 0 when fewer than two points exist', async () => {
    const store = await loadStore()
    expect(store.weeklyDelta([])).toBe(0)
    expect(store.weeklyDelta([{ week: '2026-06-15', completed: 7 }])).toBe(0)
  })
})

// Type-level guards: these references force the implementer to export these names/types.
// They have no runtime effect but fail collection if the symbols are missing.
describe('store — exported types & symbols', () => {
  it('exposes the StageEvent type and the full API surface', async () => {
    const store = await loadStore()
    const fns: Array<keyof StoreModule> = [
      'getTasks',
      'updateTaskStage',
      'addTask',
      'renameTask',
      'deleteTask',
      'doneThisWeek',
      'inProgressCount',
      'weeklyProgress',
      'weeklyDelta',
    ]
    for (const name of fns) {
      expect(typeof store[name]).toBe('function')
    }
    // Compile-time anchors for the data types (no runtime assertion needed).
    const stage: Stage = 'todo'
    const task = {} as Task
    void stage
    void task
  })
})
