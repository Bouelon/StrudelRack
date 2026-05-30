// client/src/components/Session/SessionHeader.tsx
import { useRack } from '../../store/rackStore'
import { initStrudelEngine } from '../../engine/strudel'
import { ViewToggle } from './ViewToggle'
import { ParticipantList } from './ParticipantList'
import type { ConnStatus } from '../../collab/useCollab'

export const SessionHeader = ({
  sessionCode,
  status = 'offline',
}: {
  sessionCode?: string
  status?: ConnStatus
}) => {
  const isPlaying = useRack((s) => s.isPlaying)
  const setPlaying = useRack((s) => s.setPlaying)
  const bpm = useRack((s) => s.bpm)
  const setBpm = useRack((s) => s.setBpm)

  const togglePlay = async () => {
    // AudioContext must be created/resumed from a user gesture.
    await initStrudelEngine()
    setPlaying(!isPlaying)
  }

  return (
    <header className="flex items-center gap-4 px-4 h-14 border-b border-[#1a1a20] bg-[#0a0a0c]">
      <div className="flex items-center gap-2">
        <span className="font-cond font-bold text-lg tracking-wide text-[var(--color-accent-green)]">
          STRUDEL
        </span>
        <span className="font-cond font-bold text-lg tracking-wide text-[var(--color-text)]">
          RACK
        </span>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className="px-4 py-1.5 rounded-sm font-semibold uppercase tracking-widest text-xs border"
        style={{
          background: isPlaying ? 'var(--color-led-on)' : 'var(--color-accent-green)',
          color: '#0d0d0f',
          borderColor: 'transparent',
        }}
      >
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>

      <label className="flex items-center gap-2 font-mono text-xs text-[var(--color-text-dim)]">
        BPM
        <input
          type="number"
          min={40}
          max={300}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value) || bpm)}
          className="w-16 bg-[#15151a] border border-black rounded-sm px-2 py-1 text-[var(--color-accent-green)] tabular-nums"
        />
      </label>

      <div className="ml-auto flex items-center gap-4">
        <ParticipantList status={status} />
        {sessionCode && (
          <button
            type="button"
            title="Copy room code"
            onClick={() => navigator.clipboard?.writeText(sessionCode)}
            className="font-mono text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          >
            room <span className="text-[var(--color-accent-cyan)]">{sessionCode}</span>
          </button>
        )}
        <ViewToggle />
      </div>
    </header>
  )
}
