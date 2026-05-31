// client/src/components/NodeGraph/NodeGraph.tsx
import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { PortType } from '@shared/index'
import { useRack } from '../../store/rackStore'
import { useRegistry } from '../../store/registryStore'
import { ModuleNode } from './ModuleNode'
import { AudioEdge } from './AudioEdge'
import { TriggerEdge } from './TriggerEdge'

const nodeTypes: NodeTypes = { module: ModuleNode }
const edgeTypes: EdgeTypes = { audioEdge: AudioEdge, triggerEdge: TriggerEdge }

export const NodeGraph = () => {
  const instances = useRack((s) => s.instances)
  const storeEdges = useRack((s) => s.edges)
  const updateNodePosition = useRack((s) => s.updateNodePosition)
  const removeModule = useRack((s) => s.removeModule)
  const addEdge = useRack((s) => s.addEdge)
  const removeEdge = useRack((s) => s.removeEdge)
  const byId = useRegistry((s) => s.byId)

  // React Flow owns node state locally (so it can track measured dimensions —
  // otherwise dragging warns "node not initialized"). We reconcile the SET of
  // nodes from the store when modules are added/removed, preserving existing
  // node objects (dimensions + live position).
  const [rfNodes, setRfNodes, onNodesChangeRaw] = useNodesState<Node>([])

  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return instances.map((i) => {
        const existing = prevById.get(i.instanceId)
        if (!existing)
          return {
            id: i.instanceId,
            type: 'module',
            position: i.nodePosition,
            data: { instanceId: i.instanceId },
          }
        // Don't fight a local drag; otherwise reflect remote position moves.
        if (existing.dragging) return existing
        if (existing.position.x !== i.nodePosition.x || existing.position.y !== i.nodePosition.y)
          return { ...existing, position: i.nodePosition }
        return existing
      })
    })
  }, [instances, setRfNodes])

  // Resolve a port's declared type so cables can be coloured / validated by kind.
  const outPortType = useCallback(
    (instanceId: string, portId: string): PortType => {
      const inst = instances.find((i) => i.instanceId === instanceId)
      const def = inst ? byId.get(inst.defId) : undefined
      return def?.ports.outputs.find((p) => p.id === portId)?.type ?? 'audio'
    },
    [instances, byId],
  )
  const inPortType = useCallback(
    (instanceId: string, portId: string): PortType => {
      const inst = instances.find((i) => i.instanceId === instanceId)
      const def = inst ? byId.get(inst.defId) : undefined
      return def?.ports.inputs.find((p) => p.id === portId)?.type ?? 'audio'
    },
    [instances, byId],
  )

  const edges: Edge[] = useMemo(
    () =>
      storeEdges.map((e) => {
        const isTrigger = outPortType(e.sourceInstanceId, e.sourcePortId) === 'trigger'
        return {
          id: e.id,
          source: e.sourceInstanceId,
          target: e.targetInstanceId,
          sourceHandle: e.sourcePortId,
          targetHandle: e.targetPortId,
          type: isTrigger ? 'triggerEdge' : 'audioEdge',
        }
      }),
    [storeEdges, outPortType],
  )

  // Only allow same-type connections (audio↔audio, trigger↔trigger).
  const isValidConnection = useCallback(
    (conn: Connection | Edge) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return false
      const src = outPortType(conn.source, conn.sourceHandle ?? 'out')
      const tgt = inPortType(conn.target, conn.targetHandle ?? 'in')
      return src === tgt
    },
    [outPortType, inPortType],
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRaw(changes) // keep local state (incl. dimensions) in sync
      for (const c of changes) {
        if (c.type === 'position' && c.dragging === false && c.position)
          updateNodePosition(c.id, c.position)
        else if (c.type === 'remove') removeModule(c.id)
      }
    },
    [onNodesChangeRaw, updateNodePosition, removeModule],
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) if (c.type === 'remove') removeEdge(c.id)
    },
    [removeEdge],
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return
      if (!isValidConnection(conn)) return
      const id = `${conn.source}:${conn.sourceHandle ?? 'out'}->${conn.target}:${conn.targetHandle ?? 'in'}`
      addEdge({
        id,
        sourceInstanceId: conn.source,
        sourcePortId: conn.sourceHandle ?? 'out',
        targetInstanceId: conn.target,
        targetPortId: conn.targetHandle ?? 'in',
      })
    },
    [addEdge, isValidConnection],
  )

  const minimapColor = useCallback(
    (n: Node) => {
      const inst = instances.find((i) => i.instanceId === n.id)
      const def = inst ? byId.get(inst.defId) : undefined
      return def?.visual.accentColor ?? '#39ff14'
    },
    [instances, byId],
  )

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={{ type: 'audioEdge' }}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1c1c22" />
        <Controls />
        <MiniMap nodeColor={minimapColor} maskColor="rgba(0,0,0,0.6)" pannable zoomable />
      </ReactFlow>
    </div>
  )
}
