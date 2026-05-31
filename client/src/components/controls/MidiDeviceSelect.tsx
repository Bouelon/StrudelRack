// client/src/components/controls/MidiDeviceSelect.tsx
// Lists real Web MIDI output devices and writes the chosen device name to the param.
// Falls back to a free-text input when Web MIDI is unavailable or no devices are found
// (Strudel's .midi(name) matches by output name).
import { useEffect, useState } from 'react'

interface MidiDeviceSelectProps {
  value: string
  label: string
  onChange: (value: string) => void
}

type MidiState = 'idle' | 'loading' | 'ready' | 'unsupported' | 'denied'

export const MidiDeviceSelect = ({ value, label, onChange }: MidiDeviceSelectProps) => {
  const [devices, setDevices] = useState<string[]>([])
  const [state, setState] = useState<MidiState>('idle')

  useEffect(() => {
    if (typeof navigator.requestMIDIAccess !== 'function') {
      setState('unsupported')
      return
    }
    let access: MIDIAccess | null = null
    let cancelled = false
    const refresh = (a: MIDIAccess) => {
      const names = [...a.outputs.values()].map((o) => o.name ?? '').filter(Boolean)
      if (!cancelled) {
        setDevices(names)
        setState('ready')
      }
    }
    setState('loading')
    navigator
      .requestMIDIAccess({ sysex: false })
      .then((a) => {
        if (cancelled) return
        access = a
        a.onstatechange = () => refresh(a)
        refresh(a)
      })
      .catch(() => !cancelled && setState('denied'))
    return () => {
      cancelled = true
      if (access) access.onstatechange = null
    }
  }, [])

  // Always offer the current value even if the device isn't present yet.
  const options = devices.includes(value) || !value ? devices : [value, ...devices]
  const useDropdown = state === 'ready' && options.length > 0

  return (
    <label className="flex flex-col gap-1 w-full">
      <span className="engraved text-[9px] uppercase tracking-[0.15em] text-[var(--color-text-dim)]">
        {label} {state === 'loading' ? '· scanning…' : state === 'denied' ? '· no access' : state === 'unsupported' ? '· no Web MIDI' : ''}
      </span>
      {useDropdown ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="nodrag bg-[#15151a] border border-black rounded-sm px-1 py-0.5 font-mono text-[10px] text-[var(--color-text)]"
        >
          {!options.includes(value) && <option value={value}>{value || '— select —'}</option>}
          {options.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          spellCheck={false}
          placeholder="MIDI output name"
          onChange={(e) => onChange(e.target.value)}
          className="nodrag bg-[#0a0a0a] border border-black rounded-sm px-1.5 py-1 font-mono text-[11px] text-[var(--color-accent-green)] w-full"
        />
      )}
    </label>
  )
}
