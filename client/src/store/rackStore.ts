// client/src/store/rackStore.ts
// Single source of truth for BOTH the Rack view and the Node view, AND the shared
// collaborative session. All participants edit the same instances/edges; local
// mutations are broadcast over WebSocket and remote messages are folded back in
// (guarded by `muted` so applying a remote change never re-broadcasts → no echo).

import { create } from 'zustand'
import type { ModuleEdge, ModuleInstance, Participant, ParamValue, WSMessage } from '@shared/index'
import { colorForUser } from '@shared/index'
import { compile, compileSession } from '../engine/compiler'
import { useRegistry, defaultParamValues } from './registryStore'

export type ViewMode = 'rack' | 'node'

// ── networking bridge (module-level so it never triggers re-renders) ──────────
let netSend: (m: WSMessage) => void = () => {}
let muted = false
export function setNetSend(fn: (m: WSMessage) => void): void {
  netSend = fn
}
function emit(m: WSMessage): void {
  if (!muted) netSend(m)
}
function runMuted(fn: () => void): void {
  muted = true
  try {
    fn()
  } finally {
    muted = false
  }
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

interface RackStore {
  instances: ModuleInstance[]
  edges: ModuleEdge[]
  bpm: number
  view: ViewMode
  isPlaying: boolean
  userId: string
  displayName: string
  participants: Participant[]
  codeOverride: string | null

  // identity / presence
  setIdentity: (userId: string, displayName: string) => void

  // lifecycle
  addModule: (defId: string, at?: { x: number; y: number }) => string | null
  addInstance: (instance: ModuleInstance) => void
  removeModule: (instanceId: string) => void
  toggleActive: (instanceId: string) => void
  reorder: (instanceId: string, position: number) => void

  // rack-view mutations
  updateParam: (instanceId: string, paramId: string, value: ParamValue) => void

  // node-view mutations
  updateNodePosition: (instanceId: string, pos: { x: number; y: number }) => void
  addEdge: (edge: ModuleEdge) => void
  removeEdge: (edgeId: string) => void

  // session
  setBpm: (bpm: number) => void
  setView: (view: ViewMode) => void
  setPlaying: (playing: boolean) => void
  setCodeOverride: (code: string | null) => void

  // collaboration
  applyRemote: (msg: WSMessage) => void

  // derived
  compiled: () => string
  effectiveCode: () => string
}

function recompileInstanceCode(inst: ModuleInstance): ModuleInstance {
  const def = useRegistry.getState().getDef(inst.defId)
  if (!def) return inst
  return { ...inst, generatedCode: compile(def, inst.paramValues) }
}

export const useRack = create<RackStore>((set, get) => ({
  instances: [],
  edges: [],
  bpm: 130,
  view: 'rack',
  isPlaying: false,
  userId: 'local',
  displayName: 'You',
  participants: [],
  codeOverride: null,

  setIdentity: (userId, displayName) =>
    set((s) => {
      const me: Participant = { userId, displayName, color: colorForUser(userId) }
      const others = s.participants.filter((p) => p.userId !== userId)
      return { userId, displayName, participants: [me, ...others] }
    }),

  addModule: (defId, at) => {
    const def = useRegistry.getState().getDef(defId)
    if (!def) return null
    const instances = get().instances
    const instance: ModuleInstance = {
      instanceId: uid(),
      defId,
      userId: get().userId,
      paramValues: defaultParamValues(def),
      active: true,
      position: instances.length,
      generatedCode: '',
      nodePosition: at ?? { x: 80 + (instances.length % 4) * 240, y: 80 + Math.floor(instances.length / 4) * 200 },
    }
    const built = recompileInstanceCode(instance)
    get().addInstance(built)
    emit({ type: 'module_add', userId: get().userId, instance: built })
    return built.instanceId
  },

  addInstance: (instance) =>
    set((s) =>
      s.instances.some((i) => i.instanceId === instance.instanceId)
        ? s
        : { instances: [...s.instances, instance] },
    ),

  removeModule: (instanceId) => {
    set((s) => ({
      instances: s.instances.filter((i) => i.instanceId !== instanceId),
      edges: s.edges.filter(
        (e) => e.sourceInstanceId !== instanceId && e.targetInstanceId !== instanceId,
      ),
    }))
    emit({ type: 'module_remove', userId: get().userId, instanceId })
  },

  toggleActive: (instanceId) => {
    let active = true
    set((s) => ({
      instances: s.instances.map((i) => {
        if (i.instanceId !== instanceId) return i
        active = !i.active
        return { ...i, active }
      }),
    }))
    emit({ type: 'module_toggle', userId: get().userId, instanceId, active })
  },

  reorder: (instanceId, position) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, position } : i,
      ),
    })),

  updateParam: (instanceId, paramId, value) => {
    const cur = get().instances.find((i) => i.instanceId === instanceId)
    if (!cur) return
    const updated = recompileInstanceCode({
      ...cur,
      paramValues: { ...cur.paramValues, [paramId]: value },
    })
    set((s) => ({
      instances: s.instances.map((i) => (i.instanceId === instanceId ? updated : i)),
    }))
    emit({
      type: 'module_update',
      userId: get().userId,
      instanceId,
      paramValues: updated.paramValues,
      generatedCode: updated.generatedCode,
    })
  },

  updateNodePosition: (instanceId, pos) => {
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, nodePosition: pos } : i,
      ),
    }))
    emit({ type: 'node_move', userId: get().userId, instanceId, position: pos })
  },

  addEdge: (edge) => {
    let added = false
    set((s) => {
      if (s.edges.some((e) => e.id === edge.id)) return s
      added = true
      return { edges: [...s.edges, edge] }
    })
    if (added) emit({ type: 'edge_add', userId: get().userId, edge })
  },

  removeEdge: (edgeId) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) }))
    emit({ type: 'edge_remove', userId: get().userId, edgeId })
  },

  setBpm: (bpm) => {
    set({ bpm })
    emit({ type: 'bpm_change', bpm, originUserId: get().userId })
  },

  setView: (view) => set({ view }), // view is local-only, not broadcast

  setPlaying: (isPlaying) => {
    set({ isPlaying })
    emit({ type: 'transport', action: isPlaying ? 'start' : 'stop', tick: 0 })
  },

  setCodeOverride: (codeOverride) => set({ codeOverride }),

  applyRemote: (msg) => {
    switch (msg.type) {
      case 'session_sync':
        set((s) => ({
          bpm: msg.bpm,
          isPlaying: msg.playing,
          instances: msg.instances,
          edges: msg.edges,
          participants: mergeParticipants(msg.participants, s.userId, s.displayName),
        }))
        break
      case 'join':
        set((s) =>
          s.participants.some((p) => p.userId === msg.userId)
            ? s
            : {
                participants: [
                  ...s.participants,
                  { userId: msg.userId, displayName: msg.displayName, color: colorForUser(msg.userId) },
                ],
              },
        )
        break
      case 'leave':
        set((s) => ({ participants: s.participants.filter((p) => p.userId !== msg.userId) }))
        break
      case 'module_add':
        runMuted(() => get().addInstance(msg.instance))
        break
      case 'module_remove':
        runMuted(() => get().removeModule(msg.instanceId))
        break
      case 'module_update':
        runMuted(() =>
          set((s) => ({
            instances: s.instances.map((i) =>
              i.instanceId === msg.instanceId
                ? { ...i, paramValues: msg.paramValues, generatedCode: msg.generatedCode }
                : i,
            ),
          })),
        )
        break
      case 'module_toggle':
        runMuted(() =>
          set((s) => ({
            instances: s.instances.map((i) =>
              i.instanceId === msg.instanceId ? { ...i, active: msg.active } : i,
            ),
          })),
        )
        break
      case 'node_move':
        runMuted(() => get().updateNodePosition(msg.instanceId, msg.position))
        break
      case 'edge_add':
        runMuted(() => get().addEdge(msg.edge))
        break
      case 'edge_remove':
        runMuted(() => get().removeEdge(msg.edgeId))
        break
      case 'bpm_change':
        runMuted(() => get().setBpm(msg.bpm))
        break
      case 'transport':
        runMuted(() => get().setPlaying(msg.action === 'start'))
        break
      case 'rack_state':
      case 'clock_tick':
        break
    }
  },

  compiled: () => {
    const { instances, edges, bpm } = get()
    const defs = useRegistry.getState().byId
    return compileSession(instances, edges, defs, bpm)
  },

  effectiveCode: () => {
    const { codeOverride } = get()
    return codeOverride ?? get().compiled()
  },
}))

function mergeParticipants(
  incoming: Participant[],
  userId: string,
  displayName: string,
): Participant[] {
  const map = new Map(incoming.map((p) => [p.userId, p]))
  map.set(userId, { userId, displayName, color: colorForUser(userId) })
  return [...map.values()]
}
