# StrudelRack

Collaborative live-coding rack built on [Strudel](https://strudel.cc). Each user assembles a
"rack" of shareable modules — instruments, effects, sequencers — with two synchronized views:

- **Rack View** — skeuomorphic Eurorack panels for tweaking parameters.
- **Node View** — a React Flow graph where cables between modules become `.pipe()` chains.

Both views read/write the same Zustand store, so a knob turn and a new cable stay in sync.

## Status

| Phase | Scope | State |
|------|-------|-------|
| 1 | Audio engine + solo rack (compiler, controls, transport, CodePane) | ✅ built |
| 2 | Node Graph view (React Flow, edge-aware compiler, view toggle) | ✅ built |
| 3 | Session + collab (Bun WS, rooms, shared rack, presence) | 🟡 MVP built (test with 2 tabs) |
| 4 | Module registry (SQLite, browser, upload) | 🟡 browser + `/api/modules` done; SQLite/upload pending |
| 5 | Polish (patches, share links, mobile, real skins, CodeMirror) | ⏳ deferred |

The **compiler** (`client/src/engine/compiler.ts`) is the pure, fully unit-tested core.

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3 (`curl -fsSL https://bun.sh/install | bash`)

## Setup

```bash
bun install
```

Knobs/sliders render procedurally from webaudio-controls (colored per module) — no
sprite-sheet assets needed.

## Run

```bash
# client (Vite dev server → http://localhost:5173)
bun run dev:client

# server (Hono on :3001 — serves /api/modules; WS lands in Phase 3)
bun run dev:server
```

On the home screen, **Create a jam** (or join with a code, or play solo). Click **▶ Play**
(a user gesture is required to start the AudioContext), then add modules from the registry
panel on the left.

**Collaboration**: run the server too, open the app in two tabs, and join the same room
code — modules, knob moves, cables, BPM and transport sync live. (Vite proxies `/ws` to the
server, so the dev client must be running for WebSocket to reach `:3001`.)

## Test & typecheck

```bash
bun test          # compiler unit tests (19)
bun run typecheck # all workspaces
```

## Layout

```
shared/   types.ts — the shared contract (also a Bun workspace)
client/   React + Vite app (engine, store, components, pages)
server/   Hono server (module registry API; WS in Phase 3)
modules/  seed module definitions as editable JSON
```

See [`DECISIONS.md`](./DECISIONS.md) for non-obvious choices (compiler grammar, Strudel embed,
webaudio-controls vendoring, the oscilloscope limitation).
