/**
 * WeeklyProgressChart tests — TDD source of truth (architect-plan §3.1, §6 Step 5).
 *
 * SOFTENED FOR JSDOM (documented): jsdom has no layout engine, so Recharts'
 * ResponsiveContainer measures 0×0 and renders no SVG paths. We therefore:
 *   1. stub the container's measured box to a fixed size (ResizeObserver + bounding rect),
 *   2. assert LIGHT facts only — the component renders without throwing, an <svg> exists,
 *      and Y headroom is [0, max+1] (asserted via the rendered Y-axis tick "8" for a
 *      max of 7, since recharts emits axis ticks as text). We do NOT assert pixel geometry
 *      or exact path `d` strings (brittle, and partly absent under jsdom).
 *
 * The "no second series" requirement is asserted structurally: only one <path class
 * recharts-line-curve> (a single line) is rendered.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { WeeklyPoint } from '../data/store'
import { WeeklyProgressChart } from './WeeklyProgressChart'

const DATA: WeeklyPoint[] = [
  { week: '2026-05-11', completed: 2 },
  { week: '2026-05-18', completed: 3 },
  { week: '2026-05-25', completed: 4 },
  { week: '2026-06-01', completed: 5 },
  { week: '2026-06-08', completed: 6 },
  { week: '2026-06-15', completed: 7 },
]

// Give Recharts a non-zero measured box so it actually draws under jsdom.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value() {
      return { width: 640, height: 320, top: 0, left: 0, right: 640, bottom: 320, x: 0, y: 0, toJSON() {} }
    },
  })
})

function renderChart(data: WeeklyPoint[]) {
  return render(
    <div style={{ width: 640, height: 320 }}>
      <WeeklyProgressChart data={data} />
    </div>,
  )
}

describe('WeeklyProgressChart (§6 Step 5)', () => {
  it('renders without throwing for a WeeklyPoint[] and produces an SVG', () => {
    const { container } = renderChart(DATA)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders exactly one line series (no second series)', () => {
    const { container } = renderChart(DATA)
    const lines = container.querySelectorAll('.recharts-line')
    expect(lines.length).toBe(1)
  })

  it('gives the Y axis headroom of [0, max+1] (max 7 → top tick 8)', () => {
    const { container } = renderChart(DATA)
    // Recharts renders axis ticks as <text>; with domain [0, 8] a tick labelled "8" exists.
    const tickTexts = Array.from(container.querySelectorAll('.recharts-yAxis text')).map(
      (n) => n.textContent,
    )
    expect(tickTexts).toContain('8')
  })
})
