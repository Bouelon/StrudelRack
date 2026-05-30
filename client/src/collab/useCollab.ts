// client/src/collab/useCollab.ts
import { useEffect, useState } from 'react'
import { connect } from './wsClient'
import { useRack, setNetSend } from '../store/rackStore'

export type ConnStatus = 'offline' | 'connecting' | 'open' | 'closed'

/** Connects the shared session to the WS server and bridges it to the store. */
export function useCollab(room: string | null, userId: string, name: string): ConnStatus {
  const applyRemote = useRack((s) => s.applyRemote)
  const setIdentity = useRack((s) => s.setIdentity)
  const [status, setStatus] = useState<ConnStatus>('offline')

  useEffect(() => {
    if (!room) {
      setStatus('offline')
      return
    }
    setIdentity(userId, name)
    const conn = connect({ room, userId, name, onMessage: applyRemote, onStatus: setStatus })
    setNetSend(conn.send)
    return () => {
      setNetSend(() => {})
      conn.close()
    }
  }, [room, userId, name, applyRemote, setIdentity])

  return status
}
