// client/src/components/Rack/ModulePanel.tsx
import type { CSSProperties } from 'react'
import { useRack } from '../../store/rackStore'
import { useRegistry } from '../../store/registryStore'
import { ParamControl } from './ParamControl'
import { WaMonitor } from '../controls/WaMonitor'

const HP_PX = 12

export const ModulePanel = ({ instanceId }: { instanceId: string }) => {
  const instance = useRack((s) => s.instances.find((i) => i.instanceId === instanceId))
  const updateParam = useRack((s) => s.updateParam)
  const toggleActive = useRack((s) => s.toggleActive)
  const removeModule = useRack((s) => s.removeModule)
  const def = useRegistry((s) => (instance ? s.getDef(instance.defId) : undefined))

  if (!instance || !def) return null

  const widthPx = def.visual.panelWidthHP * HP_PX
  const accent = def.visual.accentColor
  const textureClass = def.visual.panelTexture ? `panel-texture-${def.visual.panelTexture}` : ''

  const fullWidthParams = def.params.filter((p) => p.type === 'steps' || p.type === 'code')
  const compactParams = def.params.filter((p) => p.type !== 'steps' && p.type !== 'code')

  return (
    <div
      className={`module-panel ${textureClass}`}
      style={{
        width: widthPx,
        minWidth: widthPx,
        background: def.visual.panelColor,
        ['--node-accent' as string]: accent,
      } as CSSProperties}
    >
      {/* type stripe */}
      <div style={{ height: 4, background: accent, borderRadius: '4px 4px 0 0' }} />

      {/* corner screws */}
      <span className="screw" style={{ top: 8, left: 6 }} />
      <span className="screw" style={{ top: 8, right: 6 }} />
      <span className="screw" style={{ bottom: 6, left: 6 }} />
      <span className="screw" style={{ bottom: 6, right: 6 }} />

      {/* header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span
          className="engraved font-semibold uppercase tracking-[0.08em] leading-tight text-[13px]"
          style={{ color: accent }}
        >
          {def.name}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title={instance.active ? 'Mute' : 'Unmute'}
            onClick={() => toggleActive(instance.instanceId)}
            className="h-2.5 w-2.5 rounded-full border border-black"
            style={{
              background: instance.active ? 'var(--color-led-on)' : 'var(--color-led-off)',
              boxShadow: instance.active ? '0 0 6px 1px var(--color-led-on)' : 'none',
            }}
          />
          <button
            type="button"
            title="Remove"
            onClick={() => removeModule(instance.instanceId)}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-led-on)] text-xs leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="px-3 pb-3 pt-1 flex flex-col gap-3"
        style={{ opacity: instance.active ? 1 : 0.45 }}
      >
        {fullWidthParams.map((p) => (
          <ParamControl
            key={p.id}
            def={def}
            param={p}
            value={instance.paramValues[p.id]}
            onChange={(v) => updateParam(instance.instanceId, p.id, v)}
          />
        ))}

        {compactParams.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center">
            {compactParams.map((p) => (
              <ParamControl
                key={p.id}
                def={def}
                param={p}
                value={instance.paramValues[p.id]}
                onChange={(v) => updateParam(instance.instanceId, p.id, v)}
              />
            ))}
          </div>
        )}

        {def.visual.hasOscilloscope && <WaMonitor width={widthPx - 24} height={36} color={accent} />}
      </div>
    </div>
  )
}
