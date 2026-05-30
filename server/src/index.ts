// server/src/index.ts
// Hono REST (module registry) + Bun WebSocket relay for collaborative sessions.
// The server stores and relays JSON only — it NEVER runs Strudel code.

import { Hono } from 'hono'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ModuleDef, WSMessage } from '@shared/index'
import { colorForUser } from '@shared/index'
import { getOrCreateRoom, roomSnapshot, applyToRoom, removeRoomIfEmpty } from './ws/rooms'

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

interface WSData {
  room: string
  userId: string
  name: string
}

const port = Number(process.env.PORT ?? 3001)
console.log(`StrudelRack server on :${port}`)

export default {
  port,
  fetch(req: Request, server: { upgrade: (req: Request, opts: { data: WSData }) => boolean }) {
    const url = new URL(req.url)
    if (url.pathname === '/ws') {
      const data: WSData = {
        room: (url.searchParams.get('room') ?? 'LOBBY').toUpperCase(),
        userId: url.searchParams.get('user') ?? crypto.randomUUID(),
        name: url.searchParams.get('name') ?? 'anon',
      }
      if (server.upgrade(req, { data })) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }
    return app.fetch(req)
  },
  websocket: {
    open(ws: { data: WSData; subscribe: (t: string) => void; send: (m: string) => void; publish: (t: string, m: string) => void }) {
      const { room: code, userId, name } = ws.data
      const room = getOrCreateRoom(code)
      ws.subscribe(code)
      room.participants.set(userId, { userId, displayName: name, color: colorForUser(userId) })
      // sync the newcomer with the current session, announce to the rest
      ws.send(JSON.stringify(roomSnapshot(room)))
      const join: WSMessage = { type: 'join', userId, displayName: name }
      ws.publish(code, JSON.stringify(join))
    },
    message(ws: { data: WSData; publish: (t: string, m: string) => void }, raw: string | Buffer) {
      const { room: code } = ws.data
      const room = getOrCreateRoom(code)
      const text = typeof raw === 'string' ? raw : raw.toString()
      let msg: WSMessage
      try {
        msg = JSON.parse(text) as WSMessage
      } catch {
        return
      }
      applyToRoom(room, msg)
      ws.publish(code, text) // relay verbatim to the other peers (excludes sender)
    },
    close(ws: { data: WSData; publish: (t: string, m: string) => void; unsubscribe: (t: string) => void }) {
      const { room: code, userId } = ws.data
      const room = getOrCreateRoom(code)
      room.participants.delete(userId)
      const leave: WSMessage = { type: 'leave', userId }
      ws.publish(code, JSON.stringify(leave))
      ws.unsubscribe(code)
      removeRoomIfEmpty(room)
    },
  },
}
