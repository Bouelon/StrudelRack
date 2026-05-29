// JSX typings for the webaudio-controls Web Components.
// These are custom elements; we type the attributes we actually use.
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

type WaElement<Extra> = DetailedHTMLProps<HTMLAttributes<HTMLElement> & Extra, HTMLElement>

interface WaKnobAttrs {
  src?: string
  value?: number
  min?: number
  max?: number
  step?: number
  diameter?: number
  sprites?: number
  tooltip?: string
  colors?: string
}

interface WaSliderAttrs extends WaKnobAttrs {
  direction?: 'horz' | 'vert'
  width?: number
  height?: number
}

interface WaSwitchAttrs {
  src?: string
  value?: number
  width?: number
  height?: number
  type?: 'toggle' | 'kick' | 'radio' | 'sequential'
}

interface WaParamAttrs {
  link?: unknown
  value?: string | number
  width?: number
  height?: number
  fontsize?: number
}

interface WaMonitorAttrs {
  width?: number
  height?: number
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'webaudio-knob': WaElement<WaKnobAttrs>
      'webaudio-slider': WaElement<WaSliderAttrs>
      'webaudio-switch': WaElement<WaSwitchAttrs>
      'webaudio-param': WaElement<WaParamAttrs>
      'webaudio-monitor': WaElement<WaMonitorAttrs>
    }
  }
}

export {}
