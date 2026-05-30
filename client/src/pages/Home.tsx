// client/src/pages/Home.tsx
import { useState } from 'react'
import { generateRoomCode, normalizeRoomCode } from '@shared/index'

interface HomeProps {
  onEnter: (room: string, name: string) => void
}

export const Home = ({ onEnter }: HomeProps) => {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const displayName = () => name.trim() || 'Jammer'

  const create = () => onEnter(generateRoomCode(), displayName())
  const joinSolo = () => onEnter('LOCAL', displayName())
  const join = () => {
    const c = normalizeRoomCode(code)
    if (c) onEnter(c, displayName())
  }

  return (
    <div className="h-full grid place-items-center bg-[var(--color-bg)] p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-baseline gap-2 justify-center mb-1">
          <span className="font-cond font-bold text-3xl tracking-wide text-[var(--color-accent-green)]">
            STRUDEL
          </span>
          <span className="font-cond font-bold text-3xl tracking-wide text-[var(--color-text)]">RACK</span>
        </div>
        <p className="text-center font-mono text-[11px] text-[var(--color-text-dim)] mb-6">
          collaborative modular live coding
        </p>

        <label className="block mb-4">
          <span className="engraved text-[10px] uppercase tracking-widest text-[var(--color-text-dim)]">
            Your name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jammer"
            className="mt-1 w-full bg-[#15151a] border border-black rounded-sm px-3 py-2 font-mono text-sm text-[var(--color-text)]"
          />
        </label>

        <button
          type="button"
          onClick={create}
          className="w-full py-2.5 rounded-sm font-semibold uppercase tracking-widest text-sm mb-3"
          style={{ background: 'var(--color-accent-green)', color: '#0d0d0f' }}
        >
          Create a jam
        </button>

        <div className="flex gap-2 mb-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && join()}
            placeholder="ROOM-CODE"
            className="flex-1 bg-[#15151a] border border-black rounded-sm px-3 py-2 font-mono text-sm uppercase tracking-widest text-[var(--color-accent-cyan)]"
          />
          <button
            type="button"
            onClick={join}
            className="px-4 rounded-sm font-semibold uppercase tracking-widest text-xs border border-[#2a2a32] text-[var(--color-text)]"
          >
            Join
          </button>
        </div>

        <button
          type="button"
          onClick={joinSolo}
          className="w-full text-center font-mono text-[11px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        >
          or play solo →
        </button>
      </div>
    </div>
  )
}
