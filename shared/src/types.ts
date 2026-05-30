// shared/src/types.ts — The contract. Define everything here before touching components.

// ── Visual definition ───────────────────────────────────────────────────────
export type KnobStyle =
  | 'davies1900'
  | 'aluminum'
  | 'bakelite'
  | 'vintage-white'
  | 'black-vintage'

export type PanelTexture = 'brushed-metal' | 'matte-plastic' | 'wood-grain' | 'anodized'

export interface ModuleVisual {
  panelColor: string
  accentColor: string
  knobStyle: KnobStyle
  panelTexture?: PanelTexture
  hasOscilloscope?: boolean
  hasVuMeter?: boolean
  /** Eurorack HP units (multiples of 5.08mm). Min 4, typical 8–16. */
  panelWidthHP: number
  /** Optional SVG string drawn over the panel (logo, decorations). */
  customSvgOverlay?: string
}

// ── Module definition ────────────────────────────────────────────────────────
export type ModuleType = 'instrument' | 'effect' | 'sequencer' | 'modifier'

export type ParamType = 'knob' | 'slider' | 'steps' | 'select' | 'toggle' | 'code'

export type ParamValue = number | string | boolean | string[]

export interface ModuleParam {
  id: string
  label: string
  type: ParamType
  min?: number
  max?: number
  /** Control increment. Use 1 for integer-only params (euclid pulses/steps, bit depth…). */
  step?: number
  default: ParamValue
  options?: string[] // for 'select'
  stepCount?: number // for 'steps' (e.g. 16)
  /** Value written when a step is toggled on. Default "0" (note root); use "1" for drum struct. */
  onValue?: string
  unit?: string // "Hz", "ms", "%"
  /** Show this param's control in the compact Node View card. */
  showInNodeView?: boolean
  // webaudio-controls mapping
  waControlSrc?: string
  waControlDiameter?: number
}

export type PortType = 'audio' | 'cv' | 'trigger'

export interface ModulePort {
  id: string
  label: string
  type: PortType
}

export interface ModuleDef {
  id: string
  name: string
  author: string
  version: string // semver
  type: ModuleType
  tags: string[]
  description: string
  /** Strudel template with {{paramId}} placeholders. */
  strudelCode: string
  params: ModuleParam[]
  visual: ModuleVisual
  ports: {
    inputs: ModulePort[]
    outputs: ModulePort[]
  }
  createdAt: string
}

// ── Live instance ─────────────────────────────────────────────────────────────
export interface ModuleInstance {
  instanceId: string
  defId: string
  userId: string
  paramValues: Record<string, ParamValue>
  active: boolean
  position: number // order in the rack
  generatedCode: string // compiled Strudel code (instrument body, pre-edge)
  nodePosition: { x: number; y: number }
}

/** A node-graph edge — represents a .pipe() connection. */
export interface ModuleEdge {
  id: string
  sourceInstanceId: string
  sourcePortId: string
  targetInstanceId: string
  targetPortId: string
}

// ── Session ───────────────────────────────────────────────────────────────────
export interface Participant {
  userId: string
  displayName: string
  color: string
}

export interface Patch {
  id: string
  name: string
  bpm: number
  instances: ModuleInstance[]
  edges: ModuleEdge[]
  createdAt: string
}

// ── WebSocket protocol — discriminated union, exhaustive switch required ───────
export type WSMessage =
  | {
      // Full session snapshot sent by the server to a newly joined client.
      type: 'session_sync'
      bpm: number
      playing: boolean
      instances: ModuleInstance[]
      edges: ModuleEdge[]
      participants: Participant[]
    }
  | { type: 'join'; userId: string; displayName: string }
  | { type: 'leave'; userId: string }
  | { type: 'bpm_change'; bpm: number; originUserId: string }
  | { type: 'transport'; action: 'start' | 'stop'; tick: number }
  | { type: 'module_add'; userId: string; instance: ModuleInstance }
  | { type: 'module_remove'; userId: string; instanceId: string }
  | {
      type: 'module_update'
      userId: string
      instanceId: string
      paramValues: Record<string, ParamValue>
      generatedCode: string
    }
  | { type: 'module_toggle'; userId: string; instanceId: string; active: boolean }
  | { type: 'edge_add'; userId: string; edge: ModuleEdge }
  | { type: 'edge_remove'; userId: string; edgeId: string }
  | { type: 'node_move'; userId: string; instanceId: string; position: { x: number; y: number } }
  | { type: 'rack_state'; userId: string; instances: ModuleInstance[]; edges: ModuleEdge[] }
  | { type: 'clock_tick'; serverTime: number; bpm: number }
