// server/src/ws/rooms.ts
// Authoritative, in-memory room state. The server stores/relays JSON only — it
// NEVER executes Strudel code (firm security boundary).

import type { ModuleInstance, ModuleEdge, Participant, WSMessage } from '@shared/index'

export interface Room {
  code: string
  bpm: number
  playing: boolean
  instances: Map<string, ModuleInstance>
  edges: Map<string, ModuleEdge>
  participants: Map<string, Participant>
}

const rooms = new Map<string, Room>()

export function getOrCreateRoom(code: string): Room {
  let room = rooms.get(code)
  if (!room) {
    room = { code, bpm: 130, playing: false, instances: new Map(), edges: new Map(), participants: new Map() }
    rooms.set(code, room)
  }
  return room
}

export function removeRoomIfEmpty(room: Room): void {
  if (room.participants.size === 0) rooms.delete(room.code)
}

/** Full snapshot sent to a newly joined client. */
export function roomSnapshot(room: Room): WSMessage {
  return {
    type: 'session_sync',
    bpm: room.bpm,
    playing: room.playing,
    instances: [...room.instances.values()],
    edges: [...room.edges.values()],
    participants: [...room.participants.values()],
  }
}

/** Fold a client message into the authoritative room state. */
export function applyToRoom(room: Room, msg: WSMessage): void {
  switch (msg.type) {
    case 'module_add':
      room.instances.set(msg.instance.instanceId, msg.instance)
      break
    case 'module_remove':
      room.instances.delete(msg.instanceId)
      for (const [id, e] of room.edges)
        if (e.sourceInstanceId === msg.instanceId || e.targetInstanceId === msg.instanceId)
          room.edges.delete(id)
      break
    case 'module_update': {
      const inst = room.instances.get(msg.instanceId)
      if (inst) {
        inst.paramValues = msg.paramValues
        inst.generatedCode = msg.generatedCode
      }
      break
    }
    case 'module_toggle': {
      const inst = room.instances.get(msg.instanceId)
      if (inst) inst.active = msg.active
      break
    }
    case 'node_move': {
      const inst = room.instances.get(msg.instanceId)
      if (inst) inst.nodePosition = msg.position
      break
    }
    case 'edge_add':
      room.edges.set(msg.edge.id, msg.edge)
      break
    case 'edge_remove':
      room.edges.delete(msg.edgeId)
      break
    case 'bpm_change':
      room.bpm = msg.bpm
      break
    case 'transport':
      room.playing = msg.action === 'start'
      break
    // server→client or presence-only: nothing to fold here
    case 'join':
    case 'leave':
    case 'session_sync':
    case 'rack_state':
    case 'clock_tick':
      break
  }
}
