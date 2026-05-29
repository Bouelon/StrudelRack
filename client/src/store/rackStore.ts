// client/src/store/rackStore.ts
// Single source of truth for BOTH the Rack view and the Node view.

import { create } from 'zustand'
import type { ModuleEdge, ModuleInstance, ParamValue } from '@shared/index'
import { compile, compileSession } from '../engine/compiler'
import { useRegistry, defaultParamValues } from './registryStore'

export type ViewMode = 'rack' | 'node'

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
  /** Manual code edit that overrides compiled output (null = use compiled). */
  codeOverride: string | null

  // lifecycle
  addModule: (defId: string, at?: { x: number; y: number }) => string | null
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

  // derived
  compiled: () => string
  /** What actually gets evaluated: manual override if present, else compiled. */
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
  codeOverride: null,

  addModule: (defId, at) => {
    const def = useRegistry.getState().getDef(defId)
    if (!def) return null
    const instanceId = uid()
    const instances = get().instances
    const instance: ModuleInstance = {
      instanceId,
      defId,
      userId: get().userId,
      paramValues: defaultParamValues(def),
      active: true,
      position: instances.length,
      generatedCode: '',
      nodePosition: at ?? { x: 80 + (instances.length % 4) * 240, y: 80 + Math.floor(instances.length / 4) * 200 },
    }
    set({ instances: [...instances, recompileInstanceCode(instance)] })
    return instanceId
  },

  removeModule: (instanceId) =>
    set((s) => ({
      instances: s.instances.filter((i) => i.instanceId !== instanceId),
      edges: s.edges.filter(
        (e) => e.sourceInstanceId !== instanceId && e.targetInstanceId !== instanceId,
      ),
    })),

  toggleActive: (instanceId) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, active: !i.active } : i,
      ),
    })),

  reorder: (instanceId, position) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, position } : i,
      ),
    })),

  updateParam: (instanceId, paramId, value) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId
          ? recompileInstanceCode({ ...i, paramValues: { ...i.paramValues, [paramId]: value } })
          : i,
      ),
    })),

  updateNodePosition: (instanceId, pos) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.instanceId === instanceId ? { ...i, nodePosition: pos } : i,
      ),
    })),

  addEdge: (edge) =>
    set((s) => {
      if (s.edges.some((e) => e.id === edge.id)) return s
      return { edges: [...s.edges, edge] }
    }),

  removeEdge: (edgeId) => set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

  setBpm: (bpm) => set({ bpm }),
  setView: (view) => set({ view }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCodeOverride: (codeOverride) => set({ codeOverride }),

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
