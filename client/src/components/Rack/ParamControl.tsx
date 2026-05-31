// client/src/components/Rack/ParamControl.tsx
// Renders the appropriate control for a ModuleParam and wires it to the store.
import type { ModuleDef, ModuleParam, ParamValue } from '@shared/index'
import { WaKnob } from '../controls/WaKnob'
import { WaSlider } from '../controls/WaSlider'
import { WaSwitch } from '../controls/WaSwitch'
import { StepGrid } from './StepGrid'
import { NoteStepGrid } from './NoteStepGrid'
import { MidiDeviceSelect } from '../controls/MidiDeviceSelect'
import { knobColors, sliderColors, skinFor } from '../controls/skins'

interface ParamControlProps {
  def: ModuleDef
  param: ModuleParam
  value: ParamValue
  diameter?: number
  onChange: (value: ParamValue) => void
}

export const ParamControl = ({ def, param, value, diameter, onChange }: ParamControlProps) => {
  const accent = def.visual.accentColor
  // Real KnobMan sprite per knobStyle (param can override via waControlSrc).
  const skin = param.waControlSrc ?? skinFor(def.visual.knobStyle)
  const min = param.min ?? 0
  const max = param.max ?? 1
  const step = param.step ?? (max - min > 32 ? 1 : 0.01)
  // Integer-step params must emit integers (e.g. euclid(pulses,steps) throws on floats).
  const snap = (v: number) => (step >= 1 ? Math.round(v) : v)

  switch (param.type) {
    case 'knob':
      return (
        <WaKnob
          value={Number(value)}
          min={min}
          max={max}
          step={step}
          label={param.label}
          unit={param.unit}
          colors={knobColors(def.visual.knobStyle, accent)}
          skinSrc={skin}
          diameter={param.waControlDiameter ?? diameter ?? 56}
          onChange={(v) => onChange(snap(v))}
        />
      )
    case 'slider':
      return (
        <WaSlider
          value={Number(value)}
          min={min}
          max={max}
          step={step}
          label={param.label}
          unit={param.unit}
          colors={sliderColors(def.visual.knobStyle, accent)}
          skinSrc={param.waControlSrc}
          onChange={(v) => onChange(snap(v))}
        />
      )
    case 'toggle':
      return (
        <WaSwitch
          value={Boolean(value)}
          label={param.label}
          accent={accent}
          onChange={(v) => onChange(v)}
        />
      )
    case 'select':
      return (
        <label className="flex flex-col items-center gap-1">
          <select
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="bg-[#15151a] border border-black rounded-sm px-1 py-0.5 font-mono text-[10px] text-[var(--color-text)]"
          >
            {(param.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
            {param.label}
          </span>
        </label>
      )
    case 'code':
      return (
        <label className="flex flex-col gap-1 w-full">
          <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
            {param.label}
          </span>
          <input
            type="text"
            value={String(value)}
            spellCheck={false}
            onChange={(e) => onChange(e.target.value)}
            className="bg-[#0a0a0a] border border-black rounded-sm px-1.5 py-1 font-mono text-[11px] text-[var(--color-accent-green)] w-full"
          />
        </label>
      )
    case 'steps':
      return (
        <div className="flex flex-col gap-1 w-full">
          <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
            {param.label}
          </span>
          <StepGrid
            steps={Array.isArray(value) ? value : []}
            stepCount={param.stepCount ?? 16}
            accent={accent}
            onValue={param.onValue}
            columns={param.gridColumns}
            onChange={(s) => onChange(s)}
          />
        </div>
      )
    case 'noteSteps':
      return (
        <div className="flex flex-col gap-1 w-full">
          <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
            {param.label}
          </span>
          <NoteStepGrid
            steps={Array.isArray(value) ? value : []}
            stepCount={param.stepCount ?? 16}
            accent={accent}
            noteOptions={param.noteOptions ?? []}
            columns={param.gridColumns}
            onChange={(s) => onChange(s)}
          />
        </div>
      )
    case 'midiDevice':
      return (
        <MidiDeviceSelect value={String(value ?? '')} label={param.label} onChange={(v) => onChange(v)} />
      )
    default:
      return null
  }
}
