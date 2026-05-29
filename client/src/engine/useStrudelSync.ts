// client/src/engine/useStrudelSync.ts
// Bridges the reactive store to the Strudel runtime.
// Re-evaluates the effective program (compiled or manual override), debounced 150ms,
// whenever the rack changes — but only while playing. Stops on pause.

import { useEffect, useRef } from 'react'
import { useRack } from '../store/rackStore'
import { setBpm as setClockBpm } from './clock'
import { evaluateCode, stopPlayback } from './strudel'

const DEBOUNCE_MS = 150

export function useStrudelSync(onError?: (msg: string | null) => void) {
  const timer = useRef<number | null>(null)

  const isPlaying = useRack((s) => s.isPlaying)
  const instances = useRack((s) => s.instances)
  const edges = useRack((s) => s.edges)
  const bpm = useRack((s) => s.bpm)
  const codeOverride = useRack((s) => s.codeOverride)

  useEffect(() => {
    setClockBpm(bpm)
  }, [bpm])

  useEffect(() => {
    if (!isPlaying) {
      stopPlayback()
      return
    }
    // Debounce: never re-evaluate on every event; batch rapid param changes.
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const code = useRack.getState().effectiveCode()
      const res = await evaluateCode(code)
      onError?.(res.ok ? null : res.error)
    }, DEBOUNCE_MS)

    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, instances, edges, bpm, codeOverride])
}
