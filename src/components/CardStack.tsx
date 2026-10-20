import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useRef, type MouseEvent, type ReactNode } from 'react'

const settings = {
  swipeThreshold: 120,
  stackRotation: 5,
  stackScale: 0.035,
  tiltStrength: 25,
  springStiffness: 300,
  springDamping: 30,
  behind: 2,
}

interface Props {
  children: ReactNode
  className?: string
  canAct: boolean
  /** 0..1 share of the turn timer still left; drawn as a stroke that unwinds around the card. */
  timeFraction: number
  urgent: boolean
  onSwipeRight: () => void
  onSwipeLeft: () => void
  onTap?: () => void
}

export function CardStack({ children, className = '', canAct, timeFraction, urgent, onSwipeRight, onSwipeLeft, onTap }: Props) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-200, 200], [settings.tiltStrength, -settings.tiltStrength])
  const rotateY = useTransform(x, [-200, 200], [-settings.tiltStrength, settings.tiltStrength])
  const dragged = useRef(false)

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (canAct && info.offset.x > settings.swipeThreshold) onSwipeRight()
    else if (canAct && info.offset.x < -settings.swipeThreshold) onSwipeLeft()
    else {
      x.set(0)
      y.set(0)
    }
    setTimeout(() => {
      dragged.current = false
    }, 0)
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (dragged.current) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    if (onTap && !(e.target as HTMLElement).closest('button')) onTap()
  }

  const pct = Math.max(0, Math.min(1, timeFraction)) * 100

  return (
    <motion.div layout className="card-stage" style={{ perspective: 1200 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
      {Array.from({ length: settings.behind }, (_, i) => i + 1).map((i) => (
        <motion.div
          key={i}
          aria-hidden
          className="card-stage-back"
          initial={false}
          animate={{ rotateZ: i * settings.stackRotation, scale: 1 - i * settings.stackScale, transformOrigin: '85% 85%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          style={{ zIndex: settings.behind - i }}
        />
      ))}

      <motion.div
        className={`main-game-card ${className}`}
        style={{ x, y, rotateX, rotateY, zIndex: settings.behind + 1 }}
        initial={{ opacity: 0, x: 80, rotate: 6, scale: 0.94 }}
        animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
        exit={{ opacity: 0, x: -80, rotate: -6, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: settings.springStiffness, damping: settings.springDamping }}
        drag={canAct}
        dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
        dragElastic={0.5}
        onDragStart={() => {
          dragged.current = true
        }}
        onDragEnd={handleDragEnd}
        onClickCapture={handleClick}
        whileHover={canAct ? { scale: 1.02 } : {}}
      >
        {children}
        <svg className={`timer-ring${urgent ? ' is-urgent' : ''}`} aria-hidden>
          <rect pathLength={100} strokeDasharray="100" style={{ strokeDashoffset: 100 - pct }} />
        </svg>
      </motion.div>
    </motion.div>
  )
}
