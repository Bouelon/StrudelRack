import type { KnobStyle } from '@shared/index'

// Real KnobMan sprite sheets (from the g200kg/webaudio-controls `knobs/` set).
// Vertical strips — webaudio-knob auto-detects the frame count. Used as the primary
// look; `knobColors()` below is the procedural fallback.
export const SKIN_SRC: Record<KnobStyle, string> = {
  davies1900: '/skins/knob_metal_mesh.png',
  aluminum: '/skins/m400.png',
  bakelite: '/skins/Vintage_Knob.png',
  'vintage-white': '/skins/SimpleFlat3.png',
  'black-vintage': '/skins/MiniMoog_Main.png',
}

export function skinFor(style: KnobStyle): string {
  return SKIN_SRC[style] ?? SKIN_SRC.aluminum
}

// webaudio-controls draws a crisp procedural knob when no `src` sprite is given,
// colored by a "indicator;body;highlight" string. We map each Eurorack knobStyle
// to a body/highlight material and use the module's accent as the indicator — so
// every knob reads as its module at a glance. (Real KnobMan sprites remain a
// Phase-5 option via a param's `waControlSrc`.)

const MATERIAL: Record<KnobStyle, { body: string; hi: string }> = {
  davies1900: { body: '#8a8a90', hi: '#e2e2e8' }, // silver industrial
  aluminum: { body: '#74747a', hi: '#c4c4ca' }, // brushed aluminum
  bakelite: { body: '#3a261c', hi: '#7a5238' }, // vintage brown
  'vintage-white': { body: '#d6d6d0', hi: '#ffffff' }, // ARP white
  'black-vintage': { body: '#161619', hi: '#4a4a52' }, // Moog black
}

/** webaudio-controls `colors` string: "indicator;body;highlight". */
export function knobColors(style: KnobStyle, accent: string): string {
  const m = MATERIAL[style] ?? MATERIAL.aluminum
  return `${accent};${m.body};${m.hi}`
}

/** Slider `colors` string: "fill;groove;knob". */
export function sliderColors(style: KnobStyle, accent: string): string {
  const m = MATERIAL[style] ?? MATERIAL.aluminum
  return `${accent};#0d0d0f;${m.hi}`
}
