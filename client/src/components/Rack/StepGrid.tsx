// client/src/components/Rack/StepGrid.tsx
import { useEffect, useState } from 'react'
import { useRack } from '../../store/rackStore'

interface StepGridProps {
  steps: string[]
  stepCount: number
  accent: string
  /** Value written when a step is enabled. "0" = note root (default), "1" = drum trigger. */
  onValue?: string
  /** Force a fixed number of columns (e.g. 16 for a single straight matrix row). */
  columns?: number
  onChange: (steps: string[]) => void
}

/** Toggling a step on writes `onValue`; off writes "" (a rest). */
export const StepGrid = ({ steps, stepCount, accent, onValue = '0', columns, onChange }: StepGridProps) => {
  const isPlaying = useRack((s) => s.isPlaying)
  const bpm = useRack((s) => s.bpm)
  const [playhead, setPlayhead] = useState(-1)

  // Visual playhead: cycle steps at the 16th-note rate implied by BPM.
  useEffect(() => {
    if (!isPlaying) {
      setPlayhead(-1)
      return
    }
    const sixteenthMs = 60000 / bpm / 4
    const id = window.setInterval(() => {
      setPlayhead((p) => (p + 1) % stepCount)
    }, sixteenthMs)
    return () => window.clearInterval(id)
  }, [isPlaying, bpm, stepCount])

  const padded = Array.from({ length: stepCount }, (_, i) => steps[i] ?? '')

  const toggle = (i: number) => {
    const next = [...padded]
    next[i] = next[i].trim() === '' ? onValue : ''
    onChange(next)
  }

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns ?? Math.min(stepCount, 8)}, minmax(0, 1fr))`, '--led-accent': accent } as React.CSSProperties}
    >
      {padded.map((v, i) => {
        const on = v.trim() !== ''
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={`step-led ${on ? 'on' : ''} ${i === playhead ? 'playhead' : ''}`}
            aria-label={`step ${i + 1}`}
            title={on ? `note ${v}` : 'rest'}
          />
        )
      })}
    </div>
  )
}
