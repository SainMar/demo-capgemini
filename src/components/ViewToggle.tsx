export type View = 'team' | 'manager'

interface ViewToggleProps {
  value: View
  onChange: (value: View) => void
}

const OPTIONS: Array<{ value: View; label: string }> = [
  { value: 'team', label: 'Team' },
  { value: 'manager', label: 'Manager' },
]

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Switch view"
      className="inline-flex rounded-full border border-slate-200 bg-white p-1"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              selected ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
