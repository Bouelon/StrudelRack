// client/src/components/controls/WaSwitch.tsx
// Toggle switch. Uses a styled button rather than the sprite switch so it works
// without a dedicated sprite sheet, while staying visually on-theme.

interface WaSwitchProps {
  value: boolean
  label: string
  accent: string
  onChange: (value: boolean) => void
}

export const WaSwitch = ({ value, label, accent, onChange }: WaSwitchProps) => {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative h-5 w-10 rounded-sm border border-black transition-colors"
        style={{
          background: value ? accent : '#15151a',
          boxShadow: value
            ? `inset 0 0 4px rgba(0,0,0,0.5), 0 0 8px ${accent}66`
            : 'inset 0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        <span
          className="absolute top-0.5 h-3.5 w-3.5 rounded-[2px] transition-all"
          style={{
            left: value ? 'calc(100% - 1.125rem)' : '0.125rem',
            background: 'radial-gradient(circle at 35% 35%, #ddd, #777)',
          }}
        />
      </button>
      <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
        {label}
      </span>
    </div>
  )
}
