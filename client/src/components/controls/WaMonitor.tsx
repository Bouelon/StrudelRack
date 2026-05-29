// client/src/components/controls/WaMonitor.tsx
// Oscilloscope fed by the Strudel master AnalyserNode. Falls back to a flat
// trace when no audio tap is available (see DECISIONS.md).
import { useEffect, useRef } from 'react'
import { getAnalyser } from '../../engine/strudel'

interface WaMonitorProps {
  width: number
  height?: number
  color?: string
}

export const WaMonitor = ({ width, height = 40, color = '#39ff14' }: WaMonitorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const buffer = new Uint8Array(1024)

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const analyser = getAnalyser()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()

      const mid = canvas.height / 2
      if (analyser) {
        const n = Math.min(buffer.length, analyser.fftSize)
        analyser.getByteTimeDomainData(buffer)
        for (let i = 0; i < n; i++) {
          const x = (i / n) * canvas.width
          const y = (buffer[i] / 255) * canvas.height
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
      } else {
        ctx.moveTo(0, mid)
        ctx.lineTo(canvas.width, mid)
      }
      ctx.stroke()
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 2, width, height }}
    />
  )
}
