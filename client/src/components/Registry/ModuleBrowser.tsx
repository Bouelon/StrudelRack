// client/src/components/Registry/ModuleBrowser.tsx
import { useMemo, useState } from 'react'
import type { ModuleType } from '@shared/index'
import { useRegistry } from '../../store/registryStore'
import { useRack } from '../../store/rackStore'

const TYPE_ORDER: ModuleType[] = ['instrument', 'sequencer', 'effect', 'modifier']

const TYPE_COLOR: Record<ModuleType, string> = {
  instrument: 'var(--color-accent-green)',
  effect: 'var(--color-accent-amber)',
  sequencer: 'var(--color-accent-purple)',
  modifier: 'var(--color-accent-cyan)',
}

export const ModuleBrowser = () => {
  const defs = useRegistry((s) => s.defs)
  const addModule = useRack((s) => s.addModule)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ModuleType | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return defs.filter((d) => {
      if (filter !== 'all' && d.type !== filter) return false
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        d.description.toLowerCase().includes(q)
      )
    })
  }, [defs, query, filter])

  return (
    <aside className="w-64 shrink-0 border-r border-[#1a1a20] bg-[#0a0a0c] flex flex-col">
      <div className="p-3 border-b border-[#1a1a20]">
        <h2 className="font-cond font-bold uppercase tracking-widest text-xs text-[var(--color-text-dim)] mb-2">
          Module Registry
        </h2>
        <input
          type="text"
          placeholder="search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-[#15151a] border border-black rounded-sm px-2 py-1 font-mono text-xs text-[var(--color-text)] mb-2"
        />
        <div className="flex flex-wrap gap-1">
          {(['all', ...TYPE_ORDER] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className="px-1.5 py-0.5 rounded-sm text-[9px] font-semibold uppercase tracking-wider border"
              style={{
                borderColor: filter === t ? 'var(--color-accent-green)' : '#2a2a32',
                color: filter === t ? 'var(--color-accent-green)' : 'var(--color-text-dim)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
        {filtered.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => addModule(d.id)}
            className="text-left rounded-sm p-2 border border-[#1f1f26] hover:border-[#3a3a44] bg-[var(--color-panel)] transition-colors group"
            style={{ borderLeft: `3px solid ${TYPE_COLOR[d.type]}` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-cond font-semibold text-sm" style={{ color: TYPE_COLOR[d.type] }}>
                {d.name}
              </span>
              <span className="text-[var(--color-text-dim)] text-lg leading-none opacity-0 group-hover:opacity-100">
                +
              </span>
            </div>
            <p className="font-mono text-[10px] text-[var(--color-text-dim)] mt-0.5 line-clamp-2">
              {d.description}
            </p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="font-mono text-[10px] text-[var(--color-text-dim)] p-2">No modules match.</p>
        )}
      </div>
    </aside>
  )
}
