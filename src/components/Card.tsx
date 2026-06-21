import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Stage, Task } from '../data/store'

interface CardProps {
  task: Task
  onAdvance: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  justDone?: boolean
  overlay?: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const STATUS_LABEL: Record<Stage, string> = {
  todo: 'Mark task to do as in progress',
  'in-progress': 'Mark task in progress as done',
  done: 'Task done',
}

export function Card({ task, onAdvance, onRename, onDelete, justDone = false, overlay = false }: CardProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [justCompleted, setJustCompleted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  const isDone = task.stage === 'done'
  const reduce = prefersReducedMotion()
  // The done-settle beat fires from the click path (justCompleted) OR a drag into Done
  // (justDone prop set by the board). Reduced-motion suppresses the beat (instant fill).
  const settling = !reduce && (justCompleted || justDone)

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { stage: task.stage }, disabled: overlay })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reduce ? undefined : transition,
  }

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

  const showDone = isDone || justCompleted || justDone

  const overlayLift = overlay
    ? reduce
      ? 'shadow-lg cursor-grabbing'
      : 'shadow-lg scale-[1.02] rotate-[1deg] cursor-grabbing'
    : ''

  return (
    <li
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      className={`group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 hover:shadow-sm ${
        reduce ? '' : 'transition-[box-shadow,border-color] duration-200'
      } ${!overlay && isDragging ? 'opacity-40' : ''} ${
        settling ? '-translate-y-0.5' : ''
      } ${reduce ? '' : 'transition-transform duration-300 ease-out'} ${overlayLift}`}
    >
      <button
        type="button"
        aria-label={`Move ${task.title}`}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 hover:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.4" />
          <circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" />
          <circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" />
          <circle cx="15" cy="18" r="1.4" />
        </svg>
      </button>

      <button
        type="button"
        aria-label={STATUS_LABEL[task.stage]}
        onClick={handleAdvance}
        disabled={isDone}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          reduce ? '' : 'transition-all duration-200 ease-out'
        } ${
          showDone
            ? 'bg-blue-600 text-white'
            : task.stage === 'in-progress'
              ? 'border-2 border-slate-400 text-slate-400'
              : 'cursor-pointer border-2 border-slate-300 text-transparent hover:border-slate-400'
        } ${settling ? 'scale-110' : 'scale-100'}`}
      >
        {showDone && (
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
          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      ) : (
        <span
          onClick={startEditing}
          className={`flex-1 truncate text-left text-sm ${
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
        className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-blue-500 group-hover:opacity-100"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 5h14M8 5V3.5h4V5M5 5l1 11h8l1-11" />
        </svg>
      </button>
    </li>
  )
}
