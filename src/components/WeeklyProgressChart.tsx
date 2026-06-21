import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { WeeklyPoint } from '../data/store'
import { formatWeek } from './months'

interface WeeklyProgressChartProps {
  data: WeeklyPoint[]
}

export function yAxisTicks(data: WeeklyPoint[]): number[] {
  const max = data.reduce((m, p) => Math.max(m, p.completed), 0)
  const top = max + 1
  return Array.from({ length: top + 1 }, (_, i) => i)
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface TooltipPayload {
  active?: boolean
  payload?: Array<{ payload: WeeklyPoint }>
}

function ChartTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
      Week of {formatWeek(point.week)} — {point.completed} done
    </div>
  )
}

const CHART_HEIGHT = 280

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  const ticks = yAxisTicks(data)
  const top = ticks[ticks.length - 1]
  const animate = !prefersReducedMotion()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Completed per week
      </h2>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="#E2E8F0" horizontal vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={formatWeek}
            tick={{ fontSize: 12, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis
            type="number"
            domain={[0, top]}
            ticks={ticks}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E2E8F0' }} />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="#2563EB"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#2563EB', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={animate}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
