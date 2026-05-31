// client/src/components/NodeGraph/TriggerEdge.tsx
// MIDI / trigger cable — visually distinct from audio: amber, dashed, square pulse.
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

const TRIGGER_COLOR = '#ffa733'

export const TriggerEdge = (props: EdgeProps) => {
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
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={{ stroke: TRIGGER_COLOR, strokeWidth: 2, strokeDasharray: '6 4', opacity: 0.85 }}
      />
      <rect x="-3" y="-3" width="6" height="6" fill={TRIGGER_COLOR}>
        <animateMotion dur="1.1s" repeatCount="indefinite" path={edgePath} />
      </rect>
    </>
  )
}
