import { useRef, useState } from 'react'
import type { Task } from '../data/store'

interface QuickAddInputProps {
  onAdd: (title: string) => Task | null
}

export function QuickAddInput({ onAdd }: QuickAddInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (value.trim() === '') return
    const created = onAdd(value.trim())
    if (created) {
      setValue('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
      <span aria-hidden="true" className="text-lg leading-none text-slate-400">
        +
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Add a task"
        placeholder="Add a task…"
        autoFocus
        className="flex-1 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none"
      />
      <span aria-hidden="true" className="text-sm text-slate-400">
        ⏎
      </span>
    </div>
  )
}
