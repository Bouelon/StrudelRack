// client/src/engine/clock.ts
// Beat-aligned scheduling helper for collaborative timing.

let currentBpm = 120
let latencyOffset = 0

export function setBpm(bpm: number): void {
  currentBpm = bpm
}

export function getBpm(): number {
  return currentBpm
}

/** Offset (ms) between local clock and the server clock, set from clock_tick. */
export function setLatencyOffset(ms: number): void {
  latencyOffset = ms
}

/** Run `fn` aligned to the next beat boundary. */
export function scheduleOnNextBeat(fn: () => void): number {
  const now = Date.now() + latencyOffset
  const beatMs = 60000 / currentBpm
  const msToNextBeat = beatMs - (now % beatMs)
  return window.setTimeout(fn, msToNextBeat)
}
