import { useEffect, useRef } from 'react'

interface Props {
  /** Frame rows ordered from upward gaze to downward gaze. */
  frameSets: string[][]
  fallback?: string
  parallax?: number
  ease?: number
  initialX?: number
  initialY?: number
  objectPosition?: string
}

const EPSILON = 0.0005

/**
 * Two-axis character tracking without video seeking. All clean poses are
 * decoded once, then the closest X/Y pose is painted synchronously to canvas.
 */
export default function CursorCharacter({
  frameSets,
  fallback,
  parallax = 10,
  ease = 0.22,
  initialX = 0.12,
  initialY = 0.5,
  objectPosition = '50% 50%',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLImageElement[][]>([])
  const pointer = useRef({
    x: Math.min(1, Math.max(0, initialX)),
    y: Math.min(1, Math.max(0, initialY)),
  })
  const easedPointer = useRef({ ...pointer.current })
  const rafId = useRef<number | null>(null)
  const lastTick = useRef(0)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (!canvas || !context || !frameSets.length || frameSets.some((set) => !set.length)) return

    const loadFrame = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })

    const draw = (x: number, y: number) => {
      const rows = imagesRef.current
      if (!rows.length) return

      const rowIndex = Math.min(
        rows.length - 1,
        Math.floor(Math.min(0.999999, Math.max(0, y)) * rows.length),
      )
      const row = rows[rowIndex]
      const frameIndex = Math.round(
        Math.min(row.length - 1, Math.max(0, x * (row.length - 1))),
      )

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(row[frameIndex], 0, 0, canvas.width, canvas.height)
    }

    const tick = (now: number) => {
      const dt = lastTick.current ? Math.min(50, now - lastTick.current) : 16.67
      lastTick.current = now
      const factor = 1 - Math.pow(1 - ease, dt / 16.67)

      easedPointer.current.x += (pointer.current.x - easedPointer.current.x) * factor
      easedPointer.current.y += (pointer.current.y - easedPointer.current.y) * factor
      draw(easedPointer.current.x, easedPointer.current.y)

      if (parallax && plateRef.current) {
        const shiftX = (easedPointer.current.x - 0.5) * -2 * parallax
        const shiftY = (easedPointer.current.y - 0.5) * -parallax
        plateRef.current.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0) scale(1.025)`
      }

      const distance = Math.max(
        Math.abs(pointer.current.x - easedPointer.current.x),
        Math.abs(pointer.current.y - easedPointer.current.y),
      )

      if (distance > EPSILON) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        easedPointer.current = { ...pointer.current }
        draw(pointer.current.x, pointer.current.y)
        rafId.current = null
        lastTick.current = 0
      }
    }

    const startLoop = () => {
      if (rafId.current === null) {
        lastTick.current = 0
        rafId.current = requestAnimationFrame(tick)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointer.current.x = Math.min(1, Math.max(0, event.clientX / window.innerWidth))
      pointer.current.y = Math.min(1, Math.max(0, event.clientY / window.innerHeight))
      startLoop()
    }

    Promise.all(frameSets.map((set) => Promise.all(set.map(loadFrame)))).then((rows) => {
      if (cancelled) return

      imagesRef.current = rows
      canvas.width = rows[0][0].naturalWidth
      canvas.height = rows[0][0].naturalHeight
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      draw(easedPointer.current.x, easedPointer.current.y)

      if (!reducedMotion.matches) {
        window.addEventListener('pointermove', handlePointerMove, { passive: true })
      }
    }).catch(() => {
      // Keep the static fallback visible if any generated pose fails to load.
    })

    return () => {
      cancelled = true
      window.removeEventListener('pointermove', handlePointerMove)
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
      rafId.current = null
      imagesRef.current = []
    }
  }, [frameSets, ease, parallax])

  return (
    <div
      ref={plateRef}
      style={{
        width: '100%',
        height: '100%',
        willChange: 'transform',
        backgroundImage: fallback ? `url(${fallback})` : undefined,
        backgroundSize: 'contain',
        backgroundPosition: objectPosition,
        backgroundRepeat: 'no-repeat',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition,
          display: 'block',
        }}
      />
    </div>
  )
}
