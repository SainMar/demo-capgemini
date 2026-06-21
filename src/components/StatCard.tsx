interface StatCardProps {
  label: string
  value: number
  emphasis: 'headline' | 'soft'
  delta?: number
  caption?: string
}

export function StatCard({ label, value, emphasis, delta, caption }: StatCardProps) {
  const isHeadline = emphasis === 'headline'
  const showDelta = isHeadline && delta !== undefined && delta > 0

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl bg-white p-6 ${
        isHeadline ? 'ring-1 ring-slate-200 shadow-sm' : 'border border-slate-200'
      }`}
    >
      <span
        className={`text-xs font-medium uppercase tracking-wide ${
          isHeadline ? 'text-slate-600' : 'text-slate-400'
        }`}
      >
        {label}
      </span>

      <span
        className={`font-bold tabular-nums text-slate-800 ${isHeadline ? 'text-6xl' : 'text-4xl font-semibold'}`}
      >
        {value}
      </span>

      {showDelta ? (
        <span className="text-sm font-medium text-blue-600">
          ▲ +{delta} vs last week
        </span>
      ) : (
        caption && <span className="text-sm text-slate-400">{caption}</span>
      )}
    </div>
  )
}
