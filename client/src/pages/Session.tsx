// client/src/pages/Session.tsx
import { useState } from 'react'
import { useRack } from '../store/rackStore'
import { useStrudelSync } from '../engine/useStrudelSync'
import { SessionHeader } from '../components/Session/SessionHeader'
import { ModuleBrowser } from '../components/Registry/ModuleBrowser'
import { Rack } from '../components/Rack/Rack'
import { NodeGraph } from '../components/NodeGraph/NodeGraph'
import { CodePane } from '../components/Rack/CodePane'

export const Session = ({ sessionCode }: { sessionCode?: string }) => {
  const view = useRack((s) => s.view)
  const [error, setError] = useState<string | null>(null)
  useStrudelSync(setError)

  return (
    <div className="h-full flex flex-col">
      <SessionHeader sessionCode={sessionCode} />
      <div className="flex-1 flex min-h-0">
        <ModuleBrowser />
        <main className="flex-1 min-w-0">
          {view === 'rack' ? <Rack /> : <NodeGraph />}
        </main>
      </div>
      <CodePane error={error} />
    </div>
  )
}
