// client/src/components/Rack/CodePane.tsx
// Collapsed 24px strip by default; expands to show the compiled Strudel program.
// Editable: a manual edit becomes a code override (param knobs no longer drive output
// until reverted). Uses a styled textarea for MVP (CodeMirror 6 deferred — see DECISIONS.md).
import { useState } from 'react'
import { useRack } from '../../store/rackStore'

export const CodePane = ({ error }: { error?: string | null }) => {
  const [expanded, setExpanded] = useState(false)
  const compiled = useRack((s) => s.compiled())
  const codeOverride = useRack((s) => s.codeOverride)
  const setCodeOverride = useRack((s) => s.setCodeOverride)

  const shown = codeOverride ?? compiled
  const overridden = codeOverride !== null

  return (
    <div className="border-t border-[#1a1a20] bg-[#0a0a0c]">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full h-6 flex items-center gap-2 px-3 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
      >
        <span>{expanded ? '▾' : '▸'} master code</span>
        {overridden && <span className="text-[var(--color-accent-amber)]">● override</span>}
        {error && <span className="text-[var(--color-led-on)] truncate">⚠ {error}</span>}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <textarea
            value={shown}
            spellCheck={false}
            onChange={(e) => setCodeOverride(e.target.value)}
            rows={Math.min(16, shown.split('\n').length + 1)}
            className="w-full bg-[#0a0a0a] border border-[#1a1a20] rounded-sm p-2 font-mono text-[12px] leading-5 text-[var(--color-accent-green)] resize-y"
          />
          <div className="flex justify-end mt-1">
            {overridden && (
              <button
                type="button"
                onClick={() => setCodeOverride(null)}
                className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent-amber)] hover:text-[var(--color-text)]"
              >
                revert to compiled
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
