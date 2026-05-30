// client/src/collab/wsClient.ts
import type { WSMessage } from '@shared/index'

export interface WsConn {
  send: (msg: WSMessage) => void
  close: () => void
}

export interface ConnectOptions {
  room: string
  userId: string
  name: string
  onMessage: (msg: WSMessage) => void
  onStatus?: (status: 'connecting' | 'open' | 'closed') => void
}

export function connect({ room, userId, name, onMessage, onStatus }: ConnectOptions): WsConn {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${location.host}/ws?room=${encodeURIComponent(room)}&user=${encodeURIComponent(
    userId,
  )}&name=${encodeURIComponent(name)}`

  onStatus?.('connecting')
  const ws = new WebSocket(url)
  ws.onopen = () => onStatus?.('open')
  ws.onclose = () => onStatus?.('closed')
  ws.onerror = () => onStatus?.('closed')
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data) as WSMessage)
    } catch {
      /* ignore malformed frame */
    }
  }

  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
    },
    close: () => ws.close(),
  }
}
