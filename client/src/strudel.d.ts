// Ambient module declarations for the Strudel packages (no bundled types).
// We only ever import from '@strudel/web' (single core — see engine/strudel.ts).
declare module '@strudel/web' {
  export function initStrudel(options?: {
    prebake?: () => void | Promise<void>
    [key: string]: unknown
  }): Promise<{
    evaluate: (code: string, autostart?: boolean) => Promise<unknown>
    stop: () => void
  }>
  export function getAudioContext(): AudioContext
  export function samples(source: string): Promise<unknown>
}
declare module '@strudel/webaudio'
declare module '@strudel/core'
declare module '@strudel/mini'
