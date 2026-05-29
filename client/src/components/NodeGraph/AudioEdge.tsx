// client/src/components/NodeGraph/AudioEdge.tsx
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export const AudioEdge = (props: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  return (
    <>
      <BaseEdge id={props.id} path={edgePath} style={{ stroke: '#39ff14', strokeWidth: 2, opacity: 0.7 }} />
      <circle r="4" fill="#39ff14">
        <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  )
}
