# DECISIONS.md

Non-obvious decisions taken while building StrudelRack. Newest first.

## Environment & layout
- **Built directly in repo root** (`/home/jean-gabriel/sessionjam`) instead of a nested
  `strudelrack/` folder — the working directory *is* the project root.
- **Bun 1.3.14** installed locally to `~/.bun` (was absent; Node 20 present as fallback).
- **Monorepo via Bun workspaces**: `shared`, `server`, `client`. `@shared/*` path alias
  resolved through the root `tsconfig.json` (Bun reads `paths` from the nearest tsconfig).

## Compiler (`client/src/engine/compiler.ts`) — the core
- **Placeholder grammar**: `{{paramId}}` for value substitution, plus a ternary extension
  `{{flag ? a : b}}` whose branches are **raw text** (resolves toggles cleanly without
  needing conditional logic in templates — e.g. Lo-Fi `vinyl`).
- **`steps` params** are `string[]`; empty/blank slots compile to a rest `~` and slots are
  space-joined into Strudel mini-notation.
- **Effect/modifier templates are method-chain fragments beginning with `.`**, e.g.
  `.delay({{wet}}).delaytime({{time}})`. The chain builder appends them directly onto the
  source pattern. NOTE: the spec's `.pipe(x => …)` example is **wrong** — Strudel patterns
  have no `.pipe()` method; effects ARE pattern methods, so composition is plain chaining
  (`note(...).cutoff(800).delay(0.5)`). Confirmed at runtime (`.pipe is not a function`).
- **Sources vs piped modules**: only `instrument` and `sequencer` are chain roots emitted in
  `stack(...)`. `effect`/`modifier` only appear via incoming edges (a disconnected effect is
  silent, never standalone).
- **Linear chains**: from each source we follow the first unvisited effect edge; branches are
  followed in edge-array order. **Cycles are guarded** with a visited-set (cannot hang).
- **Mute = drop**: inactive sources drop their whole chain; an inactive effect mid-chain is
  skipped while the chain continues.
- **Missing values fall back to `param.default`** so a module always compiles.
- **Empty session → `silence`** so the Strudel program is always syntactically valid.
- **Unknown placeholder → `/*?key*/`** marker rather than emitting broken syntax.
- Purity verified by 19 unit tests (`client/src/engine/compiler.test.ts`).

## Dependencies & runtime
- **webaudio-controls is NOT on npm** (g200kg ships it as a GitHub repo / single JS file).
  Vendored `client/public/vendor/webaudio-controls.js` and loaded via a classic `<script>` in
  `index.html` (preserves `document.currentScript` so its default-image resolution works).
  React wrappers (`WaKnob`/`WaSlider`) use `useRef` + DOM `change`/`input` events.
- **Strudel embed via `@strudel/web`** (`initStrudel()`) rather than hand-wiring
  core/webaudio/mini — the manual path is version-fragile (transpiler/mini-notation
  registration). `strudel.ts` is defensive and idempotent; AudioContext is created/resumed on
  the first user gesture (Play button).
- **Import EVERYTHING from `@strudel/web` only.** First cut imported `getAudioContext` from
  `@strudel/webaudio` too — that loaded a *second* copy of `@strudel/core` in the browser
  ("core loaded more than once"), which duplicates the scheduler and **silently kills audio**.
  Fixed by sourcing `getAudioContext`/`samples` from `@strudel/web` and dropping the separate
  `@strudel/core`/`@strudel/mini`/`@strudel/webaudio` client deps (web bundles them inline).
- **`initStrudel()` returns a Promise**, not the repl — it resolves after the `prebake` sample
  bank loads. We `await` it, then call `repl.evaluate(code, true)`. Prebake loads
  `github:tidalcycles/dirt-samples` so `s("bd")` works; synth waveforms work even offline.
- **Strudel packages ship no types** → ambient `declare module` shims in `client/src/strudel.d.ts`.
- **Knobs use real KnobMan sprite sheets** from the g200kg `knobs/` set
  (`client/public/skins/`), mapped per `knobStyle` in `controls/skins.ts`
  (black-vintage → `MiniMoog_Main`, bakelite → `Vintage_Knob`, davies1900 → `knob_metal_mesh`,
  aluminum → `m400`, vintage-white → `SimpleFlat3`). Vertical strips; webaudio-knob
  auto-detects the frame count. A param's `waControlSrc` overrides per-control.
- **Procedural fallback**: when no sprite/`src` is given, webaudio-controls draws an SVG knob
  colored by `"indicator;body;highlight"` — `knobColors()`/`sliderColors()` build that from the
  module accent + knobStyle material. Sliders use this (no seed uses a slider sprite yet).
  Global defaults (no MIDI, `valuetip`, no outline) set via `window.WebAudioControlsOptions`
  in `index.html` before the vendor script.
- **tsconfig `baseUrl` must be set per workspace** (`.`) or the inherited root baseUrl makes
  the `@shared/*` path alias resolve outside the repo.

## Audio analyser / oscilloscope (known limitation)
- `WaMonitor` reads a master `AnalyserNode`, but Strudel connects voices directly to
  `ctx.destination`; we cannot intercept that graph from outside. The analyser is connected to
  the destination so it is valid, but the trace stays flat until a per-voice tap is added.
  Documented rather than faked.

## Build / test
- `bun test` runs the compiler suite (19 tests). Client builds with Vite (Strudel makes the
  bundle ~1.1 MB — expected; code-splitting deferred to polish).
- Server (`bun server/src/index.ts`) serves `/api/health` and `/api/modules` (reads seed JSON).
  The server never executes Strudel code — JSON store/relay only.

## Open / deferred
- Phase 3: Bun/Hono WebSocket server, rooms by code, shared BPM clock, Yjs awareness.
- Phase 4: SQLite registry + "Package as Module" upload + versioning (client currently bundles
  seeds directly; `/api/modules` already serves them for the eventual hydration path).
- Phase 5: patch save/load, share links, mobile layout, real sprite sheets, CodeMirror 6
  (CodePane currently uses a styled textarea).
