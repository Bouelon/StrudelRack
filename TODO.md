# StrudelRack — TODO

État au 2026-05-30. ✅ fait · 🟡 partiel · ⬜ à faire

---

## ✅ Socle (fait)
- [x] Monorepo Bun (`shared` / `client` / `server` / `modules`)
- [x] `shared/types.ts` — contrat de types complet
- [x] Compiler pur + 19 tests unitaires (`bun test`)
- [x] Sprite sheets placeholder (`scripts/gen-skins.mjs`)
- [x] Embed Strudel via `@strudel/web` (audio confirmé dans le navigateur)

---

## Phase 1 — Audio engine + rack solo ✅
- [x] Init Strudel (AudioContext au 1er geste)
- [x] Compiler template → code Strudel
- [x] Wrappers webaudio-controls (WaKnob, WaSlider, WaSwitch, WaMonitor)
- [x] ModulePanel (rendu dynamique depuis `params[]`)
- [x] StepGrid (16 pas, LED + playhead)
- [x] Rack avec modules seed
- [x] Transport Play/Stop
- [x] CodePane (repliable, éditable, override)

## Phase 2 — Node Graph ✅
- [x] React Flow + ModuleNode + AudioEdge animé
- [x] ViewToggle Rack ↔ Node
- [x] Edge CRUD (câbles)
- [x] Compiler edge-aware (chaînage direct des effets)
- [x] Position des nodes persistée

---

## 🟡 À valider d'abord (rapide)
- [ ] **Vérifier le mapping audio des modules** un par un dans le navigateur :
  - [x] Acid Bass ✅ (confirmé)
  - [ ] 808/909 Kick (`s("909").struct().speed().shape().release()`) — nouveau
  - [ ] Euclidean Kick (`s("bd").euclid().decay().room()`)
  - [ ] FM Pad (`note().s("sine").fm().pan()`) — vérifier `.fm`
  - [ ] Tape Delay (`.delay().delaytime().delayfeedback()`)
  - [ ] Lo-Fi Filter (`.cutoff().resonance().crush().coarse()`)
- [ ] Corriger les templates JSON dont une fonction Strudel n'existe pas

---

## Phase 3 — Session + Collab ⬜
- [ ] Serveur Bun/Hono WebSocket (`server/src/ws/handler.ts`)
- [ ] Création de room + join par code (`TRM-4F9`)
- [ ] Protocole WSMessage (déjà typé dans `shared`) — switch exhaustif côté serveur + client
- [ ] BPM partagé + synchro d'horloge (`clock.ts` client ↔ `ws/clock.ts` serveur)
- [ ] Diffusion des changements module/edge
- [ ] Liste des participants + awareness Yjs (curseurs colorés dans le node graph)
- [ ] Client : `collab/yjsProvider.ts`, `collab/awareness.ts`, `store/sessionStore.ts`

## Phase 4 — Module Registry ⬜
- [x] Endpoint `/api/modules` (lit les JSON seed) 🟡 amorcé
- [ ] Schéma SQLite + seed au démarrage (upsert)
- [ ] Hydrater `registryStore` depuis `/api/modules` (au lieu d'importer les JSON en dur)
- [ ] ModuleBrowser : recherche/filtre ✅ (fait) — brancher sur l'API
- [ ] Drag registry → rack + node graph
- [ ] Flux « Package as Module » (upload)
- [ ] Versioning des modules

## Phase 5 — Polish ⬜
- [ ] Sauvegarde/chargement de Patch (JSON)
- [ ] Lien de partage de session
- [ ] Layout mobile (rack simple, node graph en lecture seule)
- [ ] (Optionnel) vraies sprite sheets KnobMan via `waControlSrc` — knobs procéduraux OK pour l'instant
- [ ] CodeMirror 6 dans CodePane (actuellement textarea)
- [ ] Oscilloscope : vrai tap audio par-voix (actuellement trace plate — voir DECISIONS.md)
- [ ] Code-splitting du bundle (~1.1 MB à cause de Strudel)

---

## Dette technique connue
- Oscilloscope `WaMonitor` : pas de tap sur le master Strudel → trace plate (limitation documentée).
- `@strudel/web` non typé → shims ambient dans `client/src/strudel.d.ts`.
- Bundle non splitté (warning Vite > 500 kB).

Détails des décisions non-évidentes : voir [`DECISIONS.md`](./DECISIONS.md).
