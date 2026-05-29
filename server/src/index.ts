// server/src/index.ts
// Minimal Hono server. Phase 1/4 slice: serves the module registry from the
// repo-root `modules/` dir as JSON. The server NEVER runs Strudel code — it only
// stores and relays JSON (firm security boundary). WS + rooms land in Phase 3.

import { Hono } from 'hono'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ModuleDef } from '@shared/index'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MODULES_DIR = join(ROOT, 'modules')

function loadModules(): ModuleDef[] {
  const out: ModuleDef[] = []
  for (const sub of ['instruments', 'effects', 'sequencers', 'modifiers']) {
    let files: string[]
    try {
      files = readdirSync(join(MODULES_DIR, sub))
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      try {
        out.push(JSON.parse(readFileSync(join(MODULES_DIR, sub, f), 'utf8')) as ModuleDef)
      } catch (e) {
        console.error(`Failed to parse module ${sub}/${f}:`, e)
      }
    }
  }
  return out
}

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))
app.get('/api/modules', (c) => c.json(loadModules()))

const port = Number(process.env.PORT ?? 3001)
console.log(`StrudelRack server on :${port}`)

export default { port, fetch: app.fetch }
