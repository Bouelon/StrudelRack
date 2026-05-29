// client/src/components/controls/WaKnob.tsx
import { useRef, useEffect } from 'react'

interface WaKnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  unit?: string
  /** webaudio-controls "indicator;body;highlight" — used for the procedural knob. */
  colors: string
  /** Optional sprite sheet override; when set, takes precedence over `colors`. */
  skinSrc?: string
  diameter?: number
  onChange: (value: number) => void
}

export const WaKnob = ({
  value,
  min,
  max,
  step = 0.01,
  label,
  unit,
  colors,
  skinSrc,
  diameter = 56,
  onChange,
}: WaKnobProps) => {
  const ref = useRef<HTMLElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const v = detail?.value ?? (el as unknown as { value: number }).value
      if (typeof v === 'number') onChangeRef.current(v)
    }
    el.addEventListener('change', handler)
    el.addEventListener('input', handler)
    return () => {
      el.removeEventListener('change', handler)
      el.removeEventListener('input', handler)
    }
  }, [])

  useEffect(() => {
    const el = ref.current as unknown as { value: number; setValue?: (v: number, f?: boolean) => void } | null
    if (!el) return
    if (el.setValue) el.setValue(value, false)
    else el.value = value
  }, [value])

  const readout = step >= 1 ? value.toFixed(0) : value.toFixed(2)

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <webaudio-knob
        ref={ref}
        src={skinSrc}
        colors={skinSrc ? undefined : colors}
        value={value}
        min={min}
        max={max}
        step={step}
        diameter={diameter}
        tooltip="%s"
      />
      <span className="font-mono text-[9px] tabular-nums" style={{ color: colors.split(';')[0] }}>
        {readout}
        {unit ? <span className="text-[var(--color-text-dim)]"> {unit}</span> : null}
      </span>
      <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
        {label}
      </span>
    </div>
  )
}
