import { useEffect, useRef, useState } from 'react'
import type { Task } from '../data/store'

interface TaskRowProps {
  task: Task
  onAdvance: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const STATUS_LABEL: Record<Task['stage'], string> = {
  todo: 'Mark task to do as in progress',
  'in-progress': 'Mark task in progress as done',
  done: 'Task done',
}

export function TaskRow({ task, onAdvance, onRename, onDelete }: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [justCompleted, setJustCompleted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  const isDone = task.stage === 'done'
  const reduce = prefersReducedMotion()

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleAdvance() {
    if (isDone) return
    if (task.stage === 'in-progress' && !reduce) {
      setJustCompleted(true)
      window.setTimeout(() => setJustCompleted(false), 320)
    }
    onAdvance(task.id)
  }

  function startEditing() {
    if (isDone) return
    committedRef.current = false
    setDraftTitle(task.title)
    setEditing(true)
  }

  function commit() {
    if (committedRef.current) return
    committedRef.current = true
    setEditing(false)
    onRename(task.id, draftTitle)
  }

  function cancel() {
    committedRef.current = true
    setEditing(false)
    setDraftTitle(task.title)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  const motionClass = reduce ? '' : 'transition-all duration-300 ease-out'

  return (
    <li
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 ${
        reduce ? '' : 'transition-colors duration-200'
      } ${justCompleted && !reduce ? '-translate-y-0.5' : ''} ${motionClass}`}
    >
      <button
        type="button"
        aria-label={STATUS_LABEL[task.stage]}
        onClick={handleAdvance}
        disabled={isDone}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          reduce ? '' : 'transition-all duration-200 ease-out'
        } ${
          isDone || justCompleted
            ? 'bg-blue-600 text-white'
            : task.stage === 'in-progress'
              ? 'border-2 border-slate-400 text-slate-400'
              : 'border-2 border-slate-300 text-transparent hover:border-slate-400'
        } ${justCompleted && !reduce ? 'scale-110' : 'scale-100'}`}
      >
        {(isDone || justCompleted) && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-7" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      ) : (
        <span
          onClick={startEditing}
          className={`flex-1 truncate text-left ${
            isDone ? 'text-slate-400 line-through' : 'cursor-text text-slate-800'
          }`}
        >
          {task.title}
        </span>
      )}

      <button
        type="button"
        aria-label="Delete task"
        onClick={() => onDelete(task.id)}
        className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500 group-hover:opacity-100"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 5h14M8 5V3.5h4V5M5 5l1 11h8l1-11" />
        </svg>
      </button>
    </li>
  )
}
