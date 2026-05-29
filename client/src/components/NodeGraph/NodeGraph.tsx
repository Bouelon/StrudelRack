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
import { useRack } from '../../store/rackStore'
import { useRegistry } from '../../store/registryStore'
import { ModuleNode } from './ModuleNode'
import { AudioEdge } from './AudioEdge'

const nodeTypes: NodeTypes = { module: ModuleNode }
const edgeTypes: EdgeTypes = { audioEdge: AudioEdge }

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
  const idsKey = instances.map((i) => i.instanceId).join(',')

  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return instances.map(
        (i) =>
          prevById.get(i.instanceId) ?? {
            id: i.instanceId,
            type: 'module',
            position: i.nodePosition,
            data: { instanceId: i.instanceId },
          },
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  const edges: Edge[] = useMemo(
    () =>
      storeEdges.map((e) => ({
        id: e.id,
        source: e.sourceInstanceId,
        target: e.targetInstanceId,
        sourceHandle: e.sourcePortId,
        targetHandle: e.targetPortId,
        type: 'audioEdge',
      })),
    [storeEdges],
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
      const id = `${conn.source}:${conn.sourceHandle ?? 'out'}->${conn.target}:${conn.targetHandle ?? 'in'}`
      addEdge({
        id,
        sourceInstanceId: conn.source,
        sourcePortId: conn.sourceHandle ?? 'out',
        targetInstanceId: conn.target,
        targetPortId: conn.targetHandle ?? 'in',
      })
    },
    [addEdge],
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
