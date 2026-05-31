// client/src/engine/compiler.ts
// The core of the entire app. PURE — zero side effects. 100% unit tested.
//
// Responsibilities:
//   1. compile()        — interpolate a single module's {{param}} template → Strudel code
//   2. compileSession() — assemble instances + edges into one `stack(...).cpm(bpm/4)` program
//
// Signal routing (port-type aware):
//   • audio cable   (audio→audio)   → effect/filter method-chaining, as before
//   • trigger cable (trigger→trigger) → a SEQUENCER drives a target:
//        - instrument target → append `.struct("…")` (rhythm) or `.note("…")` (notes)
//        - MIDI-out sink     → `note("…").midi("device")` (external MIDI; experimental)
//   Sequencers are NOT audible on their own; they only shape whatever they trigger.
//
// Template placeholder syntax:
//   {{paramId}}                 → formatted param value
//   {{flag ? aaa : bbb}}        → ternary on a boolean/truthy param; branches are RAW text

import type { ModuleDef, ModuleInstance, ModuleEdge, ParamValue, PortType } from '@shared/index'

const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g
const TERNARY = /^([A-Za-z_$][\w$]*)\s*\?\s*([\s\S]+?)\s*:\s*([\s\S]+)$/

/** Format a single param value into a Strudel-literal fragment. */
export function formatValue(value: ParamValue): string {
  if (Array.isArray(value)) {
    // 'steps' param → mini-notation: empty/falsy slot becomes a rest "~"
    return value.map((s) => (s == null || String(s).trim() === '' ? '~' : String(s).trim())).join(' ')
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    // Avoid scientific notation / trailing float noise for clean output
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
  }
  return String(value)
}

/** Resolve one placeholder expression against param values. */
function resolvePlaceholder(expr: string, paramValues: Record<string, ParamValue>): string {
  const tern = expr.match(TERNARY)
  if (tern) {
    const [, flag, whenTrue, whenFalse] = tern
    return truthy(paramValues[flag]) ? whenTrue : whenFalse
  }
  const key = expr.trim()
  if (key in paramValues) return formatValue(paramValues[key])
  // Unknown placeholder: leave a visible marker rather than silently breaking syntax
  return `/*?${key}*/`
}

function truthy(v: ParamValue | undefined): boolean {
  if (Array.isArray(v)) return v.length > 0
  return Boolean(v)
}

/** Interpolate a template string with the given param values. */
export function interpolate(template: string, paramValues: Record<string, ParamValue>): string {
  return template.replace(PLACEHOLDER, (_m, expr: string) => resolvePlaceholder(expr, paramValues))
}

/**
 * Compile a single module definition + values into Strudel code.
 * - sound sources (instrument): produce a standalone pattern
 * - effects/modifiers: produce a method-chain fragment beginning with `.`
 *   (e.g. `.delay(0.4).delaytime(0.4)`) appended directly onto the source.
 * Defaults are filled in from def.params when a value is missing.
 */
export function compile(def: ModuleDef, paramValues: Record<string, ParamValue>): string {
  const merged = withDefaults(def, paramValues)
  return interpolate(def.strudelCode, merged).trim()
}

function withDefaults(def: ModuleDef, paramValues: Record<string, ParamValue>): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {}
  for (const p of def.params) out[p.id] = p.id in paramValues ? paramValues[p.id] : p.default
  // Allow extra values not declared as params (forward-compat)
  for (const k of Object.keys(paramValues)) if (!(k in out)) out[k] = paramValues[k]
  return out
}

// ── port-type / role helpers ──────────────────────────────────────────────────

/** Type of an output port (defaults to 'audio' when a def declares no ports). */
function outPortType(def: ModuleDef, portId: string): PortType {
  return def.ports.outputs.find((p) => p.id === portId)?.type ?? 'audio'
}

/** A MIDI-out sink: a modifier that consumes a trigger and emits no audio. */
function isMidiSink(def: ModuleDef): boolean {
  return (
    def.type === 'modifier' &&
    def.ports.inputs.some((p) => p.type === 'trigger') &&
    !def.ports.outputs.some((p) => p.type === 'audio')
  )
}

/** An audio processor that can be chained onto a source (filter, delay, …). */
function isAudioEffect(def: ModuleDef): boolean {
  return (def.type === 'effect' || def.type === 'modifier') && !isMidiSink(def)
}

/** Roots = audible instruments + driven MIDI sinks. Sequencers are never roots. */
function isRootCandidate(def: ModuleDef): boolean {
  return def.type === 'instrument' || isMidiSink(def)
}

/** Which sequencer (and which of its trigger outputs) feeds a target's trigger input. */
interface TriggerLink {
  instanceId: string
  portId: string
}

interface CompileCtx {
  byId: Map<string, ModuleInstance>
  defs: Map<string, ModuleDef>
  /** source instance → its outgoing AUDIO edges (effect chaining). */
  audioOut: Map<string, ModuleEdge[]>
  /** target instance → the sequencer + output port feeding its trigger input. */
  triggerSource: Map<string, TriggerLink>
}

function buildCtx(
  instances: ModuleInstance[],
  edges: ModuleEdge[],
  defs: Map<string, ModuleDef>,
): CompileCtx {
  const byId = new Map(instances.map((i) => [i.instanceId, i]))
  const audioOut = new Map<string, ModuleEdge[]>()
  const triggerSource = new Map<string, TriggerLink>()
  for (const e of edges) {
    const src = byId.get(e.sourceInstanceId)
    const tgt = byId.get(e.targetInstanceId)
    if (!src || !tgt) continue
    const sDef = defs.get(src.defId)
    if (!sDef) continue
    if (outPortType(sDef, e.sourcePortId) === 'trigger') {
      // first trigger wins (one sequencer lane per target)
      if (!triggerSource.has(e.targetInstanceId))
        triggerSource.set(e.targetInstanceId, { instanceId: e.sourceInstanceId, portId: e.sourcePortId })
    } else {
      if (!audioOut.has(e.sourceInstanceId)) audioOut.set(e.sourceInstanceId, [])
      audioOut.get(e.sourceInstanceId)!.push(e)
    }
  }
  return { byId, defs, audioOut, triggerSource }
}

