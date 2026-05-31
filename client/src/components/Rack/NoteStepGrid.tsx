// client/src/components/Rack/NoteStepGrid.tsx
// Per-step NOTE editor: 16 cells, each holds a pitch (or a rest). Click a cell to
// toggle rest ↔ note; the dropdown picks the pitch. Emits a string[] the compiler
// turns into mini-notation, e.g. ["c2","","e2"] → note("c2 ~ e2").
import { useEffect, useState } from 'react'
import { useRack } from '../../store/rackStore'

interface NoteStepGridProps {
  steps: string[]
  stepCount: number
  accent: string
  noteOptions: string[]
  columns?: number
  onChange: (steps: string[]) => void
}

const DEFAULT_NOTES = [
  'c2', 'd2', 'e2', 'f2', 'g2', 'a2', 'b2',
  'c3', 'd3', 'e3', 'f3', 'g3', 'a3', 'b3',
  'c4', 'e4', 'g4',
]

export const NoteStepGrid = ({ steps, stepCount, accent, noteOptions, columns, onChange }: NoteStepGridProps) => {
  const isPlaying = useRack((s) => s.isPlaying)
  const bpm = useRack((s) => s.bpm)
  const [playhead, setPlayhead] = useState(-1)
  const notes = noteOptions.length > 0 ? noteOptions : DEFAULT_NOTES
  const fallbackNote = notes[Math.floor(notes.length / 2)] ?? 'c3'

  useEffect(() => {
    if (!isPlaying) {
      setPlayhead(-1)
      return
    }
    const sixteenthMs = 60000 / bpm / 4
    const id = window.setInterval(() => setPlayhead((p) => (p + 1) % stepCount), sixteenthMs)
    return () => window.clearInterval(id)
  }, [isPlaying, bpm, stepCount])

  const padded = Array.from({ length: stepCount }, (_, i) => steps[i] ?? '')

  const set = (i: number, value: string) => {
    const next = [...padded]
    next[i] = value
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
          <div
            key={i}
            className={`note-step ${on ? 'on' : ''} ${i === playhead ? 'playhead' : ''}`}
            style={{ ['--led-accent' as string]: accent }}
          >
            <button
              type="button"
              className="note-step-toggle"
              title={on ? `note ${v} — click to clear` : 'rest — click to set'}
              onClick={() => set(i, on ? '' : fallbackNote)}
            >
              {on ? v : '·'}
            </button>
            {on && (
              <select
                className="note-step-select nodrag"
                value={v}
                onChange={(e) => set(i, e.target.value)}
              >
                {notes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
          </div>
        )
      })}
    </div>
  )
}
