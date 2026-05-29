// client/src/components/NodeGraph/ModuleNode.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CSSProperties } from 'react'
import { useRack } from '../../store/rackStore'
import { useRegistry } from '../../store/registryStore'
import { ParamControl } from '../Rack/ParamControl'

export interface ModuleNodeData {
  instanceId: string
  [key: string]: unknown
}

const HP_PX = 12

export const ModuleNode = ({ data, selected }: NodeProps) => {
  const { instanceId } = data as ModuleNodeData
  const instance = useRack((s) => s.instances.find((i) => i.instanceId === instanceId))
  const updateParam = useRack((s) => s.updateParam)
  const toggleActive = useRack((s) => s.toggleActive)
  const def = useRegistry((s) => (instance ? s.getDef(instance.defId) : undefined))

  if (!instance || !def) return null
  const accent = def.visual.accentColor
  const width = Math.max(def.visual.panelWidthHP * HP_PX, 120)
  const nodeParams = def.params.filter((p) => p.showInNodeView)

  return (
    <div
      className={`module-node ${selected ? 'selected' : ''}`}
      style={{ borderTopColor: accent, width, color: accent, ['--node-accent' as string]: accent } as CSSProperties}
    >
      {def.ports.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{ top: 34 + i * 20, background: accent, width: 9, height: 9 }}
        />
      ))}

      <div className="node-header" style={{ color: accent }}>
        <span>{def.name}</span>
        <button
          type="button"
          title={instance.active ? 'Mute' : 'Unmute'}
          onClick={() => toggleActive(instance.instanceId)}
          className="h-2.5 w-2.5 rounded-full border border-black nodrag"
          style={{
            background: instance.active ? 'var(--color-led-on)' : 'var(--color-led-off)',
            boxShadow: instance.active ? '0 0 6px 1px var(--color-led-on)' : 'none',
          }}
        />
      </div>

      <div className="node-params nodrag" style={{ opacity: instance.active ? 1 : 0.45 }}>
        {nodeParams.length === 0 ? (
          <span className="text-[10px] text-[var(--color-text-dim)] font-mono">{def.type}</span>
        ) : (
          nodeParams
            .filter((p) => p.type === 'knob')
            .map((p) => (
              <ParamControl
                key={p.id}
                def={def}
                param={p}
                value={instance.paramValues[p.id]}
                diameter={36}
                onChange={(v) => updateParam(instance.instanceId, p.id, v)}
              />
            ))
        )}
      </div>

      {def.ports.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{ top: 34 + i * 20, background: accent, width: 9, height: 9 }}
        />
      ))}
    </div>
  )
}
