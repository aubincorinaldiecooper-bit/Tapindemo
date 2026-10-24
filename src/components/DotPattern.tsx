import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'

// Adapted from Magic UI's DotPattern (registry/magicui/dot-pattern.tsx); `cn` swapped for a plain class join.
interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  x?: number
  y?: number
  cx?: number
  cy?: number
  cr?: number
  className?: string
  glow?: boolean
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  glow = false,
  ...props
}: DotPatternProps) {
  const id = useId()
  const containerRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const dots = useMemo(() => {
    const cols = Math.ceil(dimensions.width / width)
    return Array.from(
      { length: cols * Math.ceil(dimensions.height / height) },
      (_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return {
          x: col * width + cx + x,
          y: row * height + cy + y,
          // oxlint-disable-next-line react/purity -- per-dot glow stagger, as in the Magic UI source
          delay: Math.random() * 5,
          // oxlint-disable-next-line react/purity
          duration: Math.random() * 3 + 2,
        }
      },
    )
  }, [dimensions, width, height, x, y, cx, cy])

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={['dot-pattern', className].filter(Boolean).join(' ')}
      {...props}
    >
      <defs>
        <radialGradient id={`${id}-gradient`}>
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {dots.map((dot) => (
        <motion.circle
          key={`${dot.x}-${dot.y}`}
          cx={dot.x}
          cy={dot.y}
          r={cr}
          fill={glow ? `url(#${id}-gradient)` : 'currentColor'}
          initial={glow ? { opacity: 0.4, scale: 1 } : {}}
          animate={glow ? { opacity: [0.4, 1, 0.4], scale: [1, 1.5, 1] } : {}}
          transition={
            glow
              ? {
                  duration: dot.duration,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: dot.delay,
                  ease: 'easeInOut',
                }
              : {}
          }
        />
      ))}
    </svg>
  )
}
