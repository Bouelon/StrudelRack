// client/src/engine/compiler.ts
// The core of the entire app. PURE — zero side effects. 100% unit tested.
//
// Two responsibilities:
//   1. compile()        — interpolate a single module's {{param}} template → Strudel code
//   2. compileSession() — assemble instances + edges into one `stack(...).cpm(bpm/4)` program
//
// Template placeholder syntax:
//   {{paramId}}                 → formatted param value
//   {{flag ? aaa : bbb}}        → ternary on a boolean/truthy param; branches are RAW text

import type { ModuleDef, ModuleInstance, ModuleEdge, ParamValue } from '@shared/index'

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
 * - sound sources (instrument/sequencer): produce a standalone pattern
 * - effects/modifiers: produce a method-chain fragment beginning with `.`
 *   (e.g. `.delay(0.4).delaytime(0.4)`) appended directly onto the source — Strudel
 *   patterns have NO `.pipe()`; effects ARE pattern methods, so chaining is direct.
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

const SOURCE_TYPES = new Set(['instrument', 'sequencer'])

interface CompileCtx {
  byId: Map<string, ModuleInstance>
  defs: Map<string, ModuleDef>
  outgoing: Map<string, ModuleEdge[]>
  incomingCount: Map<string, number>
}

function buildCtx(
  instances: ModuleInstance[],
  edges: ModuleEdge[],
  defs: Map<string, ModuleDef>,
): CompileCtx {
  const byId = new Map(instances.map((i) => [i.instanceId, i]))
  const outgoing = new Map<string, ModuleEdge[]>()
  const incomingCount = new Map<string, number>()
  for (const e of edges) {
    // Only chain edges between known instances
    if (!byId.has(e.sourceInstanceId) || !byId.has(e.targetInstanceId)) continue
    if (!outgoing.has(e.sourceInstanceId)) outgoing.set(e.sourceInstanceId, [])
    outgoing.get(e.sourceInstanceId)!.push(e)
    incomingCount.set(e.targetInstanceId, (incomingCount.get(e.targetInstanceId) ?? 0) + 1)
  }
  return { byId, defs, outgoing, incomingCount }
}

/**
 * Build the chain code for a single source instance, following outgoing edges
 * through effects/modifiers as `.pipe(x => <effectBody>)` segments.
 * Linear chain (branches followed in edge order). Cycles are guarded.
 */
function buildChain(rootId: string, ctx: CompileCtx): string | null {
  const root = ctx.byId.get(rootId)!
  const rootDef = ctx.defs.get(root.defId)
  if (!rootDef) return null
  if (!root.active) return null

  let code = compile(rootDef, root.paramValues)
  const visited = new Set<string>([rootId])
  let cursor = rootId

  // Walk the chain
  for (;;) {
    const edges = ctx.outgoing.get(cursor) ?? []
    let advanced = false
    for (const edge of edges) {
      const target = ctx.byId.get(edge.targetInstanceId)
      if (!target || visited.has(target.instanceId)) continue
      const tDef = ctx.defs.get(target.defId)
      if (!tDef || SOURCE_TYPES.has(tDef.type)) continue // sources aren't piped into
      visited.add(target.instanceId)
      if (target.active) {
        // Effect bodies are method-chain fragments beginning with `.` — append directly.
        const body = compile(tDef, target.paramValues)
        code += `\n  ${body}`
      }
      cursor = target.instanceId
      advanced = true
      break // linear: follow first unvisited effect
    }
    if (!advanced) break
  }
  return code
}

/** Roots = active sound sources (deterministic order by `position`). */
function findRoots(instances: ModuleInstance[], defs: Map<string, ModuleDef>): ModuleInstance[] {
  return instances
    .filter((i) => {
      const d = defs.get(i.defId)
      return d != null && SOURCE_TYPES.has(d.type)
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
