// client/src/components/controls/WaSlider.tsx
import { useRef, useEffect } from 'react'

interface WaSliderProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  unit?: string
  /** webaudio-controls "fill;groove;knob". */
  colors: string
  skinSrc?: string
  height?: number
  onChange: (value: number) => void
}

export const WaSlider = ({
  value,
  min,
  max,
  step = 0.01,
  label,
  unit,
  colors,
  skinSrc,
  height = 96,
  onChange,
}: WaSliderProps) => {
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
    const el = ref.current as unknown as { value: number } | null
    if (el) el.value = value
  }, [value])

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <webaudio-slider
        ref={ref}
        src={skinSrc}
        colors={skinSrc ? undefined : colors}
        direction="vert"
        value={value}
        min={min}
        max={max}
        step={step}
        width={24}
        height={height}
      />
      <span className="font-mono text-[9px] tabular-nums" style={{ color: colors.split(';')[0] }}>
        {step >= 1 ? value.toFixed(0) : value.toFixed(2)}
        {unit ? <span className="text-[var(--color-text-dim)]"> {unit}</span> : null}
      </span>
      <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
        {label}
      </span>
    </div>
  )
}
