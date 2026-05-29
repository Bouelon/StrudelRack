// client/src/engine/strudel.ts
// Thin, defensive wrapper around the Strudel runtime.
//
// IMPORTANT: import EVERYTHING from `@strudel/web` only. Importing @strudel/webaudio
// or @strudel/core separately loads a SECOND copy of @strudel/core, which duplicates
// the scheduler/registry and silently breaks playback ("core loaded more than once").
//
// initStrudel() returns a PROMISE that resolves to the repl once the sound bank
// (prebake) has loaded — it is not the repl synchronously.

import { initStrudel, getAudioContext, samples } from '@strudel/web'

type StrudelRepl = {
  evaluate: (code: string, autostart?: boolean) => Promise<unknown>
  stop: () => void
}

let replPromise: Promise<StrudelRepl> | null = null
let repl: StrudelRepl | null = null
let analyser: AnalyserNode | null = null

/** Initialise the Strudel runtime + AudioContext + default samples. Idempotent. */
export function initStrudelEngine(): Promise<StrudelRepl> {
  if (!replPromise) {
    replPromise = (
      initStrudel({
        prebake: async () => {
          // Default drum/sample bank so `s("bd")` etc. make sound.
          // Synth waveforms (sawtooth/sine) work even if this fails (offline).
          try {
            await samples('github:tidalcycles/dirt-samples')
          } catch (e) {
            console.warn('[strudel] sample prebake failed (synths still work):', e)
          }
        },
      }) as Promise<StrudelRepl>
    ).then((r) => {
      repl = r
      try {
        setupAnalyser(getAudioContext())
      } catch {
        /* context not ready yet */
      }
      return r
    })
  }
  return replPromise
}

/** Best-effort master tap for oscilloscope/VU (see DECISIONS.md for its limitation). */
function setupAnalyser(ctx: AudioContext) {
  if (analyser) return
  analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  try {
    analyser.connect(ctx.destination)
  } catch {
    /* ignore */
  }
}

export function getAnalyser(): AnalyserNode | null {
  return analyser
}

/** Evaluate (and start) a Strudel program. */
export async function evaluateCode(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await initStrudelEngine()
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    await r.evaluate(code, true)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Stop all playback. */
export function stopPlayback(): void {
  try {
    repl?.stop()
  } catch {
    /* ignore */
  }
}

export function isInitialised(): boolean {
  return repl != null
}
