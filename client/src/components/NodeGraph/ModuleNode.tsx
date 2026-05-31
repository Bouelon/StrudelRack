// client/src/components/NodeGraph/ModuleNode.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { PortType } from '@shared/index'
import { useRack } from '../../store/rackStore'
import { useRegistry } from '../../store/registryStore'
import { ParamControl } from '../Rack/ParamControl'

export interface ModuleNodeData {
  instanceId: string
  [key: string]: unknown
}

const HP_PX = 12

/** Trigger/MIDI ports stand out in amber; CV cyan; audio inherits the panel accent. */
function portColor(type: PortType, accent: string): string {
  if (type === 'trigger') return '#ffa733'
  if (type === 'cv') return '#7cff9b'
  return accent
}

export const ModuleNode = ({ data, selected }: NodeProps) => {
  const { instanceId } = data as ModuleNodeData
  const instance = useRack((s) => s.instances.find((i) => i.instanceId === instanceId))
  const updateParam = useRack((s) => s.updateParam)
  const toggleActive = useRack((s) => s.toggleActive)
  const def = useRegistry((s) => (instance ? s.getDef(instance.defId) : undefined))

  if (!instance || !def) return null
  const accent = def.visual.accentColor
  const width = Math.min(Math.max(def.visual.panelWidthHP * HP_PX, 120), 220)
  const nodeParams = def.params.filter((p) => p.showInNodeView)
  // Reserve vertical room so every input/output handle sits on the card.
  const maxPorts = Math.max(def.ports.inputs.length, def.ports.outputs.length)
  const minHeight = Math.max(70, 34 + maxPorts * 20 + 8)

  return (
    <div
      className={`module-node ${selected ? 'selected' : ''}`}
      style={{ borderTopColor: accent, width, minHeight, color: accent, ['--node-accent' as string]: accent } as CSSProperties}
    >
      {def.ports.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          title={`${port.label} (${port.type})`}
          style={{
            top: 34 + i * 20,
            background: portColor(port.type, accent),
            width: 9,
            height: 9,
            borderRadius: port.type === 'trigger' ? 2 : 9,
          }}
        >
          <span className="port-label port-label-in">{port.label}</span>
        </Handle>
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
          title={`${port.label} (${port.type})`}
          style={{
            top: 34 + i * 20,
            background: portColor(port.type, accent),
            width: 9,
            height: 9,
            borderRadius: port.type === 'trigger' ? 2 : 9,
          }}
        >
          <span className="port-label port-label-out">{port.label}</span>
        </Handle>
      ))}
    </div>
  )
}
