// client/src/components/Session/ParticipantList.tsx
import { useRack } from '../../store/rackStore'
import type { ConnStatus } from '../../collab/useCollab'

const STATUS_COLOR: Record<ConnStatus, string> = {
  offline: 'var(--color-text-dim)',
  connecting: 'var(--color-accent-amber)',
  open: 'var(--color-accent-green)',
  closed: 'var(--color-led-on)',
}

export const ParticipantList = ({ status }: { status: ConnStatus }) => {
  const participants = useRack((s) => s.participants)
  const me = useRack((s) => s.userId)

  return (
    <div className="flex items-center gap-2">
      <span
        title={status}
        className="h-2 w-2 rounded-full"
        style={{ background: STATUS_COLOR[status], boxShadow: `0 0 6px ${STATUS_COLOR[status]}` }}
      />
      <div className="flex items-center -space-x-1">
        {participants.map((p) => (
          <span
            key={p.userId}
            title={p.displayName + (p.userId === me ? ' (you)' : '')}
            className="h-5 w-5 rounded-full border border-[#0a0a0c] grid place-items-center text-[9px] font-bold text-[#0d0d0f]"
            style={{ background: p.color }}
          >
            {p.displayName.slice(0, 1).toUpperCase()}
          </span>
        ))}
      </div>
      {participants.length > 0 && (
        <span className="font-mono text-[10px] text-[var(--color-text-dim)]">
          {participants.length} on air
        </span>
      )}
    </div>
  )
}
