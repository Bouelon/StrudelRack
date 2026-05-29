// client/src/components/Session/ViewToggle.tsx
import { useRack, type ViewMode } from '../../store/rackStore'

const OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'rack', label: 'Rack' },
  { id: 'node', label: 'Node' },
]

export const ViewToggle = () => {
  const view = useRack((s) => s.view)
  const setView = useRack((s) => s.setView)
  return (
    <div className="flex rounded-sm overflow-hidden border border-[#2a2a32]">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setView(o.id)}
          className="px-3 py-1 text-xs font-semibold uppercase tracking-widest transition-colors"
          style={{
            background: view === o.id ? 'var(--color-accent-green)' : 'transparent',
            color: view === o.id ? '#0d0d0f' : 'var(--color-text-dim)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