/**
 * The fragment a sequencer contributes when one of its trigger outputs feeds a target.
 * - `standalone`  → a head pattern for a MIDI sink (`note("…")` / `note("c3").struct("…")`)
 * - otherwise     → a chain fragment appended onto an instrument (`.note("…")` / `.struct("…")`)
 *
 * Lane selection:
 *  - if the source output port declares a `lane` (multi-lane drum matrix) → that step lane,
 *    always rhythm (`.struct`);
 *  - otherwise the mono sequencer's `mode`: rhythm → `pattern`, notes → `noteSeq`/`notePattern`.
 * Returns null when the source is not an active sequencer.
 */
function triggerFragment(link: TriggerLink, ctx: CompileCtx, standalone: boolean): string | null {
  const seq = ctx.byId.get(link.instanceId)
  if (!seq) return null
  const seqDef = ctx.defs.get(seq.defId)
  if (!seqDef || seqDef.type !== 'sequencer' || !seq.active) return null
  const m = withDefaults(seqDef, seq.paramValues)
  const base = formatValue(m.baseNote ?? 'c3')

  // Multi-lane: the trigger output names the step lane it carries.
  const lane = seqDef.ports.outputs.find((p) => p.id === link.portId)?.lane
  if (lane) {
    const pat = formatValue(m[lane] ?? [])
    return standalone ? `note("${base}").struct("${pat}")` : `.struct("${pat}")`
  }

  // Mono sequencer: rhythm vs notes.
  if (String(m.mode ?? 'rhythm') === 'notes') {
    const notes = formatValue(m.noteSeq ?? m.notePattern ?? '')
    return standalone ? `note("${notes}")` : `.note("${notes}")`
  }
  const pat = formatValue(m.pattern ?? [])
  return standalone ? `note("${base}").struct("${pat}")` : `.struct("${pat}")`
}

/**
 * Build the chain code for one root.
 *   instrument → its body, optionally trigger-shaped, then audio effects appended.
 *   MIDI sink  → the driving sequencer's head pattern + the sink's `.midi(...)` body.
 * Linear audio chain (branches followed in edge order). Cycles are guarded.
 */
function buildChain(rootId: string, ctx: CompileCtx): string | null {
  const root = ctx.byId.get(rootId)!
  const def = ctx.defs.get(root.defId)
  if (!def || !root.active) return null

  // MIDI-out sink: only audible/active when a sequencer drives it.
  if (isMidiSink(def)) {
    const link = ctx.triggerSource.get(rootId)
    if (!link) return null
    const head = triggerFragment(link, ctx, true)
    if (head == null) return null
    return head + compile(def, root.paramValues)
  }

  // Instrument: own body, optionally re-shaped by a trigger cable.
  let code = compile(def, root.paramValues)
  const link = ctx.triggerSource.get(rootId)
  if (link) {
    const frag = triggerFragment(link, ctx, false)
    if (frag) code += frag
  }

  // Walk outgoing AUDIO edges, appending effect bodies.
  const visited = new Set<string>([rootId])
  let cursor = rootId
  for (;;) {
    const edges = ctx.audioOut.get(cursor) ?? []
    let advanced = false
    for (const edge of edges) {
      const target = ctx.byId.get(edge.targetInstanceId)
      if (!target || visited.has(target.instanceId)) continue
      const tDef = ctx.defs.get(target.defId)
      if (!tDef || !isAudioEffect(tDef)) continue // only filters/effects are piped into
      visited.add(target.instanceId)
      if (target.active) {
        // Effect bodies are method-chain fragments beginning with `.` — append directly.
        code += `\n  ${compile(tDef, target.paramValues)}`
      }
      cursor = target.instanceId
      advanced = true
      break // linear: follow first unvisited effect
    }
    if (!advanced) break
  }
  return code
}

/** Roots = active sound sources / driven sinks (deterministic order by `position`). */
function findRoots(instances: ModuleInstance[], defs: Map<string, ModuleDef>): ModuleInstance[] {
  return instances
    .filter((i) => {
      const d = defs.get(i.defId)
      return d != null && isRootCandidate(d)
    })
    .sort((a, b) => a.position - b.position)
}

/** Compile every source chain into an array of Strudel snippets. */
export function compileChains(
  instances: ModuleInstance[],
  edges: ModuleEdge[],
  defs: Map<string, ModuleDef>,
): string[] {
  const ctx = buildCtx(instances, edges, defs)
  const chains: string[] = []
  for (const root of findRoots(instances, defs)) {
    const chain = buildChain(root.instanceId, ctx)
    if (chain) chains.push(chain)
  }
  return chains
}

/**
 * Assemble the full session program.
 * Returns `silence` when nothing is playable so Strudel stays valid.
 */
export function compileSession(
  instances: ModuleInstance[],
  edges: ModuleEdge[],
  defs: Map<string, ModuleDef>,
  bpm: number,
): string {
  const chains = compileChains(instances, edges, defs)
  if (chains.length === 0) return `silence`
  const body = chains.map((c) => indent(c, 2)).join(',\n')
  return `stack(\n${body}\n).cpm(${bpm}/4)`
}

function indent(code: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return code
    .split('\n')
    .map((line) => pad + line)
    .join('\n')
}
