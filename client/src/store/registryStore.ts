// client/src/store/registryStore.ts
// The module library. Phase 1: seeds are bundled from the repo-root `modules/` dir.
// Phase 4 will hydrate this from the SQLite registry over /api.

import { create } from 'zustand'
import type { ModuleDef, ParamValue } from '@shared/index'

import kickDesigner from '../../../modules/instruments/kick-designer.json'
import euclideanKick from '../../../modules/instruments/euclidean-kick.json'
import drumMachineKick from '../../../modules/instruments/drum-machine-kick.json'
import acidBass from '../../../modules/instruments/acid-bass.json'
import fmPad from '../../../modules/instruments/fm-pad.json'
import tapeDelay from '../../../modules/effects/tape-delay.json'
import lofiFilter from '../../../modules/effects/lo-fi-filter.json'

const SEED: ModuleDef[] = [
  kickDesigner as ModuleDef,
  drumMachineKick as ModuleDef,
  euclideanKick as ModuleDef,
  acidBass as ModuleDef,
  fmPad as ModuleDef,
  tapeDelay as ModuleDef,
  lofiFilter as ModuleDef,
]

interface RegistryStore {
  defs: ModuleDef[]
  byId: Map<string, ModuleDef>
  setDefs: (defs: ModuleDef[]) => void
  getDef: (id: string) => ModuleDef | undefined
}

export const useRegistry = create<RegistryStore>((set, get) => ({
  defs: SEED,
  byId: new Map(SEED.map((d) => [d.id, d])),
  setDefs: (defs) => set({ defs, byId: new Map(defs.map((d) => [d.id, d])) }),
  getDef: (id) => get().byId.get(id),
}))

/** Default param values for a definition. */
export function defaultParamValues(def: ModuleDef): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {}
  for (const p of def.params) {
    out[p.id] = Array.isArray(p.default) ? [...p.default] : p.default
  }
  return out
}
