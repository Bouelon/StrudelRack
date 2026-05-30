import { useState } from 'react'
import { Home } from './pages/Home'
import { Session } from './pages/Session'

function makeUserId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

export default function App() {
  const [userId] = useState(makeUserId)
  const [session, setSession] = useState<{ room: string; name: string } | null>(null)

  if (!session) {
    return <Home onEnter={(room, name) => setSession({ room, name })} />
  }
  return <Session room={session.room} userId={userId} name={session.name} />
}
