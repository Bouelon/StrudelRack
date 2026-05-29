# StrudelRack v2 — Claude Code Prompt

## Project Vision

Build **StrudelRack** from scratch: a collaborative live coding web app powered by [Strudel](https://strudel.cc) where users jam together in real-time, each managing a personal "rack" of shareable modules — instruments, effects, sequencers — inspired by DIY Eurorack modular synthesis culture.

The target users are experienced DAW/Ableton musicians and modular synth enthusiasts who are also web developers. They understand synthesis concepts (signal routing, modulation, CV, patching) and can read a step sequencer or a patch cable diagram. The interface must feel like a **collection of handcrafted DIY hardware modules**, not a generic music app.

The app has **two synchronized views** that the user can toggle at any time:
- **Rack View** — physical, skeuomorphic panels side by side like a Eurorack row. Best for tweaking parameters.
- **Node View** — abstract graph of modules connected by cables, like Max/MSP, VCV Rack, or n8n. Best for building signal topology.

Both views are always in sync. A knob turn in Rack View updates the corresponding node. A new cable in Node View generates a `.pipe()` in the Strudel code.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Bun | Fast, modern, built-in WS |
| Backend | Hono (Bun) | REST + WebSocket server |
| Frontend | React + Vite | TypeScript strict |
| Audio engine | Strudel (`@strudel/core`, `@strudel/webaudio`, `@strudel/mini`) | Web Audio API |
| UI controls | **webaudio-controls** | Web Components: knobs, sliders, switches, monitor |
| Node graph | **React Flow (xyflow)** | Module graph view with animated edges |
| Code editor | CodeMirror 6 | Strudel syntax highlighting |
| Collab sync | Yjs + y-websocket | CRDT for shared state |
| Styling | Tailwind CSS v4 | Dark theme, Eurorack aesthetic |
| Persistence | SQLite (via Bun) | Module registry |
| State management | Zustand | Per-user rack + graph state |

---

## Core Concepts — Glossary

| Term | Definition |
|---|---|
| **Module** | A self-contained Strudel block (instrument, effect, sequencer or modifier) with exposed parameters and a visual definition. Saved as JSON + Strudel code. The atomic unit of the app. |
| **Rack** | Each user's personal workspace — a collection of active module panels displayed as a Eurorack row. |
| **Node Graph** | The same modules represented as connectable nodes. Edges define signal routing (`.pipe()` chains in Strudel). |
| **Session / Room** | A collaborative jam. Has a shared BPM clock, a list of participants and their racks. Identified by a short code (e.g. `TRM-4F9`). |
| **Patch** | A saved state of a full session: all racks, all module configs, all node connections, BPM. Exportable as JSON. |
| **Module Registry** | The library of available modules — built-in + community-shared. Persisted in SQLite. |

---

## Module Data Structure

```typescript
// Visual definition — how the module panel looks (VST-style)
interface ModuleVisual {
  panelColor: string            // CSS color for the panel face
  accentColor: string           // knob indicator, LED, label color
  knobStyle: 'davies1900' | 'aluminum' | 'bakelite' | 'vintage-white' | 'black-vintage'
  // knobStyle maps to a sprite sheet PNG in /public/skins/
  panelTexture?: 'brushed-metal' | 'matte-plastic' | 'wood-grain' | 'anodized'
  hasOscilloscope?: boolean     // show webaudio-monitor on the panel
  hasVuMeter?: boolean
  panelWidthHP: number          // Eurorack HP units (multiples of 5.08mm). Min 4, typical 8–16.
  customSvgOverlay?: string     // Optional SVG string drawn over the panel (logo, decorations)
}

// A Module definition — what gets stored and shared
interface ModuleDef {
  id: string                    // nanoid
  name: string                  // "Acid Bass", "Tape Delay", "Euclidean Kick"
  author: string
  version: string               // semver
  type: 'instrument' | 'effect' | 'sequencer' | 'modifier'
  tags: string[]                // ["bass", "fm", "percussive", ...]
  description: string
  strudelCode: string           // Strudel template with {{param}} placeholders
  params: ModuleParam[]         // Exposed controls
  visual: ModuleVisual          // Panel appearance
  // Node graph ports
  ports: {
    inputs: ModulePort[]        // audio/cv inputs (for effects, modifiers)
    outputs: ModulePort[]       // audio outputs
  }
  createdAt: string
}

interface ModuleParam {
  id: string
  label: string
  type: 'knob' | 'slider' | 'steps' | 'select' | 'toggle' | 'code'
  min?: number
  max?: number
  default: number | string | boolean | string[]
  options?: string[]            // for 'select'
  stepCount?: number            // for 'steps' (e.g. 16)
  unit?: string                 // "Hz", "ms", "%"
  // webaudio-controls mapping
  waControlSrc?: string         // sprite sheet path override for this specific param
  waControlDiameter?: number    // knob size in px
}

interface ModulePort {
  id: string
  label: string
  type: 'audio' | 'cv' | 'trigger'
}

// A Module instance — live in a user's rack
interface ModuleInstance {
  instanceId: string
  defId: string
  userId: string
  paramValues: Record<string, number | string | boolean | string[]>
  active: boolean
  position: number              // order in the rack
  generatedCode: string         // compiled Strudel code
  // Node graph position
  nodePosition: { x: number; y: number }
}

// A node graph edge — represents a .pipe() connection
interface ModuleEdge {
  id: string
  sourceInstanceId: string
  sourcePortId: string
  targetInstanceId: string
  targetPortId: string
}
```

---

## webaudio-controls Integration

**webaudio-controls** (https://github.com/g200kg/webaudio-controls) provides Web Components: `<webaudio-knob>`, `<webaudio-slider>`, `<webaudio-switch>`, `<webaudio-param>`, `<webaudio-monitor>`.

Each component uses a **sprite sheet PNG** for rendering. The `knobStyle` in `ModuleVisual` maps to a sprite sheet file in `/public/skins/`:

```
/public/skins/
├── davies1900.png       # Classic Davies 1900H style (silver, industrial)
├── aluminum.png         # Flat brushed aluminum with dot indicator
├── bakelite.png         # Vintage brown Bakelite, cream indicator
├── vintage-white.png    # White plastic, red indicator (ARP style)
└── black-vintage.png    # Black knob, white indicator (Moog style)
```

Sprite sheets are 512×512 PNG with 64 frames (rotation from min to max). Use KnobMan-compatible format.

**React wrapper for webaudio-knob:**

```tsx
// client/src/components/controls/WaKnob.tsx
import { useRef, useEffect } from 'react'

interface WaKnobProps {
  value: number
  min: number
  max: number
  step?: number
  label: string
  unit?: string
  skinSrc: string           // path to sprite sheet
  diameter?: number
  onChange: (value: number) => void
}

export const WaKnob = ({ value, min, max, step = 0.01, label, unit, skinSrc, diameter = 64, onChange }: WaKnobProps) => {
  const ref = useRef<any>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: CustomEvent) => onChange(e.detail.value)
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [onChange])

  useEffect(() => {
    if (ref.current) ref.current.value = value
  }, [value])

  return (
    <div className="flex flex-col items-center gap-1">
      <webaudio-knob
        ref={ref}
        src={skinSrc}
        value={value}
        min={min}
        max={max}
        step={step}
        diameter={diameter}
        tooltip="%s"
      />
      <webaudio-param ref={null} link={ref} width={diameter} height={16} />
      <span className="text-[9px] font-mono uppercase tracking-widest opacity-60">{label}</span>
    </div>
  )
}
```

**webaudio-monitor for oscilloscope** (rendered per-module when `visual.hasOscilloscope = true`):

```tsx
// Connect to a Web Audio AnalyserNode fed by Strudel's output
<webaudio-monitor
  ref={monitorRef}
  width={moduleWidthPx - 16}
  height={40}
  style="background:#0a0a0a;border:1px solid #1a1a1a"
/>
// On mount: monitorRef.current.analyser = strudelAnalyserNode
```

---

## Node Graph View (React Flow)

### Setup

```tsx
// client/src/components/NodeGraph/NodeGraph.tsx
import ReactFlow, { 
  Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type NodeTypes, type EdgeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const nodeTypes: NodeTypes = {
  module: ModuleNode,           // custom node = mini panel preview
}

const edgeTypes: EdgeTypes = {
  audioEdge: AudioEdge,         // animated edge with signal flow effect
}
```

### Module Node

Each module in the Node View renders as a compact panel card with:
- Module name + type color stripe
- 2–3 key param knobs (the most important ones only, defined by `param.showInNodeView: boolean`)
- Input/output port handles (left = input, right = output)
- Mute toggle

```tsx
// client/src/components/NodeGraph/ModuleNode.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'

export const ModuleNode = ({ data }: NodeProps<ModuleNodeData>) => {
  const { def, instance, skinSrc } = data
  const accentColor = def.visual.accentColor

  return (
    <div className="module-node" style={{ borderTopColor: accentColor, width: `${def.visual.panelWidthHP * 12}px` }}>
      {/* Input handles */}
      {def.ports.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{ top: `${30 + i * 20}px`, background: accentColor }}
        />
      ))}

      <div className="node-header">
        <span>{def.name}</span>
        <MuteButton instanceId={instance.instanceId} />
      </div>

      {/* Key params only */}
      <div className="node-params">
        {def.params.filter(p => p.showInNodeView).map(param => (
          <WaKnob key={param.id} ... diameter={40} />
        ))}
      </div>

      {/* Output handles */}
      {def.ports.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{ top: `${30 + i * 20}px`, background: accentColor }}
        />
      ))}
    </div>
  )
}
```

### Audio Edge — Animated Signal Flow

Edges use a custom SVG with animated dashes to suggest signal flow:

```tsx
// client/src/components/NodeGraph/AudioEdge.tsx
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export const AudioEdge = (props: EdgeProps) => {
  const [edgePath] = getSmoothStepPath(props)
  return (
    <>
      <BaseEdge path={edgePath} style={{ stroke: '#39ff14', strokeWidth: 2, opacity: 0.7 }} />
      {/* Animated flow dot */}
      <circle r="4" fill="#39ff14">
        <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  )
}
```

### Edge → Strudel Code Compilation

When a new edge is created (instrument → effect), the compiler wraps the source in `.pipe()`:

```typescript
// compiler.ts — edge-aware compilation
function compileWithEdges(instances: ModuleInstance[], edges: ModuleEdge[], defs: Map<string, ModuleDef>): string {
  // Build dependency graph
  // instruments with no incoming edges → standalone
  // effects chained via edges → .pipe(effect)
  // result: stack( inst1.pipe(eff1).pipe(eff2), inst2, inst3.pipe(eff1) )
}
```

### Sync between Rack View and Node View

State is single-source-of-truth in Zustand. Both views read from and write to the same store:

```typescript
// store/rackStore.ts
interface RackStore {
  instances: ModuleInstance[]   // source of truth for both views
  edges: ModuleEdge[]           // source of truth for node graph
  
  // Rack view mutations
  updateParam: (instanceId: string, paramId: string, value: any) => void
  
  // Node view mutations  
  updateNodePosition: (instanceId: string, pos: {x: number, y: number}) => void
  addEdge: (edge: ModuleEdge) => void
  removeEdge: (edgeId: string) => void
}
```

---

## Strudel Code Compilation

Each module has a `strudelCode` template with `{{paramId}}` interpolation:

```javascript
// Acid Bass template:
`note("{{steps}}")
  .s("sawtooth")
  .cutoff({{cutoff}})
  .resonance({{res}})
  .gain({{gain}})
  .room({{room}})`

// After compilation:
`note("0 ~ 3 0 7 ~ ~ 0")
  .s("sawtooth")
  .cutoff(800)
  .resonance(0.6)
  .gain(0.9)
  .room(0.15)`
```

Final session code assembles everything respecting edge connections:

```javascript
stack(
  // user_1: acid bass → tape delay → lo-fi (chained via edges)
  note("0 ~ 3 0").s("sawtooth").cutoff(800)
    .pipe(x => x.delay(0.4).delayfeedback(0.5))   // Tape Delay edge
    .pipe(x => x.cutoff(400).crush(6)),             // Lo-Fi Filter edge

  // user_1: kick standalone (no edges)
  n("0 ~ ~ 0 ~ ~ 0 ~").s("bd"),

  // user_2: FM pad standalone
  note("<c3 eb3 g3>").s("sine").room(0.5)
).cpm(130/4)
```

---

## Application Architecture

```
strudelrack/
├── server/
│   ├── index.ts
│   ├── routes/
│   │   ├── rooms.ts
│   │   ├── modules.ts
│   │   └── patches.ts
│   ├── ws/
│   │   ├── handler.ts
│   │   └── clock.ts
│   └── db/
│       ├── schema.ts
│       └── seed.ts
│
├── client/
│   ├── public/
│   │   └── skins/                    # webaudio-controls sprite sheets
│   │       ├── davies1900.png
│   │       ├── aluminum.png
│   │       ├── bakelite.png
│   │       ├── vintage-white.png
│   │       └── black-vintage.png
│   ├── src/
│   │   ├── engine/
│   │   │   ├── strudel.ts
│   │   │   ├── compiler.ts           # template + edge-aware compilation
│   │   │   └── clock.ts
│   │   ├── collab/
│   │   │   ├── yjsProvider.ts
│   │   │   └── awareness.ts
│   │   ├── store/
│   │   │   ├── sessionStore.ts
│   │   │   ├── rackStore.ts          # instances + edges (shared by both views)
│   │   │   └── registryStore.ts
│   │   ├── components/
│   │   │   ├── controls/             # webaudio-controls wrappers
│   │   │   │   ├── WaKnob.tsx
│   │   │   │   ├── WaSlider.tsx
│   │   │   │   ├── WaSwitch.tsx
│   │   │   │   └── WaMonitor.tsx     # oscilloscope wrapper
│   │   │   ├── Rack/
│   │   │   │   ├── Rack.tsx
│   │   │   │   ├── ModulePanel.tsx   # full VST-style panel
│   │   │   │   ├── StepGrid.tsx
│   │   │   │   └── CodePane.tsx
│   │   │   ├── NodeGraph/
│   │   │   │   ├── NodeGraph.tsx     # React Flow canvas
│   │   │   │   ├── ModuleNode.tsx    # custom node component
│   │   │   │   └── AudioEdge.tsx     # animated signal edge
│   │   │   ├── Registry/
│   │   │   │   ├── ModuleBrowser.tsx
│   │   │   │   ├── ModuleCard.tsx
│   │   │   │   └── ModuleUploader.tsx
│   │   │   └── Session/
│   │   │       ├── SessionHeader.tsx  # BPM, transport, view toggle
│   │   │       ├── ViewToggle.tsx     # Rack ↔ Node switch
│   │   │       ├── ParticipantList.tsx
│   │   │       └── MasterCode.tsx
│   │   └── pages/
│   │       ├── Home.tsx
│   │       └── Session.tsx
│   └── index.html
│
├── shared/
│   └── types.ts
│
└── modules/
    ├── instruments/
    │   ├── acid-bass.json
    │   ├── fm-pad.json
    │   └── euclidean-drums.json
    ├── effects/
    │   ├── tape-delay.json
    │   └── lo-fi-filter.json
    └── sequencers/
        └── euclidean.json
```

---

## WebSocket Message Protocol

```typescript
type WSMessage =
  | { type: 'join';           userId: string; displayName: string }
  | { type: 'leave';          userId: string }
  | { type: 'bpm_change';     bpm: number; originUserId: string }
  | { type: 'transport';      action: 'start' | 'stop'; tick: number }
  | { type: 'module_add';     userId: string; instance: ModuleInstance }
  | { type: 'module_remove';  userId: string; instanceId: string }
  | { type: 'module_update';  userId: string; instanceId: string; paramValues: Record<string, any>; generatedCode: string }
  | { type: 'module_toggle';  userId: string; instanceId: string; active: boolean }
  | { type: 'edge_add';       userId: string; edge: ModuleEdge }
  | { type: 'edge_remove';    userId: string; edgeId: string }
  | { type: 'node_move';      userId: string; instanceId: string; position: { x: number; y: number } }
  | { type: 'rack_state';     userId: string; instances: ModuleInstance[]; edges: ModuleEdge[] }
  | { type: 'clock_tick';     serverTime: number; bpm: number }
```

---

## Clock Synchronization

```typescript
// client/src/engine/clock.ts
export function scheduleOnNextBeat(fn: () => void) {
  const now = Date.now() + latencyOffset
  const beatMs = 60000 / currentBpm
  const msToNextBeat = beatMs - (now % beatMs)
  setTimeout(fn, msToNextBeat)
}
```

---

## UI Design Directives

**Aesthetic**: Dark industrial Eurorack meets patching studio. Think aluminum panels, engraved labels, phosphor green oscilloscopes, glowing LEDs. NOT a generic music app.

### Colors
```css
--bg:           #0d0d0f;   /* near-black */
--panel:        #1a1a20;   /* module face */
--panel-raised: #222228;   /* raised surfaces */
--accent-green: #39ff14;   /* phosphor green (instruments) */
--accent-amber: #ffb347;   /* warm amber (effects) */
--accent-purple:#9b59ff;   /* UV purple (sequencers) */
--accent-cyan:  #00e5ff;   /* cyan (modifiers) */
--text-dim:     #555560;
--text:         #c8c8d0;
--led-on:       #ff4444;   /* red LED active */
--led-off:      #2a0808;
```

### Typography
- Values, code, param readouts: `JetBrains Mono` (monospace)
- Panel labels, module names: `Barlow Condensed` or `Rajdhani` (condensed industrial)
- NO Inter, NO Roboto, NO rounded fonts

### Module Panels (Rack View)
- Width = `panelWidthHP × 12px` (1HP = 12px, typical module: 96–192px wide)
- Background = `visual.panelColor` with `visual.panelTexture` CSS overlay
- Top stripe = `visual.accentColor` (4px, identifies module type at a glance)
- Engraved labels: text with `text-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 -1px 0 rgba(0,0,0,0.5)`
- Panel borders: `box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.8)`
- Screws in corners (CSS circles, decorative)

### Node Graph View
- React Flow dark background with subtle dot grid
- Module nodes use the same color stripe system as panels
- Audio edges: phosphor green (`#39ff14`), animated flow dots
- CV modulation edges: amber dashed
- Selected node: outer glow matching accent color
- MiniMap in bottom-right, styled to match

### Step Grid
- 16 buttons, LED style (3D inset with glow on active)
- Playhead = bright moving indicator
- Off = `#1a1a1a`, On = `visual.accentColor` + glow

### CodePane
- Collapsed to a 24px strip by default (click to expand)
- Shows compiled Strudel with CodeMirror 6 dark theme
- Editable — manual edits override param values and gray out affected knobs

---

## Built-in Seed Modules

Each JSON must include a complete `visual` object. Implement these 5 first:

### 1. Euclidean Kick
```json
{
  "name": "Euclidean Kick",
  "type": "instrument",
  "visual": {
    "panelColor": "#1a1200",
    "accentColor": "#ffb347",
    "knobStyle": "aluminum",
    "panelTexture": "brushed-metal",
    "hasOscilloscope": false,
    "hasVuMeter": true,
    "panelWidthHP": 8
  }
}
```
Params: `pulses` (knob, 1–16), `steps` (knob, 1–16), `gain` (knob), `decay` (knob), `room` (knob)

### 2. Acid Bass
```json
{
  "name": "Acid Bass",
  "type": "instrument",
  "visual": {
    "panelColor": "#0d1a0d",
    "accentColor": "#39ff14",
    "knobStyle": "black-vintage",
    "panelTexture": "matte-plastic",
    "hasOscilloscope": true,
    "panelWidthHP": 16
  }
}
```
Params: `steps` (steps, 16), `cutoff` (knob, 200–4000 Hz), `res` (knob, 0–1), `gain` (knob), `room` (knob)

### 3. FM Pad
```json
{
  "name": "FM Pad",
  "type": "instrument",
  "visual": {
    "panelColor": "#0d0d1a",
    "accentColor": "#9b59ff",
    "knobStyle": "vintage-white",
    "panelTexture": "matte-plastic",
    "hasOscilloscope": true,
    "panelWidthHP": 12
  }
}
```
Params: `notes` (code), `harmonics` (knob, 1–8), `room` (knob), `pan` (knob -1 to 1), `gain` (knob)

### 4. Tape Delay
```json
{
  "name": "Tape Delay",
  "type": "effect",
  "visual": {
    "panelColor": "#1a0d0d",
    "accentColor": "#ff6b6b",
    "knobStyle": "bakelite",
    "panelTexture": "wood-grain",
    "panelWidthHP": 10
  }
}
```
Params: `time` (knob, 0.1–1.0 s), `feedback` (knob, 0–0.95), `wet` (knob, 0–1)

### 5. Lo-Fi Filter
```json
{
  "name": "Lo-Fi Filter",
  "type": "effect",
  "visual": {
    "panelColor": "#12120a",
    "accentColor": "#d4c97a",
    "knobStyle": "davies1900",
    "panelTexture": "anodized",
    "panelWidthHP": 8
  }
}
```
Params: `cutoff` (knob), `res` (knob), `crush` (knob, 1–16 bits), `vinyl` (toggle)

---

## MVP Feature Scope

### Phase 1 — Audio Engine + Solo Rack
- [ ] Strudel init (AudioContext on first user gesture)
- [ ] Module compiler: template → Strudel code (pure, unit-tested)
- [ ] webaudio-controls wrappers: WaKnob, WaSlider, WaSwitch, WaMonitor
- [ ] ModulePanel with dynamic control rendering from `params[]`
- [ ] StepGrid component (16 steps, LED style)
- [ ] Rack with 2 seed modules (Kick + Acid Bass)
- [ ] Play/Stop transport
- [ ] CodePane (collapsed, expandable, editable)

### Phase 2 — Node Graph View
- [ ] React Flow setup with custom ModuleNode + AudioEdge
- [ ] ViewToggle (Rack ↔ Node, persisted in store)
- [ ] Edge CRUD (add/remove connections)
- [ ] Edge-aware compiler (`.pipe()` chains from edges)
- [ ] Node position persistence in ModuleInstance

### Phase 3 — Session + Collab
- [ ] Bun/Hono WS server
- [ ] Room creation + join by code
- [ ] Participant list + Yjs awareness (colored user cursors in node graph)
- [ ] Shared BPM + clock sync
- [ ] WS broadcast for module/edge state changes

### Phase 4 — Module Registry
- [ ] SQLite schema + seed (5 built-in modules)
- [ ] Module browser drawer (searchable, filterable by type)
- [ ] Drag from registry → add to rack + node graph
- [ ] "Package as Module" upload flow
- [ ] Module versioning

### Phase 5 — Polish
- [ ] Patch save/load (JSON)
- [ ] Session share link
- [ ] Sprite sheet download helper (KnobMan presets)
- [ ] Mobile layout (single rack view, node graph read-only)

---

## Development Instructions for Claude Code

1. **Monorepo first** — `server/`, `client/`, `shared/` with proper `tsconfig.json` each.

2. **`shared/types.ts` is the contract** — define all interfaces before touching any component.

3. **Audio engine before UI** — test `strudel.ts` with a hardcoded `evaluate()` call. Confirm audio plays. Then build UI on top.

4. **webaudio-controls are Web Components** — import the library once in `main.tsx` (`import 'webaudio-controls'`). Use `useRef` + DOM events in wrappers. TypeScript: declare module with `JSX.IntrinsicElements`.

5. **Sprite sheets** — for MVP, use free KnobMan presets. Download 3–4 PNG sprite sheets (64 frames, 64×64 each, stacked vertically = 64×4096px). Place in `/public/skins/`. The `knobStyle` → filename mapping lives in a config file.

6. **React Flow** — use `@xyflow/react` (v12+). Custom node dimensions must match Eurorack HP widths. Edges must carry typed data (`{ type: 'audio' | 'cv' }`) to style differently.

7. **Compiler is pure** — `compile(def, paramValues, incomingEdges, outgoingEdges): string`. Zero side effects. 100% unit tested. This function is the core of the entire app.

8. **Strudel evaluation debounced at 150ms** — never re-evaluate on every event. Batch param changes.

9. **No `any` in WS messages** — discriminated union, exhaustive switch.

10. **Seed modules are JSON files** — server reads them on startup and upserts. Editable without code changes.

11. **Server never runs Strudel code** — stores and relays JSON only. Security boundary is firm.

12. **Document all non-obvious decisions in `DECISIONS.md`** — especially compiler edge cases and clock sync approach.

---

## Key Dependencies

```json
{
  "server": {
    "hono": "^4",
    "yjs": "^13",
    "y-websocket": "^2",
    "nanoid": "^5",
    "better-sqlite3": "^9"
  },
  "client": {
    "@strudel/core": "latest",
    "@strudel/webaudio": "latest",
    "@strudel/mini": "latest",
    "@xyflow/react": "^12",
    "webaudio-controls": "latest",
    "@codemirror/view": "^6",
    "@codemirror/state": "^6",
    "yjs": "^13",
    "y-websocket": "^2",
    "zustand": "^4",
    "react": "^18",
    "react-dom": "^18"
  }
}
```

---

## First Command

```bash
mkdir strudelrack && cd strudelrack
bun init
mkdir -p server/src client/src shared modules/instruments modules/effects modules/sequencers
```

**Begin with Phase 1, step 1.** Do not ask clarifying questions. Make reasonable decisions and log them in `DECISIONS.md`.
