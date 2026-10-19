import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useRef, type ReactNode } from 'react'

// Adapted from the 21st.dev "image-stack-carousel" SwipeCards: 3D tilt while dragging, spring snap-back,
// cards fanned behind the front one. The front card is the live game card; swiping it is the verdict.
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
  onSwipeRight: () => void
  onSwipeLeft: () => void
}

export function CardStack({ children, className = '', canAct, onSwipeRight, onSwipeLeft }: Props) {
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

  return (
    <div className="card-stage" style={{ perspective: 1200 }}>
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
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation()
            e.preventDefault()
          }
        }}
        whileHover={canAct ? { scale: 1.02 } : {}}
      >
        {children}
      </motion.div>
    </div>
  )
}
