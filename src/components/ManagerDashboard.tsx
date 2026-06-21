import { doneThisWeek, inProgressCount, weeklyDelta, weeklyProgress } from '../data/store'
import { StatCard } from './StatCard'
import { ViewToggle } from './ViewToggle'
import type { View } from './ViewToggle'
import { WeeklyProgressChart } from './WeeklyProgressChart'
import { MONTHS } from './months'

interface ManagerDashboardProps {
  view: View
  onViewChange: (view: View) => void
}

function currentWeekLabel(points: { week: string }[]): string {
  if (points.length === 0) return ''
  const last = points[points.length - 1].week
  const [year, month, day] = last.split('-').map(Number)
  const monday = new Date(year, month - 1, day)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const start = `${MONTHS[monday.getMonth()]} ${monday.getDate()}`
  const end =
    sunday.getMonth() === monday.getMonth()
      ? `${sunday.getDate()}`
      : `${MONTHS[sunday.getMonth()]} ${sunday.getDate()}`
  return `Week of ${start} – ${end}`
}

export function ManagerDashboard({ view, onViewChange }: ManagerDashboardProps) {
  const points = weeklyProgress()
  const done = doneThisWeek()
  const inProgress = inProgressCount()
  const delta = weeklyDelta(points)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Team progress</h1>
          <p className="mt-1 text-sm text-slate-500">{currentWeekLabel(points)}</p>
        </div>
        <ViewToggle value={view} onChange={onViewChange} />
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatCard label="Done this week" value={done} emphasis="headline" delta={delta} />
        <StatCard label="In progress" value={inProgress} emphasis="soft" caption="tasks moving" />
      </div>

      <WeeklyProgressChart data={points} />
    </div>
  )
}
