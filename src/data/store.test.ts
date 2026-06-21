/**
 * Store tests — TDD source of truth for src/data/store.ts (architect-plan-kanban §1, §2, §7).
 *
 * V2 NET-CURRENT MODEL
 * --------------------
 * The append-only StageEvent log is GONE. The store now derives the barometer from
 * net-current state + tombstones:
 *   completions() = (live tasks with stage==='done' && doneAt) ∪ tombstones
 * `weeklyProgress()` / `doneThisWeek()` are pure functions of completions(). They RISE
 * when a card enters Done, FALL when a card LEAVES Done (drag-back, not tombstoned), and
 * are INVARIANT under delete (a done card is tombstoned BEFORE removal → union unchanged;
 * a non-done card never counted → union unchanged).
 *
 * API: `moveTask(id, stage)` REPLACES `updateTaskStage` (any direction). Entering Done
 * stamps doneAt=today; leaving Done clears doneAt. `completedAt` is RENAMED to `doneAt`
 * on the Task record (and in the seed). `updateTaskStage` and `StageEvent` no longer exist.
 *
 * TEST ISOLATION STRATEGY
 * -----------------------
 * The store keeps module-level MUTABLE arrays (`tasks`, `tombstones`) seeded once at module
 * load. Tests mutate that state, so a fresh module instance is required per test. We call
 * `vi.resetModules()` in `beforeEach` and `await import()` the store inside each test
 * (dynamic import), guaranteeing a pristine seed (32 tasks: 27 done / 3 in-progress / 2 todo).
 *
 * DEMO CLOCK
 * ----------
 * The store stamps "today" via `new Date()`. The demo clock is fixed at 2026-06-20 (current
 * ISO week = Mon Jun 15 – Sun Jun 21). We freeze time with fake timers so live mutations land
 * in the current week deterministically. Frozen at local noon to dodge UTC midnight rollover.
 *
 * SEED LANDMARKS (used by assertions below)
 * -----------------------------------------
 *   todo:        task-31, task-32
 *   in-progress: task-28, task-29, task-30
 *   done in current week (2026-06-15 bucket): task-21..task-27 (7 tasks)
 *     task-21.doneAt === '2026-06-15'  (drag-back this one to dip the current-week point)
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

const CURRENT_WEEK = '2026-06-15'

function lastPoint(series: WeeklyPoint[]): WeeklyPoint {
  return series[series.length - 1]
}

describe('store — net-current seed parity (§7 Step 1.1)', () => {
  it('weeklyProgress() derives from net-current state = the pinned 6-point rising series', async () => {
    const store = await loadStore()
    // Untouched seed: every done task is a live completion bucketed by its doneAt, so the
    // net-current series equals the v1 cumulative series byte-for-byte (architect §1.3).
    expect(store.weeklyProgress()).toEqual(SEED_SERIES)
  })

  it('doneThisWeek() counts completions in the current ISO week (seed = 7)', async () => {
    const store = await loadStore()
    expect(store.doneThisWeek()).toBe(7)
  })

  it('getTasks() returns the 32-task seed', async () => {
    const store = await loadStore()
    expect(store.getTasks()).toHaveLength(32)
  })

  it('inProgressCount() counts live in-progress tasks (seed = 3)', async () => {
    const store = await loadStore()
    expect(store.inProgressCount()).toBe(3)
  })
})

describe('store — drag-back dips (§7 Step 1.2)', () => {
  it('moveTask(doneId, "todo") decrements doneThisWeek, dips the current-week point, clears doneAt', async () => {
    const store = await loadStore()

    const beforeDone = store.doneThisWeek() // 7
    const beforePoint = lastPoint(store.weeklyProgress()) // { 2026-06-15, 7 }
    expect(beforePoint.week).toBe(CURRENT_WEEK)

    // task-21 is a done task whose doneAt (2026-06-15) lands in the current week.
    const moved = store.moveTask('task-21', 'todo')
    expect(moved).not.toBeNull()
    expect(moved!.stage).toBe('todo')
    // Leaving Done RETRACTS its current-done status.
    expect(moved!.doneAt).toBeNull()

    // Net-current dips by one: it left liveDone and was NOT tombstoned (drag ≠ delete).
    expect(store.doneThisWeek()).toBe(beforeDone - 1) // 6
    const afterPoint = lastPoint(store.weeklyProgress())
    expect(afterPoint).toEqual({ week: CURRENT_WEEK, completed: beforePoint.completed - 1 })
  })
})

describe('store — delete-while-done preserves via tombstone (§7 Step 1.3, the PIN)', () => {
  // PIN TEST — the #1 correctness guard. A completion must survive deletion of its task,
  // now via a tombstone rather than an append-only event.
  it('PIN: deleting a done task does NOT change weeklyProgress() or doneThisWeek()', async () => {
    const store = await loadStore()

    // Advance a live todo task all the way to done (a real check-off this week).
    const advanced = store.moveTask('task-31', 'in-progress')
    expect(advanced).not.toBeNull()
    store.moveTask('task-31', 'done')

    // Snapshot AFTER the check-off (the baseline the delete must preserve).
    const progressAfterCheckoff = store.weeklyProgress()
    const doneAfterCheckoff = store.doneThisWeek()

    // Now delete that very task.
    store.deleteTask('task-31')

    // The task is gone from the live list...
    expect(store.getTasks().find((t) => t.id === 'task-31')).toBeUndefined()

    // ...but the completion survives via tombstone: counters/chart UNCHANGED from post-check-off.
    expect(store.weeklyProgress()).toEqual(progressAfterCheckoff)
    expect(store.doneThisWeek()).toBe(doneAfterCheckoff)
  })

  it('CONTRAST: drag-back DIPS, but a separate delete-while-done KEEPS (same starting counter)', async () => {
    const store = await loadStore()
    const base = store.doneThisWeek() // 7

    // (a) Drag-back: task-21 done→todo → dips to 6 (left Done, not tombstoned).
    store.moveTask('task-21', 'todo')
    expect(store.doneThisWeek()).toBe(base - 1) // 6

    // (b) Delete-while-done: task-22 is still a current-week done card. Deleting it
    //     tombstones the completion first, so the counter does NOT dip again.
    store.deleteTask('task-22')
    expect(store.doneThisWeek()).toBe(base - 1) // still 6 — the delete preserved task-22's completion
    expect(store.getTasks().find((t) => t.id === 'task-22')).toBeUndefined()
  })
})

describe('store — moveTask any-direction (§7 Step 1.4)', () => {
  it('todo→done stamps doneAt=today and counts in the current week', async () => {
    const store = await loadStore()
    // Take task-31 (todo) straight to done.
    const moved = store.moveTask('task-31', 'done')
    expect(moved).not.toBeNull()
    expect(moved!.stage).toBe('done')
    expect(moved!.doneAt).toBe('2026-06-20')

    expect(store.doneThisWeek()).toBe(8) // 7 → 8
    expect(lastPoint(store.weeklyProgress())).toEqual({ week: CURRENT_WEEK, completed: 8 })
  })

  it('done→in-progress clears doneAt and dips the barometer', async () => {
    const store = await loadStore()
    const before = store.doneThisWeek() // 7

    const moved = store.moveTask('task-21', 'in-progress')
    expect(moved).not.toBeNull()
    expect(moved!.stage).toBe('in-progress')
    expect(moved!.doneAt).toBeNull()

    expect(store.doneThisWeek()).toBe(before - 1) // 6
    expect(store.inProgressCount()).toBe(4) // 3 + the re-opened card
  })

  it('same-stage move is a pure no-op: returns the task, no doneAt churn, no counter change', async () => {
    const store = await loadStore()
    const beforeProgress = store.weeklyProgress()
    const beforeDone = store.doneThisWeek()
    const originalDoneAt = store.getTasks().find((t) => t.id === 'task-21')!.doneAt

    const same = store.moveTask('task-21', 'done') // already done
    expect(same).not.toBeNull()
    expect(same!.stage).toBe('done')
    // doneAt must NOT be re-stamped on a same-stage no-op.
    expect(same!.doneAt).toBe(originalDoneAt)

    expect(store.weeklyProgress()).toEqual(beforeProgress)
    expect(store.doneThisWeek()).toBe(beforeDone)
  })

  it('done→todo→done re-stamps doneAt to the current week', async () => {
    const store = await loadStore()
    // task-21 starts done in the current week. Drag out, then back in.
    store.moveTask('task-21', 'todo')
    const back = store.moveTask('task-21', 'done')
    expect(back).not.toBeNull()
    // Re-entry re-stamps doneAt to today → it lands in the current week again.
    expect(back!.doneAt).toBe('2026-06-20')
    expect(lastPoint(store.weeklyProgress())).toEqual({ week: CURRENT_WEEK, completed: 7 })
    expect(store.doneThisWeek()).toBe(7)
  })

  it('returns null for an unknown id', async () => {
    const store = await loadStore()
    expect(store.moveTask('task-999', 'done')).toBeNull()
  })
})

describe('store — addTask lands in the given column (§7 Step 1.5)', () => {
  // NEW CONTRACT: addTask(title, stage = 'todo'). A card added in a column appears in THAT
  // column's stage. doneAt is stamped today ONLY when stage === 'done' (the new card IS a
  // completion and counts); otherwise null. Empty/whitespace title → null regardless of stage.
  it('rejects empty / whitespace title → null, no task added, series unchanged (even with stage)', async () => {
    const store = await loadStore()
    const beforeLen = store.getTasks().length
    const beforeProgress = store.weeklyProgress()

    expect(store.addTask('')).toBeNull()
    expect(store.addTask('   ')).toBeNull()
    // Empty is rejected regardless of the requested stage.
    expect(store.addTask('  ', 'done')).toBeNull()

    expect(store.getTasks()).toHaveLength(beforeLen)
    expect(store.weeklyProgress()).toEqual(beforeProgress)
  })

  it('addTask("  Foo  ") with no stage trims, creates in todo at end, doneAt null (default unchanged)', async () => {
    const store = await loadStore()
    const beforeLen = store.getTasks().length

    const created = store.addTask('  Foo  ')
    expect(created).not.toBeNull()
    expect(created!.title).toBe('Foo')
    expect(created!.stage).toBe('todo')
    expect(created!.createdAt).toBe('2026-06-20')
    expect(created!.doneAt).toBeNull()

    const tasks = store.getTasks()
    expect(tasks).toHaveLength(beforeLen + 1)
    expect(tasks[tasks.length - 1].id).toBe(created!.id) // appended at end

    // A new todo never counts toward the barometer.
    expect(store.weeklyProgress()).toEqual(SEED_SERIES)
    expect(store.doneThisWeek()).toBe(7)
  })

  it('addTask("Foo", "in-progress") creates in-progress, doneAt null, bumps inProgressCount', async () => {
    const store = await loadStore()
    const beforeLen = store.getTasks().length
    const beforeInProgress = store.inProgressCount() // 3

    const created = store.addTask('Foo', 'in-progress')
    expect(created).not.toBeNull()
    expect(created!.stage).toBe('in-progress')
    expect(created!.doneAt).toBeNull()

    const tasks = store.getTasks()
    expect(tasks).toHaveLength(beforeLen + 1)
    expect(tasks[tasks.length - 1].id).toBe(created!.id) // appended at end

    // An in-progress card bumps the in-progress count, not the barometer.
    expect(store.inProgressCount()).toBe(beforeInProgress + 1) // 4
    expect(store.weeklyProgress()).toEqual(SEED_SERIES)
    expect(store.doneThisWeek()).toBe(7)
  })

  it('addTask("Foo", "done") creates done, stamps doneAt=today, bumps doneThisWeek + current-week point', async () => {
    const store = await loadStore()
    const beforeLen = store.getTasks().length
    const beforeDone = store.doneThisWeek() // 7
    const beforePoint = lastPoint(store.weeklyProgress()) // { 2026-06-15, 7 }
    expect(beforePoint.week).toBe(CURRENT_WEEK)

    const created = store.addTask('Foo', 'done')
    expect(created).not.toBeNull()
    expect(created!.stage).toBe('done')
    // The new card IS a completion: stamped today, counts in the current week.
    expect(created!.doneAt).toBe('2026-06-20')

    const tasks = store.getTasks()
    expect(tasks).toHaveLength(beforeLen + 1)
    expect(tasks[tasks.length - 1].id).toBe(created!.id) // appended at end

    expect(store.doneThisWeek()).toBe(beforeDone + 1) // 8
    expect(lastPoint(store.weeklyProgress())).toEqual({
      week: CURRENT_WEEK,
      completed: beforePoint.completed + 1,
    }) // 8
  })
})

describe('store — renameTask (unchanged behavior)', () => {
  it('changes the title only, touches no other field', async () => {
    const store = await loadStore()
    const original = store.getTasks().find((t) => t.id === 'task-28')!
    const { stage, createdAt, doneAt } = original
    const beforeProgress = store.weeklyProgress()

    const renamed = store.renameTask('task-28', '  Renamed pricing page  ')
    expect(renamed).not.toBeNull()
    expect(renamed!.title).toBe('Renamed pricing page')
    expect(renamed!.stage).toBe(stage)
    expect(renamed!.createdAt).toBe(createdAt)
    expect(renamed!.doneAt).toBe(doneAt)

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

describe('store — deleteTask (§7 Step 1.6)', () => {
  it('deleting a NON-done card records no tombstone — series unchanged (it never counted)', async () => {
    const store = await loadStore()
    const beforeProgress = store.weeklyProgress()
    const beforeDone = store.doneThisWeek()

    // task-28 is an in-progress card: it was never a completion.
    store.deleteTask('task-28')

    expect(store.getTasks().find((t) => t.id === 'task-28')).toBeUndefined()
    expect(store.weeklyProgress()).toEqual(beforeProgress)
    expect(store.doneThisWeek()).toBe(beforeDone)
  })

  it('deleting an absent id is a safe no-op', async () => {
    const store = await loadStore()
    const len = store.getTasks().length
    expect(() => store.deleteTask('task-999')).not.toThrow()
    expect(store.getTasks()).toHaveLength(len)
  })

  it('inProgressCount drops when a live in-progress card is deleted', async () => {
    const store = await loadStore()
    expect(store.inProgressCount()).toBe(3)
    store.deleteTask('task-28') // an in-progress seed task
    expect(store.inProgressCount()).toBe(2)
  })
})

describe('store — weeklyDelta (unchanged)', () => {
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

// Type-level + runtime guards: force the implementer to export the v2 API surface and
// to REMOVE the v1 names. These fail collection/run if the symbols are wrong.
describe('store — exported symbols guard (§7 Step 1.7)', () => {
  it('exposes the v2 API surface with moveTask present', async () => {
    const store = await loadStore()
    const fns: Array<keyof StoreModule> = [
      'getTasks',
      'moveTask',
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
  })

  it('no longer exports the v1 updateTaskStage function', async () => {
    const store = await loadStore() as Record<string, unknown>
    expect(store.updateTaskStage).toBeUndefined()
  })

  it('Task carries doneAt (renamed from completedAt); DoneTombstone type exists', async () => {
    await loadStore()
    // Compile-time anchors: Task must have `doneAt`, and the DoneTombstone type must be
    // exported. These have no runtime effect but fail collection if the shape is wrong.
    const stage: Stage = 'todo'
    const task: Task = {
      id: 'task-00',
      title: 'x',
      stage,
      createdAt: '2026-06-20',
      doneAt: null,
    }
    const tombstone: import('./store').DoneTombstone = {
      taskId: 'task-00',
      doneAt: '2026-06-20',
    }
    void task
    void tombstone
  })
})
