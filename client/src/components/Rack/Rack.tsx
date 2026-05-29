// client/src/components/Rack/Rack.tsx
import { useRack } from '../../store/rackStore'
import { ModulePanel } from './ModulePanel'

export const Rack = () => {
  const instances = useRack((s) => s.instances)
  const ordered = [...instances].sort((a, b) => a.position - b.position)

  return (
    <div className="h-full overflow-auto p-6">
      {ordered.length === 0 ? (
        <div className="h-full flex items-center justify-center text-[var(--color-text-dim)]">
          <p className="font-mono text-sm">
            Empty rack — add a module from the browser on the left.
          </p>
        </div>
      ) : (
        <div
          className="flex gap-2 items-stretch p-3 rounded-md"
          style={{
            background:
              'repeating-linear-gradient(90deg, #0a0a0c 0 2px, #111114 2px 4px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 2px 12px rgba(0,0,0,0.8)',
            minHeight: 320,
            width: 'fit-content',
          }}
        >
          {ordered.map((inst) => (
            <ModulePanel key={inst.instanceId} instanceId={inst.instanceId} />
          ))}
        </div>
      )}
    </div>
  )
}
